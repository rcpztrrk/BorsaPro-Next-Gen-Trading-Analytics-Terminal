import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, TrendingUp, BarChart2, History, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createChart } from 'lightweight-charts';

const BacktestPanel = ({ symbol }) => {
    const [strategy, setStrategy] = useState('SMA_CROSS');
    const [params, setParams] = useState({ fast: 20, slow: 50 });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();

    useEffect(() => {
        if (strategy === 'SMA_CROSS') {
            setParams({ fast: 20, slow: 50 });
        } else if (strategy === 'RSI') {
            setParams({ period: 14, overbought: 70, oversold: 30 });
        }
    }, [strategy]);

    // Handle Resize for the equity chart
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const runBacktest = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await axios.post('http://localhost:8000/api/backtest', {
                symbol,
                strategy,
                params,
                initial_capital: 10000
            });

            if (resp.data.error) {
                setError(resp.data.error);
                setResult(null);
            } else {
                setResult(resp.data);
                renderEquityChart(resp.data.equity_curve);
            }
        } catch (err) {
            setError("Backtest failed. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    const renderEquityChart = (data) => {
        if (!chartContainerRef.current) return;

        // Cleanup previous chart
        if (chartRef.current) {
            chartRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 250,
            layout: {
                background: { color: '#1e222d' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2b2b43' },
                horzLines: { color: '#2b2b43' },
            },
            rightPriceScale: {
                borderColor: '#2b2b43',
            },
            timeScale: {
                borderColor: '#2b2b43',
            },
        });

        const areaSeries = chart.addAreaSeries({
            lineColor: '#2962ff',
            topColor: '#2962ff',
            bottomColor: 'rgba(41, 98, 255, 0.28)',
            lineWidth: 2,
        });

        // Map data for lightweight-charts
        const formattedData = data.map(item => ({
            time: item.time,
            value: item.value
        }));

        areaSeries.setData(formattedData);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = areaSeries;
    };

    return (
        <div className="backtest-panel" style={{ color: '#d1d4dc', padding: '16px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                    <TrendingUp size={18} color="#2962ff" /> Backtest Simülatörü
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#787b86' }}>{symbol}</span>
            </div>

            <div className="backtest-settings" style={{ background: '#2a2e39', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#787b86', marginBottom: '4px' }}>Strateji Seç</label>
                    <select
                        value={strategy}
                        onChange={(e) => setStrategy(e.target.value)}
                        style={{ width: '100%', padding: '8px', background: '#131722', color: 'white', border: '1px solid #363c4e', borderRadius: '4px' }}
                    >
                        <option value="SMA_CROSS">SMA Kesişimi (Fast/Slow)</option>
                        <option value="RSI">RSI Stratejisi</option>
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {strategy === 'SMA_CROSS' ? (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#787b86' }}>Hızlı SMA</label>
                                <input
                                    type="number"
                                    value={params.fast}
                                    onChange={(e) => setParams({ ...params, fast: parseInt(e.target.value) })}
                                    style={{ width: '100%', padding: '6px', background: '#131722', color: 'white', border: '1px solid #363c4e', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#787b86' }}>Yavaş SMA</label>
                                <input
                                    type="number"
                                    value={params.slow}
                                    onChange={(e) => setParams({ ...params, slow: parseInt(e.target.value) })}
                                    style={{ width: '100%', padding: '6px', background: '#131722', color: 'white', border: '1px solid #363c4e', borderRadius: '4px' }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#787b86' }}>Periyot</label>
                                <input
                                    type="number"
                                    value={params.period}
                                    onChange={(e) => setParams({ ...params, period: parseInt(e.target.value) })}
                                    style={{ width: '100%', padding: '6px', background: '#131722', color: 'white', border: '1px solid #363c4e', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#787b86' }}>Aşırı Satış</label>
                                <input
                                    type="number"
                                    value={params.oversold}
                                    onChange={(e) => setParams({ ...params, oversold: parseInt(e.target.value) })}
                                    style={{ width: '100%', padding: '6px', background: '#131722', color: 'white', border: '1px solid #363c4e', borderRadius: '4px' }}
                                />
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={runBacktest}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: '#2962ff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: 'bold'
                    }}
                >
                    {loading ? "Simüle ediliyor..." : <><Play size={16} fill="white" /> Başlat</>}
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(255, 78, 78, 0.1)', color: '#ff4e4e', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '16px' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {result && (
                <div className="backtest-results animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: '#1e222d', padding: '12px', borderRadius: '8px', border: '1px solid #363c4e' }}>
                            <div style={{ fontSize: '0.7rem', color: '#787b86' }}>Toplam Getiri</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: result.summary.total_return_pct >= 0 ? '#089981' : '#f23645' }}>
                                %{result.summary.total_return_pct}
                            </div>
                        </div>
                        <div style={{ background: '#1e222d', padding: '12px', borderRadius: '8px', border: '1px solid #363c4e' }}>
                            <div style={{ fontSize: '0.7rem', color: '#787b86' }}>İşlem Sayısı</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{result.summary.trade_count}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', color: '#787b86' }}>Bakiye Eğrisi (Equity Curve)</div>
                        <div ref={chartContainerRef} style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }} />
                    </div>

                    <div className="trades-list">
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', color: '#787b86' }}>Son İşlemler</div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {result.trades.slice(-5).reverse().map((trade, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2e39', fontSize: '0.75rem' }}>
                                    <span style={{ color: trade.type === 'BUY' ? '#089981' : '#f23645', fontWeight: 'bold' }}>{trade.type}</span>
                                    <span>{trade.price.toFixed(2)} TL</span>
                                    <span style={{ color: '#787b86' }}>{trade.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BacktestPanel;
