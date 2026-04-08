"""
data/data_feed.py
=================
BankNifty data ingestion layer.

Provides three sources (tried in order of preference):
  1. **yfinance** – historical OHLCV, reliable for backtesting.
  2. **jugaad-data** – NSE official historical data (more accurate for options).
  3. **NSE JSON scraper** – lightweight fallback for live/delayed quotes.

All sources normalise output to the same pandas DataFrame schema:
    datetime | open | high | low | close | volume

Usage
-----
    feed = BankNiftyFeed(interval="5m", source="yfinance")
    df   = feed.fetch_historical(days=30)

    # Live tick loop (calls callback each candle)
    feed.start_live_stream(callback=my_handler, interval_seconds=300)
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from typing import Callable, Iterator, Optional

import pandas as pd

import config as cfg

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Normalisation helper
# ---------------------------------------------------------------------------

def _normalise(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure the DataFrame has consistent lowercase column names and a
    timezone-aware DatetimeIndex in IST.
    """
    df.columns = [c.lower() for c in df.columns]
    for alias in ("adj close", "adj_close", "adjusted_close"):
        if alias in df.columns:
            df = df.drop(columns=[alias])

    required = {"open", "high", "low", "close"}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"Data source is missing columns: {missing}")

    if "volume" not in df.columns:
        df["volume"] = 0

    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)

    if df.index.tzinfo is None:
        df.index = df.index.tz_localize("UTC")
    df.index = df.index.tz_convert(cfg.IST_TIMEZONE)

    df = df[["open", "high", "low", "close", "volume"]].sort_index()

    # FIX 14: drop NaN rows and rows with zero/negative prices
    df = df.dropna(subset=["open", "high", "low", "close"])
    df = df[(df["close"] > 0) & (df["low"] > 0) & (df["open"] > 0)]

    return df


# ---------------------------------------------------------------------------
# yfinance source
# ---------------------------------------------------------------------------

def _fetch_yfinance(symbol: str, interval: str, days: int) -> pd.DataFrame:
    try:
        import yfinance as yf
    except ImportError as exc:
        raise ImportError("yfinance not installed. Run: pip install yfinance") from exc

    end   = datetime.now()
    start = end - timedelta(days=days)

    logger.info("yfinance: fetching %s  interval=%s  days=%d", symbol, interval, days)
    ticker = yf.Ticker(symbol)
    df     = ticker.history(start=start, end=end, interval=interval, auto_adjust=True)

    # FIX 15: retry with fallback symbol if first ticker returns empty data
    if df.empty:
        logger.warning("yfinance: %s returned empty data, retrying with BANKNIFTY.NS", symbol)
        ticker2 = yf.Ticker("BANKNIFTY.NS")
        df = ticker2.history(start=start, end=end, interval=interval, auto_adjust=True)

    if df.empty:
        raise RuntimeError(
            f"yfinance returned empty data for {symbol} and BANKNIFTY.NS. "
            "For intraday data yfinance only provides ~60 days of 1m and ~730 days of 5m history."
        )
    return _normalise(df)


# ---------------------------------------------------------------------------
# jugaad-data source
# ---------------------------------------------------------------------------

def _fetch_jugaad(symbol: str, interval: str, days: int) -> pd.DataFrame:
    """
    Fetch BankNifty index data via jugaad-data.
    jugaad-data provides NSE index historical data (daily only); for intraday
    we fall back to yfinance automatically.
    """
    if interval not in ("1d", "daily"):
        logger.warning(
            "jugaad-data only supports daily OHLC; falling back to yfinance for %s interval.",
            interval,
        )
        return _fetch_yfinance(symbol, interval, days)

    try:
        from jugaad_data.nse import index_df
    except ImportError as exc:
        raise ImportError(
            "jugaad-data not installed. Run: pip install jugaad-data"
        ) from exc

    end_date   = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    symbol_jd  = "NIFTY BANK"  # jugaad-data expects the NSE display name

    logger.info("jugaad-data: fetching %s  from=%s  to=%s", symbol_jd, start_date, end_date)
    df = index_df(symbol=symbol_jd, from_date=start_date, to_date=end_date)

    # jugaad-data column names vary by version – attempt best-effort rename
    rename_map = {
        "HistoricalDate": "datetime", "OPEN": "open", "HIGH": "high",
        "LOW": "low", "CLOSE": "close", "Volume": "volume",
        "Date": "datetime",
    }
    df = df.rename(columns=rename_map)

    if "datetime" in df.columns:
        df = df.set_index("datetime")
    return _normalise(df)


# ---------------------------------------------------------------------------
# NSE JSON scraper (live delayed quote)
# ---------------------------------------------------------------------------

def _fetch_nse_live_quote(symbol: str = "NIFTY BANK") -> Optional[dict]:
    """
    Scrape the NSE public JSON API for a live (20-min delayed) index quote.
    Returns a dict with keys: symbol, last_price, open, high, low, close, timestamp
    or None if the request fails.
    """
    try:
        import requests
    except ImportError:
        logger.warning("requests not installed; cannot fetch NSE live quote.")
        return None

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.nseindia.com/",
    }
    session = requests.Session()
    # Seed the cookie jar (NSE requires a prior homepage visit)
    try:
        session.get("https://www.nseindia.com/", headers=headers, timeout=5)
        url  = "https://www.nseindia.com/api/allIndices"
        resp = session.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json().get("data", [])
        for entry in data:
            if entry.get("index", "").upper() == "NIFTY BANK":
                return {
                    "symbol":      "NIFTY BANK",
                    "last_price":  float(entry.get("last",  0)),
                    "open":        float(entry.get("open",  0)),
                    "high":        float(entry.get("high",  0)),
                    "low":         float(entry.get("low",   0)),
                    "close":       float(entry.get("previousClose", 0)),
                    "timestamp":   datetime.now(),
                }
    except Exception as exc:
        logger.warning("NSE live quote fetch failed: %s", exc)
    return None


