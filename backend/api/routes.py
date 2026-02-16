from fastapi import APIRouter, HTTPException
from services.data_service import DataService
from services.indicator_service import IndicatorService
from typing import Optional

router = APIRouter()
data_service = DataService()
indicator_service = IndicatorService()

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

@router.get("/search/{query}")
def search_stock(query: str):
    # Mock search functionality or implement properly
    return {"results": []}
