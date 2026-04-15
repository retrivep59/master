#!/usr/bin/env python3
"""
dashboard.py — BankNifty Sentinel
===================================
Futuristic full-screen TUI dashboard for the BankNifty AI paper-trading engine.
Built with Textual + Rich for real-time monitoring.

Usage
-----
    python dashboard.py --demo               # Synthetic GARCH data, no internet needed
    python dashboard.py --demo --speed 5     # 5× faster candle replay
    python dashboard.py --capital 500000     # Live mode (real Yahoo Finance data)
    python dashboard.py --backtest --days 30 # Replay 30 days of data in TUI
"""
from __future__ import annotations

import argparse
import math
import os
import random
import sys
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, time as dtime, timedelta
from typing import Optional

import pytz

IST = pytz.timezone("Asia/Kolkata")
sys.path.insert(0, os.path.dirname(__file__))

from rich.text import Text
from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.reactive import reactive
from textual.widgets import DataTable, Footer, Static

try:
    import config as cfg
    from broker.paper_broker import PaperBroker
    from agent.trading_agent import BankNiftyAgent, AgentConfig
    HAS_TRADING = True
except ImportError:
    HAS_TRADING = False

# ══════════════════════════════════════════════════════════════════════════
# Shared state — written by background worker, read by UI every second
# ══════════════════════════════════════════════════════════════════════════

@dataclass
class TState:
    price:       float = 49_000.0
    price_open:  float = 49_000.0
    price_high:  float = 49_000.0
    price_low:   float = 49_000.0
    history:     deque = field(default_factory=lambda: deque([49_000.0]*60, maxlen=90))

    balance:     float = 500_000.0
    start_bal:   float = 500_000.0
    total_pnl:   float = 0.0
    unrealised:  float = 0.0
    max_dd:      float = 0.0
    max_dd_pct:  float = 0.0
    total_fees:  float = 0.0
    trades_today: int  = 0
    pnl_today:   float = 0.0

    signal:      str   = "HOLD"
    sig_entry:   float = 0.0
    sig_lots:    int   = 1
    sig_reason:  str   = "Warming up indicators…"
    sig_ts:      str   = "--:--"

    rsi:         float = 50.0
    macd_hist:   float = 0.0
    ema_fast:    float = 49_000.0
    ema_slow:    float = 49_000.0
    bb_upper:    float = 50_000.0
    bb_lower:    float = 48_000.0

    total_trades: int  = 0
    winners:     int   = 0
    losers:      int   = 0
    avg_win:     float = 0.0
    avg_loss:    float = 0.0

    in_pos:      bool  = False
    pos_side:    str   = ""
    pos_entry:   float = 0.0
    pos_lots:    int   = 0

    trades:      list  = field(default_factory=list)
    candles:     int   = 0
    mode:        str   = "DEMO"
    mkt_status:  str   = "DEMO"
    warmup_done: bool  = False
    running:     bool  = True
    status_msg:  str   = "Initialising…"


STATE = TState()
_TRADE_ROWS_RENDERED = 0  # tracks how many rows the DataTable already has


# ══════════════════════════════════════════════════════════════════════════
# Rendering helpers
# ══════════════════════════════════════════════════════════════════════════

_SPARK = "▁▂▃▄▅▆▇█"

def _spark(data: deque, width: int = 42) -> list[tuple[str, str]]:
    """Return list of (char, style) for a coloured sparkline."""
    pts = list(data)[-width:]
    if len(pts) < 2:
        return [("─", "dim white")] * len(pts)
    lo, hi = min(pts), max(pts)
    rng = hi - lo or 1
    result = []
    for i, v in enumerate(pts):
        idx = int((v - lo) / rng * (len(_SPARK) - 1))
        ch = _SPARK[idx]
        style = "bright_green" if i == 0 or v >= pts[i-1] else "bright_red"
        result.append((ch, style))
    return result


def _bar(val: float, lo: float, hi: float, w: int = 18,
         fill: str = "█", empty: str = "░") -> str:
    pct = max(0.0, min(1.0, (val - lo) / max(hi - lo, 1e-9)))
    f = int(pct * w)
    return fill * f + empty * (w - f)


def _pnl_style(v: float) -> str:
    return "bold bright_green" if v > 0 else ("bold bright_red" if v < 0 else "dim white")


def _fmt(v: float) -> str:
    sign = "+" if v >= 0 else ""
    return f"{sign}₹{v:,.0f}"


def _now_ist() -> str:
    return datetime.now(IST).strftime("%H:%M:%S")


def _mkt_status() -> str:
    t = datetime.now(IST).time()
    if dtime(9, 15) <= t < dtime(15, 30):
        return "OPEN"
    if dtime(9, 0) <= t < dtime(9, 15):
        return "PRE-OPEN"
    return "CLOSED"


# ══════════════════════════════════════════════════════════════════════════
# Textual widgets
# ══════════════════════════════════════════════════════════════════════════

class HeaderBar(Static):
    def render(self) -> Text:
        t = Text(no_wrap=True)
        t.append("  ⬡ ", "bold #00c8ff")
        t.append("BANKNIFTY SENTINEL", "bold #e8f4ff")
        t.append("  │  ", "dim #0d3050")
        t.append(f"⏱ {_now_ist()} IST", "#4a6a88")
        t.append("  │  ", "dim #0d3050")
        st = STATE.mkt_status
        if st == "OPEN":
            t.append("◉ MARKET OPEN", "bold #00e676")
        elif st == "PRE-OPEN":
            t.append("◐ PRE-OPEN", "bold #ffcc00")
        elif "DEMO" in st or "BT" in st:
            t.append(f"◈ {st}", "bold #00c8ff")
        else:
            t.append(f"○ {st}", "dim #ff6688")
        t.append("  │  ", "dim #0d3050")
        t.append(f"▣ {STATE.mode}", "bold #0099dd")
        t.append("  │  ", "dim #0d3050")
        t.append(f"◈ {STATE.candles:,} candles", "dim #3a5a70")
        t.append("  │  ", "dim #0d3050")
        t.append(STATE.status_msg[:52], "dim #4a6a80")
        return t


class PricePanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        chg = s.price - s.price_open
        pct = chg / max(s.price_open, 1) * 100
        arrow = "▲" if chg >= 0 else "▼"
        chg_st = "#00e676" if chg >= 0 else "#ff1744"

        t.append("━━━━ LIVE PRICE " + "━" * 24 + "\n", "#0d3050")
        t.append("\n")
        t.append(f"   ₹  {s.price:>12,.2f}\n", "bold #e8f4ff")
        t.append(f"   {arrow}  {chg:+,.1f}   ({pct:+.2f}%)\n", f"bold {chg_st}")
        t.append("\n")

        spark = _spark(s.history, width=38)
        t.append("  ")
        for ch, sty in spark:
            t.append(ch, sty)
        t.append("\n\n")

        t.append(f"  H ₹{s.price_high:>9,.1f}   L ₹{s.price_low:>9,.1f}\n", "dim #3a5a70")
        t.append("─" * 40 + "\n", "dim #0d3050")

        if s.in_pos:
            unr = (s.price - s.pos_entry) * abs(s.pos_lots) * 15 * (1 if s.pos_side == "LONG" else -1)
            side_st = "#00e676" if s.pos_side == "LONG" else "#ff1744"
            t.append(f"  {'▲' if s.pos_side == 'LONG' else '▼'} {s.pos_side}  {s.pos_lots}L  @₹{s.pos_entry:,.0f}", f"bold {side_st}")
            t.append(f"    {_fmt(unr)}\n", _pnl_style(unr))
        else:
            t.append("  ─  No open position\n", "dim #3a5a70")
        return t


class SignalPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("━━━━ AI SIGNAL " + "━" * 25 + "\n", "#0d3050")
        t.append("\n")

        sig = s.signal
        if sig == "BUY":
            box_st = "#00e676"
            arrow  = "▲"
        elif sig == "SELL":
            box_st = "#ff1744"
            arrow  = "▼"
        else:
            box_st = "#3a5a70"
            arrow  = "◈"

        t.append(f"  ┌{'─' * 36}┐\n", box_st)
        label = f"   {arrow}   {sig}"
        t.append(f"  │{label:<36}│\n", f"bold {box_st}")
        if sig in ("BUY", "SELL") and s.sig_entry > 0:
            sub = f"   Entry ₹{s.sig_entry:,.1f}  ·  {s.sig_lots} lot"
            t.append(f"  │{sub:<36}│\n", box_st)
        t.append(f"  └{'─' * 36}┘\n", box_st)
        t.append("\n")
        t.append(f"  {s.sig_reason[:38]}\n", "dim #4a6a80")
        t.append(f"  ⏱  {s.sig_ts}\n", "dim #3a5a70")
        return t


class AccountPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("━━━━ ACCOUNT " + "━" * 16 + "\n", "#0d3050")

        bal_pct = (s.balance / max(s.start_bal, 1) - 1) * 100
        bal_st  = "#00e676" if s.balance >= s.start_bal else "#ff1744"
        bal_arr = "▲" if s.balance >= s.start_bal else "▼"
        t.append(f"\n  {bal_arr} ₹{s.balance:>11,.0f}", f"bold {bal_st}")
        t.append(f"   {bal_pct:+.2f}%\n", bal_st)
        t.append("─" * 29 + "\n", "dim #0d3050")

        total = s.total_pnl + s.unrealised
        for lbl, val in [("Realised  ", s.total_pnl),
                          ("Unrealised", s.unrealised),
                          ("Total P&L ", total)]:
            arr = "▲" if val >= 0 else "▼"
            t.append(f"  {lbl}  {arr} ", _pnl_style(val))
            t.append(f"{_fmt(val)}\n", _pnl_style(val))

        t.append(f"\n  Fees paid    ₹{s.total_fees:>8,.0f}\n", "dim #ff6644")
        t.append("─" * 29 + "\n", "dim #0d3050")

        dd    = s.max_dd_pct
        dd_st = "#ff1744" if dd > 10 else ("#ffcc00" if dd > 5 else "#00e676")
        t.append("  Max Drawdown\n", "dim #3a5a70")
        t.append(f"  [{_bar(dd, 0, 20, w=18)}] {dd:.1f}%\n", dd_st)
        return t


class TodayPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("━━━━ SESSION " + "━" * 16 + "\n", "#0d3050")
        t.append("\n")
        t.append("  Today P&L   ", "dim #3a5a70")
        t.append(f"{_fmt(s.pnl_today)}\n", _pnl_style(s.pnl_today))
        t.append(f"  Trades       {s.trades_today:>8}\n", "#b0c8e0")
        t.append("─" * 29 + "\n", "dim #0d3050")
        t.append(f"  All-time     {s.total_trades:>8}\n", "dim #3a5a70")
        t.append(f"  Candles      {s.candles:>8,}\n", "dim #3a5a70")
        t.append(f"  Mode      {s.mode:>11}\n", "#0099dd")
        wup    = "✓ READY  " if s.warmup_done else "⟳ WARMING"
        wup_st = "#00e676" if s.warmup_done else "#ffcc00"
        t.append(f"  Status    {wup:>11}\n", wup_st)
        return t


class IndicatorsPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("━━━━ INDICATORS " + "━" * 13 + "\n", "#0d3050")

        rsi = s.rsi
        if rsi >= 70:
            rsi_st, rsi_lbl = "#ff1744", "OVERBOUGHT"
        elif rsi <= 30:
            rsi_st, rsi_lbl = "#00e676", "OVERSOLD  "
        elif rsi >= 55:
            rsi_st, rsi_lbl = "#00c8ff", "BULLISH   "
        elif rsi <= 45:
            rsi_st, rsi_lbl = "#ff9900", "BEARISH   "
        else:
            rsi_st, rsi_lbl = "#4a6a88", "NEUTRAL   "
        t.append(f"\n  RSI  ", "dim #3a5a70")
        t.append(f"{rsi:5.1f}  ", f"bold {rsi_st}")
        t.append(f"{rsi_lbl}\n", rsi_st)
        t.append(f"  [{_bar(rsi, 0, 100, w=20)}]\n\n", rsi_st)

        mh    = s.macd_hist
        mh_st = "#00e676" if mh >= 0 else "#ff1744"
        t.append("  MACD Hist   ", "dim #3a5a70")
        t.append(f"{'▲' if mh >= 0 else '▼'} {mh:+.2f}\n\n", f"bold {mh_st}")

        ef, es  = s.ema_fast, s.ema_slow
        ema_st  = "#00e676" if ef > es else "#ff1744"
        ema_lbl = "▲ BULLISH" if ef > es else "▼ BEARISH"
        t.append(f"  EMA-F  ₹{ef:>9,.0f}\n", "#b0c8e0")
        t.append(f"  EMA-S  ₹{es:>9,.0f}\n", "dim #3a5a70")
        t.append(f"  Cross   {ema_lbl:>10}\n\n", f"bold {ema_st}")

        bw     = max(s.bb_upper - s.bb_lower, 1)
        bb_pos = (s.price - s.bb_lower) / bw * 100
        t.append(f"  BB  ₹{s.bb_lower:,.0f} ─── ₹{s.bb_upper:,.0f}\n", "dim #3a5a70")
        t.append(f"  [{_bar(bb_pos, 0, 100, w=20)}] {bb_pos:.0f}%\n", "#00c8ff")
        return t


class StatsPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("━━━━ PERFORMANCE " + "━" * 12 + "\n", "#0d3050")
        t.append("\n")

        total = s.winners + s.losers
        wr    = s.winners / max(total, 1) * 100
        wr_st = "#00e676" if wr >= 55 else ("#ffcc00" if wr >= 45 else "#ff1744")
        t.append("  Win Rate\n", "dim #3a5a70")
        t.append(f"  [{_bar(wr, 0, 100, w=18, fill='▓', empty='░')}] {wr:.0f}%\n", wr_st)
        t.append(f"  {s.winners}W  /  {s.losers}L\n\n", "dim #3a5a70")

        t.append("  Avg Win    ", "dim #3a5a70")
        t.append(f"{_fmt(s.avg_win)}\n", "#00e676")
        t.append("  Avg Loss   ", "dim #3a5a70")
        t.append(f"{_fmt(s.avg_loss)}\n", "#ff1744")

        pf    = abs(s.avg_win * s.winners) / max(abs(s.avg_loss * s.losers), 0.01)
        pf_st = "#00e676" if pf >= 1.5 else ("#ffcc00" if pf >= 1.0 else "#ff1744")
        t.append(f"\n  P-Factor    ", "dim #3a5a70")
        t.append(f"{pf:.2f}×\n", f"bold {pf_st}")

        rr    = abs(s.avg_win / s.avg_loss) if s.avg_loss != 0 else 0.0
        rr_st = "#00e676" if rr >= 1.5 else ("#ffcc00" if rr >= 1.0 else "#ff1744")
        t.append("  Risk/Rew    ", "dim #3a5a70")
        t.append(f"{rr:.2f}×\n", rr_st)
        return t


class TradeLogPanel(Static):
    def render(self) -> Text:
        t = Text()
        t.append("━━━━ TRADE LOG " + "━" * 64, "#0d3050")
        return t


# ══════════════════════════════════════════════════════════════════════════
# Main App
# ══════════════════════════════════════════════════════════════════════════

class BankNiftySentinel(App):
    TITLE = "BankNifty Sentinel"

    CSS = """
    Screen {
        background: #040810;
        color: #b0c8e0;
    }
    HeaderBar {
        dock: top;
        height: 1;
        background: #07111e;
        padding: 0 1;
    }
    Footer {
        dock: bottom;
        background: #07111e;
    }
    #body {
        height: 1fr;
    }
    #left-col {
        width: 32;
    }
    #center-col {
        width: 1fr;
    }
    #right-col {
        width: 32;
    }
    AccountPanel {
        height: 3fr;
        border: tall #0d2d4a;
        background: #060c14;
        padding: 0 1;
    }
    TodayPanel {
        height: 2fr;
        border: tall #0d2d4a;
        background: #060c14;
        padding: 0 1;
    }
    PricePanel {
        height: 3fr;
        border: tall #0d2d4a;
        background: #060c14;
        padding: 0 1;
    }
    SignalPanel {
        height: 2fr;
        border: tall #0d2d4a;
        background: #060c14;
        padding: 0 1;
    }
    IndicatorsPanel {
        height: 3fr;
        border: tall #0d2d4a;
        background: #060c14;
        padding: 0 1;
    }
    StatsPanel {
        height: 2fr;
        border: tall #0d2d4a;
        background: #060c14;
        padding: 0 1;
    }
    #log-section {
        dock: bottom;
        height: 12;
        border: tall #0d2d4a;
        background: #060c14;
    }
    TradeLogPanel {
        height: 1;
        padding: 0 1;
        background: #08111e;
    }
    DataTable {
        height: 1fr;
        background: #060c14;
    }
    DataTable > .datatable--header {
        background: #0a1e35;
        color: #00c8ff;
        text-style: bold;
    }
    DataTable > .datatable--cursor {
        background: #0f2840;
    }
    DataTable > .datatable--even-row {
        background: #07101a;
    }
    """

    def compose(self) -> ComposeResult:
        yield HeaderBar()
        with Horizontal(id="body"):
            with Vertical(id="left-col"):
                yield AccountPanel()
                yield TodayPanel()
            with Vertical(id="center-col"):
                yield PricePanel()
                yield SignalPanel()
            with Vertical(id="right-col"):
                yield IndicatorsPanel()
                yield StatsPanel()
        with Container(id="log-section"):
            yield TradeLogPanel()
            yield DataTable(id="trade-table", zebra_stripes=True, cursor_type="row")
        yield Footer()

    def on_mount(self) -> None:
        tbl = self.query_one("#trade-table", DataTable)
        tbl.add_columns(
            Text("  TIME", style="bold cyan"),
            Text("SIDE", style="bold cyan"),
            Text("     ENTRY", style="bold cyan"),
            Text("      EXIT", style="bold cyan"),
            Text("     GROSS", style="bold cyan"),
            Text("  FEES", style="bold cyan"),
            Text("    NET P&L", style="bold cyan"),
        )
        self.set_interval(1.0, self._tick)

    def _tick(self) -> None:
        global _TRADE_ROWS_RENDERED
        STATE.mkt_status = _mkt_status() if STATE.mode in ("LIVE", "BACKTEST", "SCALP-LIVE", "SCALP-BT") else STATE.mode

        for w in (HeaderBar, PricePanel, SignalPanel,
                  AccountPanel, TodayPanel, IndicatorsPanel, StatsPanel):
            self.query_one(w).refresh()

        tbl = self.query_one("#trade-table", DataTable)
        trades = STATE.trades
        if len(trades) > _TRADE_ROWS_RENDERED:
            for trade in trades[_TRADE_ROWS_RENDERED:]:
                net = trade.get("net_pnl", 0.0)
                gross = trade.get("gross_pnl", 0.0)
                side = trade.get("side", "")
                side_txt = Text(f" {'▲' if side == 'LONG' else '▼'} {side}",
                                style="bold #00e676" if side == "LONG" else "bold #ff1744")
                net_txt = Text(
                    f" {'▲' if net >= 0 else '▼'} {_fmt(net)}",
                    style="bold #00e676" if net >= 0 else "bold #ff1744",
                )
                gross_txt = Text(f" {_fmt(gross)}",
                                 style="#00e676" if gross >= 0 else "#ff1744")
                tbl.add_row(
                    f"  {trade.get('time','--:--')}",
                    side_txt,
                    f" ₹{trade.get('entry', 0):>9,.1f}",
                    f" ₹{trade.get('exit',  0):>9,.1f}",
                    gross_txt,
                    f" ₹{trade.get('fees', 0):>5,.0f}",
                    net_txt,
                )
                _TRADE_ROWS_RENDERED += 1
            tbl.move_cursor(row=tbl.row_count - 1)

    def on_key(self, event) -> None:
        if event.key == "q":
            STATE.running = False
            self.exit()



