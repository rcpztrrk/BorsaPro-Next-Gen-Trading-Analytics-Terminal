import yfinance as yf
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import time

class NewsService:
    def __init__(self, cache_duration_minutes: int = 30):
        self.cache_duration = cache_duration_minutes
        self._cache = {} # {symbol: (timestamp, news_list)}
        self._general_cache = None # (timestamp, news_list) for general market news

    def get_news(self, symbol: str = None) -> list:
        """ Fetches news for a specific symbol or general market news. """
        now = datetime.now()
        
        # Check cache
        if symbol:
            if symbol in self._cache:
                ts, data = self._cache[symbol]
                if now - ts < timedelta(minutes=self.cache_duration):
                    return data
        else:
            if self._general_cache:
                ts, data = self._general_cache
                if now - ts < timedelta(minutes=self.cache_duration):
                    return data

        # Fetch new data
        all_news = []
        
        # Source 1: yfinance (Good for global and some BIST)
        if symbol:
            all_news.extend(self._fetch_yfinance_news(symbol))
        
        # Source 2: Mynet Finans (Excellent for BIST news and KAP integration)
        # We only do this for BIST stocks or general market
        if not symbol or symbol.endswith('.IS'):
            all_news.extend(self._fetch_bist_news(symbol))

        # Sort by timestamp (if available) or keep order
        # Unique by title
        seen_titles = set()
        unique_news = []
        for n in all_news:
            title = n.get('title')
            if not title:
                continue
            
            clean_title = title.strip().lower()
            if clean_title not in seen_titles:
                unique_news.append(n)
                seen_titles.add(clean_title)

        # Limit to 10-15 latest items
        final_news = unique_news[:15]

        # Update cache
        if symbol:
            self._cache[symbol] = (now, final_news)
        else:
            self._general_cache = (now, final_news)

        return final_news

    def _fetch_yfinance_news(self, symbol: str) -> list:
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news
            results = []
            for n in news:
                results.append({
                    'title': n.get('title'),
                    'publisher': n.get('publisher'),
                    'link': n.get('link'),
                    'provider_publish_time': n.get('providerPublishTime'),
                    'source': 'Yahoo Finance',
                    'type': 'story'
                })
            return results
        except Exception as e:
            print(f"yfinance news error ({symbol}): {e}")
            return []

    def _fetch_bist_news(self, symbol: str = None) -> list:
        """ Fetches Turkish financial news using Google News RSS for symbol-specific results. """
        try:
            import xml.etree.ElementTree as ET
            from urllib.parse import quote
            from email.utils import parsedate_to_datetime
            
            clean_symbol = symbol.split('.')[0] if symbol else "BIST 100"
            
            # We'll fetch two queries if a symbol is provided: "[SYMBOL] hisse" and "[SYMBOL] KAP"
            # If no symbol, just "Borsa İstanbul KAP"
            queries = []
            if symbol:
                queries.append(f'{clean_symbol} hisse')
                queries.append(f'{clean_symbol} "KAP"')
            else:
                queries.append('Borsa İstanbul KAP hisse')

            news_items = []
            seen_links = set()

            headers = {'User-Agent': 'Mozilla/5.0'}

            for query in queries:
                encoded_query = quote(query)
                url = f"https://news.google.com/rss/search?q={encoded_query}&hl=tr&gl=TR&ceid=TR:tr"
                
                resp = requests.get(url, headers=headers, timeout=10)
                if resp.status_code != 200:
                    continue

                xml_data = resp.content.decode('utf-8', errors='replace')
                root = ET.fromstring(xml_data)
                items = root.findall('.//item')
                
                for item in items[:15]:
                    title_elem = item.find('title')
                    link_elem = item.find('link')
                    pubdate_elem = item.find('pubDate')
                    source_elem = item.find('source')
                    
                    title = title_elem.text if title_elem is not None else ""
                    link = link_elem.text if link_elem is not None else ""
                    pubdate = pubdate_elem.text if pubdate_elem is not None else ""
                    publisher = source_elem.text if source_elem is not None else "Haber"

                    if not title or not link or link in seen_links:
                        continue

                    # Clean title: Google news titles usually have " - Publisher Name" at the end
                    clean_title = title.split(' - ')[0] if ' - ' in title else title

                    # Determine if KAP related
                    is_kap = "KAP" in clean_title.upper() or "KAP" in query.upper()
                    
                    # Parse timestamp
                    ts = None
                    try:
                        if pubdate:
                            dt = parsedate_to_datetime(pubdate)
                            ts = int(dt.timestamp())
                    except:
                        pass

                    news_items.append({
                        'title': clean_title.strip(),
                        'publisher': publisher.strip(),
                        'link': link.strip(),
                        'provider_publish_time': ts,
                        'source': 'KAP' if is_kap else 'Haber',
                        'type': 'kap' if is_kap else 'story'
                    })
                    seen_links.add(link)
            
            # Sort by publish time descending
            news_items.sort(key=lambda x: x['provider_publish_time'] or 0, reverse=True)
            return news_items[:15]
            
        except Exception as e:
            print(f"BIST RSS error ({symbol}): {e}")
            return []

news_service = NewsService()
