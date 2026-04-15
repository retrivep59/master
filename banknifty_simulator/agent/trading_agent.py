"""
agent/trading_agent.py
======================
BankNiftyAgent – Professional-grade intraday trading agent for BankNifty F&O.

Strategy: Supertrend + Triple-EMA Alignment + RSI + MACD + ATR Regime Filter

Inspired by techniques used by the most successful intraday traders:
  - Supertrend (7, 3.0)    : primary trend filter, adapts to volatility
  - Triple EMA (9/21/50)   : only trade with the medium-term trend
  - ATR trailing stop      : dynamic, lets winners run, adapts to volatility
  - Regime filter          : skip choppy/ranging conditions automatically
  - Time-of-day filter     : avoid opening noise and closing illiquidity
  - MACD + BB confirmation : additional quality filter on entries

Signal logic
------------
LONG  : Supertrend↑  +  EMA9>21>50  +  RSI 35-65  +  MACD>0  +  trending
SHORT : Supertrend↓  +  EMA9<21<50  +  RSI 35-65  +  MACD<0  +  trending
EXIT  : Supertrend flips  OR  ATR trailing stop  OR  RSI extreme
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Deque, List, Optional
from collections import deque

import pandas as _pd
import config as _config

logger = logging.getLogger(__name__)


# ── Signal ────────────────────────────────────────────────────────────────────

@dataclass
class Signal:
    action:     str
    instrument: str
    lots:       int   = 1
    reason:     str   = ""
    confidence: float = 0.0
    timestamp:  Optional[datetime] = None


# ── Config ────────────────────────────────────────────────────────────────────

@dataclass
class AgentConfig:
    # Indicator windows
    ema_fast:     int   = 9
    ema_slow:     int   = 21
    ema_trend:    int   = 50        # medium-term trend EMA
    rsi_period:   int   = 14
    bb_period:    int   = 20
    bb_std:       float = 2.0
    macd_fast:    int   = 12
    macd_slow:    int   = 26
    macd_signal:  int   = 9
    atr_period:   int   = 14

    # Supertrend — the primary trend filter
    supertrend_period: int   = 7
    supertrend_mult:   float = 3.0

    # RSI thresholds
    rsi_oversold:   float = 35.0
    rsi_overbought: float = 65.0

    # Risk overrides (None = use config.py global defaults)
    max_trades_per_day:  Optional[int]   = None
    daily_stop_loss_pct: Optional[float] = None
    max_lots:            int             = 1

    # Trailing stop: threshold = max(static_floor, atr_multiplier × ATR) × lots × lot_size
    trailing_stop_pts:       float = 100.0   # static floor in index points
    atr_trailing_multiplier: float = 1.5     # dynamic component

    # Time-of-day filters (in 5-min candle counts)
    skip_open_candles:  int = 3   # skip 09:15-09:30 (3 candles × 5 min)
    skip_close_candles: int = 2   # skip 15:20-15:30 (2 candles × 5 min)

    # Market regime filter
    use_regime_filter: bool  = True
    min_atr_ratio:     float = 0.7   # ATR14 / ATR50 must be >= this

    # Warmup: need EMA50, ATR50, stable MACD (26+9), Supertrend (7×5)
    warmup_candles: int = 60


# ── Indicator helpers ─────────────────────────────────────────────────────────

def _ema(prices: List[float], period: int) -> float:
    if len(prices) < period:
        return prices[-1]
    k   = 2.0 / (period + 1)
    val = sum(prices[:period]) / period
    for p in prices[period:]:
        val = p * k + val * (1 - k)
    return val


def _rsi(prices: List[float], period: int = 14) -> float:
    if len(prices) < period + 1:
        return 50.0
    deltas   = [prices[i] - prices[i-1] for i in range(1, len(prices))]
    gains    = [d if d > 0 else 0.0 for d in deltas]
    losses   = [-d if d < 0 else 0.0 for d in deltas]
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    return 100.0 - (100.0 / (1 + avg_gain / avg_loss))


def _bollinger_bands(
    prices: List[float], period: int = 20, std_mult: float = 2.0
) -> tuple:
    window = prices[-period:] if len(prices) >= period else prices
    mid    = sum(window) / len(window)
    var    = sum((p - mid)**2 for p in window) / len(window)
    std    = var ** 0.5
    return (mid + std_mult * std, mid, mid - std_mult * std)


def _macd(
    prices: List[float], fast: int = 12, slow: int = 26, signal_period: int = 9
) -> tuple:
    if len(prices) < slow + signal_period:
        return (0.0, 0.0, 0.0)
    macd_line = _ema(prices, fast) - _ema(prices, slow)
    window    = min(len(prices), slow + signal_period * 3)
    recent    = prices[-window:]
    macd_vals = [
        _ema(recent[:i+1], fast) - _ema(recent[:i+1], slow)
        for i in range(slow - 1, len(recent))
    ]
    sig_line  = (
        _ema(macd_vals, signal_period) if len(macd_vals) >= signal_period
        else (macd_vals[-1] if macd_vals else 0.0)
    )
    return (macd_line, sig_line, macd_line - sig_line)


def _atr(
    highs: List[float], lows: List[float], closes: List[float], period: int
) -> float:
    """Average True Range using Wilder's smoothing."""
    n = len(closes)
    if n < 2:
        return highs[-1] - lows[-1] if n == 1 else 0.0
    tr_list = [
        max(highs[i] - lows[i],
            abs(highs[i] - closes[i-1]),
            abs(lows[i] - closes[i-1]))
        for i in range(1, n)
    ]
    if len(tr_list) < period:
        return sum(tr_list) / len(tr_list)
    atr = sum(tr_list[:period]) / period
    for tr in tr_list[period:]:
        atr = (atr * (period - 1) + tr) / period
    return atr


