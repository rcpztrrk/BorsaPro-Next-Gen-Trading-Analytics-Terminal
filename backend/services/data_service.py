import yfinance as yf
import pandas as pd
import requests
from bs4 import BeautifulSoup
import time
import math
from datetime import datetime, timedelta
from typing import Dict, List
import sys
import os
import pytz

# Import utilities (assuming project root is in sys.path)
try:
    from utils.helpers import safe_print
except ImportError:
    def safe_print(msg): print(msg)

class DataService:
    def __init__(self, cache_duration_minutes: int = 15):
        self.cache_duration = cache_duration_minutes
        self._price_cache = {}
        self._fundamental_cache = {}
        
    def clear_cache(self):
        self._price_cache = {}
        self._fundamental_cache = {}
        print("[OK] Data Service cache cleared.")
        
    def get_stock_data(self, symbol: str, period: str = "1y", interval: str = "1d") -> Dict:
        # Same logic as DataEngine.get_stock_data
        print(f"[>>] Fetching data: {symbol} ({period}/{interval})")
        
        result = {
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),
            'price_data': None,
            'fundamental': None,
            'news': [],
            'error': None
        }
        
        try:
            # 1. Price Data
            df = self._get_price_data(symbol, period, interval)
            # Convert DataFrame to JSON-friendly dict for API response
            if not df.empty:
                # Reset index to make Date a column
                if isinstance(df.index, pd.DatetimeIndex):
                    df = df.reset_index()
                    df.rename(columns={'index': 'Date', 'Datetime': 'Date'}, inplace=True)
                
                # Ensure Date column exists, if not finding it, try first column
                if 'Date' not in df.columns and len(df.columns) > 0:
                     # Fallback: rename first column to Date
                     df.rename(columns={df.columns[0]: 'Date'}, inplace=True)

                # Convert timestamps to string
                for col in df.columns:
                    if pd.api.types.is_datetime64_any_dtype(df[col]):
                        df[col] = df[col].dt.strftime('%Y-%m-%d %H:%M:%S')
                
                result['price_data'] = df.to_dict(orient='records')
            
            # 2. Fundamental Data
            result['fundamental'] = self._get_fundamental_data(symbol)
            
            # 3. News (Simplified for API)
            result['news'] = self._get_news_data(symbol)

            # 4. Correlation Data (New Feature)
            result['correlation'] = self._get_correlation_data(symbol)
            
        except Exception as e:
            result['error'] = str(e)
            print(f"[ERROR] Fetch failed ({symbol}): {e}")
            
        return result

    def _get_price_data(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        # Copied logic from DataEngine
        cache_key = f"{symbol}_{period}_{interval}"
        if cache_key in self._price_cache:
            cached_time, cached_data = self._price_cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=self.cache_duration):
                # Ensure we return a DataFrame, as cached_data is now a list of dicts
                return pd.DataFrame(cached_data)
        
        try:
            ticker = yf.Ticker(symbol)
            
            # Smart period logic (pushing usage limits for free intraday data)
            target_period = period
            if period.lower() == "max":
                if interval == "1h":
                    target_period = "730d"  # yfinance limit for hourly
                elif interval in ["2m", "5m", "15m", "30m", "90m"]:
                    target_period = "60d"   # yfinance limit for most intraday
                elif interval == "1m":
                    target_period = "7d"    # yfinance limit for 1-minute
                else:
                    target_period = "max"
            elif period == "1d" and interval in ["1m", "5m", "15m", "30m", "1h"]:
                target_period = "5d"

            df = ticker.history(
                period=target_period,
                interval=interval, 
                auto_adjust=False,
                prepost=True  # Enable pre/post market for more intraday candles
            )
            
            if df.empty:
                # Fallback
                df = ticker.history(period="1mo", interval=interval, auto_adjust=False)
            
            if df.empty:
                return pd.DataFrame()

            # Format data
            data = []
            
            # Localize to Istanbul time
            utc_tz = pytz.utc
            istanbul_tz = pytz.timezone('Europe/Istanbul')

            for index, row in df.iterrows():
                # Timestamp handling
                dt_istanbul = None
                if isinstance(index, pd.Timestamp):
                    dt_utc = index.replace(tzinfo=utc_tz) if index.tzinfo is None else index
                    dt_istanbul = dt_utc.astimezone(istanbul_tz)
                else:
                    try:
                        dt_utc = pd.to_datetime(index).replace(tzinfo=utc_tz)
                        dt_istanbul = dt_utc.astimezone(istanbul_tz)
                    except:
                        continue

                # Filter for BIST Trading Hours (10:00 - 18:05) strictly for intraday
                if interval in ["1m", "2m", "5m", "15m", "30m", "1h", "90m"]:
                    if dt_istanbul:
                        # Market Open: 10:00. Market Close: 18:05 (approx)
                        # We include 10:00 <= time <= 18:05
                        total_minutes = dt_istanbul.hour * 60 + dt_istanbul.minute
                        # 10:00 = 600 min, 18:05 = 1085 min
                        if total_minutes < 600 or total_minutes > 1085:
                            continue

                item = {
                    "Date": dt_istanbul.isoformat() if dt_istanbul else str(index),
                    "Open": row['Open'],
                    "High": row['High'],
                    "Low": row['Low'],
                    "Close": row['Close'],
                    "Volume": row['Volume']
                }
                data.append(item)
            
            self._price_cache[cache_key] = (datetime.now(), data)
            return pd.DataFrame(data) 
            
        except Exception as e:
            print(f"Error getting price data: {e}")
            return pd.DataFrame()

    def _get_fundamental_data(self, symbol: str) -> Dict:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info or {} # Handle None info
            
            def safe_num(val):
                """Helper to ensure numbers are JSON-friendly (no NaN/Inf)"""
                try:
                    num = float(val)
                    if math.isnan(num) or math.isinf(num):
                        return None
                    return num
                except:
                    return None

            # 1. Basic Info & Info-based metrics
            dict_data = {
                'name': info.get('longName') or info.get('shortName') or symbol,
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'ozet': info.get('longBusinessSummary'),
                'piyasa_degeri': safe_num(info.get('marketCap')),
                'enterprise_value': safe_num(info.get('enterpriseValue')),
                'fk_orani': safe_num(info.get('trailingPE')),
                'pd_dd_orani': safe_num(info.get('priceToBook')),
                'peg_orani': safe_num(info.get('pegRatio')),
                'eps': safe_num(info.get('trailingEps')),
                'temettu_verimi': safe_num(info.get('dividendYield')),
                'ozsermaye_karliligi': safe_num(info.get('returnOnEquity')),
                'son_fiyat': safe_num(info.get('regularMarketPrice') or info.get('currentPrice')),
                'gunluk_degisim': safe_num(info.get('regularMarketChangePercent')),
                'elli_gunluk_ort': safe_num(info.get('fiftyDayAverage')),
                'iki_yuz_gunluk_ort': safe_num(info.get('twoHundredDayAverage')),
                'hedef_dusuk': safe_num(info.get('targetLowPrice')),
                'hedef_medyan': safe_num(info.get('targetMedianPrice')),
                'hedef_yuksek': safe_num(info.get('targetHighPrice')),
                'rekomendasyon': info.get('recommendationKey')
            }

            # 2. Capture Statements (Multi-method fallback for stability)
            def capture_stmt(ticker, name):
                try:
                    # Method 1: New get_* methods
                    # IMPORTANT: yfinance expects 'yearly' not 'annual'
                    if name == 'income': stmt = ticker.get_income_stmt(freq='quarterly')
                    elif name == 'balance': stmt = ticker.get_balance_sheet(freq='quarterly')
                    elif name == 'cash': stmt = ticker.get_cash_flow(freq='quarterly')
                    else: stmt = None
                    
                    if stmt is not None and not stmt.empty: return stmt, False
                    
                    # Method 2: Property access
                    prop_name = f'quarterly_{name}_stmt' if name != 'balance' else 'quarterly_balance_sheet'
                    stmt = getattr(ticker, prop_name, None)
                    if stmt is not None and not stmt.empty: return stmt, False
                    
                    # Method 3: Annual fallback (using 'yearly')
                    if name == 'income': stmt = ticker.get_income_stmt(freq='yearly')
                    elif name == 'balance': stmt = ticker.get_balance_sheet(freq='yearly')
                    elif name == 'cash': stmt = ticker.get_cash_flow(freq='yearly')
                    
                    if stmt is not None and not stmt.empty: return stmt, True
                    
                    # Method 4: Annual Property access
                    prop_name = f'{name}_stmt' if name != 'balance' else 'balance_sheet'
                    stmt = getattr(ticker, prop_name, None)
                    if stmt is not None and not stmt.empty: return stmt, True
                    
                    return None, False
                except Exception as e:
                    print(f"Capture error ({name}) for {symbol}: {e}")
                    return None, False

            q_inc, inc_annual = capture_stmt(ticker, 'income')
            q_bs, bs_annual = capture_stmt(ticker, 'balance')
            q_cf, cf_annual = capture_stmt(ticker, 'cash')

            def get_financial_history(stmt, is_annual, mapping):
                if stmt is None or stmt.empty:
                    return {}
                
                result = {}
                # BIST specific: indices often have no spaces or are CamelCase
                index_list = [str(i) for i in stmt.index]
                normalized_indices = {str(i).replace(" ", "").lower(): i for i in stmt.index}
                
                for yf_key, local_key in mapping.items():
                    matched_idx = None
                    norm_target = yf_key.replace(" ", "").lower()
                    
                    # 1. Normalized match (strips spaces/case)
                    if norm_target in normalized_indices:
                        matched_idx = normalized_indices[norm_target]
                    else:
                        # 2. Partial/Fuzzy fallback
                        for norm_idx, original_idx in normalized_indices.items():
                            if norm_target in norm_idx or norm_idx in norm_target:
                                matched_idx = original_idx
                                break
                    
                    if matched_idx is not None:
                        try:
                            row = stmt.loc[matched_idx]
                            if isinstance(row, pd.DataFrame): row = row.iloc[0]
                            values = [safe_num(v) for v in row.tolist()]
                            if not values: continue

                            qoq_val = 0
                            if len(values) >= 2 and values[1] and values[0] is not None:
                                qoq_val = ((values[0] - values[1]) / abs(values[1])) * 100

                            yoy_val = 0
                            comp_idx = 4 if not is_annual else 1
                            if len(values) > comp_idx and values[comp_idx] and values[0] is not None:
                                yoy_val = ((values[0] - values[comp_idx]) / abs(values[comp_idx])) * 100

                            result[local_key] = {
                                'current': values[0],
                                'previous': values[1] if len(values) > 1 else None,
                                'qoq_growth': safe_num(qoq_val),
                                'yoy_growth': safe_num(yoy_val),
                                'raw_history': values, # Keep full array for calculations
                                'history': values[:8],
                                'is_annual': is_annual,
                                'label': matched_idx
                            }
                        except Exception as inner_e:
                            print(f"Error mapping {yf_key} for {symbol}: {inner_e}")
                
                return result

            # A. Income Statement
            inc_map = {
                'Total Revenue': 'satislar',
                'EBITDA': 'favok',
                'Net Income': 'net_kar',
                'Gross Profit': 'brut_kar',
                'Operating Income': 'esas_faaliyet_kari',
                'Pretax Income': 'vergi_oncesi_kar'
            }
            dict_data['gelir_tablosu'] = get_financial_history(q_inc, inc_annual, inc_map)
            dict_data['ceyrek_veriler'] = dict_data['gelir_tablosu']

            # B. Balance Sheet
            bs_map = {
                'Total Assets': 'toplam_varliklar',
                'Total Liabilities': 'toplam_yukumlulukler',
                'Stockholders Equity': 'ozsermaye',
                'Net Debt': 'net_borc',
                'Cash And Cash Equivalents': 'nakit',
                'Inventory': 'stoklar'
            }
            dict_data['bilanco'] = get_financial_history(q_bs, bs_annual, bs_map)
            if dict_data['bilanco']:
                dict_data['bilanco_ozet'] = {k: v['current'] for k, v in dict_data['bilanco'].items()}

            # C. Cash Flow
            cf_map = {
                'Operating Cash Flow': 'isletme_nakit_akisi',
                'Free Cash Flow': 'serbest_nakit_akisi',
                'Investing Cash Flow': 'yatirim_nakit_akisi',
                'Financing Cash Flow': 'finansman_nakit_akisi'
            }
            dict_data['nakit_akim'] = get_financial_history(q_cf, cf_annual, cf_map)

            # D. Calculate Advanced Ratios (ROE, ROA, Margins)
            def calculate_ratios(data):
                inc = data.get('gelir_tablosu', {})
                bs = data.get('bilanco', {})
                
                # Check for critical nodes
                if not inc or not bs: return {}
                
                ratios = {}
                
                # 1. ROE (Net Income / Stockholders Equity)
                net_income = inc.get('net_kar', {}).get('raw_history', [])
                equity = bs.get('ozsermaye', {}).get('raw_history', [])
                
                if net_income and equity:
                    min_len = min(len(net_income), len(equity))
                    roe_history = []
                    for i in range(min_len):
                        if equity[i] and equity[i] != 0:
                            roe_history.append((net_income[i] / abs(equity[i])) * 100)
                        else:
                            roe_history.append(None)
                    
                    if roe_history:
                        ratios['roe'] = {
                            'current': roe_history[0],
                            'history': roe_history[:8],
                            'yoy_growth': safe_num(((roe_history[0] - roe_history[4]) / abs(roe_history[4])) * 100) if len(roe_history) > 4 and roe_history[4] else 0
                        }

                # 2. ROA (Net Income / Total Assets)
                assets = bs.get('toplam_varliklar', {}).get('raw_history', [])
                if net_income and assets:
                    min_len = min(len(net_income), len(assets))
                    roa_history = []
                    for i in range(min_len):
                        if assets[i] and assets[i] != 0:
                            roa_history.append((net_income[i] / abs(assets[i])) * 100)
                        else:
                            roa_history.append(None)
                    
                    if roa_history:
                        ratios['roa'] = {
                            'current': roa_history[0],
                            'history': roa_history[:8],
                            'yoy_growth': safe_num(((roa_history[0] - roa_history[4]) / abs(roa_history[4])) * 100) if len(roa_history) > 4 and roa_history[4] else 0
                        }

                # 3. Net Margin (Net Income / Revenue)
                rev = inc.get('satislar', {}).get('raw_history', [])
                if net_income and rev:
                    min_len = min(len(net_income), len(rev))
                    margin_history = []
                    for i in range(min_len):
                        if rev[i] and rev[i] != 0:
                            margin_history.append((net_income[i] / abs(rev[i])) * 100)
                        else:
                            margin_history.append(None)
                    
                    if margin_history:
                        ratios['net_marj'] = {
                            'current': margin_history[0],
                            'history': margin_history[:8],
                            'yoy_growth': safe_num(((margin_history[0] - margin_history[4]) / abs(margin_history[4])) * 100) if len(margin_history) > 4 and margin_history[4] else 0
                        }
                
                # 4. Cari Oran (Current Assets / Current Liabilities)
                # Note: yfinance indices for these can vary, but let's try standard ones
                cur_assets = bs.get('toplam_varliklar', {}).get('raw_history', []) # Fallback to total if current is missing
                cur_liab = bs.get('toplam_yukumlulukler', {}).get('raw_history', [])
                
                # Check if we can find more specific 'Current' indices
                # (Logic would go here, but for now we'll use totals or existing nodes)
                
                # 5. Borç/Özsermaye (Total Liabilities / Stockholders Equity)
                liab = bs.get('toplam_yukumlulukler', {}).get('raw_history', [])
                if liab and equity:
                    min_len = min(len(liab), len(equity))
                    der_history = []
                    for i in range(min_len):
                        if equity[i] and equity[i] != 0:
                            der_history.append(liab[i] / abs(equity[i]))
                        else:
                            der_history.append(None)
                    
                    if der_history:
                        ratios['borc_ozsermaye'] = {
                            'current': der_history[0],
                            'history': der_history[:8],
                            'yoy_growth': safe_num(((der_history[0] - der_history[4]) / abs(der_history[4])) * 100) if len(der_history) > 4 and der_history[4] else 0
                        }
                
                return ratios

            dict_data['oranlar'] = calculate_ratios(dict_data)

            # Cleanup raw_history strings to save bandwidth
            for node in ['gelir_tablosu', 'bilanco', 'nakit_akim']:
                if node in dict_data:
                    for k in dict_data[node]:
                        if 'raw_history' in dict_data[node][k]:
                            del dict_data[node][k]['raw_history']

            return dict_data
        except Exception as e:
            print(f"Fundamental error for {symbol}: {e}")
            return {}

    def _get_news_data(self, symbol: str) -> List[Dict]:
         # Simplified news fetch
        try:
            ticker = yf.Ticker(symbol)
            return ticker.news[:5]
        except:
            return []

    def _get_correlation_data(self, symbol: str) -> List[Dict]:
        """
        Calculates Pearson correlation between the stock and major benchmarks.
        """
        try:
            # 1. Define Benchmarks
            benchmarks = {
                'USD/TRY': 'TRY=X',
                'Gram Altın': 'GC=F', # Global Gold Futures (Proxy)
                'S&P 500': '^GSPC',
                'BIST 100': 'XU100.IS'
            }
            
            # 2. Fetch History (Last 1 year, daily)
            # We need aligned dates for correlation
            period = "1y"
            interval = "1d"
            
            # Target Stock Data
            target_df = self._get_price_data(symbol, period, interval)
            if target_df.empty: return []

            # Prepare Target Series (Close prices indexed by Date)
            # Ensure Date is datetime object for alignment
            target_df['Date'] = pd.to_datetime(target_df['Date'].apply(lambda x: x.split('T')[0] if 'T' in str(x) else x))
            target_series = target_df.set_index('Date')['Close']

            correlations = []

            for label, ticker_symbol in benchmarks.items():
                if ticker_symbol == symbol: continue # Don't correlate with itself

                # Fetch Benchmark Data
                bench_df = self._get_price_data(ticker_symbol, period, interval)
                if bench_df.empty: continue

                bench_df['Date'] = pd.to_datetime(bench_df['Date'].apply(lambda x: x.split('T')[0] if 'T' in str(x) else x))
                bench_series = bench_df.set_index('Date')['Close']

                # 3. Align and Calculate Correlation
                # Inner join to match dates exactly
                combined = pd.concat([target_series, bench_series], axis=1, join='inner')
                if len(combined) < 30: continue # Need enough data points

                corr_val = combined.iloc[:, 0].corr(combined.iloc[:, 1])
                
                # Determine "Driver" status
                # If correlation is high (>0.7 or <-0.7), it's a strong driver
                status = "Nötr"
                if corr_val > 0.7: status = "Pozitif"
                elif corr_val < -0.7: status = "Ters (Negatif)"
                elif corr_val > 0.4: status = "Hafif Pozitif"
                elif corr_val < -0.4: status = "Hafif Ters"

                correlations.append({
                    'id': ticker_symbol,
                    'label': label,
                    'correlation': round(corr_val, 2),
                    'status': status,
                    'info': f"{label} ile {status.lower()} ilişki"
                })


            return correlations

        except Exception as e:
            print(f"Correlation error for {symbol}: {e}")
            return []

