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

import config as cfg

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

    # --- Minimum candles before issuing any signal ---
    warmup_candles: int = 30


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
    """Returns (macd_line, signal_line, histogram)."""
    if len(prices) < slow:
        return (0.0, 0.0, 0.0)
    macd_line    = _ema(prices, fast) - _ema(prices, slow)
    macd_history = [
        _ema(prices[: i+1], fast) - _ema(prices[: i+1], slow)
        for i in range(slow - 1, len(prices))
    ]
    signal_line  = _ema(macd_history, signal_period) if len(macd_history) >= signal_period else macd_line
    histogram    = macd_line - signal_line
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
        cfg: AgentConfig = AgentConfig(),
        symbol: str = "BANKNIFTY-FUT",
        instrument: str = "FUTURES",
    ) -> None:
        self.cfg        = cfg
        self.symbol     = symbol
        self.instrument = instrument

        # Rolling price history (close prices)
        self._closes: Deque[float] = deque(maxlen=max(cfg.ema_slow, cfg.bb_period, cfg.rsi_period) * 3)
        self._candle_count: int    = 0

        # Track whether we are currently long / short
        self._in_long:  bool = False
        self._in_short: bool = False

        # Indicator snapshot of the last candle (for reporting)
        self.last_indicators: dict = {}

    # ------------------------------------------------------------------
    # Main entry point – called by the simulation engine each candle
    # ------------------------------------------------------------------

    def on_candle(self, candle: dict, broker=None) -> Signal:
        """
        Process a new OHLCV candle and return a trading signal.

        Parameters
        ----------
        candle : dict with keys timestamp, open, high, low, close, volume
        broker : PaperBroker instance (used for position/balance awareness)
        """
        close = float(candle["close"])
        self._closes.append(close)
        self._candle_count += 1
        ts = candle.get("timestamp", datetime.now())

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
            max_trades = self.cfg.max_trades_per_day or cfg_module_val("MAX_TRADES_PER_DAY")
            if summary["trades_today"] >= max_trades:
                return Signal("HOLD", self.instrument, reason="max trades/day hit", timestamp=ts)

            dsl_pct = self.cfg.daily_stop_loss_pct or cfg_module_val("DAILY_STOP_LOSS_PCT")
            daily_loss_limit = summary["starting_balance"] * dsl_pct
            if summary["realised_pnl_today"] < -daily_loss_limit:
                return Signal("HOLD", self.instrument, reason="daily stop-loss hit", timestamp=ts)

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
                return Signal(
                    action     = "BUY",
                    instrument = self.instrument,
                    lots       = self.cfg.max_lots,
                    reason     = f"EMA-cross UP | RSI={rsi:.1f} | MACD_hist={macd_hist:.2f}",
                    confidence = confidence,
                    timestamp  = ts,
                )

        # --- SHORT / close-long exit ---
        if self._in_long and (
            bearish_cross
            or rsi > self.cfg.rsi_overbought
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
            and rsi > self.cfg.rsi_oversold
            and macd_hist < 0
            and not self._in_short
        ):
            if close < bb_upper:
                self._in_short = True
                self._in_long  = False
                confidence = self._score_bear(rsi, macd_hist, close, bb_upper)
                return Signal(
                    action     = "SELL",
                    instrument = self.instrument,
                    lots       = self.cfg.max_lots,
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
        self.last_indicators = {}


# ---------------------------------------------------------------------------
# Helper to read global config values (avoids import collision with local cfg)
# ---------------------------------------------------------------------------

def cfg_module_val(attr: str):
    import config as _cfg
    return getattr(_cfg, attr)
