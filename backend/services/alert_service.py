import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional

class AlertService:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Consistent with other services
            db_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, 'alerts.db')
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initializes the SQLite database with the alerts table."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    target_price REAL NOT NULL,
                    condition TEXT NOT NULL, -- 'ABOVE' or 'BELOW'
                    is_triggered INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    triggered_at DATETIME
                )
            ''')
            conn.commit()

    def add_alert(self, symbol: str, target_price: float, condition: str) -> bool:
        """Adds a new price alert."""
        symbol = symbol.upper().strip()
        condition = condition.upper().strip()
        if condition not in ['ABOVE', 'BELOW']:
            return False
            
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    'INSERT INTO alerts (symbol, target_price, condition) VALUES (?, ?, ?)',
                    (symbol, target_price, condition)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error adding alert for {symbol}: {e}")
            return False

    def get_alerts(self, active_only: bool = False) -> List[Dict]:
        """Retrieves alerts from the database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                if active_only:
                    cursor.execute('SELECT * FROM alerts WHERE is_triggered = 0 ORDER BY created_at DESC')
                else:
                    cursor.execute('SELECT * FROM alerts ORDER BY created_at DESC')
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error retrieving alerts: {e}")
            return []

    def delete_alert(self, alert_id: int) -> bool:
        """Deletes an alert by ID."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('DELETE FROM alerts WHERE id = ?', (alert_id,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error deleting alert {alert_id}: {e}")
            return False

    def check_alerts(self, current_prices: Dict[str, float]) -> List[Dict]:
        """
        Checks current prices against active alerts and returns triggered ones.
        Updates triggered status in DB.
        """
        triggered = []
        try:
            active_alerts = self.get_alerts(active_only=True)
            if not active_alerts:
                return []

            with sqlite3.connect(self.db_path) as conn:
                for alert in active_alerts:
                    symbol = alert['symbol']
                    if symbol not in current_prices:
                        continue
                        
                    curr_price = current_prices[symbol]
                    target = alert['target_price']
                    condition = alert['condition']
                    is_hit = False
                    
                    if condition == 'ABOVE' and curr_price >= target:
                        is_hit = True
                    elif condition == 'BELOW' and curr_price <= target:
                        is_hit = True
                        
                    if is_hit:
                        now = datetime.now().isoformat()
                        conn.execute(
                            'UPDATE alerts SET is_triggered = 1, triggered_at = ? WHERE id = ?',
                            (now, alert['id'])
                        )
                        alert_dict = dict(alert)
                        alert_dict['triggered_price'] = curr_price
                        alert_dict['triggered_at'] = now
                        triggered.append(alert_dict)
                conn.commit()
        except Exception as e:
            print(f"Error checking alerts: {e}")
            
        return triggered
