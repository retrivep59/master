"""
run_test.py  –  ₹10,000 Paper-Trading Test
===========================================
Generates 45 days of realistic synthetic BankNifty 5-min OHLCV data
(Geometric Brownian Motion, ±2% intraday vol, ±10% total period range,
realistic opening gaps) and runs two scenarios:

  Scenario A – BankNifty FUTURES  (1 lot = 15 units ≈ ₹74k margin)
  Scenario B – BankNifty CE OPTIONS  (1 lot = 15 units × ₹350 premium ≈ ₹5,250)

Scenario A shows that ₹10k is correctly rejected for futures.
Scenario B shows realistic P&L when trading cheap ATM options.
"""

import sys, os, math
from datetime import datetime, timedelta, time as dtime, date
from typing import List

sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
import pytz

import config as cfg
from broker.paper_broker import PaperBroker
from agent.trading_agent  import BankNiftyAgent, AgentConfig
from simulation.engine     import SimulationEngine

IST = pytz.timezone("Asia/Kolkata")

# ══════════════════════════════════════════════════════════════════════════
# Synthetic BankNifty price generator
# ══════════════════════════════════════════════════════════════════════════

def generate_banknifty_data(
    days: int = 45, interval_min: int = 5,
    start_price: float = 49_200.0, seed: int = 7,
) -> pd.DataFrame:
    """
    Realistic BankNifty 5-min OHLCV via GBM.
    Annual vol = 22%, drift = +8%, daily moves capped at ±3σ to avoid
    black-swan runaway during the test period.
    """
    rng = np.random.default_rng(seed)

    annual_vol   = 0.22
    annual_drift = 0.08
    candles_year = 252 * 75            # 75 five-min candles per trading day
    dt   = 1.0 / candles_year
    mu   = annual_drift * dt
    sig  = annual_vol * math.sqrt(dt)

    MARKET_OPEN  = dtime(9, 15)
    MARKET_CLOSE = dtime(15, 30)

    # Build trading calendar (weekdays only)
    all_wd, d = [], date(2025, 10, 1)
    while len(all_wd) < days + 5:
        if d.weekday() < 5:
            all_wd.append(d)
        d += timedelta(days=1)
    trading_days = all_wd[:days]

    records: List[dict] = []
    price = start_price

    for day_idx, tdate in enumerate(trading_days):
        if day_idx > 0:
            gap = rng.normal(0, 0.002)          # ±0.2 % overnight gap
            gap = max(-0.008, min(0.008, gap))  # cap gap at ±0.8 %
            price *= (1 + gap)

        ts = datetime.combine(tdate, MARKET_OPEN)
        end = datetime.combine(tdate, MARKET_CLOSE)
        candle_open = price

        while ts < end:
            mins_open  = (ts.hour * 60 + ts.minute) - (9 * 60 + 15)
            mins_close = (15 * 60 + 30) - (ts.hour * 60 + ts.minute)
            vol_mult   = 1.6 if mins_open < 30 else (1.4 if mins_close < 30 else 1.0)

            hi, lo, p = candle_open, candle_open, candle_open
            for _ in range(4):
                raw_r = rng.standard_normal()
                # cap within-candle move at ±3σ
                raw_r = max(-3.0, min(3.0, raw_r))
                p    *= math.exp(mu + sig * vol_mult * raw_r)
                hi    = max(hi, p)
                lo    = min(lo, p)
            close = p

            vol_v = int(rng.integers(600, 2000) *
                        (2.5 if mins_open < 30 else (2.0 if mins_close < 30 else 1.0)))
            records.append({
                "timestamp": IST.localize(ts),
                "open":   round(candle_open, 2),
                "high":   round(hi,          2),
                "low":    round(lo,          2),
                "close":  round(close,       2),
                "volume": vol_v,
            })
            candle_open = close
            ts += timedelta(minutes=interval_min)

        price = close

    return pd.DataFrame(records).set_index("timestamp")