def _supertrend(
    highs: List[float], lows: List[float], closes: List[float],
    period: int, multiplier: float,
) -> tuple:
    """
    Supertrend indicator — primary trend filter.

    Uses a ratchet mechanism on the bands:
    - Lower band only rises (never falls) while price is above it  → supports uptrend
    - Upper band only falls (never rises) while price is below it  → resists downtrend
    Trend flips when price crosses the active band.

    Returns (is_bullish: bool, supertrend_level: float)
    """
    n = len(closes)
    if n < period + 2:
        return True, closes[-1]

    w   = min(n, period * 5)
    h   = highs[-w:]
    l   = lows[-w:]
    c   = closes[-w:]
    m   = len(c)

    # Wilder's ATR for candles 1..m-1
    atr_arr: List[float] = []
    for i in range(1, m):
        tr = max(h[i] - l[i], abs(h[i] - c[i-1]), abs(l[i] - c[i-1]))
        if not atr_arr:
            atr_arr.append(tr)
        elif len(atr_arr) < period:
            prev = atr_arr[-1]
            atr_arr.append((prev * len(atr_arr) + tr) / (len(atr_arr) + 1))
        else:
            atr_arr.append((atr_arr[-1] * (period - 1) + tr) / period)

    n_k    = len(atr_arr)            # = m - 1
    c_k    = c[1:]                   # closes aligned with bands
    ub_raw = [(h[i+1] + l[i+1]) / 2 + multiplier * atr_arr[i] for i in range(n_k)]
    lb_raw = [(h[i+1] + l[i+1]) / 2 - multiplier * atr_arr[i] for i in range(n_k)]

    final_ub = list(ub_raw)
    final_lb = list(lb_raw)
    is_bull  = [True] * n_k

    for i in range(1, n_k):
        # Ratchet: upper only tightens downward; lower only raises upward
        final_ub[i] = (
            ub_raw[i]
            if ub_raw[i] < final_ub[i-1] or c_k[i-1] > final_ub[i-1]
            else final_ub[i-1]
        )
        final_lb[i] = (
            lb_raw[i]
            if lb_raw[i] > final_lb[i-1] or c_k[i-1] < final_lb[i-1]
            else final_lb[i-1]
        )
        # Trend flips only when price crosses the active band
        if is_bull[i-1]:
            is_bull[i] = c_k[i] >= final_lb[i]
        else:
            is_bull[i] = c_k[i] > final_ub[i]

    bullish = is_bull[-1]
    return bullish, (final_lb[-1] if bullish else final_ub[-1])