# ══════════════════════════════════════════════════════════════════════════
# Background worker — Demo mode (synthetic GARCH-lite candles + live agent)
# ══════════════════════════════════════════════════════════════════════════

def _run_demo(capital: float, speed: float, instrument_key: str = "FUTURES",
              scalp: bool = False) -> None:
    """Generate synthetic BankNifty candles and run the real trading engine."""
    import time as _time

    if not HAS_TRADING:
        _run_demo_simple(capital, speed)
        return

    inst_map = {
        "FUTURES": cfg.INSTRUMENT_FUTURES,
        "CE":      cfg.INSTRUMENT_CALL,
        "PE":      cfg.INSTRUMENT_PUT,
    }
    instrument = inst_map.get(instrument_key, cfg.INSTRUMENT_FUTURES)
    symbol = f"BANKNIFTY-{instrument_key}"

    broker, agent = _make_broker_agent(capital, symbol, instrument, scalp=scalp)

    STATE.mode = "SCALP-DEMO" if scalp else "DEMO"
    STATE.start_bal = capital
    STATE.mkt_status = "DEMO"

    # Seed price state
    price = 49_000.0 + random.uniform(-300, 300)
    day_open = price
    price_high = price
    price_low = price
    candle_in_day = 0

    # GARCH-lite state
    omega, alpha, beta = 2.5e-8, 0.08, 0.88
    h = omega / (1 - alpha - beta)
    mu = 2e-5

    # Indicator state (mirrored for display)
    ema9_d, ema21_d = price, price
    a9, a21 = 2/10, 2/22
    rsi_gains: deque = deque([0.3]*14, maxlen=14)
    rsi_losses: deque = deque([0.3]*14, maxlen=14)
    prices_window: deque = deque([price]*25, maxlen=25)

    candle_idx = 0

    while STATE.running:
        # ── Generate candle ────────────────────────────────────────────
        eps = random.gauss(0, 1)
        r = mu + math.sqrt(min(h, 1e-5)) * eps
        # Poisson jump (λ ≈ 2/month ≈ 2/1500 candles)
        if random.random() < 2/1500:
            r += random.gauss(0, 0.008)
        r = max(-0.03, min(0.03, r))
        h = omega + alpha * eps**2 * h + beta * h
        h = min(h, 1e-5)

        o = price
        c = price * math.exp(r)
        hi = max(o, c) * (1 + abs(random.gauss(0, 0.0005)))
        lo = min(o, c) * (1 - abs(random.gauss(0, 0.0005)))

        # Simulated IST timestamp (75 candles per day × 5 min)
        day_num   = candle_idx // 75
        candle_in_day = candle_idx % 75
        fake_ts   = datetime(2026, 2, 3, 9, 15, 0, tzinfo=IST) + \
                    timedelta(days=day_num, minutes=candle_in_day * 5)

        candle = {"timestamp": fake_ts, "open": o, "high": hi, "low": lo,
                  "close": c, "volume": random.randint(500, 1800)}

        # Day reset
        if candle_in_day == 0 and candle_idx > 0:
            day_open = c
            price_high = c
            price_low = c
        price_high = max(price_high, hi)
        price_low  = min(price_low,  lo)

        # ── Feed to real trading engine ─────────────────────────────────
        broker.update_market_price(symbol, instrument, c, candle_ts=fake_ts)
        broker.process_pending_orders()
        signal = agent.on_candle(candle, broker)

        order = None
        if signal.action in ("BUY", "SELL"):
            order = broker.place_order(
                symbol=symbol, instrument=instrument,
                action=signal.action, order_type="MARKET",
                lots=signal.lots, timestamp=fake_ts,
            )
            if order and order.status == "FILLED":
                if hasattr(agent, "sync_state_from_broker"):
                    agent.sync_state_from_broker(broker)

        # ── Compute display indicators ──────────────────────────────────
        chg = c - o
        rsi_gains.append(max(chg, 0))
        rsi_losses.append(max(-chg, 0))
        ag = sum(rsi_gains) / 14
        al = sum(rsi_losses) / 14
        rs = ag / max(al, 1e-9)
        rsi_val = 100 - 100 / (1 + rs)

        ema9_d  = ema9_d  + a9  * (c - ema9_d)
        ema21_d = ema21_d + a21 * (c - ema21_d)
        macd_h  = (ema9_d - ema21_d) / max(price, 1) * 1000

        prices_window.append(c)
        pw = list(prices_window)
        std_bb = math.sqrt(sum((x - c)**2 for x in pw) / len(pw))
        bb_up = c + 2 * std_bb
        bb_lo = c - 2 * std_bb

        # ── Pull broker summary ─────────────────────────────────────────
        summ = broker.get_account_summary()
        open_pos = broker.get_open_positions()
        hist_trades = broker.get_trade_history()

        # Position info
        my_pos = [p for p in open_pos if p["symbol"] == symbol]
        in_pos = bool(my_pos)
        pos_side = ("LONG" if my_pos[0]["lots"] > 0 else "SHORT") if in_pos else ""
        pos_entry = my_pos[0]["avg_price"] if in_pos else 0.0
        pos_lots  = abs(my_pos[0]["lots"])  if in_pos else 0

        # Unrealised
        unr = 0.0
        if in_pos:
            sign = 1 if pos_side == "LONG" else -1
            unr = (c - pos_entry) * pos_lots * broker.lot_size * sign

        # Drawdown
        equity = summ["balance"] + unr
        dd_abs = max(capital - equity, 0.0)
        dd_pct = dd_abs / max(capital, 1) * 100
        STATE.max_dd     = max(STATE.max_dd, dd_abs)
        STATE.max_dd_pct = max(STATE.max_dd_pct, dd_pct)

        # Wins/losses from history
        wins  = [t for t in hist_trades if t["net_pnl"] > 0]
        losses_t = [t for t in hist_trades if t["net_pnl"] <= 0]
        avg_w = sum(t["net_pnl"] for t in wins)    / max(len(wins),     1)
        avg_l = sum(t["net_pnl"] for t in losses_t) / max(len(losses_t), 1)

        # Sync new trades to STATE.trades
        if len(hist_trades) > len(STATE.trades):
            for tr in hist_trades[len(STATE.trades):]:
                et = tr["exit_time"][:16] if isinstance(tr["exit_time"], str) else str(tr["exit_time"])[:16]
                STATE.trades.append({
                    "time":      et[11:16],
                    "side":      "LONG"  if tr["action"] == "BUY" else "SHORT",
                    "entry":     tr["entry"],
                    "exit":      tr["exit"],
                    "gross_pnl": tr["gross_pnl"],
                    "fees":      tr["exit_fees"],
                    "net_pnl":   tr["net_pnl"],
                })

        # ── Write STATE ─────────────────────────────────────────────────
        STATE.price      = c
        STATE.price_open = day_open
        STATE.price_high = price_high
        STATE.price_low  = price_low
        STATE.history.append(c)
        STATE.balance      = summ["balance"]
        STATE.total_pnl    = summ["total_pnl"]
        STATE.unrealised   = unr
        STATE.total_fees   = summ["total_fees_paid"]
        STATE.trades_today = summ["trades_today"]
        STATE.pnl_today    = summ.get("realised_pnl_today", summ["total_pnl"])
        STATE.total_trades = summ["total_trades"]
        STATE.signal       = signal.action if signal.action != "SELL" or not in_pos else "HOLD"
        STATE.sig_reason   = signal.reason or "—"
        STATE.sig_lots     = signal.lots
        STATE.sig_ts       = fake_ts.strftime("%H:%M")
        if signal.action in ("BUY", "SELL") and order and order.status == "FILLED":
            STATE.sig_entry = order.fill_price
            STATE.sig_ts    = fake_ts.strftime("%H:%M")
        STATE.rsi        = rsi_val
        STATE.macd_hist  = macd_h
        STATE.ema_fast   = ema9_d
        STATE.ema_slow   = ema21_d
        STATE.bb_upper   = bb_up
        STATE.bb_lower   = bb_lo
        STATE.in_pos     = in_pos
        STATE.pos_side   = pos_side
        STATE.pos_entry  = pos_entry
        STATE.pos_lots   = pos_lots
        STATE.winners    = len(wins)
        STATE.losers     = len(losses_t)
        STATE.avg_win    = avg_w
        STATE.avg_loss   = avg_l
        STATE.candles    = candle_idx + 1
        STATE.warmup_done = agent._candle_count >= agent.cfg.warmup_candles
        STATE.status_msg  = f"{'LIVE AGENT' if STATE.warmup_done else 'WARMING UP'} — q to quit"

        price = c
        candle_idx += 1
        _time.sleep(1.0 / max(speed, 0.1))