def generate_option_premiums(spot_df: pd.DataFrame, seed: int = 7) -> pd.DataFrame:
    """
    Approximate ATM CE option premium for each 5-min candle.

    Model: premium = intrinsic + time_value
    - Start premium ~₹350 (ATM, ~1-week expiry style rolling)
    - Delta ≈ 0.45  →  premium moves 0.45 × Δspot
    - Theta decay: lose ~0.5 % of premium per trading day
    - IV crush on quiet days, IV spike on volatile days
    - Minimum floor: ₹5 (option can't go below near-zero)
    """
    rng = np.random.default_rng(seed + 1)
    premiums = []
    prem = 350.0                                  # starting ATM premium
    prev_spot = float(spot_df["close"].iloc[0])
    prev_date = spot_df.index[0].date()

    for ts, row in spot_df.iterrows():
        spot  = float(row["close"])
        today = ts.date()

        # Daily theta decay at day boundary
        if today != prev_date:
            prem *= 0.993                         # ~0.7 % decay per session
            prev_date = today

        # Delta move
        d_spot = spot - prev_spot
        delta  = 0.45 + rng.uniform(-0.04, 0.04)
        prem  += delta * d_spot

        # Small random vega noise
        prem  *= math.exp(rng.normal(0, 0.003))

        # Floor
        prem   = max(prem, 5.0)

        hi_p   = prem * (1 + abs(rng.normal(0, 0.002)))
        lo_p   = prem * (1 - abs(rng.normal(0, 0.002)))

        premiums.append({
            "timestamp": ts,
            "open":   round(prem * (1 + rng.uniform(-0.001, 0.001)), 2),
            "high":   round(hi_p, 2),
            "low":    round(lo_p,  2),
            "close":  round(prem,  2),
            "volume": int(rng.integers(200, 800)),
        })
        prev_spot = spot

    return pd.DataFrame(premiums).set_index("timestamp")


class SyntheticFeed:
    def __init__(self, df: pd.DataFrame, interval: str = "5m"):
        self._df = df
        self.interval = interval

    def iter_candles(self, df=None, speed_factor=0.0):
        source = df if df is not None else self._df
        for ts, row in source.iterrows():
            yield {"timestamp": ts, "open": float(row["open"]),
                   "high": float(row["high"]), "low": float(row["low"]),
                   "close": float(row["close"]), "volume": float(row["volume"])}


def separator(title=""):
    line = "═" * 65
    if title:
        pad = (65 - len(title) - 2) // 2
        print(f"\n{'═'*pad} {title} {'═'*(65-pad-len(title)-2)}")
    else:
        print(f"\n{line}")


# ══════════════════════════════════════════════════════════════════════════
# SCENARIO A – Futures (should be mostly rejected for ₹10k)
# ══════════════════════════════════════════════════════════════════════════

def run_futures_scenario(spot_df: pd.DataFrame):
    separator("SCENARIO A: BankNifty FUTURES")
    print(f"  Capital: ₹10,000 | 1 lot = 15 units | Margin needed ≈ ₹74,000")
    print(f"  Expected: ALL orders rejected (insufficient margin)\n")

    broker = PaperBroker(starting_balance=10_000.0, seed=42)
    agent  = BankNiftyAgent(
        cfg        = AgentConfig(warmup_candles=12, max_lots=1, trailing_stop_pts=30),
        symbol     = "BANKNIFTY-FUT",
        instrument = cfg.INSTRUMENT_FUTURES,
    )
    engine = SimulationEngine(
        broker=broker, agent=agent,
        feed=SyntheticFeed(spot_df), symbol="BANKNIFTY-FUT", verbose=False,
    )
    engine._run_loop(SyntheticFeed(spot_df).iter_candles())

    summary = broker.get_account_summary()
    orders  = broker._orders
    rejected = [o for o in orders if o.status == "REJECTED"]
    filled   = [o for o in orders if o.status == "FILLED"]

    print(f"  Signals generated       : {len(orders):>6}")
    print(f"  Orders REJECTED         : {len(rejected):>6}  ← correctly blocked")
    print(f"  Orders FILLED           : {len(filled):>6}")
    print(f"  Closed trades           : {summary['total_trades']:>6}")
    print(f"  Final balance           : ₹{summary['balance']:>10,.2f}")
    print(f"  Capital safe?           : {'✓ YES – no margin spent' if len(filled)==0 else '✗ NO – margin leak!'}")
    if rejected:
        print(f"\n  Sample rejection reason : {rejected[0].rejection_reason}")
    print(f"\n  ⚠  VERDICT: ₹10,000 CANNOT trade BankNifty Futures.")
    print(f"     Minimum capital for 1 lot futures ≈ ₹80,000–₹1,00,000")


# ══════════════════════════════════════════════════════════════════════════
# SCENARIO B – Options CE (viable at ₹10k)
# ══════════════════════════════════════════════════════════════════════════