# ── Agent ─────────────────────────────────────────────────────────────────────

class BankNiftyAgent:
    """
    Professional BankNifty intraday agent.

    Entry strategy
    --------------
    LONG  : Supertrend bullish + EMA9 > EMA21 > EMA50 + RSI in range + MACD > 0
    SHORT : Supertrend bearish + EMA9 < EMA21 < EMA50 + RSI in range + MACD < 0

    Exit strategy
    -------------
    Primary   : Supertrend flips direction
    Secondary : ATR-based trailing stop (1.5 × ATR14, floor = trailing_stop_pts)
    Tertiary  : RSI extreme (> 78 long exit, < 22 short exit)

    Filters
    -------
    Time   : Skip first 3 and last 2 candles of each session (opening/closing noise)
    Regime : Only trade when ATR14/ATR50 >= min_atr_ratio (trending, not ranging)
    """

    def __init__(
        self,
        cfg: Optional[AgentConfig] = None,
        symbol: str = "BANKNIFTY-FUT",
        instrument: str = "FUTURES",
    ) -> None:
        self.cfg        = cfg if cfg is not None else AgentConfig()
        self.symbol     = symbol
        self.instrument = instrument

        _maxlen = max(
            self.cfg.ema_trend,
            self.cfg.bb_period,
            self.cfg.rsi_period,
            self.cfg.macd_slow + self.cfg.macd_signal,
            self.cfg.supertrend_period * 5,
            50,
        ) * 2 + 20

        self._closes: Deque[float] = deque(maxlen=_maxlen)
        self._highs:  Deque[float] = deque(maxlen=_maxlen)
        self._lows:   Deque[float] = deque(maxlen=_maxlen)
        self._candle_count: int    = 0

        self._in_long:  bool = False
        self._in_short: bool = False

        self._prev_st_bull: Optional[bool] = None   # Supertrend flip detection
        self._peak_pnl:     dict           = {}     # per-position trailing stop peak

        self.last_indicators: dict = {}

    # ── Broker sync ──────────────────────────────────────────────────────────

    def sync_state_from_broker(self, broker) -> None:
        positions = broker.get_open_positions()
        own = [p for p in positions
               if p["symbol"] == self.symbol and p["instrument"] == self.instrument]
        self._in_long  = any(p["lots"] > 0 for p in own)
        self._in_short = any(p["lots"] < 0 for p in own)

    # ── Main entry point ─────────────────────────────────────────────────────

    def on_candle(self, candle: dict, broker=None) -> Signal:
        from datetime import time as dtime
        import pytz

        close = float(candle["close"])
        high  = float(candle.get("high",  close))
        low   = float(candle.get("low",   close))

        self._closes.append(close)
        self._highs.append(high)
        self._lows.append(low)
        self._candle_count += 1
        ts = candle.get("timestamp", datetime.now())

        if broker is not None:
            self.sync_state_from_broker(broker)

        # ── Market hours ─────────────────────────────────────────────────
        IST = pytz.timezone("Asia/Kolkata")
        if isinstance(ts, _pd.Timestamp):
            ts_ist = ts.tz_localize("UTC").tz_convert(IST) if ts.tzinfo is None else ts.tz_convert(IST)
        elif hasattr(ts, "astimezone"):
            ts_ist = ts.astimezone(IST) if ts.tzinfo is not None else ts.replace(tzinfo=pytz.utc).astimezone(IST)
        else:
            ts_ist = datetime.now(IST)
        t = ts_ist.time() if hasattr(ts_ist, "time") else dtime(10, 0)

        if t < dtime(9, 15) or t >= dtime(15, 30):
            return Signal("HOLD", self.instrument, reason="outside market hours", timestamp=ts)

        # ── Opening noise filter ─────────────────────────────────────────
        mins_from_open = (t.hour * 60 + t.minute) - (9 * 60 + 15)
        if 0 <= mins_from_open < self.cfg.skip_open_candles * 5:
            return Signal("HOLD", self.instrument, reason="opening noise filter", timestamp=ts)

        # ── Closing filter ────────────────────────────────────────────────
        mins_to_close = (15 * 60 + 30) - (t.hour * 60 + t.minute)
        if mins_to_close < self.cfg.skip_close_candles * 5:
            return Signal("HOLD", self.instrument, reason="closing filter", timestamp=ts)

        # ── Warmup ───────────────────────────────────────────────────────
        if self._candle_count < self.cfg.warmup_candles:
            return Signal("HOLD", self.instrument, reason="warming up", timestamp=ts)

        closes_list = list(self._closes)
        highs_list  = list(self._highs)
        lows_list   = list(self._lows)

        # ── Indicators ───────────────────────────────────────────────────
        ema_f  = _ema(closes_list, self.cfg.ema_fast)
        ema_s  = _ema(closes_list, self.cfg.ema_slow)
        ema_t  = _ema(closes_list, self.cfg.ema_trend)

        prev_c = closes_list[:-1]
        prev_f = _ema(prev_c, self.cfg.ema_fast) if len(prev_c) >= self.cfg.ema_fast else ema_f
        prev_s = _ema(prev_c, self.cfg.ema_slow) if len(prev_c) >= self.cfg.ema_slow else ema_s

        rsi                    = _rsi(closes_list, self.cfg.rsi_period)
        bb_upper, _, bb_lower  = _bollinger_bands(closes_list, self.cfg.bb_period, self.cfg.bb_std)
        _, __, macd_hist       = _macd(closes_list, self.cfg.macd_fast, self.cfg.macd_slow, self.cfg.macd_signal)
        atr_val                = _atr(highs_list, lows_list, closes_list, self.cfg.atr_period)
        st_bull, st_val        = _supertrend(highs_list, lows_list, closes_list,
                                             self.cfg.supertrend_period, self.cfg.supertrend_mult)

        # ── Regime filter ─────────────────────────────────────────────────
        trending = True
        if self.cfg.use_regime_filter and len(closes_list) >= 52:
            atr_slow = _atr(highs_list, lows_list, closes_list, 50)
            if atr_slow > 0:
                trending = (atr_val / atr_slow) >= self.cfg.min_atr_ratio

        # ── Dashboard snapshot ────────────────────────────────────────────
        self.last_indicators = {
            "close":      close,
            "ema_fast":   round(ema_f,    2),
            "ema_slow":   round(ema_s,    2),
            "ema_trend":  round(ema_t,    2),
            "rsi":        round(rsi,      2),
            "bb_upper":   round(bb_upper, 2),
            "bb_lower":   round(bb_lower, 2),
            "macd_hist":  round(macd_hist, 4),
            "atr":        round(atr_val,  2),
            "supertrend": round(st_val,   2),
            "st_bull":    st_bull,
            "trending":   trending,
        }

        # ── Risk limits ───────────────────────────────────────────────────
        if broker:
            summ       = broker.get_account_summary()
            max_trades = self.cfg.max_trades_per_day or _config.MAX_TRADES_PER_DAY
            if summ["trades_today"] >= max_trades:
                return Signal("HOLD", self.instrument, reason="max trades/day hit", timestamp=ts)
            dsl = self.cfg.daily_stop_loss_pct or _config.DAILY_STOP_LOSS_PCT
            if summ["realised_pnl_today"] < -(summ["starting_balance"] * dsl):
                return Signal("HOLD", self.instrument, reason="daily stop-loss hit", timestamp=ts)

        # ── ATR trailing stop ─────────────────────────────────────────────
        if broker:
            for pos in broker.get_open_positions():
                cur   = float(pos["current_price"])
                avg   = float(pos["avg_price"])
                lots  = int(pos["lots"])
                pkey  = f"{pos['symbol']}_{pos['instrument']}"
                dirn  = 1 if lots > 0 else -1
                unr   = (cur - avg) * abs(lots) * broker.lot_size * dirn

                if unr > self._peak_pnl.get(pkey, 0.0):
                    self._peak_pnl[pkey] = unr

                if pos["instrument"] == _config.INSTRUMENT_FUTURES:
                    dynamic   = self.cfg.atr_trailing_multiplier * atr_val * abs(lots) * broker.lot_size
                    static    = self.cfg.trailing_stop_pts        * abs(lots) * broker.lot_size
                    threshold = max(dynamic, static)
                else:
                    threshold = 10.0 * abs(lots) * broker.lot_size

                peak = self._peak_pnl.get(pkey, 0.0)
                if peak > 0 and (peak - unr) > threshold:
                    del self._peak_pnl[pkey]
                    self._in_long  = False
                    self._in_short = False
                    action = "SELL" if lots > 0 else "BUY"
                    return Signal(
                        action, pos["instrument"],
                        lots   = abs(lots),
                        reason = f"ATR trailing stop | ATR={atr_val:.0f} | peak=₹{peak:.0f}",
                        timestamp = ts,
                    )

        # ── Signal generation ─────────────────────────────────────────────
        prev_st_bull       = self._prev_st_bull
        self._prev_st_bull = st_bull

        return self._compute_signal(
            close, ema_f, ema_s, ema_t, prev_f, prev_s,
            rsi, macd_hist, bb_upper, bb_lower,
            st_bull, st_val, prev_st_bull,
            atr_val, trending, ts,
        )

    # ── Signal logic ─────────────────────────────────────────────────────────

    def _compute_signal(
        self,
        close:     float,
        ema_f:     float, ema_s: float, ema_t: float,
        prev_f:    float, prev_s: float,
        rsi:       float, macd_hist: float,
        bb_upper:  float, bb_lower: float,
        st_bull:   bool,  st_val: float, prev_st_bull: Optional[bool],
        atr_val:   float, trending: bool,
        ts:        datetime,
    ) -> Signal:

        bull_cross     = prev_f <= prev_s and ema_f > ema_s
        bear_cross     = prev_f >= prev_s and ema_f < ema_s
        ema_aligned_up = ema_f > ema_s > ema_t
        ema_aligned_dn = ema_f < ema_s < ema_t
        st_flip_bull   = prev_st_bull is not None and not prev_st_bull and st_bull
        st_flip_bear   = prev_st_bull is not None and prev_st_bull and not st_bull

        # ── Exit long ─────────────────────────────────────────────────────
        if self._in_long:
            if st_flip_bear or (not st_bull and bear_cross) or rsi > 78:
                self._in_long = False
                reason = ("Supertrend flipped BEAR" if st_flip_bear
                          else f"Exit long: EMA↓ RSI={rsi:.0f}")
                return Signal("SELL", self.instrument, lots=self.cfg.max_lots,
                              reason=reason, confidence=0.75, timestamp=ts)

        # ── Cover short ───────────────────────────────────────────────────
        if self._in_short:
            if st_flip_bull or (st_bull and bull_cross) or rsi < 22:
                self._in_short = False
                reason = ("Supertrend flipped BULL" if st_flip_bull
                          else f"Cover short: EMA↑ RSI={rsi:.0f}")
                return Signal("BUY", self.instrument, lots=self.cfg.max_lots,
                              reason=reason, confidence=0.75, timestamp=ts)

        # ── Regime gate ───────────────────────────────────────────────────
        if not trending:
            return Signal("HOLD", self.instrument, reason="choppy/ranging market", timestamp=ts)

        # ── Long entry ────────────────────────────────────────────────────
        rsi_ok = self.cfg.rsi_oversold < rsi < self.cfg.rsi_overbought
        if (
            st_bull
            and ema_aligned_up
            and rsi_ok
            and macd_hist > 0
            and close > ema_t
            and not self._in_long
            and not self._in_short
        ):
            conf = self._score_bull(rsi, macd_hist, close, bb_lower, bb_upper,
                                    st_flip_bull, ema_f, ema_s, ema_t)
            self._in_long = True
            return Signal(
                action     = "BUY",
                instrument = self.instrument,
                lots       = max(1, round(self.cfg.max_lots * conf)),
                reason     = (f"ST↑ EMA{self.cfg.ema_fast}>{self.cfg.ema_slow}>{self.cfg.ema_trend} "
                              f"RSI={rsi:.0f} MACD={macd_hist:+.2f} ATR={atr_val:.0f}"),
                confidence = conf,
                timestamp  = ts,
            )

        # ── Short entry ───────────────────────────────────────────────────
        if (
            not st_bull
            and ema_aligned_dn
            and rsi_ok
            and macd_hist < 0
            and close < ema_t
            and not self._in_short
            and not self._in_long
        ):
            conf = self._score_bear(rsi, macd_hist, close, bb_upper,
                                    st_flip_bear, ema_f, ema_s, ema_t)
            self._in_short = True
            return Signal(
                action     = "SELL",
                instrument = self.instrument,
                lots       = max(1, round(self.cfg.max_lots * conf)),
                reason     = (f"ST↓ EMA{self.cfg.ema_fast}<{self.cfg.ema_slow}<{self.cfg.ema_trend} "
                              f"RSI={rsi:.0f} MACD={macd_hist:+.2f} ATR={atr_val:.0f}"),
                confidence = conf,
                timestamp  = ts,
            )

        return Signal("HOLD", self.instrument, reason="no high-probability setup", timestamp=ts)

    # ── Confidence scorers ────────────────────────────────────────────────────

    def _score_bull(
        self, rsi, macd_hist, close, bb_lower, bb_upper,
        st_just_flipped, ef, es, et,
    ) -> float:
        score = 0.55
        if st_just_flipped:            score += 0.15   # fresh Supertrend flip = strong
        if rsi < 50:                   score += 0.10   # RSI has room to run up
        if rsi < 40:                   score += 0.05   # oversold bounce bonus
        if macd_hist > 1.0:            score += 0.05   # strong positive momentum
        bb_range = bb_upper - bb_lower
        if bb_range > 0 and (close - bb_lower) / bb_range < 0.4:
            score += 0.10                              # entry near lower BB = more upside
        if ef > es > et:               score += 0.05   # clean triple alignment
        return min(round(score, 2), 1.0)

    def _score_bear(
        self, rsi, macd_hist, close, bb_upper,
        st_just_flipped, ef, es, et,
    ) -> float:
        score = 0.55
        if st_just_flipped:            score += 0.15
        if rsi > 50:                   score += 0.10
        if rsi > 60:                   score += 0.05
        if macd_hist < -1.0:           score += 0.05
        if close > bb_upper * 0.99:    score += 0.10   # stretched above BB
        if ef < es < et:               score += 0.05
        return min(round(score, 2), 1.0)

    # ── Reset ─────────────────────────────────────────────────────────────────

    def reset(self) -> None:
        self._closes.clear()
        self._highs.clear()
        self._lows.clear()
        self._candle_count  = 0
        self._in_long       = False
        self._in_short      = False
        self._prev_st_bull  = None
        self._peak_pnl      = {}
        self.last_indicators = {}


def cfg_module_val(attr: str):
    return getattr(_config, attr)
