"""
broker/paper_broker.py
======================
PaperBroker – a high-fidelity simulated brokerage for BankNifty F&O.

Design goals
------------
* Matches the real-world fee structure for NSE F&O (Zerodha-style flat ₹20
  brokerage) so that a strategy must absorb *actual* costs to show profit.
* Simulates random bid-ask slippage drawn from a calibrated distribution so
  the AI cannot exploit "perfect fill" assumptions.
* Maintains a full trade ledger, open positions, and running P&L that the
  simulation engine and the AI agent can query at any time.
* Enforces hard risk-management guards (daily stop-loss, max open lots, max
  trades/day) – the broker simply refuses new orders when limits are hit.
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Dict, List, Optional

import config as cfg


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class Order:
    order_id:    str
    timestamp:   datetime
    symbol:      str
    instrument:  str        # FUTURES | CE | PE
    action:      str        # BUY | SELL
    order_type:  str        # MARKET | LIMIT
    lots:        int
    limit_price: Optional[float]   # None for MARKET orders
    fill_price:  Optional[float] = None
    status:      str = "PENDING"   # PENDING | FILLED | REJECTED | CANCELLED
    fees:        float = 0.0
    rejection_reason: str = ""


@dataclass
class Position:
    symbol:     str
    instrument: str
    lots:       int          # positive = long, negative = short
    avg_price:  float
    open_time:  datetime
    entry_fees: float = 0.0  # FIX 4: track cumulative entry fees per position


@dataclass
class Trade:
    """A completed round-trip (entry + exit pair) for P&L reporting."""
    trade_id:      str
    symbol:        str
    instrument:    str
    action:        str        # BUY or SELL (the closing leg)
    lots:          int
    entry_price:   float
    exit_price:    float
    entry_fees:    float
    exit_fees:     float
    gross_pnl:     float
    net_pnl:       float
    entry_time:    datetime
    exit_time:     datetime


# ---------------------------------------------------------------------------
# Fee calculator (standalone function – easy to unit-test)
# ---------------------------------------------------------------------------

def calculate_fo_fees(
    instrument: str,
    action: str,
    lots: int,
    fill_price: float,
    lot_size: int = cfg.BANKNIFTY_LOT_SIZE,
) -> dict:
    """
    Calculate all applicable Indian F&O charges for one order leg.

    Parameters
    ----------
    instrument  : "FUTURES", "CE", or "PE"
    action      : "BUY" or "SELL"
    lots        : number of lots
    fill_price  : actual fill price (index points for futures, premium for options)
    lot_size    : number of units per lot (default = BANKNIFTY_LOT_SIZE from config)

    Returns
    -------
    dict with keys: brokerage, stt, exchange_charge, stamp_duty, sebi_fee,
                    clearing_charge, gst, total
    """
    qty = lots * lot_size

    if instrument == cfg.INSTRUMENT_FUTURES:
        # For futures: turnover = fill_price × qty  (notional value)
        turnover = fill_price * qty

        brokerage      = cfg.BROKERAGE_PER_ORDER
        stt            = turnover * cfg.STT_FUTURES_SELL if action == "SELL" else 0.0
        exchange_chg   = turnover * cfg.EXCHANGE_CHARGE_FUTURES
        stamp_duty     = turnover * cfg.STAMP_DUTY_FUTURES if action == "BUY" else 0.0
        sebi_fee       = turnover * cfg.SEBI_FEE_RATE
        clearing_chg   = turnover * cfg.CLEARING_CHARGE_RATE
    else:
        # Options (CE / PE): turnover = premium × qty
        turnover = fill_price * qty

        brokerage      = cfg.BROKERAGE_PER_ORDER
        stt            = turnover * cfg.STT_OPTIONS_SELL if action == "SELL" else 0.0
        exchange_chg   = turnover * cfg.EXCHANGE_CHARGE_OPTIONS
        stamp_duty     = turnover * cfg.STAMP_DUTY_OPTIONS if action == "BUY" else 0.0
        sebi_fee       = turnover * cfg.SEBI_FEE_RATE
        clearing_chg   = turnover * cfg.CLEARING_CHARGE_RATE

    gst   = (brokerage + exchange_chg) * cfg.GST_RATE
    total = brokerage + stt + exchange_chg + stamp_duty + sebi_fee + clearing_chg + gst

    return {
        "brokerage":      round(brokerage,    2),
        "stt":            round(stt,          2),
        "exchange_charge": round(exchange_chg, 2),
        "stamp_duty":     round(stamp_duty,   2),
        "sebi_fee":       round(sebi_fee,     2),
        "clearing_charge": round(clearing_chg, 2),
        "gst":            round(gst,          2),
        "total":          round(total,        2),
    }


# ---------------------------------------------------------------------------
# Slippage simulator
# ---------------------------------------------------------------------------

def simulate_slippage(
    instrument: str,
    action: str,
    quote_price: float,
    rng: random.Random,
) -> float:
    """
    Return an adversarial fill price based on Gaussian slippage model.

    For a BUY  the fill is *above* the quote (you pay more).
    For a SELL the fill is *below* the quote (you receive less).
    """
    if instrument == cfg.INSTRUMENT_FUTURES:
        slip = abs(rng.gauss(cfg.SLIPPAGE_MEAN_FUTURES, cfg.SLIPPAGE_STD_FUTURES))
    else:
        slip = abs(rng.gauss(cfg.SLIPPAGE_MEAN_OPTIONS, cfg.SLIPPAGE_STD_OPTIONS))

    return quote_price + slip if action == "BUY" else quote_price - slip


# ---------------------------------------------------------------------------
# PaperBroker
# ---------------------------------------------------------------------------

class PaperBroker:
    """
    Simulated broker with realistic Indian F&O fee deduction and slippage.

    Usage
    -----
    broker = PaperBroker(starting_balance=500_000)

    # Feed a market price tick
    broker.update_market_price("BANKNIFTY-FUT", "FUTURES", 48_500.0)

    # Place an order
    order = broker.place_order(
        symbol="BANKNIFTY-FUT",
        instrument="FUTURES",
        action="BUY",
        order_type="MARKET",
        lots=1,
    )
    print(broker.get_account_summary())
    """

    def __init__(
        self,
        starting_balance: float = cfg.STARTING_BALANCE,
        lot_size: int = cfg.BANKNIFTY_LOT_SIZE,
        seed: Optional[int] = None,
    ) -> None:
        self.starting_balance: float = starting_balance
        self.balance:          float = starting_balance
        self.lot_size:         int   = lot_size

        # FIX 6: Initialise total reserved margin tracking
        self._total_reserved_margin: float = 0.0

        # Drawdown tracking
        self._peak_balance: float     = starting_balance
        self._max_drawdown: float     = 0.0          # maximum drawdown seen (positive number)
        self._max_drawdown_pct: float = 0.0          # max drawdown as % of peak

        # FIX 3: positions keyed by f"{symbol}_{instrument}" to avoid collision
        self._positions:    Dict[str, Position] = {}
        self._orders:       List[Order]          = []
        self._trades:       List[Trade]          = []
        self._market_prices: Dict[str, float]   = {}   # symbol → latest price

        # Per-day counters (reset each new trading date)
        self._trading_date:          Optional[date] = None
        self._trades_today:          int            = 0
        self._realised_pnl_today:    float          = 0.0

        # Random number generator (seeded for reproducible back-tests)
        self._rng = random.Random(seed)

    # ------------------------------------------------------------------
    # Market price feed
    # ------------------------------------------------------------------

    def update_market_price(
        self,
        symbol:    str,
        instrument: str,
        price:     float,
        candle_ts=None,
    ) -> None:
        """Called by the data feed / simulation engine every new candle."""
        self._market_prices[f"{symbol}_{instrument}"] = price
        self._maybe_reset_day_counters(candle_ts)

    def _maybe_reset_day_counters(self, candle_ts=None) -> None:
        # Use the candle's simulated date during backtests; fall back to wall clock
        if candle_ts is not None:
            today = candle_ts.date() if hasattr(candle_ts, "date") else date.today()
        else:
            today = date.today()
        if self._trading_date != today:
            self._trading_date       = today
            self._trades_today       = 0
            self._realised_pnl_today = 0.0

    # ------------------------------------------------------------------
    # Order placement
    # ------------------------------------------------------------------

    def place_order(
        self,
        symbol:      str,
        instrument:  str,
        action:      str,
        order_type:  str   = "MARKET",
        lots:        int   = 1,
        limit_price: Optional[float] = None,
        timestamp:   Optional[datetime] = None,
    ) -> Order:
        """
        Place a paper order.  For MARKET orders the order is filled
        immediately at the last known market price ± slippage.

        Returns the Order object (check .status and .fill_price).
        """
        order = Order(
            order_id    = str(uuid.uuid4())[:8].upper(),
            timestamp   = timestamp if timestamp is not None else datetime.now(),
            symbol      = symbol,
            instrument  = instrument,
            action      = action,
            order_type  = order_type,
            lots        = lots,
            limit_price = limit_price,
        )
        self._orders.append(order)

        rejection = self._check_risk_limits(order)
        if rejection:
            order.status           = "REJECTED"
            order.rejection_reason = rejection
            return order

        if order_type == "MARKET":
            self._fill_order(order)
        else:
            # LIMIT orders are stored as PENDING; call process_pending_orders()
            # each candle to check if the limit has been hit.
            order.status = "PENDING"

        return order

    def process_pending_orders(self) -> List[Order]:
        """
        Check all PENDING limit orders against current market prices and fill
        those whose limit price has been reached.  Call once per candle.
        """
        filled = []
        for order in self._orders:
            if order.status != "PENDING":
                continue
            mp = self._market_prices.get(f"{order.symbol}_{order.instrument}")
            if mp is None:
                continue

            hit = (
                (order.action == "BUY"  and mp <= order.limit_price) or
                (order.action == "SELL" and mp >= order.limit_price)
            )
            if hit:
                self._fill_order(order)
                filled.append(order)
        return filled

    # ------------------------------------------------------------------
    # Internal fill logic
    # ------------------------------------------------------------------

    def _fill_order(self, order: Order) -> None:
        quote = (
            order.limit_price
            if order.order_type == "LIMIT" and order.limit_price
            else self._market_prices.get(f"{order.symbol}_{order.instrument}", 0.0)
        )

        fill_price = simulate_slippage(
            order.instrument, order.action, quote, self._rng
        )
        fill_price = max(fill_price, cfg.BANKNIFTY_TICK_SIZE)  # floor at tick

        fee_breakdown = calculate_fo_fees(
            order.instrument, order.action, order.lots, fill_price, self.lot_size
        )
        total_fees = fee_breakdown["total"]
        order.fill_price = round(fill_price, 2)
        order.fees       = total_fees
        order.status     = "FILLED"

        # Deduct fees immediately from balance
        self.balance -= total_fees

        self._update_positions(order, fill_price, total_fees)
        self._trades_today += 1

    def _update_positions(
        self, order: Order, fill_price: float, fees: float
    ) -> None:
        symbol     = order.symbol
        instrument = order.instrument
        qty        = order.lots * self.lot_size

        # FIX 3: use composite key to avoid symbol+instrument collisions
        pos_key = f"{symbol}_{instrument}"

        if pos_key not in self._positions:
            # Opening a new position
            sign = 1 if order.action == "BUY" else -1
            position = Position(
                symbol     = symbol,
                instrument = instrument,
                lots       = sign * order.lots,
                avg_price  = fill_price,
                open_time  = order.timestamp,
            )
            # FIX 4: store entry fees on new position
            position.entry_fees = fees
            self._positions[pos_key] = position

            # Reserve margin from balance (simplified: notional × 10 % for futures)
            if instrument == cfg.INSTRUMENT_FUTURES:
                notional = fill_price * qty
                margin   = notional * 0.10          # ~10 % SPAN margin proxy
                self.balance -= margin
                # FIX 5: track reserved margin
                self._total_reserved_margin += margin
        else:
            pos = self._positions[pos_key]
            incoming_lots = order.lots if order.action == "BUY" else -order.lots

            if (pos.lots > 0 and incoming_lots < 0) or (pos.lots < 0 and incoming_lots > 0):
                # Closing / reducing position
                closing_lots     = min(abs(pos.lots), abs(incoming_lots))
                exit_qty         = closing_lots * self.lot_size
                lots_before_close = abs(pos.lots)  # FIX 4: capture before modification

                if pos.instrument == cfg.INSTRUMENT_FUTURES:
                    gross_pnl = (fill_price - pos.avg_price) * exit_qty * (1 if pos.lots > 0 else -1)
                    # FIX 1: release margin at ENTRY avg_price, not exit fill_price
                    released_margin = pos.avg_price * exit_qty * 0.10
                    self.balance += released_margin
                    # FIX 5: reduce total reserved margin
                    self._total_reserved_margin -= released_margin
                else:
                    gross_pnl = (fill_price - pos.avg_price) * exit_qty * (1 if pos.lots > 0 else -1)

                # FIX 4: proportional share of entry fees for this closing leg
                proportional_entry_fees = pos.entry_fees * (closing_lots / lots_before_close)
                # net_pnl deducts BOTH entry fees and exit fees so Trade record is accurate
                net_pnl = gross_pnl - proportional_entry_fees - fees

                self.balance          += gross_pnl
                self._realised_pnl_today += net_pnl

                trade = Trade(
                    trade_id    = str(uuid.uuid4())[:8].upper(),
                    symbol      = symbol,
                    instrument  = pos.instrument,
                    action      = "BUY" if pos.lots > 0 else "SELL",  # entry direction
                    lots        = closing_lots,
                    entry_price = pos.avg_price,
                    exit_price  = fill_price,
                    entry_fees  = round(proportional_entry_fees, 2),  # FIX 4
                    exit_fees   = fees,
                    gross_pnl   = round(gross_pnl, 2),
                    net_pnl     = round(net_pnl,   2),
                    entry_time  = pos.open_time,
                    exit_time   = order.timestamp,
                )
                self._trades.append(trade)

                remaining = pos.lots + incoming_lots
                if remaining == 0:
                    del self._positions[pos_key]
                else:
                    pos.lots = remaining
                    # FIX 4: reduce entry_fees proportionally for the remaining position
                    pos.entry_fees -= proportional_entry_fees
            else:
                # Adding to position (average down/up)
                total_lots  = abs(pos.lots) + abs(incoming_lots)
                pos.avg_price = (
                    (pos.avg_price * abs(pos.lots) + fill_price * abs(incoming_lots))
                    / total_lots
                )
                pos.lots += incoming_lots
                # FIX 4: accumulate entry fees when averaging
                pos.entry_fees += fees

                # FIX 2: reserve additional margin when averaging into futures
                if instrument == cfg.INSTRUMENT_FUTURES:
                    additional_margin = fill_price * abs(incoming_lots) * self.lot_size * 0.10
                    self.balance -= additional_margin
                    # FIX 5: track reserved margin
                    self._total_reserved_margin += additional_margin

        self._update_drawdown()

    def _update_drawdown(self) -> None:
        """Track peak balance and maximum drawdown."""
        current = self.balance + self._calc_unrealised_pnl()
        if current > self._peak_balance:
            self._peak_balance = current
        drawdown = self._peak_balance - current
        if drawdown > self._max_drawdown:
            self._max_drawdown     = drawdown
            self._max_drawdown_pct = drawdown / self._peak_balance * 100

    # ------------------------------------------------------------------
    # Risk management guards
    # ------------------------------------------------------------------

    def _check_risk_limits(self, order: Order) -> str:
        """Return an empty string if OK, or a rejection reason string."""
        self._maybe_reset_day_counters()

        if self._trades_today >= cfg.MAX_TRADES_PER_DAY:
            return f"Max trades/day reached ({cfg.MAX_TRADES_PER_DAY})"

        daily_loss_limit = self.starting_balance * cfg.DAILY_STOP_LOSS_PCT
        if self._realised_pnl_today < -daily_loss_limit:
            return f"Daily stop-loss breached (>{cfg.DAILY_STOP_LOSS_PCT*100:.1f}% of capital)"

        total_open_lots = sum(abs(p.lots) for p in self._positions.values())
        if total_open_lots + order.lots > cfg.MAX_OPEN_LOTS:
            return f"Max open lots ({cfg.MAX_OPEN_LOTS}) would be exceeded"

        if self.balance < cfg.BROKERAGE_PER_ORDER * 2:
            return "Insufficient balance to cover minimum brokerage"

        # Futures margin sufficiency check – reject before the order touches balance
        if order.instrument == cfg.INSTRUMENT_FUTURES and order.action == "BUY":
            latest_price = self._market_prices.get(
                f"{order.symbol}_{order.instrument}", 0.0
            )
            if latest_price > 0:
                required_margin = latest_price * order.lots * self.lot_size * 0.10
                if self.balance < required_margin + cfg.BROKERAGE_PER_ORDER:
                    return (
                        f"Insufficient margin for futures: need ₹{required_margin:,.0f} "
                        f"(10% SPAN), have ₹{self.balance:,.0f}"
                    )

        return ""

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def get_account_summary(self) -> dict:
        """Return a snapshot of the current virtual account state."""
        unrealised_pnl = self._calc_unrealised_pnl()
        # FIX 5: exclude reserved margin from balance difference so P&L is not distorted
        realised_pnl   = (self.balance - self.starting_balance) + self._total_reserved_margin
        total_pnl      = realised_pnl + unrealised_pnl

        return {
            "balance":             round(self.balance,                    2),
            "starting_balance":    round(self.starting_balance,           2),
            "unrealised_pnl":      round(unrealised_pnl,                  2),
            "realised_pnl_today":  round(self._realised_pnl_today,        2),
            "total_pnl":           round(total_pnl,                       2),
            "total_pnl_pct":       round(total_pnl / self.starting_balance * 100, 3),
            "open_positions":      len(self._positions),
            "trades_today":        self._trades_today,
            "total_trades":        len(self._trades),
            "total_fees_paid":     round(sum(o.fees for o in self._orders if o.status == "FILLED"), 2),
            # FIX 5: expose reserved margin and available balance
            "reserved_margin":     round(self._total_reserved_margin,     2),
            "available_balance":   round(self.balance,                    2),
            "peak_balance":        round(self._peak_balance,              2),
            "max_drawdown":        round(self._max_drawdown,              2),
            "max_drawdown_pct":    round(self._max_drawdown_pct,          3),
        }

    def get_open_positions(self) -> List[dict]:
        return [
            {
                "symbol":    p.symbol,
                "instrument": p.instrument,
                "lots":      p.lots,
                "avg_price": p.avg_price,
                "open_time": p.open_time.isoformat(),
                "current_price": self._market_prices.get(f"{p.symbol}_{p.instrument}", p.avg_price),
            }
            for p in self._positions.values()
        ]

    def get_trade_history(self) -> List[dict]:
        return [
            {
                "trade_id":    t.trade_id,
                "symbol":      t.symbol,
                "instrument":  t.instrument,
                "action":      t.action,
                "lots":        t.lots,
                "entry":       t.entry_price,
                "exit":        t.exit_price,
                "entry_fees":  t.entry_fees,
                "exit_fees":   t.exit_fees,
                "gross_pnl":   t.gross_pnl,
                "net_pnl":     t.net_pnl,
                "entry_time":  t.entry_time.isoformat(),
                "exit_time":   t.exit_time.isoformat(),
            }
            for t in self._trades
        ]

    def _calc_unrealised_pnl(self) -> float:
        total = 0.0
        for pos_key, pos in self._positions.items():
            market_key = f"{pos.symbol}_{pos.instrument}"
            mp  = self._market_prices.get(market_key, pos.avg_price)
            qty = abs(pos.lots) * self.lot_size
            direction = 1 if pos.lots > 0 else -1
            total += (mp - pos.avg_price) * qty * direction
        return total

    def print_fee_breakdown(
        self,
        instrument: str,
        action: str,
        lots: int,
        price: float,
    ) -> None:
        """Pretty-print the detailed fee breakdown for a hypothetical trade."""
        fees = calculate_fo_fees(instrument, action, lots, price, self.lot_size)
        qty  = lots * self.lot_size
        notional = price * qty
        print(f"\n{'='*55}")
        print(f"  Fee Breakdown – {action} {lots}L {instrument} @ ₹{price:,.2f}")
        print(f"  Notional value : ₹{notional:>12,.2f}  (qty={qty})")
        print(f"{'='*55}")
        for k, v in fees.items():
            if k != "total":
                label = k.replace("_", " ").title().ljust(24)
                print(f"  {label}: ₹{v:>10,.2f}")
        print(f"{'─'*55}")
        print(f"  {'TOTAL CHARGES'.ljust(24)}: ₹{fees['total']:>10,.2f}")
        print(f"  {'as % of notional'.ljust(24)}:  {fees['total']/notional*100:>9.4f}%")
        print(f"{'='*55}\n")