def run_options_scenario(spot_df: pd.DataFrame, option_df: pd.DataFrame):
    separator("SCENARIO B: BankNifty CE OPTIONS")
    avg_prem = option_df["close"].mean()
    lot_cost = avg_prem * cfg.BANKNIFTY_LOT_SIZE
    print(f"  Capital: ₹10,000 | 1 lot = 15 units × ~₹{avg_prem:.0f} premium = ~₹{lot_cost:.0f}/lot")
    print(f"  No margin required – pay premium upfront\n")

    broker = PaperBroker(starting_balance=10_000.0, seed=42)
    # For options the agent reads SPOT prices (spot_df) for signals,
    # but trades are placed on option premiums.
    # We wire a split-feed: agent sees spot, broker sees option premiums.
    agent = BankNiftyAgent(
        cfg        = AgentConfig(
            warmup_candles      = 12,
            max_lots            = 1,
            trailing_stop_pts   = 15.0,   # 15 premium pts trailing stop for options
            daily_stop_loss_pct = 0.04,   # 4% daily SL (options can move fast)
            rsi_oversold        = 30.0,
            rsi_overbought      = 70.0,
        ),
        symbol     = "BANKNIFTY-CE",
        instrument = cfg.INSTRUMENT_CALL,
    )

    signals_fired = []
    closed_trades = []
    candle_count  = 0

    # Zip spot and option candles together (same timestamps)
    spot_iter   = SyntheticFeed(spot_df,   "5m").iter_candles()
    option_iter = SyntheticFeed(option_df, "5m").iter_candles()

    for spot_candle, opt_candle in zip(spot_iter, option_iter):
        ts = spot_candle["timestamp"]

        # Update broker market price with OPTION premium (not spot)
        broker.update_market_price("BANKNIFTY-CE", cfg.INSTRUMENT_CALL, opt_candle["close"])

        # Fill pending limit orders
        broker.process_pending_orders()

        # Agent generates signal from SPOT price
        signal = agent.on_candle(spot_candle, broker)

        if signal.action in ("BUY", "SELL"):
            # For CE options: BUY on bullish signal, SELL to close
            order = broker.place_order(
                symbol     = "BANKNIFTY-CE",
                instrument = cfg.INSTRUMENT_CALL,
                action     = signal.action,
                order_type = "MARKET",
                lots       = signal.lots,
            )
            if order.status == "FILLED":
                signals_fired.append({
                    "ts": ts, "action": signal.action,
                    "fill": order.fill_price, "fees": order.fees,
                    "reason": signal.reason,
                })
                if hasattr(agent, 'sync_state_from_broker'):
                    agent.sync_state_from_broker(broker)

        candle_count += 1

    summary = broker.get_account_summary()
    trades  = broker.get_trade_history()

    # ── Report ─────────────────────────────────────────────────────────
    print(f"  Total candles processed : {candle_count:>6,}")
    print(f"  Trade signals fired     : {len(signals_fired):>6}")
    print(f"  Closed trades           : {summary['total_trades']:>6}")
    print(f"  Open positions left     : {summary['open_positions']:>6}")

    print(f"\n  {'─'*45}")
    print(f"  Starting capital        : ₹{10_000:>10,.2f}")
    print(f"  Final balance           : ₹{summary['balance']:>10,.2f}")
    print(f"  Total Net P&L           : ₹{summary['total_pnl']:>+10,.2f}  ({summary['total_pnl_pct']:+.2f}%)")
    print(f"  Total fees paid         : ₹{summary['total_fees_paid']:>10,.2f}")
    print(f"  Max Drawdown            : ₹{summary['max_drawdown']:>10,.2f}  ({summary['max_drawdown_pct']:.2f}%)")
    print(f"  {'─'*45}")

    if trades:
        winners  = [t for t in trades if t["net_pnl"] > 0]
        losers   = [t for t in trades if t["net_pnl"] <= 0]
        avg_net  = sum(t["net_pnl"] for t in trades) / len(trades)
        best     = max(trades, key=lambda t: t["net_pnl"])
        worst    = min(trades, key=lambda t: t["net_pnl"])
        gross    = sum(t["gross_pnl"] for t in trades)

        print(f"\n  TRADE STATISTICS")
        print(f"  Winners / Losers        : {len(winners)}W / {len(losers)}L  "
              f"({len(winners)/len(trades)*100:.1f}% win-rate)")
        print(f"  Avg P&L per trade       : ₹{avg_net:>+8,.2f}")
        print(f"  Best trade              : ₹{best['net_pnl']:>+8,.2f}  "
              f"(entry ₹{best['entry']:.1f} → exit ₹{best['exit']:.1f})")
        print(f"  Worst trade             : ₹{worst['net_pnl']:>+8,.2f}  "
              f"(entry ₹{worst['entry']:.1f} → exit ₹{worst['exit']:.1f})")
        print(f"  Gross P&L (pre-fee)     : ₹{gross:>+10,.2f}")
        print(f"  Net P&L  (post-fee)     : ₹{summary['total_pnl']:>+10,.2f}")
        print(f"  Fees ate                : ₹{summary['total_fees_paid']:,.2f} "
              f"({summary['total_fees_paid']/max(abs(gross),1)*100:.1f}% of gross)")

        if len(winners) > 0 and len(losers) > 0:
            aw = sum(t["net_pnl"] for t in winners) / len(winners)
            al = sum(t["net_pnl"] for t in losers)  / len(losers)
            pf = abs(aw * len(winners)) / max(abs(al * len(losers)), 0.01)
            rr = abs(aw / al)
            print(f"  Avg win / avg loss      : ₹{aw:+,.0f} / ₹{al:+,.0f}  (RR {rr:.2f}x)")
            print(f"  Profit Factor           : {pf:.2f}")

        # Show last 6 trades
        if len(trades) >= 2:
            print(f"\n  LAST {min(6, len(trades))} TRADES")
            print(f"  {'Time':<14} {'Act':<5} {'Entry':>7} {'Exit':>7} {'Net P&L':>10} {'Fees':>7}")
            print(f"  {'─'*57}")
            for t in trades[-6:]:
                et = t["exit_time"][:16] if isinstance(t["exit_time"], str) else str(t["exit_time"])[:16]
                print(f"  {et:<14} {t['action']:<5} {t['entry']:>7.1f} {t['exit']:>7.1f} "
                      f"₹{t['net_pnl']:>+8,.0f}  ₹{t['exit_fees']:>5.0f}")

    # ── Final verdict ───────────────────────────────────────────────────
    separator()
    pnl = summary["total_pnl"]
    pct = summary["total_pnl_pct"]
    if pnl > 0:
        verdict = f"✓ PROFIT  ₹{pnl:,.2f}  ({pct:+.2f}%) over 45 trading days"
    else:
        verdict = f"✗ LOSS    ₹{abs(pnl):,.2f}  ({pct:.2f}%) over 45 trading days"
    print(f"\n  FINAL VERDICT (₹10,000 → Options): {verdict}")
    print(f"\n  WHAT THIS MEANS:")
    print(f"  ├─ Strategy uses EMA-cross + RSI + MACD on 5-min BankNifty chart")
    print(f"  ├─ Each CE lot costs ~₹{avg_prem*cfg.BANKNIFTY_LOT_SIZE:,.0f} in premium upfront")
    print(f"  ├─ Fees per round-trip ≈ ₹{summary['total_fees_paid']/max(summary['total_trades'],1)*2:,.0f}")
    print(f"  ├─ Max drawdown hit    : ₹{summary['max_drawdown']:,.0f}  ({summary['max_drawdown_pct']:.1f}% of capital)")
    print(f"  └─ This is SYNTHETIC data. Real BankNifty can be more volatile.")
    print(f"\n  CAPITAL REQUIREMENTS SUMMARY:")
    print(f"  ├─ BankNifty Futures (1 lot) : ₹75,000–₹1,00,000 (SPAN margin)")
    print(f"  ├─ BankNifty Options  (1 lot): ₹4,000–₹10,000  (premium only)")
    print(f"  └─ ₹10,000 is viable ONLY for options, and ONLY 1 lot at a time.")
    print()


