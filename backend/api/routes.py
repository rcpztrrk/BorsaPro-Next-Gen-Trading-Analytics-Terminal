from fastapi import APIRouter, HTTPException, Request
from services.data_service import DataService
from services.indicator_service import IndicatorService
from services.screener_service import ScreenerService
from services.drawing_service import DrawingService
from services.portfolio_service import PortfolioService
from services.watchlist_service import WatchlistService
from typing import Optional, List
from pydantic import BaseModel

router = APIRouter()
data_service = DataService()
indicator_service = IndicatorService()
screener_service = ScreenerService(indicator_service)
drawing_service = DrawingService()
portfolio_service = PortfolioService()
watchlist_service = WatchlistService()

# --- WATCHLIST ENDPOINTS ---

class WatchlistInput(BaseModel):
    symbol: str

class WatchlistOrderInput(BaseModel):
    order: List[str]

@router.get("/watchlist")
def get_watchlist():
    return watchlist_service.get_watchlist()

@router.get("/watchlist/data")
def get_watchlist_data():
    symbols_data = watchlist_service.get_watchlist()
    symbols = [s['symbol'] for s in symbols_data]
    if not symbols:
        return []
    
    prices = data_service.fetch_latest_prices(symbols)
    result = []
    for s_meta in symbols_data:
        sym = s_meta['symbol']
        p_data = prices.get(sym, {"price": 0, "change": 0, "percent": 0})
        result.append({
            "symbol": sym,
            "order_index": s_meta['order_index'],
            **p_data
        })
    return result

@router.post("/watchlist")
def add_to_watchlist(input: WatchlistInput):
    success = watchlist_service.add_symbol(input.symbol)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add symbol")
    return {"status": "success"}

@router.delete("/watchlist/{symbol}")
def remove_from_watchlist(symbol: str):
    success = watchlist_service.remove_symbol(symbol)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove symbol")
    return {"status": "success"}

@router.put("/watchlist/reorder")
def reorder_watchlist(input: WatchlistOrderInput):
    success = watchlist_service.update_order(input.order)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update order")
    return {"status": "success"}

# --- PORTFOLIO ENDPOINTS ---

