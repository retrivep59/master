"""
main.py – Entry point for the BankNifty Paper Trading Simulator.

Usage
-----
# Run a 60-day backtest using yfinance data
python main.py --mode backtest --days 60

# Run a 30-day backtest using jugaad-data
python main.py --mode backtest --days 30 --source jugaad

# Start a live paper-trading session (polls NSE every 5 min)
python main.py --mode live --interval 300

# Print the fee breakdown for a sample trade
python main.py --mode fees

Flags
-----
--mode      : backtest | live | fees  (default: backtest)
--days      : history days for backtest   (default: 60)
--source    : yfinance | jugaad           (default: yfinance)
--interval  : live poll seconds          (default: 300)
--balance   : starting virtual capital   (default: 500000)
--seed      : RNG seed for reproducibility (default: 42)
--verbose   : print per-candle logs      (default: True)
--quiet     : suppress per-candle logs
"""

import argparse
import logging
import sys
import os

# Ensure the simulator package root is on sys.path when invoked directly
sys.path.insert(0, os.path.dirname(__file__))

import config as cfg
from broker.paper_broker import PaperBroker
from data.data_feed import BankNiftyFeed
from agent.trading_agent import BankNiftyAgent, AgentConfig
from simulation.engine import SimulationEngine


def setup_logging(verbose: bool) -> None:
    level = logging.INFO if verbose else logging.WARNING
    logging.basicConfig(
        format="%(asctime)s  %(levelname)-7s  %(message)s",
        datefmt="%H:%M:%S",
        level=level,
        stream=sys.stdout,
    )


def run_fee_demo(balance: float) -> None:
    """Print fee breakdowns for representative BankNifty trades."""
    broker = PaperBroker(starting_balance=balance)
    print("\n  === Indian F&O Fee Breakdown – BankNifty ===")
    # Futures: buy 1 lot at ₹48,500
    broker.print_fee_breakdown(cfg.INSTRUMENT_FUTURES, "BUY",  1, 48_500.0)
    # Futures: sell 1 lot at ₹48,500
    broker.print_fee_breakdown(cfg.INSTRUMENT_FUTURES, "SELL", 1, 48_500.0)
    # Call option: buy 1 lot at ₹350 premium
    broker.print_fee_breakdown(cfg.INSTRUMENT_CALL,    "BUY",  1, 350.0)
    # Put option: sell 1 lot at ₹280 premium
    broker.print_fee_breakdown(cfg.INSTRUMENT_PUT,     "SELL", 1, 280.0)


def run_backtest(args: argparse.Namespace) -> None:
    broker = PaperBroker(
        starting_balance=args.balance,
        seed=args.seed,
    )
    agent  = BankNiftyAgent(
        cfg    = AgentConfig(max_lots=1),
        symbol = "BANKNIFTY-FUT",
        instrument = cfg.INSTRUMENT_FUTURES,
    )
    feed   = BankNiftyFeed(interval=cfg.DATA_INTERVAL, source=args.source)
    engine = SimulationEngine(
        broker  = broker,
        agent   = agent,
        feed    = feed,
        verbose = args.verbose,
    )
    engine.run_backtest(days=args.days, source=args.source)


def run_live(args: argparse.Namespace) -> None:
    broker = PaperBroker(starting_balance=args.balance, seed=args.seed)
    agent  = BankNiftyAgent(
        cfg    = AgentConfig(max_lots=1),
        instrument = cfg.INSTRUMENT_FUTURES,
    )
    feed   = BankNiftyFeed(source="nse_live")
    engine = SimulationEngine(
        broker  = broker,
        agent   = agent,
        feed    = feed,
        verbose = args.verbose,
    )
    engine.run_live(interval_seconds=args.interval)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BankNifty Paper Trading Simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--mode",     default="backtest", choices=["backtest", "live", "fees"])
    parser.add_argument("--days",     type=int,   default=60)
    parser.add_argument("--source",   default="yfinance", choices=["yfinance", "jugaad"])
    parser.add_argument("--interval", type=int,   default=300,    help="Live poll interval (seconds)")
    parser.add_argument("--balance",  type=float, default=cfg.STARTING_BALANCE)
    parser.add_argument("--seed",     type=int,   default=42)
    parser.add_argument("--quiet",    action="store_true", help="Suppress per-candle logs")
    args = parser.parse_args()
    args.verbose = not args.quiet

    setup_logging(args.verbose)

    if args.mode == "fees":
        run_fee_demo(args.balance)
    elif args.mode == "backtest":
        run_backtest(args)
    elif args.mode == "live":
        run_live(args)


if __name__ == "__main__":
    main()
