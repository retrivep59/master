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
        t.append("  ◈ ", "bold cyan")
        t.append("BANKNIFTY SENTINEL", "bold bright_white")
        t.append(" ◈ ", "bold cyan")
        t.append(f"  {_now_ist()} IST  ", "dim white")

        st = STATE.mkt_status
        if st == "OPEN":
            t.append("● MARKET OPEN ", "bold bright_green")
        elif st == "PRE-OPEN":
            t.append("◐ PRE-OPEN ", "bold yellow")
        elif st == "DEMO":
            t.append("◈ DEMO ", "bold cyan")
        else:
            t.append("○ CLOSED ", "dim red")

        t.append(f" │ candles {STATE.candles:,}", "dim white")
        t.append(f"  │ {STATE.status_msg}", "dim cyan")
        return t


class PricePanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("◈ PRICE ACTION\n", "bold cyan")
        t.append("─" * 40 + "\n", "dim #1e3a5f")

        t.append(f"  ₹{s.price:>12,.2f}\n", "bold bright_white")

        chg = s.price - s.price_open
        pct = chg / max(s.price_open, 1) * 100
        arrow = "▲" if chg >= 0 else "▼"
        st = "bold bright_green" if chg >= 0 else "bold bright_red"
        t.append(f"  {arrow} {chg:+,.1f}  ({pct:+.2f}%)\n", st)
        t.append(f"  H ₹{s.price_high:,.1f}  ", "dim green")
        t.append(f"L ₹{s.price_low:,.1f}\n\n", "dim red")

        # Sparkline
        spark = _spark(s.history, width=40)
        t.append("  ")
        for ch, sty in spark:
            t.append(ch, sty)
        t.append("\n\n")

        # Open position
        if s.in_pos:
            unr = (s.price - s.pos_entry) * abs(s.pos_lots) * 15 * (1 if s.pos_side == "LONG" else -1)
            side_st = "bold bright_green" if s.pos_side == "LONG" else "bold bright_red"
            arrow2 = "▲" if s.pos_side == "LONG" else "▼"
            t.append(f"  {arrow2} {s.pos_side}  {s.pos_lots}L  @₹{s.pos_entry:,.0f}  ", side_st)
            t.append(f"unr {_fmt(unr)}", _pnl_style(unr))
        else:
            t.append("  ○ No open position", "dim white")
        return t


class SignalPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("◈ AI SIGNAL\n", "bold cyan")
        t.append("─" * 40 + "\n", "dim #1e3a5f")

        sig = s.signal
        if sig == "BUY":
            box_st, arrow = "bold bright_green", "▲"
        elif sig == "SELL":
            box_st, arrow = "bold bright_red", "▼"
        else:
            box_st, arrow = "bold bright_yellow", "◈"

        t.append("\n    ╔══════════════╗\n", "cyan")
        t.append(f"    ║  {arrow}  {sig:<7}  ║\n", box_st)
        t.append("    ╚══════════════╝\n", "cyan")

        if sig in ("BUY", "SELL") and s.sig_entry > 0:
            t.append(f"\n  Entry : ₹{s.sig_entry:,.1f}  Lots: {s.sig_lots}\n", "white")
        t.append(f"\n  {s.sig_reason[:38]}\n", "dim white")
        t.append(f"  Last update: {s.sig_ts}\n", "dim cyan")
        return t


class AccountPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("◈ ACCOUNT\n", "bold cyan")
        t.append("─" * 28 + "\n", "dim #1e3a5f")

        bal_pct = (s.balance / max(s.start_bal, 1) - 1) * 100
        bal_st = "bold bright_green" if s.balance >= s.start_bal else "bold bright_red"
        t.append(f"  ₹{s.balance:>13,.2f}\n", bal_st)
        t.append(f"  ({bal_pct:+.2f}% of start)\n\n", "dim white")

        t.append("  Realised    ", "dim white")
        t.append(f"{_fmt(s.total_pnl)}\n", _pnl_style(s.total_pnl))
        t.append("  Unrealised  ", "dim white")
        t.append(f"{_fmt(s.unrealised)}\n", _pnl_style(s.unrealised))
        total = s.total_pnl + s.unrealised
        t.append("  Total P&L   ", "dim white")
        t.append(f"{_fmt(total)}\n", _pnl_style(total))
        t.append(f"  Fees paid   ₹{s.total_fees:,.0f}\n\n", "dim red")

        dd = s.max_dd_pct
        dd_st = "bright_red" if dd > 10 else ("yellow" if dd > 5 else "bright_green")
        t.append("  Max Drawdown\n", "dim white")
        t.append(f"  [{_bar(dd, 0, 25, w=16)}] {dd:.1f}%\n", dd_st)
        return t


class TodayPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("◈ TODAY\n", "bold cyan")
        t.append("─" * 28 + "\n", "dim #1e3a5f")
        t.append(f"  Trades   {s.trades_today:>8}\n", "white")
        t.append("  P&L      ", "dim white")
        t.append(f"{_fmt(s.pnl_today)}\n", _pnl_style(s.pnl_today))
        t.append(f"\n  All-time  {s.total_trades:>8}\n", "white")
        t.append(f"  Candles  {s.candles:>9,}\n", "dim white")
        t.append(f"  Mode     {'  ' + s.mode:>9}\n", "cyan")
        wup = "✓ READY" if s.warmup_done else "⟳ WARMUP"
        t.append(f"  Status   {wup:>9}\n", "bright_green" if s.warmup_done else "yellow")
        return t


class IndicatorsPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("◈ INDICATORS\n", "bold cyan")
        t.append("─" * 28 + "\n", "dim #1e3a5f")

        # RSI
        rsi = s.rsi
        if rsi >= 70:
            rsi_st, rsi_lbl = "bright_red", "OVERBOUGHT"
        elif rsi <= 30:
            rsi_st, rsi_lbl = "bright_green", "OVERSOLD"
        else:
            rsi_st, rsi_lbl = "yellow", "NEUTRAL"
        t.append(f"  RSI  {rsi:5.1f}  {rsi_lbl}\n", "dim white")
        t.append(f"  [{_bar(rsi, 0, 100, w=18)}]\n\n", rsi_st)

        # MACD
        mh = s.macd_hist
        mh_st = "bright_green" if mh >= 0 else "bright_red"
        t.append("  MACD Hist  ", "dim white")
        t.append(f"{'▲' if mh >= 0 else '▼'} {mh:+.1f}\n\n", mh_st)

        # EMAs
        ef, es = s.ema_fast, s.ema_slow
        cross_st = "bright_green" if ef > es else "bright_red"
        cross_lbl = "BULLISH ▲" if ef > es else "BEARISH ▼"
        t.append(f"  EMA-fast  ₹{ef:>9,.0f}\n", "white")
        t.append(f"  EMA-slow  ₹{es:>9,.0f}\n", "dim white")
        t.append(f"  Cross     {cross_lbl:>9}\n\n", cross_st)

        # Bollinger Bands
        bw = max(s.bb_upper - s.bb_lower, 1)
        bb_pos = (s.price - s.bb_lower) / bw * 100
        t.append(f"  BB  ₹{s.bb_lower:,.0f} → ₹{s.bb_upper:,.0f}\n", "dim white")
        t.append(f"  [{_bar(bb_pos, 0, 100, w=18)}] {bb_pos:.0f}%\n", "cyan")
        return t


class StatsPanel(Static):
    def render(self) -> Text:
        s = STATE
        t = Text()
        t.append("◈ STATISTICS\n", "bold cyan")
        t.append("─" * 28 + "\n", "dim #1e3a5f")

        total = s.winners + s.losers
        wr = s.winners / max(total, 1) * 100
        wr_st = "bright_green" if wr >= 50 else "bright_red"
        t.append("  Win Rate\n", "dim white")
        t.append(f"  [{_bar(wr, 0, 100, w=16, fill='▓')}] {wr:.1f}%\n", wr_st)
        t.append(f"  {s.winners}W / {s.losers}L\n\n", "dim white")

        t.append("  Avg Win   ", "dim white")
        t.append(f"{_fmt(s.avg_win)}\n", "bright_green")
        t.append("  Avg Loss  ", "dim white")
        t.append(f"{_fmt(s.avg_loss)}\n", "bright_red")

        pf = abs(s.avg_win * s.winners) / max(abs(s.avg_loss * s.losers), 0.01)
        pf_st = "bright_green" if pf >= 1.0 else "bright_red"
        t.append(f"\n  Profit Factor  ", "dim white")
        t.append(f"{pf:.2f}×\n", pf_st)

        rr = abs(s.avg_win / s.avg_loss) if s.avg_loss != 0 else 0.0
        rr_st = "bright_green" if rr >= 1.0 else "yellow"
        t.append("  Risk/Reward   ", "dim white")
        t.append(f"{rr:.2f}×\n", rr_st)
        return t


