import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Optional

class DrawingService:
    def __init__(self, db_path: str = "drawings.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initializes the SQLite database with the drawings table."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS drawings (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                type TEXT NOT NULL,
                data TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_symbol ON drawings(symbol)')
        conn.commit()
        conn.close()

    def save_drawings(self, symbol: str, drawings: List[Dict]) -> bool:
        """
        Saves a list of drawings for a specific symbol.
        Replaces existing drawings for that symbol to keep it simple (overwrite sync).
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Start transaction
            cursor.execute('BEGIN TRANSACTION')
            
            # 1. Delete existing for this symbol
            cursor.execute('DELETE FROM drawings WHERE symbol = ?', (symbol,))
            
            # 2. Insert new drawings
            now = datetime.now().isoformat()
            for d in drawings:
                drawing_id = str(d.get('id', datetime.now().timestamp()))
                dtype = d.get('type', 'trend')
                data_json = json.dumps(d)
                cursor.execute(
                    'INSERT INTO drawings (id, symbol, type, data, updated_at) VALUES (?, ?, ?, ?, ?)',
                    (drawing_id, symbol, dtype, data_json, now)
                )
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving drawings for {symbol}: {e}")
            return False

    def get_drawings(self, symbol: str) -> List[Dict]:
        """Retrieves all drawings for a specific symbol."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT data FROM drawings WHERE symbol = ?', (symbol,))
            rows = cursor.fetchall()
            conn.close()
            
            drawings = [json.loads(row[0]) for row in rows]
            return drawings
        except Exception as e:
            print(f"Error retrieving drawings for {symbol}: {e}")
            return []
