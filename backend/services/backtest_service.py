import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta

class BacktestService:
    def __init__(self):
        pass

    def run_backtest(self, symbol: str, strategy_name: str, params: dict, initial_capital: float = 10000.0):
        # 1. Fetch historical data (using 1y daily for now)
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period="1y", interval="1d")
            if df.empty:
                return {"error": "No data found for symbol"}
        except Exception as e:
            return {"error": f"Failed to fetch data: {str(e)}"}

        # 2. Apply strategy logic
        if strategy_name == "SMA_CROSS":
            df = self._sma_cross_strategy(df, params)
        elif strategy_name == "RSI":
            df = self._rsi_strategy(df, params)
        else:
            return {"error": f"Strategy {strategy_name} not implemented"}

        # 3. Simulate trades
        results = self._simulate(df, initial_capital)
        return results

    def _sma_cross_strategy(self, df, params):
        fast_period = params.get("fast", 20)
        slow_period = params.get("slow", 50)
        
        df['SMA_Fast'] = df['Close'].rolling(window=fast_period).mean()
        df['SMA_Slow'] = df['Close'].rolling(window=slow_period).mean()
        
        # Signal: 1 for Buy, -1 for Sell
        df['Signal'] = 0
        df.loc[df['SMA_Fast'] > df['SMA_Slow'], 'Signal'] = 1
        df.loc[df['SMA_Fast'] <= df['SMA_Slow'], 'Signal'] = -1
        
        return df

    def _rsi_strategy(self, df, params):
        period = params.get("period", 14)
        overbought = params.get("overbought", 70)
        oversold = params.get("oversold", 30)
        
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        df['Signal'] = 0
        df.loc[df['RSI'] < oversold, 'Signal'] = 1
        df.loc[df['RSI'] > overbought, 'Signal'] = -1
        
        return df

    def _simulate(self, df, initial_capital):
        capital = initial_capital
        position = 0  # 0: neutral, >0: shares held
        trades = []
        equity_curve = []
        
        # We start trading from the first row with a signal
        df = df.dropna(subset=['Signal'])
        
        for index, row in df.iterrows():
            price = row['Close']
            signal = row['Signal']
            date_str = index.strftime('%Y-%m-%d')
            
            # Simple logic: Buy all-in on buy signal, Sell all-out on sell signal
            if signal == 1 and position == 0:
                # Buy
                position = capital / price
                capital = 0
                trades.append({
                    "type": "BUY",
                    "price": price,
                    "date": date_str
                })
            elif signal == -1 and position > 0:
                # Sell
                capital = position * price
                position = 0
                trades.append({
                    "type": "SELL",
                    "price": price,
                    "date": date_str
                })
            
            # Current value for equity curve
            current_value = capital + (position * price)
            equity_curve.append({
                "time": date_str,
                "value": current_value
            })
            
        final_value = capital + (position * df.iloc[-1]['Close'])
        total_return = ((final_value - initial_capital) / initial_capital) * 100
        
        return {
            "summary": {
                "initial_capital": initial_capital,
                "final_value": round(final_value, 2),
                "total_return_pct": round(total_return, 2),
                "trade_count": len(trades)
            },
            "equity_curve": equity_curve,
            "trades": trades
        }

backtest_service = BacktestService()