def _run_demo_simple(capital: float, speed: float) -> None:
    """Fallback demo without the trading engine (no config available)."""
    import time as _time
    STATE.mode = "DEMO"
    STATE.start_bal = capital
    STATE.balance = capital
    price = 49_000.0
    day_open = price

    h, omega, alpha, beta = 1.25e-6, 2.5e-8, 0.08, 0.88
    ema9, ema21 = price, price
    a9, a21 = 2/10, 2/22
    rg: deque = deque([0.3]*14, maxlen=14)
    rl: deque = deque([0.3]*14, maxlen=14)
    pw: deque = deque([price]*25, maxlen=25)
    balance = capital
    candle_idx = 0
    total_fees = 0.0
    realised = 0.0
    in_long = False
    entry_p = 0.0
    wins, losses_l = 0, 0
    win_sum, loss_sum = 0.0, 0.0

    while STATE.running:
        eps = random.gauss(0, 1)
        r = 2e-5 + math.sqrt(min(h, 1e-5)) * eps
        r = max(-0.03, min(0.03, r))
        h = min(omega + alpha * eps**2 * h + beta * h, 1e-5)

        o = price
        c = price * math.exp(r)
        hi = max(o, c) * (1 + abs(random.gauss(0, 0.0005)))
        lo = min(o, c) * (1 - abs(random.gauss(0, 0.0005)))

        chg = c - o
        rg.append(max(chg, 0))
        rl.append(max(-chg, 0))
        ag = sum(rg) / 14
        al_v = sum(rl) / 14
        rsi_val = 100 - 100 / (1 + ag / max(al_v, 1e-9))
        ema9  = ema9  + a9  * (c - ema9)
        ema21 = ema21 + a21 * (c - ema21)
        macd_h = (ema9 - ema21) / max(price, 1) * 1000
        pw.append(c)
        pwl = list(pw)
        std_bb = math.sqrt(sum((x - c)**2 for x in pwl) / len(pwl))

        if candle_idx % 75 == 0 and candle_idx > 0:
            day_open = c
        price_high = max(STATE.price_high, hi) if candle_idx > 0 else hi
        price_low  = min(STATE.price_low,  lo) if candle_idx > 0 else lo

        signal = "HOLD"
        fees = 0.0
        if candle_idx >= 20:
            if ema9 > ema21 and rsi_val < 65 and not in_long:
                signal = "BUY"
                in_long = True
                entry_p = c * 1.0001
                fees = max(entry_p * 15 * 0.0006, 100)
                balance -= fees
                total_fees += fees
                STATE.sig_entry = entry_p
                STATE.sig_ts = datetime.now(IST).strftime("%H:%M")
            elif (ema9 < ema21 or rsi_val > 72) and in_long:
                signal = "SELL"
                exit_p = c * 0.9999
                fees = max(exit_p * 15 * 0.0006, 100)
                gross = (exit_p - entry_p) * 15
                net = gross - fees
                balance += gross - fees
                realised += net
                total_fees += fees
                in_long = False
                if net > 0:
                    wins += 1; win_sum += net
                else:
                    losses_l += 1; loss_sum += net
                et = datetime.now(IST).strftime("%H:%M")
                STATE.trades.append({"time": et, "side": "LONG",
                                     "entry": entry_p, "exit": exit_p,
                                     "gross_pnl": gross, "fees": fees, "net_pnl": net})
                STATE.sig_ts = et

        unr = (c - entry_p) * 15 if in_long else 0.0
        equity = balance + unr
        dd_pct = max(capital - equity, 0) / max(capital, 1) * 100
        STATE.max_dd_pct = max(STATE.max_dd_pct, dd_pct)

        STATE.price = c; STATE.price_open = day_open
        STATE.price_high = price_high; STATE.price_low = price_low
        STATE.history.append(c)
        STATE.balance = balance; STATE.total_pnl = realised
        STATE.unrealised = unr; STATE.total_fees = total_fees
        STATE.trades_today = wins + losses_l; STATE.pnl_today = realised
        STATE.total_trades = wins + losses_l
        STATE.signal = signal if signal == "BUY" else "HOLD"
        STATE.sig_reason = "EMA crossover + RSI filter"
        STATE.rsi = rsi_val; STATE.macd_hist = macd_h
        STATE.ema_fast = ema9; STATE.ema_slow = ema21
        STATE.bb_upper = c + 2*std_bb; STATE.bb_lower = c - 2*std_bb
        STATE.in_pos = in_long; STATE.pos_side = "LONG" if in_long else ""
        STATE.pos_entry = entry_p if in_long else 0.0; STATE.pos_lots = 1 if in_long else 0
        STATE.winners = wins; STATE.losers = losses_l
        STATE.avg_win  = win_sum  / max(wins,      1)
        STATE.avg_loss = loss_sum / max(losses_l,  1)
        STATE.candles = candle_idx + 1; STATE.warmup_done = candle_idx >= 20
        STATE.status_msg = "DEMO (no trading engine) — q to quit"

        price = c
        candle_idx += 1
        _time.sleep(1.0 / max(speed, 0.1))


