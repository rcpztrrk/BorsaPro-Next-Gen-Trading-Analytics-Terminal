import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { createChart, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { Play, Pause, SkipForward, RotateCcw, Search, TrendingUp, TrendingDown, BarChart2, FastForward } from 'lucide-react';

const BacktestView = ({ symbol, onOpenSearch, onSelectSymbol }) => {
    const [allCandles, setAllCandles] = useState([]);
    const [visibleCandles, setVisibleCandles] = useState([]);
    const [phase, setPhase] = useState('loading'); // 'loading' | 'setup' | 'playing' | 'paused' | 'finished'
    const [startIndex, setStartIndex] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [interval, setIntervalState] = useState('1d');
    const [trades, setTrades] = useState([]);
    const [position, setPosition] = useState(null); // { type: 'LONG', entry_price, entry_date, shares }
    const [capital, setCapital] = useState(10000);
    const [initialCapital] = useState(10000);
    const [equityCurve, setEquityCurve] = useState([]);
    const [indicatorConfig, setIndicatorConfig] = useState({
        ma20: true, ma50: true, ma200: false,
        ema9: false, ema21: false,
        bb: false,
        rsi: false
    });

    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);
    const playIntervalRef = useRef(null);
    const [speed, setSpeed] = useState(500); // ms between candles
    const markersRef = useRef([]);

    // Indicator Refs
    const ma20Ref = useRef(null);
    const ma50Ref = useRef(null);
    const ma200Ref = useRef(null);
    const ema9Ref = useRef(null);
    const ema21Ref = useRef(null);
    const bbUpperRef = useRef(null);
    const bbMiddleRef = useRef(null);
    const bbLowerRef = useRef(null);
    const rsiRef = useRef(null);

    // Fetch historical data
    const fetchData = useCallback(async (sym, inv) => {
        setPhase('loading');
        const period = 'max';

        try {
            const resp = await axios.get(`http://localhost:8000/api/stock/${sym}?period=${period}&interval=${inv}&indicators=true`);
            const priceData = resp.data.price_data || resp.data.price || [];
            if (priceData.length === 0) return;

            const candles = priceData.map(d => {
                const rawDate = d.Date || d.time || d.index || d.date;
                // Intraday veriler için unix timestamp kullanmak daha güvenli
                const timeValue = (typeof rawDate === 'string')
                    ? Math.floor(new Date(rawDate).getTime() / 1000)
                    : rawDate;

                return {
                    time: timeValue,
                    open: Number(d.Open ?? d.open),
                    high: Number(d.High ?? d.high),
                    low: Number(d.Low ?? d.low),
                    close: Number(d.Close ?? d.close),
                    volume: Number(d.Volume ?? d.volume ?? 0),
                    // Indicators
                    ma20: d.MA20, ma50: d.MA50, ma200: d.MA200,
                    ema9: d.EMA9, ema21: d.EMA21,
                    bbUpper: d.BB_UPPER, bbMiddle: d.BB_MIDDLE, bbLower: d.BB_LOWER,
                    rsi: d.RSI,
                    macd: d.MACD, macdSignal: d.MACD_SIGNAL
                };
            });

            // Filter out any invalid data points
            const validCandles = candles.filter(c => c.time && !isNaN(c.close));

            setAllCandles(validCandles);
            setVisibleCandles(validCandles);
            setStartIndex(null);
            setCurrentIndex(null);
            setTrades([]);
            setPosition(null);
            setCapital(10000);
            setEquityCurve([]);
            setPhase('setup');
        } catch (err) {
            console.error('Backtest data fetch error:', err);
        }
    }, []);

    useEffect(() => {
        fetchData(symbol, interval);
    }, [symbol, interval, fetchData]);

    // Create Chart
    useEffect(() => {
        if (!chartContainerRef.current || allCandles.length === 0) return;

        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: {
                background: { color: '#0d1117' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    labelBackgroundColor: '#2962ff',
                    style: 2,
                    width: 1,
                    color: 'rgba(41, 98, 255, 0.6)',
                },
                horzLine: {
                    labelBackgroundColor: '#2962ff',
                    style: 2,
                    width: 1,
                    color: 'rgba(41, 98, 255, 0.6)',
                },
            },
            rightPriceScale: {
                borderColor: '#30363d',
                autoScale: true,
                axisLabelVisible: true,
                borderVisible: true,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderColor: '#30363d',
                timeVisible: true,
                rightOffset: 500,
                barSpacing: 8,
                minBarSpacing: 0.001,
                fixLeftEdge: false,
                fixRightEdge: false,
                shiftVisibleRangeOnNewBar: false,
                allowShiftVisibleRangeOnWhitespaceReplacement: true,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                mouseWheel: true,
                pinch: true,
                // Fiyat ekseninden sürükleyerek dikey ölçek değiştir (TradingView gibi)
                // Zaman ekseninden sürükleyerek yatay ölçek değiştir
                axisPressedMouseMove: {
                    time: true,
                    price: true,
                },
                // Çift tıkla → autoScale'e geri dön
                axisDoubleClickReset: {
                    time: true,
                    price: true,
                },
            },
            kineticScroll: {
                touch: false,
                mouse: false,
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#089981',
            downColor: '#f23645',
            borderDownColor: '#f23645',
            borderUpColor: '#089981',
            wickDownColor: '#f23645',
            wickUpColor: '#089981',
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });

        // Initialize Indicators
        const ma20Series = chart.addSeries(LineSeries, { color: '#2962ff', lineWidth: 1, title: 'MA20', visible: indicatorConfig.ma20 });
        const ma50Series = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1, title: 'MA50', visible: indicatorConfig.ma50 });
        const ma200Series = chart.addSeries(LineSeries, { color: '#f44336', lineWidth: 1, title: 'MA200', visible: indicatorConfig.ma200 });
        const ema9Series = chart.addSeries(LineSeries, { color: '#4caf50', lineWidth: 1, title: 'EMA9', visible: indicatorConfig.ema9 });
        const ema21Series = chart.addSeries(LineSeries, { color: '#9c27b0', lineWidth: 1, title: 'EMA21', visible: indicatorConfig.ema21 });
        const bbUpperSeries = chart.addSeries(LineSeries, { color: 'rgba(173, 216, 230, 0.4)', lineWidth: 1, title: 'BB Upper', visible: indicatorConfig.bb });
        const bbMiddleSeries = chart.addSeries(LineSeries, { color: 'rgba(173, 216, 230, 0.4)', lineWidth: 1, title: 'BB Middle', visible: indicatorConfig.bb, lineStyle: 2 });
        const bbLowerSeries = chart.addSeries(LineSeries, { color: 'rgba(173, 216, 230, 0.4)', lineWidth: 1, title: 'BB Lower', visible: indicatorConfig.bb });

        const rsiSeries = chart.addSeries(LineSeries, {
            color: '#787b86',
            lineWidth: 1,
            title: 'RSI',
            visible: indicatorConfig.rsi,
            priceScaleId: 'rsi',
        });
        chart.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.7, bottom: 0.1 },
            borderVisible: false,
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
        });

        candleSeries.setData(visibleCandles);
        volumeSeries.setData(visibleCandles.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(8,153,129,0.3)' : 'rgba(242,54,69,0.3)',
        })));

        // Set Indicator Data
        ma20Series.setData(visibleCandles.filter(c => c.ma20).map(c => ({ time: c.time, value: c.ma20 })));
        ma50Series.setData(visibleCandles.filter(c => c.ma50).map(c => ({ time: c.time, value: c.ma50 })));
        ma200Series.setData(visibleCandles.filter(c => c.ma200).map(c => ({ time: c.time, value: c.ma200 })));
        ema9Series.setData(visibleCandles.filter(c => c.ema9).map(c => ({ time: c.time, value: c.ema9 })));
        ema21Series.setData(visibleCandles.filter(c => c.ema21).map(c => ({ time: c.time, value: c.ema21 })));
        bbUpperSeries.setData(visibleCandles.filter(c => c.bbUpper).map(c => ({ time: c.time, value: c.bbUpper })));
        bbMiddleSeries.setData(visibleCandles.filter(c => c.bbMiddle).map(c => ({ time: c.time, value: c.bbMiddle })));
        bbLowerSeries.setData(visibleCandles.filter(c => c.bbLower).map(c => ({ time: c.time, value: c.bbLower })));
        rsiSeries.setData(visibleCandles.filter(c => c.rsi).map(c => ({ time: c.time, value: c.rsi })));

        // İlk yükleme: veriyi göster, sonra autoScale kapat
        // → böylece kullanıcı sayfa açılır açılmaz serbestçe hareket edebilir
        chart.timeScale().fitContent();
        // Küçük bir gecikmeyle autoScale'i devre dışı bırak
        // (fitContent'in işini bitirmesini bekle)
        requestAnimationFrame(() => {
            chart.priceScale('right').applyOptions({ autoScale: false });
        });


        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;
        ma20Ref.current = ma20Series;
        ma50Ref.current = ma50Series;
        ma200Ref.current = ma200Series;
        ema9Ref.current = ema9Series;
        ema21Ref.current = ema21Series;
        bbUpperRef.current = bbUpperSeries;
        bbMiddleRef.current = bbMiddleSeries;
        bbLowerRef.current = bbLowerSeries;
        rsiRef.current = rsiSeries;

        // Click handler for setting start line
        chart.subscribeClick((param) => {
            if (phase !== 'setup') return;
            if (!param.time) return;

            const clickedIdx = allCandles.findIndex(c => c.time === param.time);
            if (clickedIdx < 0 || clickedIdx >= allCandles.length - 10) return;

            setStartIndex(clickedIdx);
            setCurrentIndex(clickedIdx);

            // Show only candles up to clicked point
            const sliced = allCandles.slice(0, clickedIdx + 1);
            setVisibleCandles(sliced);
            candleSeries.setData(sliced);
            volumeSeries.setData(sliced.map(c => ({
                time: c.time,
                value: c.volume,
                color: c.close >= c.open ? 'rgba(8,153,129,0.3)' : 'rgba(242,54,69,0.3)',
            })));

            // Indicators
            ma20Ref.current?.setData(sliced.filter(c => c.ma20).map(c => ({ time: c.time, value: c.ma20 })));
            ma50Ref.current?.setData(sliced.filter(c => c.ma50).map(c => ({ time: c.time, value: c.ma50 })));
            ma200Ref.current?.setData(sliced.filter(c => c.ma200).map(c => ({ time: c.time, value: c.ma200 })));
            ema9Ref.current?.setData(sliced.filter(c => c.ema9).map(c => ({ time: c.time, value: c.ema9 })));
            ema21Ref.current?.setData(sliced.filter(c => c.ema21).map(c => ({ time: c.time, value: c.ema21 })));
            bbUpperRef.current?.setData(sliced.filter(c => c.bbUpper).map(c => ({ time: c.time, value: c.bbUpper })));
            bbMiddleRef.current?.setData(sliced.filter(c => c.bbMiddle).map(c => ({ time: c.time, value: c.bbMiddle })));
            bbLowerRef.current?.setData(sliced.filter(c => c.bbLower).map(c => ({ time: c.time, value: c.bbLower })));
            rsiRef.current?.setData(sliced.filter(c => c.rsi).map(c => ({ time: c.time, value: c.rsi })));
            // fitContent() removed to preserve user selection zoom
        });

        // Handle resize
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [allCandles, phase]);

    // Step forward one candle
    const stepForward = useCallback(() => {
        if (currentIndex === null || currentIndex >= allCandles.length - 1) {
            setIsPlaying(false);
            setPhase('finished');
            return;
        }

        const nextIdx = currentIndex + 1;
        const nextCandle = allCandles[nextIdx];
        setCurrentIndex(nextIdx);

        // Add candle to chart
        if (candleSeriesRef.current) {
            candleSeriesRef.current.update(nextCandle);
        }
        if (volumeSeriesRef.current) {
            volumeSeriesRef.current.update({
                time: nextCandle.time,
                value: nextCandle.volume,
                color: nextCandle.close >= nextCandle.open ? 'rgba(8,153,129,0.3)' : 'rgba(242,54,69,0.3)',
            });
        }

        // Indicators
        if (nextCandle.ma20) ma20Ref.current?.update({ time: nextCandle.time, value: nextCandle.ma20 });
        if (nextCandle.ma50) ma50Ref.current?.update({ time: nextCandle.time, value: nextCandle.ma50 });
        if (nextCandle.ma200) ma200Ref.current?.update({ time: nextCandle.time, value: nextCandle.ma200 });
        if (nextCandle.ema9) ema9Ref.current?.update({ time: nextCandle.time, value: nextCandle.ema9 });
        if (nextCandle.ema21) ema21Ref.current?.update({ time: nextCandle.time, value: nextCandle.ema21 });
        if (nextCandle.bbUpper) bbUpperRef.current?.update({ time: nextCandle.time, value: nextCandle.bbUpper });
        if (nextCandle.bbMiddle) bbMiddleRef.current?.update({ time: nextCandle.time, value: nextCandle.bbMiddle });
        if (nextCandle.bbLower) bbLowerRef.current?.update({ time: nextCandle.time, value: nextCandle.bbLower });
        if (nextCandle.rsi) rsiRef.current?.update({ time: nextCandle.time, value: nextCandle.rsi });

        // Track equity
        const currentEquity = position
            ? capital + (position.shares * nextCandle.close) - (position.shares * position.entry_price) + (initialCapital - capital)
            : capital;

        setEquityCurve(prev => [...prev, { time: nextCandle.time, value: currentEquity }]);

        // Update visible candles state
        setVisibleCandles(prev => [...prev, nextCandle]);
    }, [currentIndex, allCandles, capital, position, initialCapital]);

    // Auto-play
    useEffect(() => {
        if (isPlaying) {
            playIntervalRef.current = setInterval(() => {
                stepForward();
            }, speed);
        } else {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
            }
        }
        return () => {
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        };
    }, [isPlaying, speed, stepForward]);

    // Buy action
    const handleBuy = () => {
        if (position || currentIndex === null) return;
        const price = allCandles[currentIndex].close;
        const shares = Math.floor(capital / price);
        if (shares <= 0) return;

        const cost = shares * price;
        setPosition({ type: 'LONG', entry_price: price, entry_date: allCandles[currentIndex].time, shares });
        setCapital(prev => prev - cost);

        // Add marker
        const marker = {
            time: allCandles[currentIndex].time,
            position: 'belowBar',
            color: '#089981',
            shape: 'arrowUp',
            text: `AL ${price.toFixed(2)}`,
        };
        markersRef.current = [...markersRef.current, marker];
        if (candleSeriesRef.current) {
            candleSeriesRef.current.setMarkers(markersRef.current);
        }
    };

    // Sell action
    const handleSell = () => {
        if (!position || currentIndex === null) return;
        const price = allCandles[currentIndex].close;
        const revenue = position.shares * price;
        const pnl = revenue - (position.shares * position.entry_price);

        setTrades(prev => [...prev, {
            type: 'COMPLETED',
            entry_price: position.entry_price,
            exit_price: price,
            entry_date: position.entry_date,
            exit_date: allCandles[currentIndex].time,
            shares: position.shares,
            pnl: pnl,
        }]);

        setCapital(prev => prev + revenue);
        setPosition(null);

        // Add marker
        const marker = {
            time: allCandles[currentIndex].time,
            position: 'aboveBar',
            color: '#f23645',
            shape: 'arrowDown',
            text: `SAT ${price.toFixed(2)}`,
        };
        markersRef.current = [...markersRef.current, marker];
        if (candleSeriesRef.current) {
            candleSeriesRef.current.setMarkers(markersRef.current);
        }
    };

    // Reset
    const handleReset = () => {
        setStartIndex(null);
        setCurrentIndex(null);
        setTrades([]);
        setPosition(null);
        setCapital(10000);
        setEquityCurve([]);
        setIsPlaying(false);
        markersRef.current = [];
        setPhase('setup');
        setVisibleCandles(allCandles);
        if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(allCandles);
            candleSeriesRef.current.setMarkers([]);
        }
        if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(allCandles.map(c => ({
                time: c.time,
                value: c.volume,
                color: c.close >= c.open ? 'rgba(8,153,129,0.3)' : 'rgba(242,54,69,0.3)',
            })));
        }

        // Indicators
        ma20Ref.current?.setData(allCandles.filter(c => c.ma20).map(c => ({ time: c.time, value: c.ma20 })));
        ma50Ref.current?.setData(allCandles.filter(c => c.ma50).map(c => ({ time: c.time, value: c.ma50 })));
        ma200Ref.current?.setData(allCandles.filter(c => c.ma200).map(c => ({ time: c.time, value: c.ma200 })));
        ema9Ref.current?.setData(allCandles.filter(c => c.ema9).map(c => ({ time: c.time, value: c.ema9 })));
        ema21Ref.current?.setData(allCandles.filter(c => c.ema21).map(c => ({ time: c.time, value: c.ema21 })));
        bbUpperRef.current?.setData(allCandles.filter(c => c.bbUpper).map(c => ({ time: c.time, value: c.bbUpper })));
        bbMiddleRef.current?.setData(allCandles.filter(c => c.bbMiddle).map(c => ({ time: c.time, value: c.bbMiddle })));
        bbLowerRef.current?.setData(allCandles.filter(c => c.bbLower).map(c => ({ time: c.time, value: c.bbLower })));
        rsiRef.current?.setData(allCandles.filter(c => c.rsi).map(c => ({ time: c.time, value: c.rsi })));
        // fitContent() removed
    };

    // Manage Indicator Visibility
    useEffect(() => {
        ma20Ref.current?.applyOptions({ visible: indicatorConfig.ma20 });
        ma50Ref.current?.applyOptions({ visible: indicatorConfig.ma50 });
        ma200Ref.current?.applyOptions({ visible: indicatorConfig.ma200 });
        ema9Ref.current?.applyOptions({ visible: indicatorConfig.ema9 });
        ema21Ref.current?.applyOptions({ visible: indicatorConfig.ema21 });
        bbUpperRef.current?.applyOptions({ visible: indicatorConfig.bb });
        bbMiddleRef.current?.applyOptions({ visible: indicatorConfig.bb });
        bbLowerRef.current?.applyOptions({ visible: indicatorConfig.bb });
        rsiRef.current?.applyOptions({ visible: indicatorConfig.rsi });
    }, [indicatorConfig]);

    // Compute stats
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const unrealizedPnl = position && currentIndex !== null
        ? (position.shares * allCandles[currentIndex]?.close) - (position.shares * position.entry_price)
        : 0;
    const totalEquity = capital + (position ? position.shares * (allCandles[currentIndex]?.close || 0) : 0);
    const totalReturnPct = ((totalEquity - initialCapital) / initialCapital * 100).toFixed(2);
    const winCount = trades.filter(t => t.pnl > 0).length;
    const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(0) : '-';
    const currentPrice = currentIndex !== null ? allCandles[currentIndex]?.close : null;
    const progress = startIndex !== null ? ((currentIndex - startIndex) / (allCandles.length - startIndex) * 100).toFixed(0) : 0;

    return (
        <div style={{ display: 'flex', height: '100%', background: '#131722', color: '#d1d4dc' }}>
            {/* Left Control Panel */}
            <div style={{
                width: '300px',
                minWidth: '300px',
                background: '#1e222d',
                borderRight: '1px solid #2a2e39',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid #2a2e39' }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={18} color="#2962ff" /> Backtest Simülatörü
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#787b86' }}>Geçmiş veriler üzerinde strateji test edin</p>
                </div>

                {/* Symbol Search Trigger */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39' }}>
                    <label style={{ fontSize: '0.7rem', color: '#787b86', marginBottom: '8px', display: 'block' }}>Sembol Seçimi</label>
                    <div
                        onClick={onOpenSearch}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: '#131722',
                            color: 'white',
                            border: '1px solid #363c4e',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#2962ff'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#363c4e'}
                    >
                        <Search size={16} color="#787b86" />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{symbol.replace('.IS', '').replace('=X', '')}</span>
                            <span style={{ fontSize: '10px', color: '#787b86' }}>Değiştirmek için tıklayın</span>
                        </div>
                    </div>
                </div>

                {/* Timeframe Selection */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39' }}>
                    <label style={{ fontSize: '0.7rem', color: '#787b86', marginBottom: '8px', display: 'block' }}>Zaman Dilimi</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {['1m', '5m', '15m', '1h', '1d', '1wk'].map(tf => (
                            <button
                                key={tf}
                                onClick={() => {
                                    if (phase !== 'loading') {
                                        setIntervalState(tf);
                                        handleReset();
                                    }
                                }}
                                style={{
                                    padding: '6px',
                                    fontSize: '0.75rem',
                                    background: interval === tf ? '#2962ff' : '#2a2e39',
                                    color: 'white',
                                    border: '1px solid #363c4e',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: interval === tf ? 'bold' : 'normal',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tf.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Indicator Controls */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39' }}>
                    <label style={{ fontSize: '0.7rem', color: '#787b86', marginBottom: '8px', display: 'block' }}>İndikatörler</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                            { key: 'ma20', label: 'MA 20', color: '#2962ff' },
                            { key: 'ma50', label: 'MA 50', color: '#ff9800' },
                            { key: 'ma200', label: 'MA 200', color: '#f44336' },
                            { key: 'ema9', label: 'EMA 9', color: '#4caf50' },
                            { key: 'ema21', label: 'EMA 21', color: '#9c27b0' },
                            { key: 'bb', label: 'Bollinger Bantları', color: 'rgba(173, 216, 230, 0.8)' },
                            { key: 'rsi', label: 'RSI (14)', color: '#787b86' },
                        ].map(ind => (
                            <div key={ind.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '2px', background: ind.color }}></div>
                                    <span style={{ fontSize: '0.75rem' }}>{ind.label}</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={indicatorConfig[ind.key]}
                                    onChange={(e) => setIndicatorConfig(prev => ({ ...prev, [ind.key]: e.target.checked }))}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Phase Info */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39' }}>
                    {phase === 'loading' && (
                        <div style={{ textAlign: 'center', color: '#787b86', fontSize: '0.8rem' }}>Yükleniyor...</div>
                    )}
                    {phase === 'setup' && !startIndex && (
                        <div style={{
                            background: 'rgba(41, 98, 255, 0.1)', padding: '12px', borderRadius: '8px',
                            border: '1px solid rgba(41, 98, 255, 0.3)', fontSize: '0.8rem', textAlign: 'center'
                        }}>
                            📍 Grafikte bir noktaya tıklayarak<br /><strong>başlangıç noktasını</strong> belirleyin
                        </div>
                    )}
                    {phase === 'setup' && startIndex !== null && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                background: 'rgba(8, 153, 129, 0.1)', padding: '12px', borderRadius: '8px',
                                border: '1px solid rgba(8, 153, 129, 0.3)', fontSize: '0.8rem', marginBottom: '8px'
                            }}>
                                ✅ Başlangıç noktası seçildi!<br />
                                <strong>{allCandles[startIndex]?.time}</strong>
                            </div>
                            <button onClick={() => { setPhase('playing'); setIsPlaying(true); }} style={{
                                width: '100%', padding: '10px', background: '#089981', color: 'white',
                                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem'
                            }}>
                                <Play size={16} fill="white" /> Simülasyonu Başlat
                            </button>
                        </div>
                    )}
                </div>

                {/* Playback Controls */}
                {(phase === 'playing' || phase === 'paused' || phase === 'finished') && (
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39' }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                            <button onClick={() => { setIsPlaying(!isPlaying); setPhase(isPlaying ? 'paused' : 'playing'); }} style={{
                                flex: 1, padding: '8px', background: isPlaying ? '#f23645' : '#089981', color: 'white',
                                border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem'
                            }} disabled={phase === 'finished'}>
                                {isPlaying ? <><Pause size={14} /> Durdur</> : <><Play size={14} /> Oynat</>}
                            </button>
                            <button onClick={() => { setIsPlaying(false); setPhase('paused'); stepForward(); }} style={{
                                padding: '8px 12px', background: '#2a2e39', color: 'white',
                                border: '1px solid #363c4e', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
                            }} disabled={phase === 'finished'}>
                                <SkipForward size={14} /> Adım
                            </button>
                            <button onClick={handleReset} style={{
                                padding: '8px 12px', background: '#2a2e39', color: '#787b86',
                                border: '1px solid #363c4e', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                            }}>
                                <RotateCcw size={14} />
                            </button>
                        </div>

                        {/* Speed Control */}
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#787b86', marginBottom: '2px' }}>
                                <span>Hız</span>
                                <span><FastForward size={10} /> {speed <= 100 ? '10x' : speed <= 250 ? '4x' : speed <= 500 ? '2x' : '1x'}</span>
                            </div>
                            <input type="range" min="50" max="1000" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                                style={{ width: '100%', accentColor: '#2962ff' }}
                            />
                        </div>

                        {/* Progress Bar */}
                        <div style={{ background: '#131722', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: '#2962ff', transition: 'width 0.3s' }} />
                        </div>
                    </div>
                )}

                {/* Trade Buttons */}
                {(phase === 'playing' || phase === 'paused') && (
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleBuy} disabled={!!position} style={{
                                flex: 1, padding: '12px', background: position ? '#2a2e39' : '#089981',
                                color: 'white', border: 'none', borderRadius: '6px', cursor: position ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: position ? 0.5 : 1
                            }}>
                                <TrendingUp size={16} /> AL
                            </button>
                            <button onClick={handleSell} disabled={!position} style={{
                                flex: 1, padding: '12px', background: !position ? '#2a2e39' : '#f23645',
                                color: 'white', border: 'none', borderRadius: '6px', cursor: !position ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: !position ? 0.5 : 1
                            }}>
                                <TrendingDown size={16} /> SAT
                            </button>
                        </div>
                    </div>
                )}

                {/* Position & Equity Stats */}
                <div style={{ padding: '12px 16px', flex: 1, overflowY: 'auto' }}>
                    {/* Active Position */}
                    {position && (
                        <div style={{
                            background: 'rgba(41, 98, 255, 0.1)', padding: '10px', borderRadius: '8px',
                            border: '1px solid rgba(41, 98, 255, 0.3)', marginBottom: '12px', fontSize: '0.75rem'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📈 Açık Pozisyon</div>
                            <div>Giriş: {position.entry_price.toFixed(2)} TL / {position.shares} Adet</div>
                            <div style={{ color: unrealizedPnl >= 0 ? '#089981' : '#f23645', fontWeight: 'bold' }}>
                                Kâr/Zarar: {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)} TL
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ background: '#131722', padding: '10px', borderRadius: '6px', border: '1px solid #2a2e39' }}>
                            <div style={{ fontSize: '0.65rem', color: '#787b86' }}>Bakiye</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{totalEquity.toFixed(0)} ₺</div>
                        </div>
                        <div style={{ background: '#131722', padding: '10px', borderRadius: '6px', border: '1px solid #2a2e39' }}>
                            <div style={{ fontSize: '0.65rem', color: '#787b86' }}>Toplam Getiri</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: totalReturnPct >= 0 ? '#089981' : '#f23645' }}>
                                %{totalReturnPct}
                            </div>
                        </div>
                        <div style={{ background: '#131722', padding: '10px', borderRadius: '6px', border: '1px solid #2a2e39' }}>
                            <div style={{ fontSize: '0.65rem', color: '#787b86' }}>İşlem Sayısı</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{trades.length}</div>
                        </div>
                        <div style={{ background: '#131722', padding: '10px', borderRadius: '6px', border: '1px solid #2a2e39' }}>
                            <div style={{ fontSize: '0.65rem', color: '#787b86' }}>Kazanma Oranı</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{winRate}%</div>
                        </div>
                    </div>

                    {/* Trade History */}
                    {trades.length > 0 && (
                        <>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#787b86', marginBottom: '6px' }}>İşlem Geçmişi</div>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {[...trades].reverse().map((t, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '6px 0', borderBottom: '1px solid #2a2e39', fontSize: '0.7rem'
                                    }}>
                                        <div>
                                            <div style={{ color: '#787b86' }}>{t.entry_date} → {t.exit_date}</div>
                                            <div>{t.entry_price.toFixed(2)} → {t.exit_price.toFixed(2)}</div>
                                        </div>
                                        <div style={{
                                            color: t.pnl >= 0 ? '#089981' : '#f23645', fontWeight: 'bold', fontSize: '0.8rem'
                                        }}>
                                            {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)} ₺
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Chart Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Top Bar */}
                <div style={{
                    padding: '8px 16px', background: '#1e222d', borderBottom: '1px solid #2a2e39',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{symbol.replace('.IS', '')}</span>
                        {currentPrice && (
                            <span style={{
                                fontSize: '1rem', fontWeight: 'bold',
                                color: currentIndex > 0 && allCandles[currentIndex]?.close >= allCandles[currentIndex - 1]?.close ? '#089981' : '#f23645'
                            }}>
                                {currentPrice.toFixed(2)} TL
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#787b86' }}>
                        {phase === 'setup' && '⏳ Başlangıç noktası seçin'}
                        {phase === 'playing' && '▶ Simülasyon devam ediyor...'}
                        {phase === 'paused' && '⏸ Duraklatıldı'}
                        {phase === 'finished' && '✅ Simülasyon tamamlandı'}
                    </div>
                </div>

                {/* Chart */}
                <div ref={chartContainerRef} style={{ flex: 1 }} />
            </div>
        </div>
    );
};

export default BacktestView;
