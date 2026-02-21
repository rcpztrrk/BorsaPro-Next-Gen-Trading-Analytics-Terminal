import sqlite3
import os
from datetime import datetime
from typing import List, Dict

class WatchlistService:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Consistent with portfolio_service.py
            db_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, 'watchlist.db')
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initializes the SQLite database with the watchlist table."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS watchlist (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT UNIQUE NOT NULL,
                    order_index INTEGER DEFAULT 0,
                    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()

    def get_watchlist(self) -> List[Dict]:
        """Retrieves all symbols in the watchlist ordered by order_index."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('SELECT symbol, order_index FROM watchlist ORDER BY order_index ASC')
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error retrieving watchlist: {e}")
            return []

    def add_symbol(self, symbol: str) -> bool:
        """Adds a symbol to the watchlist."""
        symbol = symbol.upper().strip()
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Find max order_index to append
                cursor = conn.cursor()
                cursor.execute('SELECT MAX(order_index) FROM watchlist')
                max_idx = cursor.fetchone()[0]
                next_idx = (max_idx + 1) if max_idx is not None else 0
                
                cursor.execute(
                    'INSERT OR IGNORE INTO watchlist (symbol, order_index) VALUES (?, ?)',
                    (symbol, next_idx)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error adding {symbol} to watchlist: {e}")
            return False

    def remove_symbol(self, symbol: str) -> bool:
        """Removes a symbol from the watchlist."""
        symbol = symbol.upper().strip()
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('DELETE FROM watchlist WHERE symbol = ?', (symbol,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error removing {symbol} from watchlist: {e}")
            return False

    def update_order(self, order_list: List[str]) -> bool:
        """Updates the order_index for a list of symbols."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('BEGIN TRANSACTION')
                for idx, symbol in enumerate(order_list):
                    cursor.execute(
                        'UPDATE watchlist SET order_index = ? WHERE symbol = ?',
                        (idx, symbol.upper().strip())
                    )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating watchlist order: {e}")
            return False