# ══════════════════════════════════════════════════════════════════════════
# Shared helper — push broker + candle results into STATE
# ══════════════════════════════════════════════════════════════════════════

class _IndicatorState:
    """Lightweight running indicator tracker shared across workers."""
    def __init__(self):
        self.ema9 = self.ema21 = 0.0
        self.a9, self.a21 = 2/10, 2/22
        self.rg: deque = deque([0.3]*14, maxlen=14)
        self.rl: deque = deque([0.3]*14, maxlen=14)
        self.pw: deque = deque(maxlen=25)

    def update(self, o: float, c: float) -> tuple:
        """Return (rsi, macd_hist, bb_upper, bb_lower)."""
        chg = c - o
        self.rg.append(max(chg, 0))
        self.rl.append(max(-chg, 0))
        ag = sum(self.rg) / 14
        al = sum(self.rl) / 14
        rsi = 100 - 100 / (1 + ag / max(al, 1e-9))
        if self.ema9 == 0:
            self.ema9 = self.ema21 = c
        else:
            self.ema9  = self.ema9  + self.a9  * (c - self.ema9)
            self.ema21 = self.ema21 + self.a21 * (c - self.ema21)
        macd_h = (self.ema9 - self.ema21) / max(c, 1) * 1000
        self.pw.append(c)
        pwl = list(self.pw)
        std = math.sqrt(sum((x - c)**2 for x in pwl) / max(len(pwl), 1))
        return rsi, macd_h, c + 2*std, c - 2*std


def _push_to_state(
    candle: dict, signal, order,
    broker, agent, ind: _IndicatorState,
    capital: float, symbol: str,
    day_open: float, price_high: float, price_low: float,
    candle_idx: int, status_msg: str,
) -> None:
    """Write everything from the broker/agent into the global STATE."""
    c  = candle["close"]
    o  = candle["open"]
    ts = candle["timestamp"]

    # Use agent.last_indicators — same values agent used for its decision
    last_ind = getattr(agent, 'last_indicators', {}) or {}
    rsi    = last_ind.get('rsi',       0.0)
    macd_h = last_ind.get('macd_hist', 0.0)
    bb_up  = last_ind.get('bb_upper',  c * 1.02)
    bb_lo  = last_ind.get('bb_lower',  c * 0.98)
    ema_f  = last_ind.get('ema_fast',  c)
    ema_s  = last_ind.get('ema_slow',  c)

    summ        = broker.get_account_summary()
    open_pos    = broker.get_open_positions()
    hist_trades = broker.get_trade_history()

    my_pos    = [p for p in open_pos if p["symbol"] == symbol]
    in_pos    = bool(my_pos)
    pos_side  = ("LONG" if my_pos[0]["lots"] > 0 else "SHORT") if in_pos else ""
    pos_entry = my_pos[0]["avg_price"] if in_pos else 0.0
    pos_lots  = abs(my_pos[0]["lots"])  if in_pos else 0
    unr = (c - pos_entry) * pos_lots * 15 * (1 if pos_side == "LONG" else -1) if in_pos else 0.0

    dd_pct = max(capital - (summ["balance"] + unr), 0) / max(capital, 1) * 100
    STATE.max_dd_pct = max(STATE.max_dd_pct, dd_pct)

    wins     = [t for t in hist_trades if t["net_pnl"] > 0]
    losses_t = [t for t in hist_trades if t["net_pnl"] <= 0]

    # Append newly closed trades
    if len(hist_trades) > len(STATE.trades):
        for tr in hist_trades[len(STATE.trades):]:
            et = tr["exit_time"][:16] if isinstance(tr["exit_time"], str) else str(tr["exit_time"])[:16]
            STATE.trades.append({
                "time":      et[11:16],
                "side":      "LONG" if tr["action"] == "BUY" else "SHORT",
                "entry":     tr["entry"],  "exit": tr["exit"],
                "gross_pnl": tr["gross_pnl"], "fees": tr["exit_fees"],
                "net_pnl":   tr["net_pnl"],
            })

    ts_str = ts.strftime("%H:%M") if hasattr(ts, "strftime") else str(ts)[11:16]

    STATE.price      = c;            STATE.price_open  = day_open
    STATE.price_high = price_high;   STATE.price_low   = price_low
    STATE.history.append(c)
    STATE.balance      = summ["balance"]
    STATE.total_pnl    = summ["total_pnl"]
    STATE.unrealised   = unr
    STATE.total_fees   = summ["total_fees_paid"]
    STATE.trades_today = summ["trades_today"]
    STATE.pnl_today    = summ.get("realised_pnl_today", summ["total_pnl"])
    STATE.total_trades = summ["total_trades"]
    STATE.signal       = signal.action
    STATE.sig_reason   = signal.reason or "—"
    STATE.sig_lots     = signal.lots
    STATE.sig_ts       = ts_str
    if signal.action in ("BUY", "SELL") and order and order.status == "FILLED":
        STATE.sig_entry = order.fill_price
    STATE.rsi       = rsi;   STATE.macd_hist = macd_h
    STATE.ema_fast  = ema_f; STATE.ema_slow  = ema_s
    STATE.bb_upper  = bb_up; STATE.bb_lower  = bb_lo
    STATE.in_pos    = in_pos;    STATE.pos_side  = pos_side
    STATE.pos_entry = pos_entry; STATE.pos_lots  = pos_lots
    STATE.winners   = len(wins); STATE.losers    = len(losses_t)
    STATE.avg_win   = sum(t["net_pnl"] for t in wins)     / max(len(wins),     1)
    STATE.avg_loss  = sum(t["net_pnl"] for t in losses_t) / max(len(losses_t), 1)
    STATE.candles   = candle_idx + 1
    STATE.warmup_done  = agent._candle_count >= agent.cfg.warmup_candles
    STATE.status_msg   = status_msg


