# BorsaPro Terminal - Professional Financial Analysis & Portfolio Management System

A modern, high-performance stock tracking terminal built for Borsa Istanbul (BIST). Powered by the **yfinance API**, it provides real-time price tracking, 30+ technical indicators, professional drawing tools with persistent storage, a parallel stock screener, and detailed financial analysis.

---

## Features

### Advanced Charting Engine
- **Lightweight Charts**: Smooth, professional charting experience powered by TradingView's open-source library.
- **Multiple Timeframes**: Analyze data across intervals ranging from 1 minute to 1 week.
- **TradingView-Level Navigation**: Deep zoom-out (0.0001 bar spacing), free vertical/horizontal panning, axis drag-to-scale, and double-click reset for both price and time axes.
- **Interactive Drawing Tools**: Trend lines, Fibonacci retracements, boxes (supply/demand zones), and horizontal lines directly on the chart. All drawings support handle-based resizing and drag-to-move.
- **Context Menu**: Right-click any drawing to delete or manage it individually.
- **Persistent Storage**: Drawings are stored per symbol in a SQLite database. They survive page refreshes and symbol changes.

### Backtest Simulator (Market Replay)
- **Full-Page Simulator**: Replay historical candles forward one by one or at adjustable speeds, enabling manual strategy testing.
- **Multi-Timeframe Support**: Choose between 1m, 5m, 15m, 1h, 1d, and 1wk intervals for backtesting.
- **Maximum Data Coverage**: Fetches the maximum available historical data from yfinance for each timeframe.
- **Trade Execution**: Place simulated BUY/SELL trades at any point during replay, with automatic P&L and equity tracking.
- **Performance Dashboard**: Live tracking of balance, total return, win rate, and full trade history.

### Technical Indicators (30+)
- **Trend**: MA (20/50/200), EMA (9/21), SuperTrend, NW Smooth (LuxAlgo adaptation).
- **Momentum**: RSI, MACD, Stochastic %K/%D, Williams %R.
- **Volatility**: Bollinger Bands, ATR.
- **Volume**: MFI, CMF, VWAP, CCI.
- **AI**: AI Pattern recognition with confidence scores.

### Stock Screener
- **Parallel Processing**: Scans all BIST 100 stocks in under 10 seconds using ThreadPoolExecutor.
- **6-Zone RSI Analysis**: Generates signals across Oversold, Accumulation, Neutral, Momentum, Overbought, and Danger zones.
- **EMA Crossover Signals**: Detects EMA 200 positioning, Golden Cross, and Death Cross events.
- **Dynamic Filtering**: Filter and sort results by signal type in real time.

### Financial Health and Ratios
- **Profitability**: ROE, ROA, Net Margin tracking.
- **Health**: Current Ratio, Debt/Equity ratios.
- **Financial Statements**: Income Statement, Balance Sheet, and Cash Flow summaries (Annual and Quarterly).

---

## Getting Started

The fastest way to start is by running `baslat.bat` in the project root. For manual setup:

### 1. Backend (Python + FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## Architecture

```
borsa_terminali/
  backend/
    api/
      routes.py              # FastAPI endpoint definitions
    services/
      data_service.py        # yfinance data fetching and processing
      indicator_service.py   # Technical indicator calculations
      screener_service.py    # Parallel stock screening engine
      drawing_service.py     # SQLite drawing persistence service
      backtest_service.py    # Backtest simulation engine
    main.py                  # FastAPI application entry point
  frontend/
    src/
      components/
        ChartComponent.jsx       # Main chart and indicator panels
        InteractiveOverlay.jsx   # SVG drawing layer and interactions
        IndicatorModal.jsx       # Indicator selection dialog
        FundamentalPanel.jsx     # Financial ratios panel
        CorrelationCard.jsx      # Correlation card
        BacktestPanel.jsx        # Backtest controls panel
      views/
        ScreenerView.jsx         # Stock screener view
        BacktestView.jsx         # Market replay backtest view
      App.jsx                    # Application root component
      App.css                    # Global styles
  docs/                          # Project documentation (git-ignored)
```

---

## Tech Stack

| Layer         | Technology                         |
|---------------|------------------------------------|
| Languages     | Python 3.10+, JavaScript (ES6+)   |
| Backend       | FastAPI, Uvicorn                   |
| Frontend      | React 18, Vite                     |
| Data          | Pandas, NumPy                      |
| Charting      | TradingView Lightweight Charts     |
| Database      | SQLite (drawing persistence)       |
| Icons         | Lucide React                       |

---

## Disclaimer

This application is developed strictly for **educational and personal tracking purposes**. All market data is sourced from `yfinance` and may be delayed. **This is not investment advice.**

---

*Developer:rcpztrrk
