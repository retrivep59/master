"""
config.py – Central configuration for the BankNifty Paper Trading Simulator.

All monetary values are in INR (₹).
All percentages are expressed as decimals (e.g. 0.05 % → 0.0005).
"""

# ---------------------------------------------------------------------------
# BankNifty Contract Specs
# ---------------------------------------------------------------------------
BANKNIFTY_LOT_SIZE = 15          # lot size as of 2024 revision (was 25 before)
BANKNIFTY_TICK_SIZE = 0.05       # minimum price movement for options (₹)
BANKNIFTY_FUTURES_TICK = 5.0     # minimum price movement for futures (₹)
BANKNIFTY_SYMBOL_NSE = "^NSEBANK"   # yfinance ticker for spot index
BANKNIFTY_SYMBOL_YF  = "BANKNIFTY.NS"  # alternate yfinance fallback

# ---------------------------------------------------------------------------
# Virtual Account
# ---------------------------------------------------------------------------
STARTING_BALANCE = 500_000.0    # ₹5,00,000 virtual capital

# ---------------------------------------------------------------------------
# Realistic Indian F&O Fee Structure (NSE / Zerodha-style flat brokerage)
# ---------------------------------------------------------------------------

# --- Brokerage ---
BROKERAGE_PER_ORDER = 20.0       # ₹20 flat per order (each buy OR sell leg)

# --- Securities Transaction Tax (STT) ---
# Futures  : 0.01 % of turnover on the SELL side only
# Options  : 0.05 % of premium on the SELL side only
STT_FUTURES_SELL   = 0.0001      # 0.01 %
STT_OPTIONS_SELL   = 0.0005      # 0.05 %

# --- NSE Exchange Transaction Charges ---
# Futures  : 0.0019 % of turnover (both sides)
# Options  : 0.0530 % of premium turnover (both sides)
EXCHANGE_CHARGE_FUTURES  = 0.0000190   # 0.0019 %
EXCHANGE_CHARGE_OPTIONS  = 0.0005300   # 0.053  %

# --- Stamp Duty (BUY side only) ---
# Futures  : 0.002 % of turnover
# Options  : 0.003 % of premium
STAMP_DUTY_FUTURES  = 0.00002    # 0.002 %
STAMP_DUTY_OPTIONS  = 0.00003    # 0.003 %

# --- SEBI Regulatory Fee ---
# ₹10 per crore of turnover = 0.000001 (both sides)
SEBI_FEE_RATE = 0.000001         # 0.0001 %

# --- GST (18 % on brokerage + exchange charges) ---
GST_RATE = 0.18                  # 18 %

# --- Clearing charges (NSCCL) ---
# Futures  : 0.0005 % of turnover
# Options  : 0.0005 % of premium
CLEARING_CHARGE_RATE = 0.000005  # 0.0005 %

# ---------------------------------------------------------------------------
# Slippage Model
# ---------------------------------------------------------------------------
# Applied as a random offset sampled from a normal distribution:
#   fill_price = quote ± N(mean=SLIPPAGE_MEAN, std=SLIPPAGE_STD)
# For futures the unit is index points; for options it is premium points.
SLIPPAGE_MEAN_FUTURES = 1.5      # avg adverse slippage in index points
SLIPPAGE_STD_FUTURES  = 1.0      # std-dev of slippage

SLIPPAGE_MEAN_OPTIONS = 1.50     # increased from 0.50 to 1.50 premium points (realistic spread)
SLIPPAGE_STD_OPTIONS  = 2.00     # increased from 0.75 to 2.00 (much wider spread)

# ---------------------------------------------------------------------------
# Risk Management Defaults (overridable per agent)
# ---------------------------------------------------------------------------
MAX_TRADES_PER_DAY      = 10     # max round-trips per session
DAILY_STOP_LOSS_PCT     = 0.02   # halt trading if daily loss > 2 % of capital
MAX_OPEN_LOTS           = 4      # max lots open at any time
MAX_LOSS_PER_TRADE_PCT  = 0.005  # force-exit if single trade loses > 0.5 %

# ---------------------------------------------------------------------------
# Data Feed Settings
# ---------------------------------------------------------------------------
DATA_INTERVAL          = "5m"   # default candle interval  ("1m", "5m", "15m")
DATA_PERIOD_DAYS       = 60     # days of history to back-load
NSE_MARKET_OPEN_IST    = "09:15"
NSE_MARKET_CLOSE_IST   = "15:30"
IST_TIMEZONE           = "Asia/Kolkata"

# ---------------------------------------------------------------------------
# Instrument types (used as literals throughout the codebase)
# ---------------------------------------------------------------------------
INSTRUMENT_FUTURES = "FUTURES"
INSTRUMENT_CALL    = "CE"
INSTRUMENT_PUT     = "PE"
