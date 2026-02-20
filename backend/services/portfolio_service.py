"""
Portfolio Service - SQLite-backed position tracking with live P/L calculation.
Formulas:
    Unrealized P/L = (current_price - avg_cost) * quantity
    Portfolio Weight = (position_value / total_portfolio_value) * 100
"""

import sqlite3
import json
import os
import yfinance as yf
from datetime import datetime
from typing import List, Dict, Optional


class PortfolioService:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, 'portfolio.db')
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS positions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    avg_cost REAL NOT NULL,
                    sector TEXT DEFAULT '',
                    notes TEXT DEFAULT '',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(symbol)
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    type TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    price REAL NOT NULL,
                    date TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    # ---- CRUD Operations ----

    def add_position(self, symbol: str, quantity: float, avg_cost: float,
                     sector: str = '', notes: str = '') -> Dict:
        """Add or update a position. If symbol exists, recalculate average cost."""
        symbol = symbol.upper().strip()
        with sqlite3.connect(self.db_path) as conn:
            existing = conn.execute(
                "SELECT quantity, avg_cost FROM positions WHERE symbol = ?",
                (symbol,)
            ).fetchone()

            if existing:
                old_qty, old_cost = existing
                new_qty = old_qty + quantity
                if new_qty <= 0:
                    conn.execute("DELETE FROM positions WHERE symbol = ?", (symbol,))
                    conn.commit()
                    return {"status": "removed", "symbol": symbol}
                # Weighted average cost
                new_avg = ((old_qty * old_cost) + (quantity * avg_cost)) / new_qty
                conn.execute(
                    "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE symbol = ?",
                    (new_qty, round(new_avg, 4), datetime.now().isoformat(), symbol)
                )
            else:
                conn.execute(
                    "INSERT INTO positions (symbol, quantity, avg_cost, sector, notes) VALUES (?, ?, ?, ?, ?)",
                    (symbol, quantity, avg_cost, sector, notes)
                )

            # Log transaction
            conn.execute(
                "INSERT INTO transactions (symbol, type, quantity, price) VALUES (?, ?, ?, ?)",
                (symbol, 'BUY' if quantity > 0 else 'SELL', abs(quantity), avg_cost)
            )
            conn.commit()

        return {"status": "success", "symbol": symbol}

    def remove_position(self, symbol: str) -> Dict:
        symbol = symbol.upper().strip()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM positions WHERE symbol = ?", (symbol,))
            conn.commit()
        return {"status": "removed", "symbol": symbol}

    def get_positions_raw(self) -> List[Dict]:
        """Get raw positions from DB without live prices."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM positions ORDER BY symbol").fetchall()
            return [dict(r) for r in rows]

    def get_transactions(self, symbol: str = None) -> List[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if symbol:
                rows = conn.execute(
                    "SELECT * FROM transactions WHERE symbol = ? ORDER BY date DESC",
                    (symbol.upper(),)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM transactions ORDER BY date DESC LIMIT 100"
                ).fetchall()
            return [dict(r) for r in rows]

    # ---- Live Valuation ----

    def get_portfolio(self) -> Dict:
        """Full portfolio with live prices, P/L, weights, and risk metrics."""
        positions = self.get_positions_raw()
        if not positions:
            return {
                "positions": [],
                "summary": {
                    "total_cost": 0, "total_value": 0,
                    "total_pnl": 0, "total_pnl_pct": 0,
                    "position_count": 0
                },
                "risk": {"max_weight": 0, "max_weight_symbol": "", "concentration_warning": False}
            }

        # Batch fetch current prices
        symbols = [p['symbol'] for p in positions]
        prices = self._fetch_current_prices(symbols)

        total_cost = 0
        total_value = 0
        enriched = []

        for pos in positions:
            sym = pos['symbol']
            current_price = prices.get(sym, pos['avg_cost'])
            qty = pos['quantity']
            cost_basis = qty * pos['avg_cost']
            market_value = qty * current_price
            pnl = market_value - cost_basis
            pnl_pct = ((current_price - pos['avg_cost']) / pos['avg_cost'] * 100) if pos['avg_cost'] > 0 else 0

            total_cost += cost_basis
            total_value += market_value

            enriched.append({
                "symbol": sym,
                "quantity": qty,
                "avg_cost": round(pos['avg_cost'], 2),
                "current_price": round(current_price, 2),
                "cost_basis": round(cost_basis, 2),
                "market_value": round(market_value, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "sector": pos.get('sector', ''),
                "notes": pos.get('notes', '')
            })

        # Calculate weights
        for item in enriched:
            item['weight'] = round((item['market_value'] / total_value * 100) if total_value > 0 else 0, 2)

        total_pnl = total_value - total_cost
        total_pnl_pct = ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0

        # Risk analysis
        max_weight_item = max(enriched, key=lambda x: x['weight']) if enriched else None
        concentration_warning = max_weight_item and max_weight_item['weight'] > 30

        return {
            "positions": sorted(enriched, key=lambda x: x['market_value'], reverse=True),
            "summary": {
                "total_cost": round(total_cost, 2),
                "total_value": round(total_value, 2),
                "total_pnl": round(total_pnl, 2),
                "total_pnl_pct": round(total_pnl_pct, 2),
                "position_count": len(enriched)
            },
            "risk": {
                "max_weight": round(max_weight_item['weight'], 2) if max_weight_item else 0,
                "max_weight_symbol": max_weight_item['symbol'] if max_weight_item else '',
                "concentration_warning": concentration_warning
            }
        }

    def _fetch_current_prices(self, symbols: List[str]) -> Dict[str, float]:
        """Batch fetch latest prices using yfinance."""
        prices = {}
        try:
            tickers = yf.Tickers(' '.join(symbols))
            for sym in symbols:
                try:
                    ticker = tickers.tickers.get(sym)
                    if ticker:
                        hist = ticker.history(period='1d')
                        if not hist.empty:
                            prices[sym] = float(hist['Close'].iloc[-1])
                except Exception:
                    pass
        except Exception:
            pass
        return prices
