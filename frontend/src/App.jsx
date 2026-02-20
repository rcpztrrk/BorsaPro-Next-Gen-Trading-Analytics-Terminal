import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import ChartComponent from './components/ChartComponent';
import FundamentalPanel from './components/FundamentalPanel';
import CorrelationCard from './components/CorrelationCard';
import ScreenerView from './views/ScreenerView';
import PortfolioView from './views/PortfolioView';
import SymbolSearchModal from './components/SymbolSearchModal';
import { Activity, Search, RefreshCw, Settings, BarChart2, PieChart, Briefcase, Plus } from 'lucide-react';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('THYAO.IS');
  const [view, setView] = useState('chart'); // 'chart', 'screener', or 'portfolio'
  const [timeframe, setTimeframe] = useState('1d');
  const period = 'max';
  const [data, setData] = useState({ price: [], indicators: {} });
  const [fundamental, setFundamental] = useState(null);
  const [indices, setIndices] = useState([]);
  const [availableSymbols, setAvailableSymbols] = useState({ bist_100: [], forex: [], commodities: [], crypto: [] });
  const [loading, setLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const abortRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!symbol) return;

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setData({ price: [], indicators: {} });
    setFundamental(null);

    try {
      let targetSymbol = symbol;
      if (!targetSymbol.includes('.') && targetSymbol.length <= 5) {
        targetSymbol = `${targetSymbol}.IS`;
      }

      console.log(`Fetching data for ${targetSymbol} (${period}/${timeframe})...`);
      const response = await axios.get(
        `http://localhost:8000/api/stock/${targetSymbol}?period=${period}&interval=${timeframe}`,
        { signal: controller.signal }
      );

      // If this request was aborted while in-flight, don't process results
      if (controller.signal.aborted) return;

      if (response.data.price_data) {
        const priceData = [];
        const indicatorsData = {
          MA20: [], MA50: [], MA200: [],
          EMA9: [], EMA21: [],
          BB_UPPER: [], BB_LOWER: [], BB_MIDDLE: [],
          NW_SMOOTH: [], NW_UPPER: [], NW_LOWER: [], NW_DIR: [], NW_SIGNAL: [],
          RSI: [], MACD: [], MACD_SIGNAL: [],
          ST_UPPER: [], ST_LOWER: [], ST_TREND: [],
          STOCH_K: [], STOCH_D: [],
          VWAP: [], ATR: [], MFI: [], CCI: [],
          BB_PCT: [], WILLIAMS_R: [], CMF: [],
          VOLUME: [], AI_PATTERNS: []
        };

        response.data.price_data.forEach(item => {
          const rawDate = item.Date || item.index || item.date;
          const timeValue = timeframe.includes('d') || timeframe.includes('w') || timeframe.includes('mo')
            ? String(rawDate).split('T')[0]
            : Math.floor(new Date(rawDate).getTime() / 1000);

          if (timeValue) {
            priceData.push({
              time: timeValue,
              open: Number(item.Open),
              high: Number(item.High),
              low: Number(item.Low),
              close: Number(item.Close),
              volume: Number(item.Volume)
            });

            const addIndicatorRow = (targetArray, val) => {
              const num = Number(val);
              if (val !== undefined && val !== null && !isNaN(num) && isFinite(num)) {
                targetArray.push({ time: timeValue, value: num });
              }
            };

            addIndicatorRow(indicatorsData.MA20, item.MA20);
            addIndicatorRow(indicatorsData.MA50, item.MA50);
            addIndicatorRow(indicatorsData.MA200, item.MA200);
            addIndicatorRow(indicatorsData.EMA9, item.EMA9);
            addIndicatorRow(indicatorsData.EMA21, item.EMA21);
            addIndicatorRow(indicatorsData.BB_UPPER, item.BB_UPPER);
            addIndicatorRow(indicatorsData.BB_LOWER, item.BB_LOWER);
            addIndicatorRow(indicatorsData.BB_MIDDLE, item.BB_MIDDLE);
            addIndicatorRow(indicatorsData.NW_SMOOTH, item.NW_SMOOTH);
            addIndicatorRow(indicatorsData.NW_UPPER, item.NW_UPPER);
            addIndicatorRow(indicatorsData.NW_LOWER, item.NW_LOWER);
            addIndicatorRow(indicatorsData.NW_DIR, item.NW_DIR);
            addIndicatorRow(indicatorsData.NW_SIGNAL, item.NW_SIGNAL);
            addIndicatorRow(indicatorsData.RSI, item.RSI);
            addIndicatorRow(indicatorsData.MACD, item.MACD);
            addIndicatorRow(indicatorsData.MACD_SIGNAL, item.MACD_SIGNAL);
            addIndicatorRow(indicatorsData.ST_UPPER, item.ST_UPPER);
            addIndicatorRow(indicatorsData.ST_LOWER, item.ST_LOWER);
            addIndicatorRow(indicatorsData.ST_TREND, item.ST_TREND);
            addIndicatorRow(indicatorsData.STOCH_K, item.STOCH_K);
            addIndicatorRow(indicatorsData.STOCH_D, item.STOCH_D);
            addIndicatorRow(indicatorsData.VWAP, item.VWAP);
            addIndicatorRow(indicatorsData.ATR, item.ATR);
            addIndicatorRow(indicatorsData.MFI, item.MFI);
            addIndicatorRow(indicatorsData.CCI, item.CCI);
            addIndicatorRow(indicatorsData.BB_PCT, item.BB_PCT);
            addIndicatorRow(indicatorsData.WILLIAMS_R, item.WILLIAMS_R);
            addIndicatorRow(indicatorsData.CMF, item.CMF);
            addIndicatorRow(indicatorsData.VOLUME, item.Volume);

            if (item.AI_PATTERN_LABEL) {
              indicatorsData.AI_PATTERNS.push({
                time: timeValue,
                label: item.AI_PATTERN_LABEL,
                type: item.AI_PATTERN_TYPE,
                confidence: item.AI_PATTERN_CONF
              });
            }
          }
        });

        // Ensure chronological order and unique times
        const uniquePriceData = [];
        const seenTimes = new Set();
        priceData.sort((a, b) => (typeof a.time === 'number' ? a.time - b.time : new Date(a.time) - new Date(b.time)));
        priceData.forEach(d => {
          if (!seenTimes.has(d.time)) {
            uniquePriceData.push(d);
            seenTimes.add(d.time);
          }
        });

        Object.keys(indicatorsData).forEach(key => {
          indicatorsData[key].sort((a, b) => (typeof a.time === 'number' ? a.time - b.time : new Date(a.time) - new Date(b.time)));
        });

        setData({
          price: uniquePriceData,
          indicators: indicatorsData,
          correlation: response.data.correlation // Store correlation data
        });
        setFundamental(response.data.fundamental);
      }
    } catch (error) {
      if (axios.isCancel(error) || error.name === 'AbortError') return; // Cancelled, ignore
      console.error('Error fetching data:', error);
      alert(`${symbol} verisi alınamadı.`);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  const fetchIndices = async () => {
    try {
      const [indicesRes, symbolsRes] = await Promise.all([
        axios.get('http://localhost:8000/api/indices'),
        axios.get('http://localhost:8000/api/symbols')
      ]);
      setIndices(indicesRes.data);
      setAvailableSymbols(symbolsRes.data);
    } catch (err) {
      console.error('Initial fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchIndices();
    const timerId = window.setInterval(fetchIndices, 60000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo"><span>⚡ Borsa Pro</span></div>
        <nav>
          <button className={view === 'chart' ? 'active' : ''} onClick={() => setView('chart')}>
            <Activity size={20} /> <span>Grafik</span>
          </button>
          <button className={view === 'screener' ? 'active' : ''} onClick={() => setView('screener')}>
            <PieChart size={20} /> <span>Tarayıcı</span>
          </button>
          <button className={view === 'portfolio' ? 'active' : ''} onClick={() => setView('portfolio')}>
            <Briefcase size={20} /> <span>Portfoy</span>
          </button>
          <button>
            <Settings size={20} /> <span>Ayarlar</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {view === 'chart' ? (
          <>
            <header className="top-bar">
              <div className="left-controls">
                <div className="symbol-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    className="symbol-trigger"
                    onClick={() => setIsSearchModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'var(--sidebar-bg)',
                      color: 'white',
                      border: '1px solid var(--border-color)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      minWidth: '200px',
                      transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#2962ff'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <Search size={16} color="#787b86" />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{symbol.replace('.IS', '').replace('=X', '')}</span>
                      <span style={{ fontSize: '10px', color: '#787b86' }}>Sembol Değiştir</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="right-controls">
                <div className="index-info" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {indices && Array.isArray(indices) && indices.map((idx, i) => idx && !idx.error && (
                    <div className="index-item" key={i}>
                      <span className="index-label" style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginRight: '4px' }}>
                        {idx.symbol.replace('.IS', '').replace('=X', '')}
                      </span>
                      <span className={`index-value mono ${idx.percent >= 0 ? 'up' : 'down'}`} style={{ fontWeight: idx.percent >= 0 ? 'bold' : 'normal' }}>
                        {idx.price ? idx.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'} ({idx.percent >= 0 ? '+' : ''}{idx.percent ? idx.percent.toFixed(2) : '0.00'}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </header>

            <section className="chart-section">
              <ChartComponent
                key={symbol}
                symbol={symbol}
                data={data.price}
                indicators={data.indicators}
                interval={timeframe}
                setInterval={setTimeframe}
              />
            </section>

            <aside className="fundamental-section">
              <FundamentalPanel data={fundamental} loading={loading} />
              <CorrelationCard data={data.correlation} />
            </aside>
          </>
        ) : view === 'screener' ? (
          <div style={{
            gridColumn: '1 / span 2',
            gridRow: '1 / span 2',
            background: 'var(--bg-color)',
            overflowY: 'auto'
          }}>
            <ScreenerView onSelectSymbol={(sym) => {
              setSymbol(sym);
              setView('chart');
            }} />
          </div>
        ) : view === 'portfolio' ? (
          <div style={{
            gridColumn: '1 / span 2',
            gridRow: '1 / span 2',
            background: 'var(--bg-color)',
            overflowY: 'auto'
          }}>
            <PortfolioView onSelectSymbol={(sym) => {
              setSymbol(sym);
              setView('chart');
            }} />
          </div>
        ) : null}
      </main>

      <SymbolSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        symbols={availableSymbols}
        onSelect={(s) => setSymbol(s)}
      />
    </div>
  );
}

export default App;
