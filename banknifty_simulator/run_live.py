"""
run_live.py – BankNifty Live Paper-Trading Runner
==================================================
Runs the full paper-trading stack against REAL BankNifty data.

How it works
------------
1. Downloads last 5 days of 5-minute history via Yahoo Finance (no yfinance
   package needed – direct JSON API call).
2. Replays those candles to warm up the agent's indicators.
3. Switches to live NSE polling every 5 minutes during market hours.
4. Prints a live P&L dashboard to the terminal after each candle.
5. On Ctrl-C or market close, prints the full session report.

Usage
-----
    # ₹10,000 paper account, CE options
    python run_live.py --capital 10000 --instrument CE

    # ₹5,00,000 paper account, futures
    python run_live.py --capital 500000 --instrument FUTURES

    # Backtest mode on last 30 days of real data (no live polling)
    python run_live.py --capital 100000 --instrument FUTURES --backtest --days 30

    # Increase trailing stop to 75 points, 2 lots
    python run_live.py --capital 500000 --instrument FUTURES --lots 2 --trailing 75

Flags
-----
--capital     Starting virtual capital in INR       (default: 500000)
--instrument  FUTURES | CE | PE                     (default: FUTURES)
--lots        Max lots per trade                    (default: 1)
--trailing    Trailing stop points                  (default: 50)
--interval    Candle interval: 1m|5m|15m|1h         (default: 5m)
--days        History days to fetch for warmup      (default: 5)
--backtest    Replay all fetched history, no live poll
--quiet       Suppress per-candle output
"""

import argparse
import logging
import os
import sys
import time
from datetime import datetime, time as dtime

import pytz

sys.path.insert(0, os.path.dirname(__file__))

import config as cfg
from broker.paper_broker import PaperBroker
from agent.trading_agent  import BankNiftyAgent, AgentConfig
from simulation.engine     import SimulationEngine
from data.live_feed        import LiveFeed

IST = pytz.timezone("Asia/Kolkata")

