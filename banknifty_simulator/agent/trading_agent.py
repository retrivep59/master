"""
agent/trading_agent.py
======================
BankNiftyAgent – rule-based + indicator-driven trading agent for BankNifty.

Architecture
------------
Each candle the simulation engine calls:
    signal = agent.on_candle(candle, broker)

The agent:
  1. Appends the candle to its internal price history.
  2. Recomputes technical indicators (RSI, EMA-cross, MACD, Bollinger Bands).
  3. Applies risk management pre-checks (daily loss limit, max trades, open lots).
  4. Emits a Signal object: BUY / SELL / HOLD with optional metadata.
  5. The simulation engine passes the signal to the PaperBroker.

Design philosophy
-----------------
*   All indicator thresholds and risk parameters are tunable through the
    AgentConfig dataclass – no magic numbers buried in logic.
*   The agent is stateless between candles (all state lives in _price_history
    and _open_signal) so it is easy to serialise / reset.
*   Extending to ML-based signals: replace _compute_signal() with your model's
    predict() call while keeping the surrounding risk harness intact.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Deque, List, Optional

from collections import deque

import pandas as _pd
import config as _config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Signal types
# ---------------------------------------------------------------------------

@dataclass
class Signal:
    action:     str          # "BUY" | "SELL" | "HOLD"
    instrument: str          # "FUTURES" | "CE" | "PE"
    lots:       int          = 1
    reason:     str          = ""
    confidence: float        = 0.0   # 0.0–1.0; informational only
    timestamp:  Optional[datetime] = None


# ---------------------------------------------------------------------------
# Agent configuration
# ---------------------------------------------------------------------------

@dataclass
class AgentConfig:
    # --- Indicator windows ---
    ema_fast:     int   = 9
    ema_slow:     int   = 21
    rsi_period:   int   = 14
    bb_period:    int   = 20
    bb_std:       float = 2.0
    macd_fast:    int   = 12
    macd_slow:    int   = 26
    macd_signal:  int   = 9

    # --- Signal thresholds ---
    rsi_oversold:   float = 35.0   # below this → bullish bias
    rsi_overbought: float = 65.0   # above this → bearish bias

    # --- Risk overrides (None = use global config.py defaults) ---
    max_trades_per_day:     Optional[int]   = None
    daily_stop_loss_pct:    Optional[float] = None
    max_lots:               int             = 1

    # --- Trailing stop-loss ---
    trailing_stop_pts: float = 50.0   # 50 index points for futures

    # --- Minimum candles before issuing any signal ---
    warmup_candles: int = 12


# ---------------------------------------------------------------------------
# Lightweight indicator helpers (no external dependency)
# ---------------------------------------------------------------------------

def _ema(prices: List[float], period: int) -> float:
    """Exponential moving average – last value only."""
    if len(prices) < period:
        return prices[-1]
    k   = 2.0 / (period + 1)
    val = sum(prices[:period]) / period
    for p in prices[period:]:
        val = p * k + val * (1 - k)
    return val


def _sma(prices: List[float], period: int) -> float:
    if len(prices) < period:
        return sum(prices) / len(prices)
    return sum(prices[-period:]) / period


def _rsi(prices: List[float], period: int = 14) -> float:
    if len(prices) < period + 1:
        return 50.0
    deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
    gains  = [d if d > 0 else 0.0 for d in deltas]
    losses = [-d if d < 0 else 0.0 for d in deltas]
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1 + rs))


def _bollinger_bands(
    prices: List[float], period: int = 20, std_mult: float = 2.0
) -> tuple[float, float, float]:
    """Returns (upper, mid, lower)."""
    window = prices[-period:] if len(prices) >= period else prices
    mid    = sum(window) / len(window)
    var    = sum((p - mid)**2 for p in window) / len(window)
    std    = var ** 0.5
    return (mid + std_mult * std, mid, mid - std_mult * std)


def _macd(
    prices: List[float],
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9,
) -> tuple[float, float, float]:
    """Returns (macd_line, signal_line, histogram). Incremental EMA avoids O(n²)."""
    if len(prices) < slow + signal_period:
        return (0.0, 0.0, 0.0)
    macd_line = _ema(prices, fast) - _ema(prices, slow)
    # Build signal line from last (signal_period * 3) MACD values for stability
    window = min(len(prices), slow + signal_period * 3)
    recent = prices[-window:]
    macd_vals = [
        _ema(recent[:i+1], fast) - _ema(recent[:i+1], slow)
        for i in range(slow - 1, len(recent))
    ]
    signal_line = _ema(macd_vals, signal_period) if len(macd_vals) >= signal_period else (macd_vals[-1] if macd_vals else 0.0)
    histogram = macd_line - signal_line
    return (macd_line, signal_line, histogram)


# ---------------------------------------------------------------------------
# Main agent
# ---------------------------------------------------------------------------

class BankNiftyAgent:
    """
    Rule-based trading agent using EMA cross + RSI confirmation + MACD.

    Signals emitted
    ---------------
    BUY  : fast EMA crosses ABOVE slow EMA  AND  RSI < overbought  AND  MACD hist > 0
    SELL : fast EMA crosses BELOW slow EMA  AND  RSI > oversold    AND  MACD hist < 0
    HOLD : no clear setup or risk limits hit
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

        # Rolling price history (close prices)
        self._closes: Deque[float] = deque(maxlen=max(self.cfg.ema_slow, self.cfg.bb_period, self.cfg.rsi_period) * 3)
        self._candle_count: int    = 0

        # Track whether we are currently long / short
        self._in_long:  bool = False
        self._in_short: bool = False

        # FIX 12: peak unrealised P&L for trailing stop tracking (keyed per position)
        self._peak_pnl: dict = {}

        # Indicator snapshot of the last candle (for reporting)
        self.last_indicators: dict = {}

    # ------------------------------------------------------------------
    # Main entry point – called by the simulation engine each candle
    # ------------------------------------------------------------------

    def sync_state_from_broker(self, broker) -> None:
        """FIX 7: Reset _in_long/_in_short based on actual broker open positions.
        Filters to THIS agent's symbol+instrument to avoid blocking entries when
        other unrelated positions are open on different symbols."""
        positions = broker.get_open_positions()
        own = [p for p in positions
               if p["symbol"] == self.symbol and p["instrument"] == self.instrument]
        self._in_long  = any(p["lots"] > 0 for p in own)
        self._in_short = any(p["lots"] < 0 for p in own)

    def on_candle(self, candle: dict, broker=None) -> Signal:
        """
        Process a new OHLCV candle and return a trading signal.

        Parameters
        ----------
        candle : dict with keys timestamp, open, high, low, close, volume
        broker : PaperBroker instance (used for position/balance awareness)
        """
        from datetime import time as dtime
        import pytz

        close = float(candle["close"])
        self._closes.append(close)
        self._candle_count += 1
        ts = candle.get("timestamp", datetime.now())

        # FIX 7: sync long/short state from broker before any checks
        if broker is not None:
            self.sync_state_from_broker(broker)

        # FIX 13: session filter – only trade within NSE market hours (09:15–15:30 IST)
        IST = pytz.timezone("Asia/Kolkata")
        # FIX E: robust IST conversion for pandas Timestamps and plain datetimes
        if isinstance(ts, _pd.Timestamp):
            ts_ist = ts.tz_localize("UTC").tz_convert(IST) if ts.tzinfo is None else ts.tz_convert(IST)
        elif hasattr(ts, 'astimezone'):
            ts_ist = ts.astimezone(IST) if ts.tzinfo is not None else ts.replace(tzinfo=pytz.utc).astimezone(IST)
        else:
            ts_ist = datetime.now(IST)  # fallback: treat as current IST time
        t = ts_ist.time() if hasattr(ts_ist, 'time') else dtime(10, 0)
        if t < dtime(9, 15) or t >= dtime(15, 30):
            return Signal("HOLD", self.instrument, reason="outside market hours", timestamp=ts)

        # Not enough data for reliable signals yet
        if self._candle_count < self.cfg.warmup_candles:
            return Signal("HOLD", self.instrument, reason="warming up", timestamp=ts)

        # Compute indicators
        closes_list = list(self._closes)
        ema_fast_val = _ema(closes_list, self.cfg.ema_fast)
        ema_slow_val = _ema(closes_list, self.cfg.ema_slow)

        # Previous EMA values (one candle ago) for crossover detection
        prev_closes  = closes_list[:-1]
        prev_ef      = _ema(prev_closes, self.cfg.ema_fast) if len(prev_closes) >= self.cfg.ema_fast else ema_fast_val
        prev_es      = _ema(prev_closes, self.cfg.ema_slow) if len(prev_closes) >= self.cfg.ema_slow else ema_slow_val

        rsi_val            = _rsi(closes_list, self.cfg.rsi_period)
        bb_upper, bb_mid, bb_lower = _bollinger_bands(closes_list, self.cfg.bb_period, self.cfg.bb_std)
        macd_line, sig_line, macd_hist = _macd(closes_list, self.cfg.macd_fast, self.cfg.macd_slow, self.cfg.macd_signal)

        self.last_indicators = {
            "close":      close,
            "ema_fast":   round(ema_fast_val, 2),
            "ema_slow":   round(ema_slow_val, 2),
            "rsi":        round(rsi_val,      2),
            "bb_upper":   round(bb_upper,     2),
            "bb_lower":   round(bb_lower,     2),
            "macd_line":  round(macd_line,    4),
            "macd_hist":  round(macd_hist,    4),
        }

        # Check risk limits from the broker
        if broker:
            summary = broker.get_account_summary()
            max_trades = self.cfg.max_trades_per_day or _config.MAX_TRADES_PER_DAY
            if summary["trades_today"] >= max_trades:
                return Signal("HOLD", self.instrument, reason="max trades/day hit", timestamp=ts)

            dsl_pct = self.cfg.daily_stop_loss_pct or _config.DAILY_STOP_LOSS_PCT
            daily_loss_limit = summary["starting_balance"] * dsl_pct
            if summary["realised_pnl_today"] < -daily_loss_limit:
                return Signal("HOLD", self.instrument, reason="daily stop-loss hit", timestamp=ts)

        # FIX 12: trailing stop-loss check (per-position peak tracking)
        if broker:
            positions = broker.get_open_positions()
            for pos in positions:
                cur   = float(pos["current_price"])
                avg   = float(pos["avg_price"])
                lots  = int(pos["lots"])
                pkey  = f"{pos['symbol']}_{pos['instrument']}"
                unrealised = (cur - avg) * abs(lots) * broker.lot_size * (1 if lots > 0 else -1)

                if unrealised > self._peak_pnl.get(pkey, 0.0):
                    self._peak_pnl[pkey] = unrealised

                # FIX D: instrument-aware threshold
                if pos["instrument"] == _config.INSTRUMENT_FUTURES:
                    threshold = self.cfg.trailing_stop_pts * abs(lots) * broker.lot_size
                else:
                    threshold = 10.0 * abs(lots) * broker.lot_size   # options: 10 premium pts

                peak = self._peak_pnl.get(pkey, 0.0)
                if peak > 0 and (peak - unrealised) > threshold:
                    del self._peak_pnl[pkey]           # reset peak for this position
                    self._in_long  = False
                    self._in_short = False
                    action = "SELL" if lots > 0 else "BUY"
                    return Signal(action, pos["instrument"],
                                 lots=abs(lots), reason="Trailing stop triggered", timestamp=ts)

        return self._compute_signal(
            ema_fast_val, ema_slow_val, prev_ef, prev_es,
            rsi_val, macd_hist, close, bb_upper, bb_lower, ts
        )

    # ------------------------------------------------------------------
    # Signal computation logic
    # ------------------------------------------------------------------

    def _compute_signal(
        self,
        ema_fast: float, ema_slow: float,
        prev_ef:  float, prev_es:  float,
        rsi:      float,
        macd_hist: float,
        close:    float,
        bb_upper: float, bb_lower: float,
        ts:       datetime,
    ) -> Signal:

        bullish_cross = prev_ef <= prev_es and ema_fast > ema_slow
        bearish_cross = prev_ef >= prev_es and ema_fast < ema_slow

        # --- LONG entry ---
        if (
            bullish_cross
            and rsi < self.cfg.rsi_overbought
            and macd_hist > 0
            and not self._in_long
        ):
            # Extra confirmation: close above lower BB
            if close > bb_lower:
                self._in_long  = True
                self._in_short = False
                confidence = self._score_bull(rsi, macd_hist, close, bb_lower, bb_upper)
                # FIX 11: scale lots with confidence
                lots = max(1, round(self.cfg.max_lots * confidence))
                return Signal(
                    action     = "BUY",
                    instrument = self.instrument,
                    lots       = lots,
                    reason     = f"EMA-cross UP | RSI={rsi:.1f} | MACD_hist={macd_hist:.2f}",
                    confidence = confidence,
                    timestamp  = ts,
                )

        # --- SHORT / close-long exit ---
        if self._in_long and (
            bearish_cross
            or rsi > self.cfg.rsi_overbought   # FIX 8: compare against overbought
            or close < bb_lower
        ):
            self._in_long = False
            return Signal(
                action     = "SELL",
                instrument = self.instrument,
                lots       = self.cfg.max_lots,
                reason     = f"Exit long – EMA-cross DOWN | RSI={rsi:.1f}",
                confidence = 0.6,
                timestamp  = ts,
            )

        # --- SHORT entry (bearish) ---
        if (
            bearish_cross
            and rsi > self.cfg.rsi_overbought   # FIX 8: overbought threshold, not oversold
            and macd_hist < 0
            and not self._in_short
        ):
            if close < bb_upper:
                self._in_short = True
                self._in_long  = False
                confidence = self._score_bear(rsi, macd_hist, close, bb_upper)
                # FIX 11: scale lots with confidence
                lots = max(1, round(self.cfg.max_lots * confidence))
                return Signal(
                    action     = "SELL",
                    instrument = self.instrument,
                    lots       = lots,
                    reason     = f"EMA-cross DOWN | RSI={rsi:.1f} | MACD_hist={macd_hist:.2f}",
                    confidence = confidence,
                    timestamp  = ts,
                )

        # --- Cover short ---
        if self._in_short and (
            bullish_cross
            or rsi < self.cfg.rsi_oversold
            or close > bb_upper
        ):
            self._in_short = False
            return Signal(
                action     = "BUY",
                instrument = self.instrument,
                lots       = self.cfg.max_lots,
                reason     = f"Cover short – EMA-cross UP | RSI={rsi:.1f}",
                confidence = 0.6,
                timestamp  = ts,
            )

        return Signal("HOLD", self.instrument, reason="no setup", timestamp=ts)

    # ------------------------------------------------------------------
    # Confidence scoring helpers
    # ------------------------------------------------------------------

    def _score_bull(
        self, rsi: float, macd_hist: float, close: float, bb_lower: float, bb_upper: float
    ) -> float:
        score = 0.5
        if rsi < 50:        score += 0.15
        if rsi < 40:        score += 0.10
        if macd_hist > 0.5: score += 0.10
        bb_range = bb_upper - bb_lower
        if bb_range > 0 and (close - bb_lower) / bb_range < 0.4:
            score += 0.15   # entry near bottom of BB → more room to rise
        return min(round(score, 2), 1.0)

    def _score_bear(
        self, rsi: float, macd_hist: float, close: float, bb_upper: float
    ) -> float:
        score = 0.5
        if rsi > 55:         score += 0.15
        if rsi > 65:         score += 0.10
        if macd_hist < -0.5: score += 0.10
        if close > bb_upper * 0.99:
            score += 0.15   # entry near BB upper → stretched
        return min(round(score, 2), 1.0)

    def reset(self) -> None:
        """Reset agent state (call between separate back-test runs)."""
        self._closes.clear()
        self._candle_count = 0
        self._in_long      = False
        self._in_short     = False
        self._peak_pnl     = {}
        self.last_indicators = {}


# ---------------------------------------------------------------------------
# Helper to read global config values (avoids import collision with local cfg)
# ---------------------------------------------------------------------------

def cfg_module_val(attr: str):
    return getattr(_config, attr)