def _make_broker_agent(capital: float, symbol: str, instrument: str, scalp: bool = False):
    broker = PaperBroker(starting_balance=capital, seed=42)
    if scalp:
        agent_cfg = AgentConfig(
            ema_fast=5, ema_slow=13, ema_trend=21,
            rsi_period=7, supertrend_period=5, supertrend_mult=2.0,
            macd_fast=5, macd_slow=13, macd_signal=5, atr_period=7,
            scalp_mode=True, profit_target_pts=25.0, hard_stop_pts=15.0,
            trailing_stop_pts=20.0, atr_trailing_multiplier=0.5,
            rsi_oversold=40.0, rsi_overbought=60.0,
            use_regime_filter=False, skip_open_candles=1, skip_close_candles=1,
            warmup_candles=20, max_lots=1, daily_stop_loss_pct=0.04,
            max_trades_per_day=20,
        )
    else:
        agent_cfg = AgentConfig(
            warmup_candles=60, max_lots=1,
            trailing_stop_pts=100.0,
            rsi_overbought=65.0, rsi_oversold=35.0,
            daily_stop_loss_pct=0.05,
        )
    agent = BankNiftyAgent(cfg=agent_cfg, symbol=symbol, instrument=instrument)
    return broker, agent


def _feed_candle(candle: dict, broker, agent, symbol: str, instrument: str):
    """Run one candle through the broker+agent; return (signal, order)."""
    ts = candle["timestamp"]
    c  = candle["close"]
    broker.update_market_price(symbol, instrument, c, candle_ts=ts)
    broker.process_pending_orders()
    signal = agent.on_candle(candle, broker)
    order = None
    if signal.action in ("BUY", "SELL"):
        order = broker.place_order(
            symbol=symbol, instrument=instrument,
            action=signal.action, order_type="MARKET",
            lots=signal.lots, timestamp=ts,
        )
        if order and order.status == "FILLED" and hasattr(agent, "sync_state_from_broker"):
            agent.sync_state_from_broker(broker)
    return signal, order


# ══════════════════════════════════════════════════════════════════════════
# Background worker — Backtest mode (replay historical data at speed)
# ══════════════════════════════════════════════════════════════════════════

def _run_backtest(capital: float, days: int, speed: float,
                  instrument_key: str = "FUTURES", scalp: bool = False) -> None:
    import time as _time
    if not HAS_TRADING:
        _run_demo(capital, speed, instrument_key, scalp=scalp); return
    try:
        from data.live_feed import LiveFeed
    except ImportError:
        _run_demo(capital, speed, instrument_key, scalp=scalp); return

    inst_map   = {"FUTURES": cfg.INSTRUMENT_FUTURES,
                  "CE": cfg.INSTRUMENT_CALL, "PE": cfg.INSTRUMENT_PUT}
    instrument = inst_map.get(instrument_key, cfg.INSTRUMENT_FUTURES)
    symbol     = f"BANKNIFTY-{instrument_key}"

    STATE.mode      = "SCALP-BT" if scalp else "BACKTEST"
    STATE.start_bal = capital
    STATE.status_msg = f"Fetching {days}-day history from Yahoo Finance…"

    try:
        feed    = LiveFeed(interval="5m")
        hist_df = feed.fetch_history(days=days)
    except Exception as exc:
        STATE.status_msg = f"Fetch failed ({exc.__class__.__name__}) — switching to DEMO"
        _run_demo(capital, speed, instrument_key, scalp=scalp); return

    broker, agent = _make_broker_agent(capital, symbol, instrument, scalp=scalp)
    ind = _IndicatorState()
    day_open = price_high = price_low = 0.0

    for idx, candle in enumerate(feed.iter_history(hist_df)):
        if not STATE.running:
            break
        ts = candle["timestamp"]
        if idx == 0 or candle["open"] != price_high:  # rough day-change detect
            if idx == 0:
                day_open = price_high = price_low = candle["open"]
        price_high = max(price_high, candle["high"])
        price_low  = min(price_low,  candle["low"]) if price_low > 0 else candle["low"]

        signal, order = _feed_candle(candle, broker, agent, symbol, instrument)
        wup = not STATE.warmup_done
        msg = (f"BACKTEST {ts.strftime('%d %b %H:%M')}  "
               f"{'⟳ warmup' if wup else '✓ trading'}  speed={speed}× — q to quit")
        _push_to_state(candle, signal, order, broker, agent, ind,
                       capital, symbol, day_open, price_high, price_low, idx, msg)
        _time.sleep(1.0 / max(speed, 0.1))

    STATE.status_msg = "Backtest complete — q to quit"


# ══════════════════════════════════════════════════════════════════════════
# Background worker — Live trading (warmup fast, then 60-s real-time poll)
# ══════════════════════════════════════════════════════════════════════════