class TradeLogPanel(Static):
    """Header row for the trade log section."""
    def render(self) -> Text:
        t = Text()
        t.append("◈ TRADE LOG", "bold cyan")
        return t


# ══════════════════════════════════════════════════════════════════════════
# Main App
# ══════════════════════════════════════════════════════════════════════════

class BankNiftySentinel(App):
    TITLE = "BankNifty Sentinel"

    CSS = """
    Screen {
        background: #080c14;
        color: #c8d0e0;
    }
    HeaderBar {
        dock: top;
        height: 1;
        background: #0a1020;
        padding: 0 1;
    }
    Footer {
        dock: bottom;
        background: #0a1020;
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
        border: round #1e3a5f;
        background: #0d1117;
        padding: 0 1;
    }
    TodayPanel {
        height: 2fr;
        border: round #1e3a5f;
        background: #0d1117;
        padding: 0 1;
    }
    PricePanel {
        height: 3fr;
        border: round #1e3a5f;
        background: #0d1117;
        padding: 0 1;
    }
    SignalPanel {
        height: 2fr;
        border: round #1e3a5f;
        background: #0d1117;
        padding: 0 1;
    }
    IndicatorsPanel {
        height: 3fr;
        border: round #1e3a5f;
        background: #0d1117;
        padding: 0 1;
    }
    StatsPanel {
        height: 2fr;
        border: round #1e3a5f;
        background: #0d1117;
        padding: 0 1;
    }
    #log-section {
        dock: bottom;
        height: 12;
        border: round #1e3a5f;
        background: #0d1117;
    }
    TradeLogPanel {
        height: 1;
        padding: 0 1;
        background: #0d1117;
    }
    DataTable {
        height: 1fr;
        background: #0d1117;
    }
    DataTable > .datatable--header {
        background: #0f1e35;
        color: #00d4ff;
        text-style: bold;
    }
    DataTable > .datatable--cursor {
        background: #1a2a4a;
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
        STATE.mkt_status = _mkt_status() if STATE.mode in ("LIVE", "BACKTEST") else "DEMO"

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
                                style="bold bright_green" if side == "LONG" else "bold bright_red")
                net_txt = Text(
                    f" {'▲' if net >= 0 else '▼'} {_fmt(net)}",
                    style="bold bright_green" if net >= 0 else "bold bright_red",
                )
                gross_txt = Text(f" {_fmt(gross)}",
                                 style="bright_green" if gross >= 0 else "bright_red")
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

def _run_demo(capital: float, speed: float, instrument_key: str = "FUTURES") -> None:
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

    broker = PaperBroker(starting_balance=capital, seed=42)
    agent = BankNiftyAgent(
        cfg=AgentConfig(
            warmup_candles=20,
            max_lots=1,
            trailing_stop_pts=50.0,
            daily_stop_loss_pct=0.02,
            rsi_oversold=30.0,
            rsi_overbought=70.0,
        ),
        symbol=symbol,
        instrument=instrument,
    )

    STATE.mode = "DEMO"
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
        STATE.warmup_done = agent._warmup_candle_count >= agent.cfg.warmup_candles
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
# Background worker — Backtest / Live mode using real Yahoo Finance data
# ══════════════════════════════════════════════════════════════════════════

def _run_live(capital: float, days: int, speed: float,
              instrument_key: str = "FUTURES", backtest: bool = False) -> None:
    import time as _time
    try:
        from data.live_feed import LiveFeed
    except ImportError:
        STATE.status_msg = "ERROR: live_feed not found"
        return

    if not HAS_TRADING:
        STATE.status_msg = "ERROR: trading engine not found"
        return

    inst_map = {"FUTURES": cfg.INSTRUMENT_FUTURES,
                "CE": cfg.INSTRUMENT_CALL, "PE": cfg.INSTRUMENT_PUT}
    instrument = inst_map.get(instrument_key, cfg.INSTRUMENT_FUTURES)
    symbol = f"BANKNIFTY-{instrument_key}"

    STATE.mode = "BACKTEST" if backtest else "LIVE"
    STATE.start_bal = capital
    STATE.mkt_status = "OPEN"
    STATE.status_msg = "Fetching data from Yahoo Finance…"

    try:
        feed = LiveFeed(interval="5m")
        hist_df = feed.fetch_history(days=days)
    except Exception as exc:
        STATE.status_msg = f"Data fetch failed: {exc}"
        return

    broker = PaperBroker(starting_balance=capital, seed=42)
    agent = BankNiftyAgent(
        cfg=AgentConfig(warmup_candles=20, max_lots=1, trailing_stop_pts=50.0,
                        daily_stop_loss_pct=0.02),
        symbol=symbol, instrument=instrument,
    )

    ema9_d, ema21_d = 0.0, 0.0
    a9, a21 = 2/10, 2/22
    rg: deque = deque([0.3]*14, maxlen=14)
    rl: deque = deque([0.3]*14, maxlen=14)
    pw: deque = deque(maxlen=25)
    candle_idx = 0
    day_open = 0.0
    price_high = 0.0
    price_low = 1e12

    for candle in feed.iter_history(hist_df):
        if not STATE.running:
            break

        ts = candle["timestamp"]
        c  = candle["close"]
        o  = candle["open"]
        hi = candle["high"]
        lo = candle["low"]

        if candle_idx == 0 or ts.date() != (ts - timedelta(minutes=5)).date():
            day_open   = o
            price_high = hi
            price_low  = lo
        price_high = max(price_high, hi)
        price_low  = min(price_low,  lo)

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

        # Display indicators
        chg = c - o
        rg.append(max(chg, 0)); rl.append(max(-chg, 0))
        ag = sum(rg) / 14; al_v = sum(rl) / 14
        rsi_val = 100 - 100 / (1 + ag / max(al_v, 1e-9))
        if ema9_d == 0:
            ema9_d = ema21_d = c
        else:
            ema9_d  = ema9_d  + a9  * (c - ema9_d)
            ema21_d = ema21_d + a21 * (c - ema21_d)
        pw.append(c)
        pwl = list(pw)
        std_bb = math.sqrt(sum((x - c)**2 for x in pwl) / max(len(pwl), 1))

        summ = broker.get_account_summary()
        open_pos = broker.get_open_positions()
        hist_trades = broker.get_trade_history()
        my_pos = [p for p in open_pos if p["symbol"] == symbol]
        in_pos = bool(my_pos)
        pos_side  = ("LONG" if my_pos[0]["lots"] > 0 else "SHORT") if in_pos else ""
        pos_entry = my_pos[0]["avg_price"] if in_pos else 0.0
        pos_lots  = abs(my_pos[0]["lots"])  if in_pos else 0
        unr = (c - pos_entry) * pos_lots * 15 * (1 if pos_side == "LONG" else -1) if in_pos else 0.0

        equity = summ["balance"] + unr
        dd_pct = max(capital - equity, 0) / max(capital, 1) * 100
        STATE.max_dd_pct = max(STATE.max_dd_pct, dd_pct)

        wins     = [t for t in hist_trades if t["net_pnl"] > 0]
        losses_t = [t for t in hist_trades if t["net_pnl"] <= 0]
        avg_w    = sum(t["net_pnl"] for t in wins)     / max(len(wins),     1)
        avg_l    = sum(t["net_pnl"] for t in losses_t) / max(len(losses_t), 1)

        if len(hist_trades) > len(STATE.trades):
            for tr in hist_trades[len(STATE.trades):]:
                et = tr["exit_time"][:16] if isinstance(tr["exit_time"], str) else str(tr["exit_time"])[:16]
                STATE.trades.append({
                    "time":      et[11:16],
                    "side":      "LONG" if tr["action"] == "BUY" else "SHORT",
                    "entry":     tr["entry"], "exit": tr["exit"],
                    "gross_pnl": tr["gross_pnl"], "fees": tr["exit_fees"],
                    "net_pnl":   tr["net_pnl"],
                })

        STATE.price = c; STATE.price_open = day_open
        STATE.price_high = price_high; STATE.price_low = price_low
        STATE.history.append(c)
        STATE.balance = summ["balance"]; STATE.total_pnl = summ["total_pnl"]
        STATE.unrealised = unr; STATE.total_fees = summ["total_fees_paid"]
        STATE.trades_today = summ["trades_today"]
        STATE.pnl_today = summ.get("realised_pnl_today", summ["total_pnl"])
        STATE.total_trades = summ["total_trades"]
        STATE.signal = signal.action
        STATE.sig_reason = signal.reason or "—"
        STATE.sig_lots = signal.lots
        STATE.sig_ts = ts.strftime("%H:%M")
        if signal.action in ("BUY", "SELL") and order and order.status == "FILLED":
            STATE.sig_entry = order.fill_price
        STATE.rsi = rsi_val; STATE.macd_hist = (ema9_d - ema21_d) / max(c, 1) * 1000
        STATE.ema_fast = ema9_d; STATE.ema_slow = ema21_d
        STATE.bb_upper = c + 2*std_bb; STATE.bb_lower = c - 2*std_bb
        STATE.in_pos = in_pos; STATE.pos_side = pos_side
        STATE.pos_entry = pos_entry; STATE.pos_lots = pos_lots
        STATE.winners = len(wins); STATE.losers = len(losses_t)
        STATE.avg_win = avg_w; STATE.avg_loss = avg_l
        STATE.candles = candle_idx + 1
        STATE.warmup_done = agent._warmup_candle_count >= agent.cfg.warmup_candles
        STATE.status_msg = (f"{ts.strftime('%d %b %H:%M')}  "
                            f"{'WARMUP' if not STATE.warmup_done else 'TRADING'} — q to quit")

        candle_idx += 1
        if backtest:
            _time.sleep(1.0 / max(speed, 0.1))
        else:
            _time.sleep(300)   # 5-minute live candle interval

    STATE.status_msg = "Backtest complete — q to quit"


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
                        help="Run with synthetic GARCH data (no internet needed)")
    parser.add_argument("--backtest",   action="store_true",
                        help="Replay real Yahoo Finance data at speed")
    parser.add_argument("--capital",    type=float, default=500_000)
    parser.add_argument("--instrument", default="FUTURES", choices=["FUTURES","CE","PE"])
    parser.add_argument("--days",       type=int,   default=5,
                        help="Days of history to fetch/replay (backtest/live)")
    parser.add_argument("--speed",      type=float, default=3.0,
                        help="Candle replay speed multiplier (demo/backtest)")
    args = parser.parse_args()

    # Set initial values
    STATE.start_bal = args.capital
    STATE.balance   = args.capital

    # Choose and launch background worker thread
    if args.demo or (not args.backtest):
        target = _run_demo
        kwargs = dict(capital=args.capital, speed=args.speed,
                      instrument_key=args.instrument)
        if not args.demo:
            target = _run_live
            kwargs = dict(capital=args.capital, days=args.days,
                          speed=args.speed, instrument_key=args.instrument,
                          backtest=False)
    else:
        target = _run_live
        kwargs = dict(capital=args.capital, days=args.days, speed=args.speed,
                      instrument_key=args.instrument, backtest=True)

    if args.demo:
        target = _run_demo
        kwargs = dict(capital=args.capital, speed=args.speed,
                      instrument_key=args.instrument)

    worker = threading.Thread(target=target, kwargs=kwargs, daemon=True)
    worker.start()

    app = BankNiftySentinel()
    app.run()


if __name__ == "__main__":
    main()