logging.basicConfig(
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
    level=logging.INFO,
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


# ── Dashboard printer ────────────────────────────────────────────────────────

def print_dashboard(broker: PaperBroker, candle: dict, signal_action: str, order=None) -> None:
    summary  = broker.get_account_summary()
    ts       = candle["timestamp"]
    ts_str   = ts.strftime("%d %b %H:%M") if hasattr(ts, "strftime") else str(ts)[:16]
    close    = candle["close"]
    pnl      = summary["total_pnl"]
    pnl_pct  = summary["total_pnl_pct"]
    pnl_sign = "+" if pnl >= 0 else ""
    arrow    = "▲" if pnl >= 0 else "▼"

    order_str = ""
    if order and order.status == "FILLED":
        order_str = (f"  [{signal_action} {order.lots}L @ ₹{order.fill_price:.1f}  "
                     f"fees ₹{order.fees:.0f}]")
    elif order and order.status == "REJECTED":
        order_str = f"  [REJECTED: {order.rejection_reason[:40]}]"

    print(
        f"[{ts_str}] BankNifty={close:,.1f}  "
        f"Signal={signal_action:<4}  "
        f"P&L={arrow}₹{pnl_sign}{pnl:,.0f}({pnl_pct:+.2f}%)  "
        f"Balance=₹{summary['balance']:,.0f}  "
        f"Trades={summary['total_trades']}"
        f"{order_str}"
    )


# ── Instrument mapping ───────────────────────────────────────────────────────

INSTRUMENT_MAP = {
    "FUTURES": cfg.INSTRUMENT_FUTURES,
    "CE":      cfg.INSTRUMENT_CALL,
    "PE":      cfg.INSTRUMENT_PUT,
}


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="BankNifty Live Paper-Trading Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--capital",    type=float, default=500_000, help="Starting virtual capital (INR)")
    parser.add_argument("--instrument", default="FUTURES", choices=["FUTURES", "CE", "PE"])
    parser.add_argument("--lots",       type=int,   default=1)
    parser.add_argument("--trailing",   type=float, default=100.0,  help="Trailing stop floor points")
    parser.add_argument("--interval",   default="5m", choices=["1m", "2m", "5m", "15m", "30m", "1h"])
    parser.add_argument("--days",       type=int,   default=5,      help="History days to warm up agent")
    parser.add_argument("--backtest",   action="store_true",        help="Replay history only, no live poll")
    parser.add_argument("--quiet",      action="store_true")
    args = parser.parse_args()

    instrument = INSTRUMENT_MAP[args.instrument]
    symbol     = f"BANKNIFTY-{args.instrument}"
    verbose    = not args.quiet

    print(f"\n{'═'*65}")
    print(f"  BankNifty Live Paper-Trading")
    print(f"  Capital    : ₹{args.capital:>10,.0f}")
    print(f"  Instrument : {args.instrument}  ({symbol})")
    print(f"  Interval   : {args.interval}    Mode: {'BACKTEST' if args.backtest else 'LIVE'}")
    print(f"{'═'*65}\n")

    # ── 1. Fetch history ───────────────────────────────────────────────
    feed = LiveFeed(interval=args.interval)
    logger.info("Fetching %d days of %s BankNifty data from Yahoo Finance ...",
                args.days, args.interval)

    try:
        hist_df = feed.fetch_history(days=args.days)
    except RuntimeError as exc:
        print(f"\n  ERROR: {exc}")
        print("  Make sure you have an active internet connection and run during/after market hours.")
        sys.exit(1)

    logger.info("Loaded %d candles  (%s → %s)",
                len(hist_df),
                hist_df.index[0].strftime("%d %b %H:%M IST"),
                hist_df.index[-1].strftime("%d %b %H:%M IST"))

    # ── 2. Initialise broker + agent ───────────────────────────────────
    broker = PaperBroker(starting_balance=args.capital, seed=42)
    agent  = BankNiftyAgent(
        cfg        = AgentConfig(
            warmup_candles      = 60,
            max_lots            = args.lots,
            trailing_stop_pts   = max(args.trailing, 100.0),
            daily_stop_loss_pct = 0.05,
            rsi_oversold        = 35.0,
            rsi_overbought      = 65.0,
        ),
        symbol     = symbol,
        instrument = instrument,
    )

    # ── 3. Warm-up replay ──────────────────────────────────────────────
    logger.info("Warming up agent on %d historical candles ...", len(hist_df))
    warmup_count = 0
    for candle in feed.iter_history(hist_df):
        broker.update_market_price(symbol, instrument, candle["close"], candle_ts=candle["timestamp"])
        broker.process_pending_orders()
        signal = agent.on_candle(candle, broker)

        if signal.action in ("BUY", "SELL"):
            order = broker.place_order(
                symbol=symbol, instrument=instrument,
                action=signal.action, order_type="MARKET", lots=signal.lots,
                timestamp=candle["timestamp"],
            )
            if order.status == "FILLED" and hasattr(agent, "sync_state_from_broker"):
                agent.sync_state_from_broker(broker)
            if verbose:
                print_dashboard(broker, candle, signal.action, order)
        elif verbose and warmup_count % 15 == 0:
            # Print status every 15 candles even on HOLDs
            print_dashboard(broker, candle, "HOLD")

        warmup_count += 1

    summary = broker.get_account_summary()
    logger.info(
        "Warmup done. Trades so far: %d  |  P&L: ₹%+,.0f  |  Balance: ₹%,.0f",
        summary["total_trades"], summary["total_pnl"], summary["balance"],
    )

    if args.backtest:
        # Backtest mode – print final report and exit
        _print_final_report(broker)
        return

    # ── 4. Live polling loop ───────────────────────────────────────────
    interval_sec = _interval_to_seconds(args.interval)
    print(f"\n  [LIVE] Polling NSE every {interval_sec}s during market hours (09:15–15:30 IST)")
    print(f"  Press Ctrl-C to stop and print final report.\n")

    try:
        while True:
            now_ist = datetime.now(IST)
            t       = now_ist.time()

            if t < dtime(9, 15):
                wait = _seconds_until(dtime(9, 15), now_ist)
                logger.info("Market opens at 09:15 IST. Sleeping %d min ...", wait // 60)
                time.sleep(min(wait, 300))
                continue

            if t >= dtime(15, 30):
                logger.info("Market closed (15:30 IST). Session ended.")
                break

            # Fetch live tick
            quote = feed.get_live_tick()
            if quote is None:
                logger.warning("Live tick unavailable – retrying in 30s")
                time.sleep(30)
                continue

            candle = {
                "timestamp": quote["timestamp"],
                "open":      quote["open"]       or quote["last_price"],
                "high":      quote["high"]        or quote["last_price"],
                "low":       quote["low"]         or quote["last_price"],
                "close":     quote["last_price"],
                "volume":    0.0,
            }

            broker.update_market_price(symbol, instrument, candle["close"], candle_ts=candle["timestamp"])
            broker.process_pending_orders()
            signal = agent.on_candle(candle, broker)

            order = None
            if signal.action in ("BUY", "SELL"):
                order = broker.place_order(
                    symbol=symbol, instrument=instrument,
                    action=signal.action, order_type="MARKET", lots=signal.lots,
                    timestamp=candle["timestamp"],
                )
                if order.status == "FILLED" and hasattr(agent, "sync_state_from_broker"):
                    agent.sync_state_from_broker(broker)

            print_dashboard(broker, candle, signal.action, order)
            time.sleep(interval_sec)

    except KeyboardInterrupt:
        print("\n\n  [Stopped by user]")

    _print_final_report(broker)


def _print_final_report(broker: PaperBroker) -> None:
    summary = broker.get_account_summary()
    trades  = broker.get_trade_history()
    open_p  = broker.get_open_positions()

    print(f"\n{'═'*65}")
    print(f"  FINAL SESSION REPORT")
    print(f"{'═'*65}")
    print(f"  Starting capital   : ₹{summary['starting_balance']:>12,.2f}")
    print(f"  Final balance      : ₹{summary['balance']:>12,.2f}")
    print(f"  Unrealised P&L     : ₹{summary['unrealised_pnl']:>+12,.2f}")
    print(f"  Total Net P&L      : ₹{summary['total_pnl']:>+12,.2f}  ({summary['total_pnl_pct']:+.3f}%)")
    print(f"  Total fees paid    : ₹{summary['total_fees_paid']:>12,.2f}")
    print(f"  Max Drawdown       : ₹{summary['max_drawdown']:>12,.2f}  ({summary['max_drawdown_pct']:.2f}%)")
    print(f"  Closed trades      : {summary['total_trades']:>13}")

    if open_p:
        print(f"\n  Open positions ({len(open_p)}):")
        for p in open_p:
            unr = (p["current_price"] - p["avg_price"]) * abs(p["lots"]) * broker.lot_size
            print(f"    {p['symbol']} {p['instrument']}  lots={p['lots']:+d}  "
                  f"avg=₹{p['avg_price']:.1f}  cur=₹{p['current_price']:.1f}  "
                  f"unrealised=₹{unr:+,.0f}")

    if trades:
        winners  = [t for t in trades if t["net_pnl"] > 0]
        losers   = [t for t in trades if t["net_pnl"] <= 0]
        avg_win  = sum(t["net_pnl"] for t in winners) / max(len(winners), 1)
        avg_loss = sum(t["net_pnl"] for t in losers)  / max(len(losers),  1)
        win_rate = len(winners) / len(trades) * 100
        pf       = abs(avg_win * len(winners)) / max(abs(avg_loss * len(losers)), 0.01)

        print(f"\n  Win-rate      : {win_rate:.1f}%  ({len(winners)}W / {len(losers)}L)")
        print(f"  Avg win       : ₹{avg_win:>+8,.0f}")
        print(f"  Avg loss      : ₹{avg_loss:>+8,.0f}")
        print(f"  Profit Factor : {pf:.2f}")

        if len(trades) >= 1:
            print(f"\n  TRADES ({min(len(trades), 20)} shown):")
            print(f"  {'Time':<14} {'Act':<5} {'Entry':>8} {'Exit':>8} {'Net P&L':>10} {'Fees':>7}")
            print(f"  {'─'*57}")
            for t in trades[-20:]:
                et = t["exit_time"][:16] if isinstance(t["exit_time"], str) else str(t["exit_time"])[:16]
                print(f"  {et:<14} {t['action']:<5} "
                      f"{t['entry']:>8.1f} {t['exit']:>8.1f} "
                      f"₹{t['net_pnl']:>+8,.0f}  ₹{t['exit_fees']:>5.0f}")

    print(f"{'═'*65}\n")


def _interval_to_seconds(interval: str) -> int:
    mapping = {"1m": 60, "2m": 120, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600}
    return mapping.get(interval, 300)


def _seconds_until(target: dtime, now_ist: datetime) -> int:
    today    = now_ist.date()
    target_dt = datetime.combine(today, target)
    target_dt = IST.localize(target_dt)
    delta     = (target_dt - now_ist).total_seconds()
    return max(int(delta), 0)


if __name__ == "__main__":
    main()
