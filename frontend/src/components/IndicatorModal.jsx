import React, { useState, useMemo } from 'react';
import { Search, X, Activity, TrendingUp, BarChart3, Minimize2 } from 'lucide-react';

const IndicatorModal = ({ isOpen, onClose, visibility, setVisibility }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const indicatorList = useMemo(() => [
        { id: 'ma20', label: 'MA 20 (Simple)', cat: 'Trend', color: '#2962ff' },
        { id: 'ma50', label: 'MA 50 (Simple)', cat: 'Trend', color: '#ff9800' },
        { id: 'ma200', label: 'MA 200 (Simple)', cat: 'Trend', color: '#f44336' },
        { id: 'ema9', label: 'EMA 9 (Exponential)', cat: 'Trend', color: '#4caf50' },
        { id: 'ema21', label: 'EMA 21 (Exponential)', cat: 'Trend', color: '#e91e63' },
        { id: 'bb', label: 'Bollinger Bands', cat: 'Volatility', color: 'rgba(33, 150, 243, 0.8)' },
        { id: 'bb_pct', label: 'Bollinger %B', cat: 'Volatility', color: '#2196f3' },
        { id: 'vwap', label: 'VWAP (Volume Weighted)', cat: 'Trend', color: '#ffeb3b' },
        { id: 'supertrend', label: 'SuperTrend', cat: 'Trend', color: '#00c853' },
        { id: 'nw', label: 'Nadaraya-Watson Smoother', cat: 'Overlay', color: '#00bcd4' },
        { id: 'nw_env', label: 'NW Envelopes', cat: 'Overlay', color: 'rgba(0, 188, 212, 0.4)' },
        { id: 'volume', label: 'Volume (İşlem Hacmi)', cat: 'Volume', color: '#26a69a' },
        { id: 'rsi', label: 'RSI (Relative Strength)', cat: 'Momentum', color: '#7e57c2' },
        { id: 'macd', label: 'MACD (Convergence/Div)', cat: 'Momentum', color: '#2962ff' },
        { id: 'stoch', label: 'Stochastic Oscillator', cat: 'Momentum', color: '#ff5252' },
        { id: 'atr', label: 'ATR (Average True Range)', cat: 'Volatility', color: '#9c27b0' },
        { id: 'mfi', label: 'Money Flow Index (MFI)', cat: 'Volume', color: '#4caf50' },
        { id: 'cci', label: 'Commodity Channel Index', cat: 'Momentum', color: '#ffa726' },
        { id: 'williams_r', label: 'Williams %R', cat: 'Momentum', color: '#f06292' },
        { id: 'cmf', label: 'Chaikin Money Flow', cat: 'Volume', color: '#8bc34a' },
        { id: 'ai_patterns', label: 'AI Formasyon Tanıma', cat: 'AI Analysis', color: '#ff5252' },
    ], []);

    const filteredIndicators = useMemo(() => {
        return indicatorList.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, indicatorList]);

    return (
        <>
            {/* Overlay */}
            <div className={`indicator-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

            {/* Drawer */}
            <div className={`indicator-drawer-content ${isOpen ? 'open' : ''}`}>
                <header className="drawer-header">
                    <div className="header-title">
                        <Activity size={18} className="title-icon" />
                        <span>Göstergeler</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="search-container">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Gösterge ara..."
                        autoFocus={isOpen}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="indicator-list">
                    {filteredIndicators.map((item) => (
                        <div
                            key={item.id}
                            className={`indicator-row ${visibility[item.id] ? 'active' : ''}`}
                            onClick={() => setVisibility(v => ({ ...v, [item.id]: !v[item.id] }))}
                        >
                            <div className="row-info">
                                <span className="cat-tag" style={{ color: item.color }}>{item.cat}</span>
                                <span className="row-label">{item.label}</span>
                            </div>
                            <div className={`check-pill ${visibility[item.id] ? 'checked' : ''}`} style={{ borderColor: visibility[item.id] ? item.color : '#363a45' }}>
                                {visibility[item.id] && <div className="dot" style={{ background: item.color }} />}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredIndicators.length === 0 && (
                    <div className="no-results">
                        <p>Sonuç bulunamadı.</p>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .indicator-drawer-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
                    z-index: 9999; opacity: 0; pointer-events: none; transition: 0.3s;
                }
                .indicator-drawer-overlay.open { opacity: 1; pointer-events: auto; }

                .indicator-drawer-content {
                    position: fixed; top: 0; right: 0; width: 320px; height: 100%;
                    background: #1e222d; border-left: 1px solid #30363d;
                    z-index: 10000; transform: translateX(100%); transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.3);
                }
                .indicator-drawer-content.open { transform: translateX(0); }

                .drawer-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 16px 20px; border-bottom: 1px solid #30363d;
                }
                .header-title { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.95rem; color: #d1d4dc; }
                .title-icon { color: #2962ff; }
                .close-btn { background: transparent; border: none; color: #787b86; cursor: pointer; transition: 0.2s; display: flex; }
                .close-btn:hover { color: white; }

                .search-container { padding: 16px 20px; position: relative; }
                .search-icon { position: absolute; left: 32px; top: 50%; transform: translateY(-50%); color: #787b86; }
                .search-container input {
                    width: 100%; background: #2a2e39; border: 1px solid #363a45; border-radius: 6px;
                    padding: 10px 10px 10px 36px; color: #d1d4dc; font-size: 0.85rem; outline: none; transition: 0.2s;
                }
                .search-container input:focus { border-color: #2962ff; background: #2f3241; }

                .indicator-list { flex: 1; overflow-y: auto; padding: 0 10px 20px; }
                .indicator-row {
                    padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;
                    cursor: pointer; transition: 0.15s; border-radius: 6px; margin-bottom: 2px;
                }
                .indicator-row:hover { background: #2a2e39; }
                .indicator-row.active { background: rgba(41, 98, 255, 0.05); }

                .row-info { display: flex; flex-direction: column; gap: 2px; }
                .cat-tag { font-size: 0.55rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }
                .row-label { font-size: 0.8rem; font-weight: 600; color: #d1d4dc; }
                .indicator-row.active .row-label { color: white; }

                .check-pill {
                    width: 18px; height: 18px; border: 1.5px solid #363a45; border-radius: 4px;
                    display: flex; align-items: center; justify-content: center; transition: 0.2s;
                }
                .check-pill.checked { border-color: #2962ff; background: rgba(41, 98, 255, 0.1); }
                .dot { width: 8px; height: 8px; border-radius: 2px; }

                .no-results { padding: 40px 20px; text-align: center; color: #787b86; font-size: 0.85rem; }
            ` }} />
        </>
    );
};

export default IndicatorModal;
