"""
simulation/engine.py
====================
SimulationEngine – orchestrates the back-test or paper-trading loop.

Responsibilities
----------------
* Pull candles from the data feed (historical or live).
* Call the agent's on_candle() for each tick.
* Route BUY/SELL signals to the PaperBroker.
* Process pending limit orders after every candle.
* Aggregate per-candle logs into a results DataFrame.
* Print a human-readable P&L report at the end of a run.
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime
from typing import List, Optional

import config as cfg
from broker.paper_broker import PaperBroker
from data.data_feed import BankNiftyFeed
from agent.trading_agent import BankNiftyAgent, Signal

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class SimulationEngine:
    """
    Parameters
    ----------
    broker  : PaperBroker instance (injected so it can be shared / inspected)
    agent   : BankNiftyAgent (or any agent with on_candle(candle, broker) → Signal)
    feed    : BankNiftyFeed (provides iter_candles())
    symbol  : trading symbol forwarded to broker order calls
    verbose : print candle-level log lines
    """

    def __init__(
        self,
        broker: PaperBroker,
        agent:  BankNiftyAgent,
        feed:   BankNiftyFeed,
        symbol: str  = "BANKNIFTY-FUT",
        verbose: bool = True,
    ) -> None:
        self.broker  = broker
        self.agent   = agent
        self.feed    = feed
        self.symbol  = symbol
        self.verbose = verbose

        self._log: List[dict] = []    # one row per candle

    # ------------------------------------------------------------------
    # Run a backtest over historical data
    # ------------------------------------------------------------------

    def run_backtest(
        self,
        days: int    = cfg.DATA_PERIOD_DAYS,
        source: str  = "yfinance",
    ) -> List[dict]:
        """
        Fetch historical data and replay it candle-by-candle.

        Returns the candle log (list of dicts) for further analysis.
        """
        logger.info("=== BankNifty Paper-Trade Backtest  (%d days, source=%s) ===", days, source)
        self.feed.source = source
        df = self.feed.fetch_historical(days=days)
        self._run_loop(self.feed.iter_candles(df))
        self._print_report()
        return self._log

    # ------------------------------------------------------------------
    # Run a live paper-trading session
    # ------------------------------------------------------------------

    def run_live(self, interval_seconds: int = 300) -> None:
        """
        Poll the NSE live quote feed every `interval_seconds` and paper-trade
        in real time.  Runs until interrupted (Ctrl-C).
        """
        logger.info("=== BankNifty Live Paper-Trading (interval=%ds) ===", interval_seconds)

        def _handle_tick(quote: dict) -> None:
            # Live quotes don't have OHLCV – use last_price as proxy for close
            candle = {
                "timestamp": quote.get("timestamp", datetime.now()),
                "open":      quote.get("open",       quote["last_price"]),
                "high":      quote.get("high",       quote["last_price"]),
                "low":       quote.get("low",        quote["last_price"]),
                "close":     quote["last_price"],
                "volume":    0.0,
            }
            self._process_candle(candle)

        try:
            self.feed.start_live_stream(_handle_tick, interval_seconds)
        except KeyboardInterrupt:
            print("\n[Interrupted] Live session ended.")
            self._print_report()

    # ------------------------------------------------------------------
    # Internal candle processing
    # ------------------------------------------------------------------

    def _run_loop(self, candle_iter) -> None:
        for candle in candle_iter:
            self._process_candle(candle)

    def _process_candle(self, candle: dict) -> None:
        close = candle["close"]
        ts    = candle["timestamp"]

        # FIX 17: use agent's instrument instead of hardcoding INSTRUMENT_FUTURES
        self.broker.update_market_price(
            self.symbol, self.agent.instrument, close, candle_ts=ts
        )

        # Fill any pending limit orders at this candle's price
        filled_limits = self.broker.process_pending_orders()
        if filled_limits and self.verbose:
            for o in filled_limits:
                logger.info("[%s] LIMIT FILLED  %s %dL @ ₹%.2f  fees=₹%.2f",
                            ts, o.action, o.lots, o.fill_price, o.fees)

        # Ask agent for signal
        signal: Signal = self.agent.on_candle(candle, self.broker)

        order = None
        if signal.action in ("BUY", "SELL"):
            order = self.broker.place_order(
                symbol      = self.symbol,
                instrument  = signal.instrument,
                action      = signal.action,
                order_type  = "MARKET",
                lots        = signal.lots,
            )
            # FIX 18: sync agent state from broker after order fills
            if order and order.status == "FILLED" and hasattr(self.agent, 'sync_state_from_broker'):
                self.agent.sync_state_from_broker(self.broker)

            if self.verbose:
                status = order.status
                fill   = f"@ ₹{order.fill_price:.2f}  fees=₹{order.fees:.2f}" if status == "FILLED" else f"[{order.rejection_reason}]"
                logger.info(
                    "[%s] %s %-4s  %dL  %s  | reason: %s  conf=%.0f%%",
                    ts.strftime("%Y-%m-%d %H:%M") if hasattr(ts, "strftime") else ts,
                    status,
                    signal.action,
                    signal.lots,
                    fill,
                    signal.reason,
                    signal.confidence * 100,
                )

        summary = self.broker.get_account_summary()
        indics  = self.agent.last_indicators

        self._log.append({
            "timestamp":    ts,
            "close":        close,
            "signal":       signal.action,
            "signal_reason": signal.reason,
            "order_status": order.status if order else "—",
            "fill_price":   order.fill_price if order and order.fill_price else None,
            "fees":         order.fees if order else 0.0,
            "balance":      summary["balance"],
            "unrealised":   summary["unrealised_pnl"],
            "realised_today": summary["realised_pnl_today"],
            "total_pnl":    summary["total_pnl"],
            "rsi":          indics.get("rsi"),
            "ema_fast":     indics.get("ema_fast"),
            "ema_slow":     indics.get("ema_slow"),
            "macd_hist":    indics.get("macd_hist"),
        })

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def _print_report(self) -> None:
        if not self._log:
            print("No candles processed.")
            return

        summary  = self.broker.get_account_summary()
        trades   = self.broker.get_trade_history()
        open_pos = self.broker.get_open_positions()

        try:
            from tabulate import tabulate
            _tabulate = tabulate
        except ImportError:
            _tabulate = None

        print("\n" + "=" * 65)
        print("  BankNifty Paper-Trade Simulation – Final Report")
        print("=" * 65)

        account_rows = [
            ["Starting Balance",   f"₹{summary['starting_balance']:>14,.2f}"],
            ["Final Balance",      f"₹{summary['balance']:>14,.2f}"],
            ["Unrealised P&L",     f"₹{summary['unrealised_pnl']:>14,.2f}"],
            ["Total Net P&L",      f"₹{summary['total_pnl']:>14,.2f}  ({summary['total_pnl_pct']:+.3f}%)"],
            ["Total Fees Paid",    f"₹{summary['total_fees_paid']:>14,.2f}"],
            ["Total Trades",       f"{summary['total_trades']:>15}"],
            ["Open Positions",     f"{summary['open_positions']:>15}"],
        ]
        if _tabulate:
            print(_tabulate(account_rows, tablefmt="simple"))
        else:
            for row in account_rows:
                print(f"  {row[0]:<22}: {row[1]}")

        if trades:
            print(f"\n  Trade History ({len(trades)} closed trades)")
            print("  " + "-" * 61)
            trade_rows = [
                [
                    t["trade_id"],
                    t["instrument"],
                    t["action"],
                    t["lots"],
                    f"₹{t['entry']:.2f}",
                    f"₹{t['exit']:.2f}",
                    f"₹{t['net_pnl']:,.2f}",
                    t["exit_time"][:16] if isinstance(t["exit_time"], str) else str(t["exit_time"])[:16],
                ]
                for t in trades[-20:]   # last 20 trades
            ]
            headers = ["ID", "INSTR", "Side", "Lots", "Entry", "Exit", "NetP&L", "Time"]
            if _tabulate:
                print(_tabulate(trade_rows, headers=headers, tablefmt="simple"))
            else:
                print("  " + "  ".join(f"{h:<8}" for h in headers))
                for row in trade_rows:
                    print("  " + "  ".join(f"{str(c):<8}" for c in row))

        if open_pos:
            print(f"\n  Open Positions ({len(open_pos)})")
            for p in open_pos:
                print(
                    f"    {p['symbol']}  {p['instrument']}  lots={p['lots']:+d}  "
                    f"avg=₹{p['avg_price']:.2f}  cur=₹{p['current_price']:.2f}"
                )

        summary = self.broker.get_account_summary()
        if "max_drawdown" in summary:
            print(f"  Max Drawdown : ₹{summary['max_drawdown']:,.2f}  ({summary['max_drawdown_pct']:.2f}%)")

        # Win-rate calculation
        if trades:
            winners = sum(1 for t in trades if t["net_pnl"] > 0)
            win_rate = winners / len(trades) * 100
            avg_win  = sum(t["net_pnl"] for t in trades if t["net_pnl"] > 0) / max(winners, 1)
            losers   = len(trades) - winners
            avg_loss = sum(t["net_pnl"] for t in trades if t["net_pnl"] <= 0) / max(losers, 1)
            print(f"\n  Win-rate : {win_rate:.1f}%  ({winners}W / {losers}L)")
            print(f"  Avg win  : ₹{avg_win:,.2f}   Avg loss: ₹{avg_loss:,.2f}")
            if avg_loss < 0:
                profit_factor = abs(avg_win * winners) / abs(avg_loss * losers) if losers > 0 else float("inf")
                print(f"  Profit Factor: {profit_factor:.2f}")

        print("=" * 65 + "\n")

    def get_log_dataframe(self):
        """Return the candle log as a pandas DataFrame (requires pandas)."""
        try:
            import pandas as pd
            return pd.DataFrame(self._log).set_index("timestamp")
        except ImportError:
            logger.warning("pandas not installed; returning raw list of dicts.")
            return self._log
