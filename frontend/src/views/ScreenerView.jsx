import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, CheckCircle, AlertTriangle, TrendingUp, Search, RefreshCw, BarChart2 } from 'lucide-react';

const ScreenerView = ({ onSelectSymbol }) => {
    const [status, setStatus] = useState({ status: 'idle', progress: 0 });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const pollIntervalRef = useRef(null);

    const fetchStatus = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/screener/status');
            setStatus(response.data);
            if (response.data.status === 'idle' && response.data.progress === 100) {
                stopPolling();
                fetchResults();
            }
        } catch (err) {
            console.error('Status fetch error:', err);
        }
    };

    const fetchResults = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:8000/api/screener/results');
            setResults(response.data);
            setLoading(false);
        } catch (err) {
            setError('Sonuçlar alınamadı.');
            setLoading(false);
        }
    };

    const startScan = async () => {
        try {
            setError(null);
            await axios.get('http://localhost:8000/api/screener/start');
            setStatus({ status: 'running', progress: 0 });
            startPolling();
        } catch (err) {
            setError('Tarama başlatılamadı.');
        }
    };

    const startPolling = () => {
        if (pollIntervalRef.current) return;
        pollIntervalRef.current = setInterval(fetchStatus, 1500);
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    useEffect(() => {
        // Initial status check
        fetchStatus();
        // If it was already running, start polling
        if (status.status === 'running') startPolling();

        // Also fetch current results if any
        fetchResults();

        return () => stopPolling();
    }, []);

    const getScoreColor = (score) => {
        if (score >= 80) return '#4caf50';
        if (score >= 50) return '#ffc107';
        return '#9e9e9e';
    };

    return (
        <div className="screener-view" style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart2 className="text-blue" /> BIST 100 Strateji Tarayıcı
                    </h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>RSI ve EMA 200 uyumsuzluklarını yakalayan gelişmiş tarama motoru.</p>
                </div>
                <button
                    onClick={startScan}
                    disabled={status.status === 'running'}
                    className="btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: status.status === 'running' ? 'var(--border-color)' : 'var(--accent-color)',
                        cursor: status.status === 'running' ? 'not-allowed' : 'pointer'
                    }}
                >
                    {status.status === 'running' ? <RefreshCw className="spin" size={18} /> : <Play size={18} fill="currentColor" />}
                    {status.status === 'running' ? `Taranıyor... %${status.progress}` : 'Yeni Tarama Başlat'}
                </button>
            </header>

            {status.status === 'running' && (
                <div style={{ marginBottom: '24px', background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                        <span>İşlem Durumu</span>
                        <span>%{status.progress}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${status.progress}%`,
                            background: 'var(--accent-color)',
                            transition: 'width 0.3s ease-out',
                            boxShadow: '0 0 10px var(--accent-color)'
                        }}></div>
                    </div>
                    <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        ⚠️ 100 hisse paralel işleniyor. Ortalama süre 5-10 saniyedir.
                    </p>
                </div>
            )}

            {error && (
                <div style={{ color: '#f44336', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '8px' }}>
                    <AlertTriangle size={20} /> {error}
                </div>
            )}

            {!loading && results.length > 0 ? (
                <div className="screener-table-container" style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '16px' }}>Hisse</th>
                                <th style={{ padding: '16px' }}>Fiyat</th>
                                <th style={{ padding: '16px' }}>RSI</th>
                                <th style={{ padding: '16px' }}>Potansiyel Skor</th>
                                <th style={{ padding: '16px' }}>Sinyaller</th>
                                <th style={{ padding: '16px' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((item) => (
                                <tr
                                    key={item.symbol}
                                    onClick={() => onSelectSymbol(item.symbol)}
                                    className="screener-row"
                                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }}
                                >
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{item.symbol.replace('.IS', '')}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.symbol}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div className="mono" style={{ fontWeight: 'bold' }}>{item.price.toFixed(2)} ₺</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ color: item.rsi < 30 ? '#2196f3' : item.rsi > 70 ? '#f44336' : 'white' }}>
                                            {item.rsi}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                border: `3px solid ${getScoreColor(item.score)}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                color: getScoreColor(item.score)
                                            }}>
                                                {item.score}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {item.signals.map((sig, idx) => {
                                                const colorMap = {
                                                    blue: { bg: '33, 150, 243', text: '#2196f3' },
                                                    gold: { bg: '255, 193, 7', text: '#ffc107' },
                                                    orange: { bg: '255, 152, 0', text: '#ff9800' },
                                                    green: { bg: '76, 175, 80', text: '#4caf50' },
                                                    red: { bg: '244, 67, 54', text: '#f44336' }
                                                };
                                                const c = colorMap[sig.color] || colorMap.blue;
                                                return (
                                                    <span key={idx} style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 'bold',
                                                        padding: '3px 8px',
                                                        borderRadius: '12px',
                                                        background: `rgba(${c.bg}, 0.15)`,
                                                        color: c.text,
                                                        border: `1px solid rgba(${c.bg}, 0.3)`
                                                    }}>
                                                        {sig.label}
                                                    </span>
                                                );
                                            })}
                                            {item.signals.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Nötr</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button className="btn-icon" title="Grafiğe Git">
                                            <TrendingUp size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                !loading && status.status === 'idle' && (
                    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-dim)' }}>
                        <Search size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p>Henüz bir tarama sonucu bulunamadı.</p>
                        <button
                            onClick={startScan}
                            style={{ marginTop: '16px', color: 'var(--accent-color)', background: 'transparent', border: '1px solid var(--accent-color)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            Şimdi Tara
                        </button>
                    </div>
                )
            )}

            {loading && !status.status === 'running' && (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                    <RefreshCw className="spin" size={32} style={{ color: 'var(--accent-color)' }} />
                    <p style={{ marginTop: '16px' }}>Veriler düzenleniyor...</p>
                </div>
            )}
        </div>
    );
};

export default ScreenerView;
