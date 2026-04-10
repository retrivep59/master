"""
data/live_feed.py
=================
LiveFeed – fetches real BankNifty OHLCV data without the yfinance library.

Two data sources, tried in order:
  1. Yahoo Finance JSON API  (direct HTTP, no yfinance package needed)
     – provides 5-minute historical data up to ~60 days back
     – fallback symbol: BANKNIFTY.NS if ^NSEBANK returns empty
  2. NSE India public JSON API  (15-min delayed live quote)
     – used for the live-polling loop during market hours
     – seeds the session cookie and hits /api/allIndices

Usage
-----
    feed = LiveFeed(interval="5m")

    # Warm-up: get last 5 days of 5m candles
    df = feed.fetch_history(days=5)

    # Live tick during market hours
    tick = feed.get_live_tick()   # returns dict or None

    # Blocking live loop (calls callback every 5 min)
    feed.start_live_loop(callback=my_fn, interval_sec=300)
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta, date
from typing import Callable, Optional

import pandas as pd
import pytz
import requests

logger = logging.getLogger(__name__)

IST = pytz.timezone("Asia/Kolkata")

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}


# ── normalisation helper ────────────────────────────────────────────────────

def _normalise(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [c.lower() for c in df.columns]
    for alias in ("adj close", "adj_close"):
        if alias in df.columns:
            df.drop(columns=[alias], inplace=True)
    if "volume" not in df.columns:
        df["volume"] = 0
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
    if df.index.tzinfo is None:
        df.index = df.index.tz_localize("UTC")
    df.index = df.index.tz_convert(IST)
    df = df[["open", "high", "low", "close", "volume"]].sort_index()
    df = df.dropna(subset=["open", "high", "low", "close"])
    df = df[(df["close"] > 0) & (df["low"] > 0) & (df["open"] > 0)]
    return df


# ── Yahoo Finance direct API ─────────────────────────────────────────────────

def _yf_direct(symbol: str, interval: str, days: int) -> pd.DataFrame:
    """
    Call Yahoo Finance chart API directly — no yfinance package required.
    Returns normalised OHLCV DataFrame.
    """
    range_map = {
        "1m":  "7d",   "2m":  "60d",  "5m":  "60d",
        "15m": "60d",  "30m": "60d",  "1h":  "730d",
        "1d":  "5y",
    }
    yf_range = range_map.get(interval, "60d")

    for sym in (symbol, "BANKNIFTY.NS"):
        url = (
            f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}"
            f"?interval={interval}&range={yf_range}"
        )
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=(5, 10))
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            logger.warning("YF fetch failed for %s: %s", sym, exc)
            continue

        result = data.get("chart", {}).get("result", [])
        if not result:
            logger.warning("YF returned no result for %s", sym)
            continue

        res   = result[0]
        ts    = res.get("timestamp", [])
        quote = res["indicators"]["quote"][0]

        if not ts:
            continue

        df = pd.DataFrame({
            "open":   quote.get("open",   [None] * len(ts)),
            "high":   quote.get("high",   [None] * len(ts)),
            "low":    quote.get("low",    [None] * len(ts)),
            "close":  quote.get("close",  [None] * len(ts)),
            "volume": quote.get("volume", [0]    * len(ts)),
        }, index=pd.to_datetime(ts, unit="s", utc=True))

        df = _normalise(df)
        if df.empty:
            continue

        # Trim to requested days
        cutoff = datetime.now(IST) - timedelta(days=days)
        df = df[df.index >= cutoff]
        logger.info("YF (%s): %d candles  %s → %s", sym, len(df),
                    df.index[0].strftime("%d %b %H:%M"),
                    df.index[-1].strftime("%d %b %H:%M"))
        return df

    raise RuntimeError(
        "Yahoo Finance returned empty data for ^NSEBANK and BANKNIFTY.NS. "
        "Check your internet connection or try again during market hours."
    )


# ── NSE live quote ───────────────────────────────────────────────────────────

def _nse_live_quote() -> Optional[dict]:
    """
    Fetch BankNifty live (15-min delayed) quote from NSE public JSON API.
    Returns dict with keys: last_price, open, high, low, close, timestamp
    or None on failure.
    """
    session = requests.Session()
    try:
        # Seed NSE session cookie
        session.get("https://www.nseindia.com/", headers=_HEADERS, timeout=(4, 6))
        resp = session.get(
            "https://www.nseindia.com/api/allIndices",
            headers={**_HEADERS, "Referer": "https://www.nseindia.com/"},
            timeout=(4, 6),
        )
        resp.raise_for_status()
        for entry in resp.json().get("data", []):
            if entry.get("index", "").upper() == "NIFTY BANK":
                return {
                    "symbol":      "NIFTY BANK",
                    "last_price":  float(entry.get("last",          0)),
                    "open":        float(entry.get("open",          0)),
                    "high":        float(entry.get("high",          0)),
                    "low":         float(entry.get("low",           0)),
                    "close":       float(entry.get("previousClose", 0)),
                    "timestamp":   datetime.now(IST),
                }
    except Exception as exc:
        logger.warning("NSE live quote failed: %s", exc)
    return None


# ── Main LiveFeed class ──────────────────────────────────────────────────────

class LiveFeed:
    """
    Unified live + historical feed for BankNifty.

    Parameters
    ----------
    interval : str   yfinance-style interval ("1m", "5m", "15m", "1h")
    """

    def __init__(self, interval: str = "5m") -> None:
        self.interval = interval
        self._cache: Optional[pd.DataFrame] = None

    def fetch_history(self, days: int = 5) -> pd.DataFrame:
        """Download historical OHLCV via Yahoo Finance direct API."""
        df = _yf_direct("^NSEBANK", self.interval, days)
        self._cache = df
        return df

    def get_live_tick(self) -> Optional[dict]:
        """Get latest delayed quote from NSE. Returns None if unavailable."""
        return _nse_live_quote()

    def iter_history(self, df: Optional[pd.DataFrame] = None):
        """Yield candles one-by-one from a historical DataFrame."""
        source = df if df is not None else self._cache
        if source is None:
            raise RuntimeError("No history loaded. Call fetch_history() first.")
        for ts, row in source.iterrows():
            yield {
                "timestamp": ts,
                "open":   float(row["open"]),
                "high":   float(row["high"]),
                "low":    float(row["low"]),
                "close":  float(row["close"]),
                "volume": float(row["volume"]),
            }

    def start_live_loop(
        self,
        callback: Callable[[dict], None],
        interval_sec: int = 300,
        max_ticks: Optional[int] = None,
    ) -> None:
        """
        Poll NSE for a live quote every `interval_sec` seconds and call
        `callback` with a candle dict.  Runs until Ctrl-C or max_ticks.
        """
        logger.info("Live loop started – polling every %ds", interval_sec)
        count = 0
        while True:
            quote = self.get_live_tick()
            if quote:
                candle = {
                    "timestamp": quote["timestamp"],
                    "open":      quote["open"]       or quote["last_price"],
                    "high":      quote["high"]        or quote["last_price"],
                    "low":       quote["low"]         or quote["last_price"],
                    "close":     quote["last_price"],
                    "volume":    0.0,
                }
                callback(candle)
                count += 1
                if max_ticks and count >= max_ticks:
                    break
            time.sleep(interval_sec)