# ---------------------------------------------------------------------------
# Main feed class
# ---------------------------------------------------------------------------

class BankNiftyFeed:
    """
    Unified data feed for BankNifty.

    Parameters
    ----------
    interval : str
        Candle interval accepted by yfinance: "1m", "5m", "15m", "1h", "1d".
    source   : str
        "yfinance" | "jugaad" | "nse_live"
    """

    YFINANCE_SYMBOL = cfg.BANKNIFTY_SYMBOL_NSE   # "^NSEBANK"

    def __init__(
        self,
        interval: str = cfg.DATA_INTERVAL,
        source: str   = "yfinance",
    ) -> None:
        self.interval = interval
        self.source   = source
        self._cache: Optional[pd.DataFrame] = None

    # ------------------------------------------------------------------
    # Historical fetch
    # ------------------------------------------------------------------

    def fetch_historical(self, days: int = cfg.DATA_PERIOD_DAYS) -> pd.DataFrame:
        """
        Download OHLCV history and cache it locally.

        Returns a DataFrame with DatetimeIndex (IST) and columns:
            open, high, low, close, volume
        """
        if self.source == "yfinance":
            df = _fetch_yfinance(self.YFINANCE_SYMBOL, self.interval, days)
        elif self.source == "jugaad":
            df = _fetch_jugaad(self.YFINANCE_SYMBOL, self.interval, days)
        elif self.source == "nse_live":
            raise ValueError(
                "nse_live source only supports get_latest_quote(), not fetch_historical()."
            )
        else:
            raise ValueError(f"Unknown source: {self.source!r}")

        self._cache = df
        logger.info(
            "Fetched %d candles (%s to %s)",
            len(df),
            df.index[0].strftime("%Y-%m-%d %H:%M"),
            df.index[-1].strftime("%Y-%m-%d %H:%M"),
        )
        return df

    # ------------------------------------------------------------------
    # Live / delayed quote
    # ------------------------------------------------------------------

    def get_latest_quote(self) -> Optional[dict]:
        """Return the latest delayed live quote from NSE."""
        return _fetch_nse_live_quote()

    # ------------------------------------------------------------------
    # Backtest iterator (yield one candle at a time)
    # ------------------------------------------------------------------

    def iter_candles(
        self,
        df: Optional[pd.DataFrame] = None,
        speed_factor: float = 0.0,   # 0 = instant replay; >0 = wall-clock delay per candle
    ) -> Iterator[dict]:
        """
        Yield candles one at a time from a historical DataFrame.

        Each yielded item is a dict:
            { "timestamp", "open", "high", "low", "close", "volume" }

        Parameters
        ----------
        df           : DataFrame to replay (uses cached data if None)
        speed_factor : seconds to sleep between candles (use 0 for max-speed backtest)
        """
        from datetime import time as dtime
        import pytz

        IST = pytz.timezone("Asia/Kolkata")
        MARKET_OPEN  = dtime(9, 15)
        MARKET_CLOSE = dtime(15, 30)

        source_df = df if df is not None else self._cache
        if source_df is None:
            raise RuntimeError("No data loaded. Call fetch_historical() first.")

        for ts, row in source_df.iterrows():
            # FIX 16: filter candles to NSE market hours (skip for daily/weekly/monthly)
            if self.interval not in ("1d", "daily", "1wk", "1mo"):
                ts_ist = ts.astimezone(IST) if ts.tzinfo else ts
                if hasattr(ts_ist, 'time'):
                    t = ts_ist.time()
                    if t < MARKET_OPEN or t >= MARKET_CLOSE:
                        continue   # skip pre/post market candles

            candle = {
                "timestamp": ts,
                "open":      float(row["open"]),
                "high":      float(row["high"]),
                "low":       float(row["low"]),
                "close":     float(row["close"]),
                "volume":    float(row["volume"]),
            }
            yield candle
            if speed_factor > 0:
                time.sleep(speed_factor)

    # ------------------------------------------------------------------
    # Live stream (blocking loop – run in a thread for async use)
    # ------------------------------------------------------------------

    def start_live_stream(
        self,
        callback: Callable[[dict], None],
        interval_seconds: int = 300,   # 5-minute default
        max_ticks: Optional[int] = None,
    ) -> None:
        """
        Poll the NSE live quote every `interval_seconds` and call `callback`
        with each new quote dict.

        Runs until interrupted (Ctrl-C) or `max_ticks` is reached.
        """
        logger.info(
            "Starting live stream – polling every %ds (max_ticks=%s)",
            interval_seconds,
            max_ticks or "∞",
        )
        count = 0
        while True:
            quote = self.get_latest_quote()
            if quote:
                callback(quote)
                count += 1
            if max_ticks and count >= max_ticks:
                break
            time.sleep(interval_seconds)