def _run_live_trading(capital: float, instrument_key: str = "FUTURES",
                      warmup_days: int = 1, scalp: bool = False) -> None:
    """
    Proper live paper trading:
      1. Fetch 3 days of 5-min history → replay at 20× for fast warmup
      2. Poll Yahoo Finance every 60 s for the latest 1-min candle
      3. Feed each new candle to the real PaperBroker + BankNiftyAgent
    """
    import time as _time
    if not HAS_TRADING:
        STATE.status_msg = "Trading engine unavailable — switching to DEMO"
        _run_demo(capital, 2.0, instrument_key); return
    try:
        from data.live_feed import LiveFeed
    except ImportError:
        _run_demo(capital, 2.0, instrument_key); return

    inst_map   = {"FUTURES": cfg.INSTRUMENT_FUTURES,
                  "CE": cfg.INSTRUMENT_CALL, "PE": cfg.INSTRUMENT_PUT}
    instrument = inst_map.get(instrument_key, cfg.INSTRUMENT_FUTURES)
    symbol     = f"BANKNIFTY-{instrument_key}"

    STATE.mode      = "SCALP-LIVE" if scalp else "LIVE"
    STATE.start_bal = capital
    STATE.mkt_status = "OPEN"

    # ── Phase 1: fetch history for agent warmup ─────────────────────────
    STATE.status_msg = f"Fetching {warmup_days}-day history for warmup… (max 15 s)"
    try:
        feed_5m = LiveFeed(interval="5m")
        hist_df = feed_5m.fetch_history(days=warmup_days)
    except Exception as exc:
        STATE.status_msg = f"Yahoo Finance unreachable ({exc.__class__.__name__}) — switching to DEMO"
        _run_demo(capital, 2.0, instrument_key, scalp=scalp); return

    broker, agent = _make_broker_agent(capital, symbol, instrument, scalp=scalp)
    ind = _IndicatorState()
    day_open = price_high = price_low = 0.0

    # ── Phase 2: replay warmup at 20× speed ────────────────────────────
    STATE.status_msg = f"Warming up on {len(hist_df)} candles at 20× speed…"
    for idx, candle in enumerate(feed_5m.iter_history(hist_df)):
        if not STATE.running:
            return
        if idx == 0:
            day_open = price_high = candle["open"]
            price_low = candle["low"]
        price_high = max(price_high, candle["high"])
        price_low  = min(price_low,  candle["low"])
        signal, order = _feed_candle(candle, broker, agent, symbol, instrument)
        msg = (f"⟳ Warming up {idx+1}/{len(hist_df)} — "
               f"{'✓ ready' if agent._candle_count >= agent.cfg.warmup_candles else 'real trading starts after warmup'}")
        _push_to_state(candle, signal, order, broker, agent, ind,
                       capital, symbol, day_open, price_high, price_low, idx, msg)
        _time.sleep(0.05)   # 20× speed

    # ── Phase 3: live 60-second polling loop ───────────────────────────
    feed_1m    = LiveFeed(interval="1m")
    last_ts    = None
    candle_idx = len(hist_df)
    day_open   = price_high = price_low = 0.0

    STATE.status_msg = "✓ LIVE — polling Yahoo Finance every 60 s  (q to quit)"

    while STATE.running:
        now_ist = datetime.now(IST)
        t_now   = now_ist.time()

        # Market closed?
        if t_now < dtime(9, 15):
            STATE.mkt_status = "PRE-OPEN"
            opens_in = (datetime.combine(now_ist.date(), dtime(9, 15))
                        .replace(tzinfo=IST) - now_ist).seconds // 60
            STATE.status_msg = f"Pre-open — market opens in {opens_in} min"
            _time.sleep(30); continue

        if t_now >= dtime(15, 31):
            STATE.mkt_status = "CLOSED"
            STATE.status_msg = "Market closed (15:30 IST). Session complete — q to quit"
            break

        STATE.mkt_status = "OPEN"

        # Fetch latest 1-min candle from Yahoo Finance
        try:
            df_now = feed_1m.fetch_history(days=1)
            if df_now.empty:
                STATE.status_msg = "⚠ No data returned — retrying in 30 s"
                _time.sleep(30); continue

            latest_ts = df_now.index[-1]
            if last_ts is not None and latest_ts <= last_ts:
                # Same candle, nothing new yet — update price display only
                latest_close = float(df_now["close"].iloc[-1])
                STATE.price = latest_close
                STATE.status_msg = (f"✓ LIVE {latest_ts.strftime('%H:%M')}  "
                                    f"price ₹{latest_close:,.1f}  "
                                    f"next poll in ~60 s — q to quit")
                _time.sleep(30); continue

            last_ts = latest_ts
            row = df_now.iloc[-1]
            candle = {
                "timestamp": latest_ts,
                "open":   float(row["open"]),
                "high":   float(row["high"]),
                "low":    float(row["low"]),
                "close":  float(row["close"]),
                "volume": float(row.get("volume", 0)),
            }

            # Day tracking
            if candle_idx == 0 or latest_ts.date() != (last_ts - timedelta(minutes=1)).date():
                day_open  = candle["open"]
                price_high = candle["high"]
                price_low  = candle["low"]
            price_high = max(price_high, candle["high"])
            price_low  = min(price_low,  candle["low"])

            signal, order = _feed_candle(candle, broker, agent, symbol, instrument)
            msg = (f"✓ LIVE {latest_ts.strftime('%d %b %H:%M')}  "
                   f"BankNifty ₹{candle['close']:,.1f}  "
                   f"signal={signal.action} — q to quit")
            _push_to_state(candle, signal, order, broker, agent, ind,
                           capital, symbol, day_open, price_high, price_low,
                           candle_idx, msg)
            candle_idx += 1

        except Exception as exc:
            STATE.status_msg = f"⚠ Fetch error ({exc.__class__.__name__}) — retrying in 30 s"
            _time.sleep(30); continue

        # Wait ~60 s before next poll (check every 10 s so we can exit cleanly)
        for _ in range(6):
            if not STATE.running:
                break
            _time.sleep(10)

    STATE.status_msg = "Session ended — q to quit"


# ══════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(
        description="BankNifty Sentinel — Futuristic Live TUI Dashboard",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--demo",       action="store_true",
                        help="Synthetic GARCH data — starts instantly, no internet (DEFAULT)")
    parser.add_argument("--backtest",   action="store_true",
                        help="Replay real Yahoo Finance history at speed; falls back to demo")
    parser.add_argument("--live",       action="store_true",
                        help="REAL live paper trading: warmup on 3-day history then "
                             "poll Yahoo Finance every 60 s for fresh candles during "
                             "market hours (09:15–15:30 IST); falls back to demo if "
                             "network unavailable")
    parser.add_argument("--capital",    type=float, default=500_000,
                        help="Starting paper-trading capital in INR (default: 500000)")
    parser.add_argument("--instrument", default="FUTURES", choices=["FUTURES","CE","PE"])
    parser.add_argument("--days",       type=int,   default=5,
                        help="Days of history to replay in --backtest mode")
    parser.add_argument("--warmup",     type=int,   default=3,
                        help="Days of history to fetch for agent warmup in --live mode")
    parser.add_argument("--speed",      type=float, default=2.0,
                        help="Replay speed multiplier for --demo / --backtest (default: 2)")
    parser.add_argument("--scalp",      action="store_true",
                        help="Scalp mode: EMA 5/13, profit target +25pts, hard stop -15pts, up to 20 trades/day")
    args = parser.parse_args()

    STATE.start_bal = args.capital
    STATE.balance   = args.capital

    if args.live:
        target = _run_live_trading
        kwargs = dict(capital=args.capital, instrument_key=args.instrument,
                      warmup_days=args.warmup, scalp=args.scalp)
    elif args.backtest:
        target = _run_backtest
        kwargs = dict(capital=args.capital, days=args.days, speed=args.speed,
                      instrument_key=args.instrument, scalp=args.scalp)
    else:
        target = _run_demo
        kwargs = dict(capital=args.capital, speed=args.speed,
                      instrument_key=args.instrument, scalp=args.scalp)

    worker = threading.Thread(target=target, kwargs=kwargs, daemon=True)
    worker.start()

    app = BankNiftySentinel()
    app.run()


if __name__ == "__main__":
    main()