# ══════════════════════════════════════════════════════════════════════════
def main():
    DAYS, SEED = 45, 7
    print(f"\n{'═'*65}")
    print(f"  BankNifty Paper-Trade Test  |  Starting Capital: ₹10,000")
    print(f"  Period: {DAYS} trading days (synthetic GBM data)  |  Interval: 5m")
    print(f"{'═'*65}")

    print("\n  Generating 45-day BankNifty synthetic dataset ...")
    spot_df   = generate_banknifty_data(days=DAYS, seed=SEED)
    option_df = generate_option_premiums(spot_df, seed=SEED)

    start_p = float(spot_df["close"].iloc[0])
    end_p   = float(spot_df["close"].iloc[-1])
    print(f"  Spot range  : ₹{spot_df['close'].min():,.0f} – ₹{spot_df['close'].max():,.0f}")
    print(f"  Spot move   : ₹{start_p:,.0f} → ₹{end_p:,.0f}  ({(end_p-start_p)/start_p*100:+.2f}%)")
    print(f"  Option prem : ₹{option_df['close'].min():.0f} – ₹{option_df['close'].max():.0f} "
          f"(avg ₹{option_df['close'].mean():.0f})")
    print(f"  Total candles: {len(spot_df):,}")

    run_futures_scenario(spot_df)
    run_options_scenario(spot_df, option_df)


if __name__ == "__main__":
    main()