class PositionInput(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    sector: str = ''
    notes: str = ''

@router.get("/portfolio")
def get_portfolio():
    """Returns full portfolio with live prices, P/L, weights, and risk metrics."""
    return portfolio_service.get_portfolio()

@router.post("/portfolio")
def add_position(pos: PositionInput):
    """Add or update a position. If symbol exists, recalculates weighted average cost."""
    return portfolio_service.add_position(
        symbol=pos.symbol, quantity=pos.quantity, avg_cost=pos.avg_cost,
        sector=pos.sector, notes=pos.notes
    )

@router.delete("/portfolio/{symbol}")
def remove_position(symbol: str):
    """Remove a position entirely."""
    return portfolio_service.remove_position(symbol)

@router.get("/portfolio/transactions")
def get_transactions(symbol: str = None):
    """Returns transaction history, optionally filtered by symbol."""
    return portfolio_service.get_transactions(symbol)


@router.get("/drawings/{symbol}")
def get_drawings(symbol: str):
    return drawing_service.get_drawings(symbol)

@router.post("/drawings/{symbol}")
async def save_drawings(symbol: str, request: Request):
    try:
        drawings = await request.json()
        success = drawing_service.save_drawings(symbol, drawings)
        return {"status": "success" if success else "error"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- EXISTING ENDPOINTS ---

@router.get("/stock/{symbol}")
def get_stock(symbol: str, period: str = "1y", interval: str = "1d", indicators: bool = True):
    """
    Get stock data with optional indicators.
    """
    try:
        # Fetch raw data
        result = data_service.get_stock_data(symbol, period, interval)
        
        if result.get('error'):
            raise HTTPException(status_code=400, detail=result['error'])
            
        # Calculate indicators if requested
        if indicators and result['price_data']:
            result['price_data'] = indicator_service.add_indicators(result['price_data'])
            
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/screener/start")
def start_screener():
    """Triggers a background scan."""
    screener_service.start_background_scan()
    return {"message": "Screener started in background"}

@router.get("/screener/status")
def get_screener_status():
    """Returns current scan status and progress."""
    return screener_service.get_status()

@router.get("/screener/results")
def get_screener_results(filter: Optional[str] = None):
    """Returns the latest screening results."""
    return screener_service.get_results(filter_type=filter)

@router.get("/index/{symbol}")
def get_index_data(symbol: str):
    """
    Simplified endpoint for top-bar index tracking (BIST100, etc.)
    """
    try:
        # We use a 5d period with 1d interval to get latest change
        data = data_service.get_stock_data(symbol, "5d", "1d")
        if data.get('price_data') and len(data['price_data']) >= 2:
            latest = data['price_data'][-1]
            prev = data['price_data'][-2]
            
            close = latest['Close']
            change = close - prev['Close']
            pct = (change / prev['Close']) * 100
            
            return {
                "symbol": symbol,
                "price": close,
                "change": change,
                "percent": pct
            }
        return {"error": "Insufficient data"}
    except Exception as e:
        return {"error": str(e)}

@router.get("/indices")
def get_top_indices():
    # Return a quick list of main index values
    return [
       get_index_data("XU100.IS"),
       get_index_data("USDTRY=X")
    ]

@router.get("/symbols")
def get_all_symbols():
    """Returns a categorized list of all available symbols for the portfolio and search."""
    return {
        "bist_100": [{"symbol": s, "name": s.replace('.IS', '')} for s in screener_service.bist_100_symbols],
        "forex": [
            {"symbol": "USDTRY=X", "name": "USD/TRY - Dolar/TL"},
            {"symbol": "EURTRY=X", "name": "EUR/TRY - Euro/TL"},
            {"symbol": "GBPTRY=X", "name": "GBP/TRY - Sterlin/TL"},
            {"symbol": "EURUSD=X", "name": "EUR/USD - Euro/Dolar"},
            {"symbol": "GBPUSD=X", "name": "GBP/USD - Sterlin/Dolar"},
            {"symbol": "USDJPY=X", "name": "USD/JPY - Dolar/Yen"},
            {"symbol": "USDCHF=X", "name": "USD/CHF - Dolar/Frank"},
            {"symbol": "USDCAD=X", "name": "USD/CAD - Dolar/Kanada"},
            {"symbol": "AUDUSD=X", "name": "AUD/USD - Avustralya/Dolar"},
            {"symbol": "NZDUSD=X", "name": "NZD/USD - Yeni Zelanda/Dolar"},
            {"symbol": "EURGBP=X", "name": "EUR/GBP - Euro/Sterlin"},
            {"symbol": "EURJPY=X", "name": "EUR/JPY - Euro/Yen"},
            {"symbol": "GBPJPY=X", "name": "GBP/JPY - Sterlin/Yen"}
        ],
        "commodities": [
            {"symbol": "GC=F", "name": "Altin (Ons)"},
            {"symbol": "SI=F", "name": "Gumus (Ons)"},
            {"symbol": "CL=F", "name": "Ham Petrol (Brent)"},
            {"symbol": "NG=F", "name": "Dogal Gaz"},
            {"symbol": "HG=F", "name": "Bakir"},
            {"symbol": "ZC=F", "name": "Misir"},
            {"symbol": "ZW=F", "name": "Bugday"},
            {"symbol": "KC=F", "name": "Kahve"},
            {"symbol": "CT=F", "name": "Pamuk"}
        ],
        "crypto": [
            {"symbol": "BTC-USD", "name": "Bitcoin (BTC)"},
            {"symbol": "ETH-USD", "name": "Ethereum (ETH)"},
            {"symbol": "SOL-USD", "name": "Solana (SOL)"},
            {"symbol": "BNB-USD", "name": "Binance Coin (BNB)"},
            {"symbol": "XRP-USD", "name": "XRP (Ripple)"},
            {"symbol": "ADA-USD", "name": "Cardano (ADA)"},
            {"symbol": "DOGE-USD", "name": "Dogecoin (DOGE)"},
            {"symbol": "DOT-USD", "name": "Polkadot (DOT)"},
            {"symbol": "TRX-USD", "name": "TRON (TRX)"},
            {"symbol": "LINK-USD", "name": "Chainlink (LINK)"},
            {"symbol": "AVAX-USD", "name": "Avalanche (AVAX)"},
            {"symbol": "SHIB-USD", "name": "Shiba Inu (SHIB)"},
            {"symbol": "MATIC-USD", "name": "Polygon (MATIC)"},
            {"symbol": "LTC-USD", "name": "Litecoin (LTC)"},
            {"symbol": "UNI-USD", "name": "Uniswap (UNI)"},
            {"symbol": "BCH-USD", "name": "Bitcoin Cash (BCH)"},
            {"symbol": "NEAR-USD", "name": "NEAR Protocol (NEAR)"},
            {"symbol": "ATOM-USD", "name": "Cosmos (ATOM)"},
            {"symbol": "XLM-USD", "name": "Stellar (XLM)"},
            {"symbol": "XMR-USD", "name": "Monero (XMR)"},
            {"symbol": "PEPE-USD", "name": "Pepe (PEPE)"},
            {"symbol": "FET-USD", "name": "Fetch.ai (FET)"}
        ]
    }

@router.get("/search/{query}")
def search_stock(query: str):
    # Mock search functionality or implement properly
    return {"results": []}
