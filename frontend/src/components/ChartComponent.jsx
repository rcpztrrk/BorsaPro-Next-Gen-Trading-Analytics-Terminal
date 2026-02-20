import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, CrosshairMode, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts';
import axios from 'axios';
import InteractiveOverlay from './InteractiveOverlay';
import IndicatorModal from './IndicatorModal';
import { MousePointer2, Trash2, Activity, Info, Search, X, TrendingUp, Square, Type, Minus, Hash } from 'lucide-react';

const ChartComponent = ({ symbol, data, indicators, interval, setInterval }) => {
    const chartContainerRef = useRef();
    const rsiContainerRef = useRef();
    const macdContainerRef = useRef();
    const stochContainerRef = useRef();
    const atrContainerRef = useRef();
    const mfiContainerRef = useRef();
    const cciContainerRef = useRef();
    const wrContainerRef = useRef();
    const cmfContainerRef = useRef();
    const volContainerRef = useRef();

    const chartRef = useRef(null);
    const rsiChartRef = useRef(null);
    const macdChartRef = useRef(null);
    const stochChartRef = useRef(null);
    const atrChartRef = useRef(null);
    const mfiChartRef = useRef(null);
    const cciChartRef = useRef(null);
    const wrChartRef = useRef(null);
    const cmfChartRef = useRef(null);
    const volChartRef = useRef(null);

    const seriesRef = useRef({
        main: null, ma: {}, ema: {}, bb: {}, nw: null, nwGreen: null, nwRed: null,
        rsi: null, macd: null, macdSignal: null, macdHist: null,
        st: { upper: null, lower: null, trend: null },
        stoch: { k: null, d: null },
        vwap: null,
        atr: null,
        mfi: null,
        cci: null,
        williamsR: null,
        cmf: null,
        volume: null
    });

    // --- PERSISTENCE LOGIC ---
    const STORAGE_KEY = 'borsa_terminal_settings';
    const loadSettings = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    };

    const [visibility, setVisibility] = useState(loadSettings()?.visibility || {
        rsi: false, macd: false, stoch: false, atr: false,
        mfi: false, cci: false, williams_r: false, cmf: false, volume: false,
        ma20: true, ma50: true, ma200: false,
        ema9: false, ema21: false, bb: false, bb_pct: false,
        nw: true, nw_env: false,
        supertrend: false, vwap: false
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ visibility }));
    }, [visibility]);

    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [drawingType, setDrawingType] = useState('trend'); // 'trend', 'fib', 'box', 'hline'
    const [drawings, setDrawings] = useState([]);

    // --- DRAWING PERSISTENCE ---
    const fetchDrawings = useCallback(async () => {
        if (!symbol) return;
        try {
            const response = await axios.get(`http://localhost:8000/api/drawings/${symbol}`);
            if (Array.isArray(response.data)) {
                setDrawings(response.data);
            }
        } catch (e) { console.error('Error fetching drawings:', e); }
    }, [symbol]);

    const saveDrawings = async (newDrawings) => {
        if (!symbol) return;
        try {
            await axios.post(`http://localhost:8000/api/drawings/${symbol}`, newDrawings);
        } catch (e) { console.error('Error saving drawings:', e); }
    };

    useEffect(() => {
        fetchDrawings();
    }, [fetchDrawings]);

    const handleSetDrawings = (updateFunc) => {
        setDrawings(prev => {
            const next = typeof updateFunc === 'function' ? updateFunc(prev) : updateFunc;
            saveDrawings(next);
            return next;
        });
    };
    const [hoverValues, setHoverValues] = useState({
        price: null, ma20: null, ma50: null, ma200: null,
        ema9: null, ema21: null, bbUpper: null, bbLower: null,
        rsi: null, macd: null, signal: null, nw: null,
        st: null, vwap: null, stochK: null, stochD: null, atr: null,
        mfi: null, cci: null, williamsR: null, cmf: null, volume: null,
        aiPattern: null, aiConf: null
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    const isSyncingRangeRef = useRef(false);
    const isSyncingCrosshairRef = useRef(false);

    const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

    const timeFormatter = useMemo(() => (time) => {
        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        if (time && typeof time === 'object' && time.year) {
            return `${time.day} ${months[time.month - 1]} ${time.year}`;
        }
        if (typeof time === 'number') {
            const d = new Date(time * 1000);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}  ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }
        return String(time);
    }, []);

    const commonOptions = useMemo(() => ({
        layout: {
            background: { color: '#0d1117' },
            textColor: '#d1d4dc',
            fontSize: 11,
            fontFamily: "'Roboto Mono', monospace"
        },
        grid: {
            vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
            horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
        },
        rightPriceScale: {
            borderColor: '#30363d',
            autoScale: true,
            axisLabelVisible: true,
            expandLimit: 0,
            // Sabit genişlik (width) ve minimumWidth kullanıyoruz. 
            // Bu, farklı fiyat basamaklarına sahip grafiklerin (Fiyat vs RSI) 
            // çizim alanlarını yatayda tam aynı hizada tutar.
            width: 80,
            minimumWidth: 80,
        },
        timeScale: {
            borderColor: '#30363d',
            timeVisible: true,
            rightOffset: 12,
            barSpacing: 6,
            tickMarkFormatter: (time) => timeFormatter(time),
            shiftVisibleRangeOnNewBar: false,
        },
        localization: {
            timeFormatter: (time) => timeFormatter(time),
            locale: 'tr-TR'
        },
        crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
                labelVisible: true,
                labelBackgroundColor: '#2962ff',
                style: 2,
                width: 1,
                color: 'rgba(41, 98, 255, 0.6)',
                visible: true
            },
            horzLine: {
                labelVisible: true,
                labelBackgroundColor: '#2962ff',
                style: 2,
                width: 1,
                color: 'rgba(41, 98, 255, 0.6)',
                visible: true
            },
        },
        handleScroll: true,
        handleScale: true,
        watermark: { visible: false },
    }), [timeFormatter]);
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const cleanupCharts = () => {
            if (chartRef.current) chartRef.current.remove();
            if (rsiChartRef.current) rsiChartRef.current.remove();
            if (macdChartRef.current) macdChartRef.current.remove();
            if (stochChartRef.current) stochChartRef.current.remove();
            if (atrChartRef.current) atrChartRef.current.remove();
            if (mfiChartRef.current) mfiChartRef.current.remove();
            if (cciChartRef.current) cciChartRef.current.remove();
            if (wrChartRef.current) wrChartRef.current.remove();
            if (cmfChartRef.current) cmfChartRef.current.remove();
            if (volChartRef.current) volChartRef.current.remove();

            seriesRef.current = {
                main: null, ma: {}, ema: {}, bb: {}, nw: null, nwGreen: null, nwRed: null,
                rsi: null, macd: null, macdSignal: null, macdHist: null,
                st: { upper: null, lower: null, trend: null },
                stoch: { k: null, d: null },
                vwap: null,
                atr: null,
                mfi: null,
                cci: null,
                williamsR: null,
                cmf: null,
                volume: null
            };
            chartRef.current = null;
            rsiChartRef.current = null;
            macdChartRef.current = null;
            stochChartRef.current = null;
            atrChartRef.current = null;
            mfiChartRef.current = null;
            cciChartRef.current = null;
            wrChartRef.current = null;
            cmfChartRef.current = null;
            volChartRef.current = null;
        };

        cleanupCharts();

        const handleResize = () => {
            if (!chartContainerRef.current) return;
            const width = chartContainerRef.current.clientWidth;
            const parentHeight = chartContainerRef.current.closest('.panel-wrapper')?.clientHeight || chartContainerRef.current.parentElement.parentElement.clientHeight;
            const subPanelsCount = [visibility.rsi, visibility.macd, visibility.stoch, visibility.atr, visibility.mfi, visibility.cci, visibility.williams_r, visibility.cmf, visibility.volume].filter(Boolean).length;

            let mHeight, sHeight;
            if (subPanelsCount === 0) {
                mHeight = parentHeight;
                sHeight = 0;
            } else if (subPanelsCount === 1) {
                mHeight = parentHeight * 0.75;
                sHeight = parentHeight * 0.25;
            } else {
                mHeight = parentHeight * 0.60;
                sHeight = (parentHeight * 0.40) / subPanelsCount;
            }

            if (chartRef.current) {
                chartRef.current.applyOptions({ width, height: mHeight });
            }
            [
                { ref: rsiChartRef, visible: visibility.rsi },
                { ref: macdChartRef, visible: visibility.macd },
                { ref: stochChartRef, visible: visibility.stoch },
                { ref: atrChartRef, visible: visibility.atr },
                { ref: mfiChartRef, visible: visibility.mfi },
                { ref: cciChartRef, visible: visibility.cci },
                { ref: wrChartRef, visible: visibility.williams_r },
                { ref: cmfChartRef, visible: visibility.cmf },
                { ref: volChartRef, visible: visibility.volume }
            ].forEach(p => {
                if (p.visible && p.ref.current) {
                    p.ref.current.applyOptions({ width, height: sHeight });
                }
            });
        };

        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(handleResize);
        });
        resizeObserver.observe(chartContainerRef.current);

        const parentHeight = chartContainerRef.current.closest('.panel-wrapper')?.clientHeight || chartContainerRef.current.parentElement.parentElement.clientHeight;
        const subPanels = [visibility.rsi, visibility.macd, visibility.stoch, visibility.atr, visibility.mfi, visibility.cci, visibility.williams_r, visibility.cmf, visibility.volume].filter(Boolean).length;

        let mainHeight, subHeight;
        if (subPanels === 0) {
            mainHeight = parentHeight;
            subHeight = 0;
        } else if (subPanels === 1) {
            mainHeight = parentHeight * 0.75;
            subHeight = parentHeight * 0.25;
        } else {
            mainHeight = parentHeight * 0.60;
            subHeight = (parentHeight * 0.40) / subPanels;
        }

        // --- 1. PRICE CHART ---
        const chart = createChart(chartContainerRef.current, {
            ...commonOptions,
            width: chartContainerRef.current.clientWidth,
            height: mainHeight,
            timeScale: { ...commonOptions.timeScale, visible: subPanels === 0 },
        });
        chartRef.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
            wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        });
        seriesRef.current.main = candleSeries;

        // --- SUB PANELS ---
        const createSubChart = (container, height, title, isLast) => {
            if (!container) return null;
            const c = createChart(container, {
                ...commonOptions,
                width: container.clientWidth,
                height: height,
                timeScale: { ...commonOptions.timeScale, visible: isLast },
            });
            return c;
        };

        const activeSubPanels = [
            { id: 'vol', visible: visibility.volume, ref: volChartRef, container: volContainerRef },
            { id: 'rsi', visible: visibility.rsi, ref: rsiChartRef, container: rsiContainerRef },
            { id: 'macd', visible: visibility.macd, ref: macdChartRef, container: macdContainerRef },
            { id: 'stoch', visible: visibility.stoch, ref: stochChartRef, container: stochContainerRef },
            { id: 'atr', visible: visibility.atr, ref: atrChartRef, container: atrContainerRef },
            { id: 'mfi', visible: visibility.mfi, ref: mfiChartRef, container: mfiContainerRef },
            { id: 'cci', visible: visibility.cci, ref: cciChartRef, container: cciContainerRef },
            { id: 'wr', visible: visibility.williams_r, ref: wrChartRef, container: wrContainerRef },
            { id: 'cmf', visible: visibility.cmf, ref: cmfChartRef, container: cmfContainerRef }
        ].filter(p => p.visible);

        activeSubPanels.forEach((p, idx) => {
            const isLast = idx === activeSubPanels.length - 1;
            p.ref.current = createSubChart(p.container.current, subHeight, p.id.toUpperCase(), isLast);

            if (p.ref.current) {
                if (p.id === 'vol') {
                    seriesRef.current.volume = p.ref.current.addSeries(HistogramSeries, { color: '#26a69a', title: 'Volume' });
                } else if (p.id === 'rsi') {
                    seriesRef.current.rsi = p.ref.current.addSeries(LineSeries, { color: '#7e57c2', lineWidth: 2, title: 'RSI' });
                    seriesRef.current.rsi.createPriceLine({ price: 70, color: '#ef5350', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '70' });
                    seriesRef.current.rsi.createPriceLine({ price: 30, color: '#26a69a', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '30' });
                } else if (p.id === 'macd') {
                    seriesRef.current.macdHist = p.ref.current.addSeries(HistogramSeries, { title: 'Histogram' });
                    seriesRef.current.macd = p.ref.current.addSeries(LineSeries, { color: '#2962ff', lineWidth: 1, title: 'MACD' });
                    seriesRef.current.macdSignal = p.ref.current.addSeries(LineSeries, { color: '#ff5252', lineWidth: 1, title: 'Signal' });
                } else if (p.id === 'stoch') {
                    seriesRef.current.stoch.k = p.ref.current.addSeries(LineSeries, { color: '#2962ff', lineWidth: 1.5, title: '%K' });
                    seriesRef.current.stoch.d = p.ref.current.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1.5, title: '%D' });
                } else if (p.id === 'atr') {
                    seriesRef.current.atr = p.ref.current.addSeries(LineSeries, { color: '#9c27b0', lineWidth: 1.5, title: 'ATR' });
                } else if (p.id === 'mfi') {
                    seriesRef.current.mfi = p.ref.current.addSeries(LineSeries, { color: '#4caf50', lineWidth: 1.5, title: 'MFI' });
                    seriesRef.current.mfi.createPriceLine({ price: 80, color: '#ef5350', lineWidth: 1, lineStyle: 2, title: '80' });
                    seriesRef.current.mfi.createPriceLine({ price: 20, color: '#26a69a', lineWidth: 1, lineStyle: 2, title: '20' });
                } else if (p.id === 'cci') {
                    seriesRef.current.cci = p.ref.current.addSeries(LineSeries, { color: '#ffa726', lineWidth: 1.5, title: 'CCI' });
                    seriesRef.current.cci.createPriceLine({ price: 100, color: '#ef5350', lineWidth: 1, lineStyle: 2, title: '100' });
                    seriesRef.current.cci.createPriceLine({ price: -100, color: '#26a69a', lineWidth: 1, lineStyle: 2, title: '-100' });
                } else if (p.id === 'wr') {
                    seriesRef.current.williamsR = p.ref.current.addSeries(LineSeries, { color: '#f06292', lineWidth: 1.5, title: 'W %R' });
                    seriesRef.current.williamsR.createPriceLine({ price: -20, color: '#ef5350', lineWidth: 1, lineStyle: 2, title: '-20' });
                    seriesRef.current.williamsR.createPriceLine({ price: -80, color: '#26a69a', lineWidth: 1, lineStyle: 2, title: '-80' });
                } else if (p.id === 'cmf') {
                    seriesRef.current.cmf = p.ref.current.addSeries(HistogramSeries, { title: 'CMF' });
                }
            }
        });

        // --- LOAD DATA ---
        if (data && data.length > 0) {
            candleSeries.setData(data);
            if (indicators) {
                const maList = [
                    { k: 'MA20', c: '#2962ff', v: visibility.ma20 },
                    { k: 'MA50', c: '#ff9800', v: visibility.ma50 },
                    { k: 'MA200', c: '#f44336', v: visibility.ma200 }
                ];
                maList.forEach(m => {
                    if (m.v && indicators[m.k]?.length > 0) {
                        const s = chart.addSeries(LineSeries, { color: m.c, lineWidth: 1.5, title: m.k });
                        seriesRef.current.ma[m.k] = s;
                        s.setData(indicators[m.k]);
                    }
                });

                const emaList = [
                    { k: 'EMA9', c: '#4caf50', v: visibility.ema9 },
                    { k: 'EMA21', c: '#e91e63', v: visibility.ema21 }
                ];
                emaList.forEach(e => {
                    if (e.v && indicators[e.k]?.length > 0) {
                        const s = chart.addSeries(LineSeries, { color: e.c, lineWidth: 1.5, title: e.k });
                        seriesRef.current.ema[e.k] = s;
                        s.setData(indicators[e.k]);
                    }
                });

                if (visibility.nw && indicators.NW_SMOOTH?.length > 0) {
                    // Split data into Green (Rising/Buy) and Red (Falling/Sell) segments
                    const greenData = [];
                    const redData = [];
                    const source = indicators.NW_SMOOTH;
                    const signals = indicators.NW_SIGNAL || [];

                    // Create a map for fast signal lookup
                    const signalMap = new Map();
                    signals.forEach(s => signalMap.set(s.time, s.value));

                    // Initial state: Default to Green if no signal, or wait for first signal
                    let currentTrend = 1; // 1 = Green, -1 = Red

                    for (let i = 0; i < source.length; i++) {
                        const curr = source[i];
                        const sig = signalMap.get(curr.time);

                        // If a signal occurs, switch trend
                        if (sig === 1) currentTrend = 1;       // Buy -> Green
                        if (sig === -1) currentTrend = -1;     // Sell -> Red

                        if (currentTrend === 1) {
                            // If we just switched from Red, add to Red as well to bridge the gap
                            if (i > 0 && redData.length > 0 && redData[redData.length - 1].time === source[i - 1].time) {
                                // This point connects the two lines
                            }
                            // To ensure continuity, we usually add the point to the CURRENT active list.
                            // But to bridge disjoint segments, the transition point needs to be in BOTH.
                            // Simplest approach: Always add to active. If switch happens, add to specific.

                            // Better approach for continuity:
                            greenData.push(curr);

                            // If this point triggered a switch FROM Red, ensure previous point is in Green too?
                            // No, LineSeries connects points.
                            // If i-1 was Red, and i is Green.
                            // redData has ... i-1.
                            // greenData has i ...
                            // There is a gap between i-1 and i.
                            // FIX: If switching, add PREVIOUS point to NEW series.
                            if (i > 0 && redData.length > 0 && redData[redData.length - 1].time === source[i - 1].time && greenData.length === 1) {
                                // This is start of new green segment. Prepend prev point.
                                greenData.unshift(source[i - 1]);
                            }
                            // Actually, logic is simpler: 
                            // If trend is Green, add to Green.
                            // If trend JUST switched to Green, add i-1 to Green?

                        } else {
                            redData.push(curr);
                            if (i > 0 && greenData.length > 0 && greenData[greenData.length - 1].time === source[i - 1].time && redData.length === 1) {
                                redData.unshift(source[i - 1]);
                            }
                        }
                    }

                    // Refined Logic for Continuity:
                    // We need to rebuild the arrays.
                    // Ideally, every segment shares start/end points.
                    // Let's restart the loop with overlap strategy.

                    greenData.length = 0;
                    redData.length = 0;
                    currentTrend = 1; // Default

                    // Find first signal to set initial trend?
                    // Optional. Defaulting to 1 is fine.

                    // Always add first point to current trend
                    if (source.length > 0) {
                        if (currentTrend === 1) greenData.push(source[0]);
                        else redData.push(source[0]);
                    }

                    for (let i = 1; i < source.length; i++) {
                        const prev = source[i - 1];
                        const curr = source[i];
                        const sig = signalMap.get(curr.time); // Signal at this bar closes the bar? Signal usually at close.

                        // Check signal at CURRENT time (confirmed at close of i)
                        // If signal is 1, then FROM NOW ON it's Green.
                        // So segment (i-1 -> i) is still old color?
                        // Or signal indicates the state of the *next* move?
                        // Usually "Buy" means "We are now Long". So subsequent price action is Green.

                        let nextTrend = currentTrend;
                        if (sig === 1) nextTrend = 1;
                        if (sig === -1) nextTrend = -1;

                        // Add 'curr' to the list corresponding to 'currentTrend' (the trend that built this bar)
                        // Actually, if signal appeared at 'curr', it affects future.

                        if (currentTrend === 1) greenData.push(curr);
                        else redData.push(curr);

                        // If trend is changing, we must add 'curr' to the NEW trend list too (as start point)
                        if (nextTrend !== currentTrend) {
                            if (nextTrend === 1) greenData.push(curr); // Start new Green with curr
                            else redData.push(curr); // Start new Red with curr
                        }

                        currentTrend = nextTrend;
                    }

                    // Add Green Series (Up)
                    // Add Green Series (Up)
                    const sg = chart.addSeries(LineSeries, {
                        color: '#00c853',
                        lineWidth: 2,
                        title: 'LuxAlgo NW Up',
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    seriesRef.current.nwGreen = sg;
                    sg.setData(greenData);

                    // Add Red Series (Down)
                    const sr = chart.addSeries(LineSeries, {
                        color: '#ff5252',
                        lineWidth: 2,
                        title: 'LuxAlgo NW Down',
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    seriesRef.current.nwRed = sr;
                    sr.setData(redData);

                    // --- LUXALGO ENVELOPES ---
                    if (visibility.nw_env && indicators.NW_UPPER?.length > 0) {
                        const u = chart.addSeries(LineSeries, { color: 'rgba(0, 188, 212, 0.25)', lineWidth: 1, lineStyle: 2 });
                        const l = chart.addSeries(LineSeries, { color: 'rgba(0, 188, 212, 0.25)', lineWidth: 1, lineStyle: 2 });
                        u.setData(indicators.NW_UPPER);
                        l.setData(indicators.NW_LOWER);
                    }
                }

                // --- MARKERS (LuxAlgo + AI Patterns) ---
                const nwMarkers = (visibility.nw && indicators.NW_SIGNAL)
                    ? indicators.NW_SIGNAL.filter(sig => sig.value !== 0).map(sig => ({
                        time: sig.time,
                        position: sig.value === 1 ? 'belowBar' : 'aboveBar',
                        color: sig.value === 1 ? '#00c853' : '#ff5252',
                        shape: sig.value === 1 ? 'arrowUp' : 'arrowDown',
                        text: sig.value === 1 ? 'B' : 'S',
                        size: 1,
                        id: 'nw'
                    })) : [];

                const aiMarkers = (visibility.ai_patterns && indicators.AI_PATTERNS)
                    ? indicators.AI_PATTERNS.map(p => ({
                        time: p.time,
                        position: p.type === 1 ? 'belowBar' : 'aboveBar',
                        color: p.type === 1 ? '#26a69a' : '#ef5350',
                        shape: p.type === 1 ? 'arrowUp' : 'arrowDown',
                        text: p.label,
                        size: 1.5,
                        id: 'ai'
                    })) : [];

                const combinedMarkers = [...nwMarkers, ...aiMarkers].sort((a, b) => {
                    const tA = typeof a.time === 'object' ? a.time.year * 10000 + a.time.month * 100 + a.time.day : a.time;
                    const tB = typeof b.time === 'object' ? b.time.year * 10000 + b.time.month * 100 + b.time.day : b.time;
                    return tA - tB;
                });

                if (candleSeries) {
                    createSeriesMarkers(candleSeries).setMarkers(combinedMarkers);
                }

                if (visibility.bb && indicators.BB_UPPER?.length > 0) {
                    seriesRef.current.bb.upper = chart.addSeries(LineSeries, { color: 'rgba(33, 150, 243, 0.5)', lineWidth: 1, title: 'BB Upper' });
                    seriesRef.current.bb.lower = chart.addSeries(LineSeries, { color: 'rgba(33, 150, 243, 0.5)', lineWidth: 1, title: 'BB Lower' });
                    seriesRef.current.bb.middle = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.2)', lineWidth: 1, lineStyle: 2, title: 'BB Middle' });
                    seriesRef.current.bb.upper.setData(indicators.BB_UPPER);
                    seriesRef.current.bb.lower.setData(indicators.BB_LOWER);
                    seriesRef.current.bb.middle.setData(indicators.BB_MIDDLE);
                }

                if (visibility.bb_pct && indicators.BB_PCT?.length > 0) {
                    seriesRef.current.bbPct = chart.addSeries(LineSeries, {
                        color: '#2196f3',
                        lineWidth: 1,
                        title: '%B',
                        priceScaleId: 'left' // Overlay on left scale if needed, or just default right
                    });
                    seriesRef.current.bbPct.setData(indicators.BB_PCT);
                }

                if (visibility.supertrend && indicators.ST_UPPER?.length > 0) {
                    const stGreen = [];
                    const stRed = [];
                    const stU = indicators.ST_UPPER;
                    const stL = indicators.ST_LOWER;
                    const stT = indicators.ST_TREND;

                    for (let i = 0; i < stU.length; i++) {
                        const trend = stT[i]?.value;
                        const item = { time: stU[i].time, value: trend === -1 ? stL[i].value : stU[i].value };

                        if (trend === -1) {
                            // If trend just switched to Green
                            if (i > 0 && stT[i - 1].value === 1) {
                                stGreen.push({ time: stU[i - 1].time, value: stL[i].value });
                            }
                            stGreen.push(item);
                        } else {
                            // If trend just switched to Red
                            if (i > 0 && stT[i - 1].value === -1) {
                                stRed.push({ time: stU[i - 1].time, value: stU[i].value });
                            }
                            stRed.push(item);
                        }
                    }
                    seriesRef.current.st.lower = chart.addSeries(LineSeries, { color: '#00c853', lineWidth: 2, title: 'ST Up' });
                    seriesRef.current.st.upper = chart.addSeries(LineSeries, { color: '#ff5252', lineWidth: 2, title: 'ST Down' });
                    seriesRef.current.st.lower.setData(stGreen);
                    seriesRef.current.st.upper.setData(stRed);
                }

                if (visibility.vwap && indicators.VWAP?.length > 0) {
                    seriesRef.current.vwap = chart.addSeries(LineSeries, { color: '#ffeb3b', lineWidth: 1.5, title: 'VWAP' });
                    seriesRef.current.vwap.setData(indicators.VWAP);
                }

                if (seriesRef.current.rsi && indicators.RSI?.length > 0) seriesRef.current.rsi.setData(indicators.RSI);
                if (seriesRef.current.macd && indicators.MACD?.length > 0) seriesRef.current.macd.setData(indicators.MACD);
                if (seriesRef.current.macdSignal && indicators.MACD_SIGNAL?.length > 0) seriesRef.current.macdSignal.setData(indicators.MACD_SIGNAL);

                // Calculate and set MACD Histogram
                if (seriesRef.current.macdHist && indicators.MACD?.length > 0 && indicators.MACD_SIGNAL?.length > 0) {
                    const histData = indicators.MACD.map((m, i) => {
                        const s = indicators.MACD_SIGNAL[i];
                        if (!s || m.time !== s.time) return null;
                        const val = m.value - s.value;
                        return {
                            time: m.time,
                            value: val,
                            color: val >= 0 ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                        };
                    }).filter(Boolean);
                    seriesRef.current.macdHist.setData(histData);
                }

                if (seriesRef.current.stoch.k && indicators.STOCH_K?.length > 0) seriesRef.current.stoch.k.setData(indicators.STOCH_K);
                if (seriesRef.current.stoch.d && indicators.STOCH_D?.length > 0) seriesRef.current.stoch.d.setData(indicators.STOCH_D);
                if (seriesRef.current.atr && indicators.ATR?.length > 0) seriesRef.current.atr.setData(indicators.ATR);
                if (seriesRef.current.mfi && indicators.MFI?.length > 0) seriesRef.current.mfi.setData(indicators.MFI);
                if (seriesRef.current.cci && indicators.CCI?.length > 0) seriesRef.current.cci.setData(indicators.CCI);
                if (seriesRef.current.williamsR && indicators.WILLIAMS_R?.length > 0) seriesRef.current.williamsR.setData(indicators.WILLIAMS_R);
                if (seriesRef.current.volume && indicators.VOLUME?.length > 0) {
                    const volData = indicators.VOLUME.map((v, i) => ({
                        time: v.time,
                        value: v.value,
                        color: data[i]?.close >= data[i]?.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                    }));
                    seriesRef.current.volume.setData(volData);
                }
                if (seriesRef.current.cmf && indicators.CMF?.length > 0) {
                    const cmfData = indicators.CMF.map(v => ({
                        time: v.time,
                        value: v.value,
                        color: v.value >= 0 ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                    }));
                    seriesRef.current.cmf.setData(cmfData);
                }
            }
            chart.timeScale().fitContent();
        }

        // --- MUTUAL SYNC ENGINE (Karşılıklı Senkronizasyon) ---
        const activeCharts = [
            chart, volChartRef.current, rsiChartRef.current, macdChartRef.current,
            stochChartRef.current, atrChartRef.current, mfiChartRef.current,
            cciChartRef.current, wrChartRef.current, cmfChartRef.current
        ].filter(Boolean);

        if (activeCharts.length > 1) {
            // [CRITICAL] Master Range Lock: Grafiklerin kilitli başlamasını sağlar.
            const initialRange = chart.timeScale().getVisibleLogicalRange();
            if (initialRange) {
                activeCharts.forEach(c => {
                    if (c !== chart) c.timeScale().setVisibleLogicalRange(initialRange);
                });
            }

            activeCharts.forEach(src => {
                const otherCharts = activeCharts.filter(c => c !== src);

                // 1. Logical Range Sync (Zaman Kilidi - Fluid Sync)
                src.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                    if (isSyncingRangeRef.current || !range) return;
                    isSyncingRangeRef.current = true;

                    // requestAnimationFrame Kullanımı:
                    // Değişikliği tarayıcının ekran yenileme hızıyla (FPS) senkronize ederek
                    // titremeyi (jitter) önler ve çok daha akıcı bir kaydırma deneyimi sunar.
                    requestAnimationFrame(() => {
                        otherCharts.forEach(target => {
                            target.timeScale().setVisibleLogicalRange(range);
                        });
                        isSyncingRangeRef.current = false;
                    });
                });

                // 2. Crosshair Sync (Dikey Çizgi Kilidi)
                src.subscribeCrosshairMove(p => {
                    // Update Hover Values (Sync Overlay)
                    const time = p.time;
                    const getValueAtTime = (list) => list && time ? (list.find(v => v.time === time)?.value ?? null) : null;
                    const mainSeries = seriesRef.current.main;
                    const priceData = mainSeries ? p.seriesData.get(mainSeries) : null;

                    setHoverValues({
                        price: priceData ? priceData.close : getValueAtTime(data),
                        ma20: getValueAtTime(indicators.MA20),
                        ma50: getValueAtTime(indicators.MA50),
                        ma200: getValueAtTime(indicators.MA200),
                        ema9: getValueAtTime(indicators.EMA9),
                        ema21: getValueAtTime(indicators.EMA21),
                        bbUpper: getValueAtTime(indicators.BB_UPPER),
                        bbLower: getValueAtTime(indicators.BB_LOWER),
                        nw: getValueAtTime(indicators.NW_SMOOTH),
                        rsi: getValueAtTime(indicators.RSI),
                        macd: getValueAtTime(indicators.MACD),
                        signal: getValueAtTime(indicators.MACD_SIGNAL),
                        vwap: getValueAtTime(indicators.VWAP),
                        atr: getValueAtTime(indicators.ATR),
                        stochK: getValueAtTime(indicators.STOCH_K),
                        stochD: getValueAtTime(indicators.STOCH_D),
                        mfi: getValueAtTime(indicators.MFI),
                        cci: getValueAtTime(indicators.CCI),
                        williamsR: getValueAtTime(indicators.WILLIAMS_R),
                        cmf: getValueAtTime(indicators.CMF),
                        volume: getValueAtTime(indicators.VOLUME),
                        aiPattern: indicators.AI_PATTERNS && time ? (indicators.AI_PATTERNS.find(v => v.time === time)?.label ?? null) : null,
                        aiConf: indicators.AI_PATTERNS && time ? (indicators.AI_PATTERNS.find(v => v.time === time)?.confidence ?? null) : null
                    });

                    // Broadcast Crosshair Focus
                    if (isSyncingCrosshairRef.current) return;
                    isSyncingCrosshairRef.current = true;

                    if (!p.point) {
                        otherCharts.forEach(t => t.clearCrosshairPosition());
                    } else {
                        otherCharts.forEach(t => {
                            // Find any valid series to sync the vertical line
                            let syncSeries = null;
                            if (t === chartRef.current) syncSeries = seriesRef.current.main;
                            else if (t === rsiChartRef.current) syncSeries = seriesRef.current.rsi;
                            else if (t === macdChartRef.current) syncSeries = seriesRef.current.macd;
                            else if (t === stochChartRef.current) syncSeries = seriesRef.current.stoch.k;
                            else if (t === atrChartRef.current) syncSeries = seriesRef.current.atr;
                            else if (t === mfiChartRef.current) syncSeries = seriesRef.current.mfi;
                            else if (t === cciChartRef.current) syncSeries = seriesRef.current.cci;
                            else if (t === wrChartRef.current) syncSeries = seriesRef.current.williamsR;
                            else if (t === cmfChartRef.current) syncSeries = seriesRef.current.cmf;
                            else if (t === volChartRef.current) syncSeries = seriesRef.current.volume;

                            if (syncSeries) {
                                t.setCrosshairPosition(0, p.time, syncSeries);
                            }
                        });
                    }

                    isSyncingCrosshairRef.current = false;
                });
            });
        }

        return () => {
            resizeObserver.disconnect();
            cleanupCharts();
        };
    }, [visibility, data, indicators, commonOptions]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>

            {/* Professional TOP Toolbar */}
            <div className="pro-chart-toolbar">
                <div className="toolbar-section gap-2">
                    <span className="section-label">Zaman:</span>
                    <div className="flex gap-1" style={{ display: 'flex', gap: '4px' }}>
                        {['1m', '5m', '15m', '1h', '1d', '1wk'].map(tf => (
                            <button key={tf} onClick={() => setInterval(tf)} className={`tf-item ${interval === tf ? 'active' : ''}`}>
                                {tf.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="toolbar-spacer" />
                <div className="toolbar-section gap-2">
                    <span className="section-label">Göstergeler:</span>
                    <button className="dropdown-btn" onClick={() => setIsModalOpen(true)}>
                        Gösterge Ekle <Activity size={12} style={{ marginLeft: 4 }} />
                    </button>
                    <IndicatorModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        visibility={visibility}
                        setVisibility={setVisibility}
                    />
                </div>
                <div className="toolbar-spacer" />
                <div className="toolbar-section gap-2">
                    <button onClick={() => setIsDrawingMode(!isDrawingMode)} className={`circle-btn-flat ${isDrawingMode ? 'active' : ''}`} title="Çizim Modu">
                        <MousePointer2 size={14} />
                    </button>
                    {isDrawingMode && (
                        <div className="flex gap-1" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '6px' }}>
                            {[
                                { id: 'trend', icon: <Minus size={14} />, title: 'Trend Çizgisi' },
                                { id: 'fib', icon: <Hash size={14} />, title: 'Fibonacci' },
                                { id: 'box', icon: <Square size={14} />, title: 'Kutu' },
                                { id: 'hline', icon: <Type size={14} />, title: 'Yatay Çizgi' }
                            ].map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => setDrawingType(tool.id)}
                                    className={`tf-item ${drawingType === tool.id ? 'active' : ''}`}
                                    style={{ padding: '4px 8px' }}
                                    title={tool.title}
                                >
                                    {tool.icon}
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={() => handleSetDrawings([])} className="circle-btn-flat" title="Çizimleri Temizle">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="panel-wrapper" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: '#0d1117' }}>
                <div className="panel-container main-panel" style={{ position: 'relative', overflow: 'hidden' }}>
                    <div ref={chartContainerRef} style={{ width: '100%' }} />
                    <PanelLegend
                        label="PRICE"
                        indicators={visibility}
                        values={hoverValues}
                        type="main"
                        onCloseIndicator={(id) => setVisibility(v => ({ ...v, [id]: false }))}
                    />
                </div>

                {visibility.rsi && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative', overflow: 'hidden' }}>
                        <div ref={rsiContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="RSI" value={hoverValues.rsi} onClose={() => setVisibility(v => ({ ...v, rsi: false }))} />
                    </div>
                )}
                {visibility.macd && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative', overflow: 'hidden' }}>
                        <div ref={macdContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="MACD" value={hoverValues.macd} onClose={() => setVisibility(v => ({ ...v, macd: false }))} />
                    </div>
                )}
                {visibility.stoch && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative', overflow: 'hidden' }}>
                        <div ref={stochContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="STOCH" value={hoverValues.stochK} onClose={() => setVisibility(v => ({ ...v, stoch: false }))} />
                    </div>
                )}
                {visibility.atr && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative', overflow: 'hidden' }}>
                        <div ref={atrContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="ATR" value={hoverValues.atr} onClose={() => setVisibility(v => ({ ...v, atr: false }))} />
                    </div>
                )}
                {visibility.volume && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative' }}>
                        <div ref={volContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="VOLUME" value={hoverValues.volume} onClose={() => setVisibility(v => ({ ...v, volume: false }))} />
                    </div>
                )}
                {visibility.mfi && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative', overflow: 'hidden' }}>
                        <div ref={mfiContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="MFI" value={hoverValues.mfi} onClose={() => setVisibility(v => ({ ...v, mfi: false }))} />
                    </div>
                )}
                {visibility.cci && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative', overflow: 'hidden' }}>
                        <div ref={cciContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="CCI" value={hoverValues.cci} onClose={() => setVisibility(v => ({ ...v, cci: false }))} />
                    </div>
                )}
                {visibility.williams_r && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative', overflow: 'hidden' }}>
                        <div ref={wrContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="W %R" value={hoverValues.williamsR} onClose={() => setVisibility(v => ({ ...v, williams_r: false }))} />
                    </div>
                )}
                {visibility.cmf && (
                    <div className="panel-container" style={{ borderTop: '1px solid #30363d', position: 'relative', overflow: 'hidden' }}>
                        <div ref={cmfContainerRef} style={{ width: '100%' }} />
                        <PanelLegend label="CMF" value={hoverValues.cmf} onClose={() => setVisibility(v => ({ ...v, cmf: false }))} />
                    </div>
                )}

                <InteractiveOverlay
                    chart={chartRef.current}
                    series={seriesRef.current.main}
                    drawings={drawings}
                    setDrawings={handleSetDrawings}
                    isDrawingMode={isDrawingMode}
                    drawingType={drawingType}
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                 .pro-chart-toolbar {
                    height: 44px; background: #1e222d; border-bottom: 1px solid #30363d;
                    display: flex; align-items: center; padding: 0 16px; gap: 8px; z-index: 100;
                }
                .toolbar-section { display: flex; align-items: center; }
                .toolbar-section.gap-2 { gap: 8px; }
                .section-label { font-size: 0.65rem; font-weight: 700; color: #787b86; margin-right: 4px; text-transform: uppercase; }
                .toolbar-spacer { width: 1px; height: 20px; background: #363a45; margin: 0 4px; }
                
                .tf-item {
                    background: transparent; border: none; color: #d1d4dc; font-size: 0.75rem;
                    font-weight: 600; padding: 6px 10px; border-radius: 4px; cursor: pointer; transition: 0.2s;
                }
                .tf-item:hover { background: #2a2e39; color: white; }
                .tf-item.active { background: #2962ff; color: white; }
                
                .dropdown-btn { 
                    background: #2a2e39; border: 1px solid #363a45; 
                    color: #d1d4dc; font-size: 0.75rem; font-weight: 600; padding: 6px 12px; 
                    border-radius: 4px; cursor: pointer; display: flex; align-items: center; transition: 0.2s;
                }
                .dropdown-btn:hover { background: #363a45; color: white; border-color: #434651; }

                .panel-legend {
                    position: absolute; top: 8px; left: 8px; z-index: 10;
                    background: rgba(13, 17, 23, 0.6); backdrop-filter: blur(4px);
                    padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);
                    display: flex; align-items: center; gap: 10px; font-size: 0.7rem;
                    color: #787b86; pointer-events: auto;
                }
                .legend-main { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #d1d4dc; }
                .legend-close { 
                    background: transparent; border: none; color: #787b86; cursor: pointer; 
                    display: flex; align-items: center; justify-content: center; padding: 2px;
                    border-radius: 3px; transition: 0.2s;
                }
                .legend-close:hover { color: #f7525f; background: rgba(247, 82, 95, 0.1); }
                .legend-value { font-family: 'Roboto Mono', monospace; color: #2962ff; font-weight: 500; }
                .legend-indicators { display: flex; align-items: center; gap: 8px; font-size: 0.65rem; color: #787b86; }
                .legend-indicator-item { display: flex; align-items: center; gap: 4px; padding: 1px 4px; border-radius: 3px; }
                .legend-indicator-item:hover { background: rgba(255,255,255,0.05); }
                .legend-dot { width: 6px; height: 6px; border-radius: 50%; }

                .panel-container { overflow: hidden; }
                .panel-container div[ref] { background: #0d1117; }

                .overlay-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 20px; margin-top: 4px; }
                .overlay-line.ema9 .value { color: #4caf50; }
                .overlay-line.ema21 .value { color: #e91e63; }
                .overlay-line.bb .value { color: rgba(33, 150, 243, 0.8); }
                .overlay-line.nw .value { color: #00bcd4; }
            `}} />
        </div>
    );
};

const IndicatorToggle = ({ active, color, onClick, children }) => (
    <button onClick={onClick} style={{
        background: active ? color : 'transparent',
        border: `1px solid ${active ? color : 'var(--border-color)'}`,
        color: active ? 'white' : 'var(--text-dim)',
        fontSize: '0.6rem', fontWeight: 'bold', width: '26px', height: '26px', borderRadius: '50%',
        cursor: 'pointer', transition: '0.15s'
    }}>
        {children}
    </button>
);

const PanelLegend = ({ label, value, onClose, indicators, values, type = 'sub', onCloseIndicator }) => (
    <div className="panel-legend">
        <div className="legend-main">
            <span>{label}</span>
            {value !== undefined && value !== null && <span className="legend-value">{typeof value === 'number' ? value.toFixed(2) : value}</span>}
        </div>
        {type === 'main' && indicators && (
            <div className="legend-indicators">
                {values?.aiPattern && (
                    <div className="legend-indicator-item ai-pattern-badge" style={{ background: 'rgba(255, 82, 82, 0.1)', border: '1px solid #ff5252' }}>
                        <TrendingUp size={10} style={{ color: '#ff5252' }} />
                        <span style={{ color: '#fff', fontWeight: 'bold' }}>{values.aiPattern}</span>
                        <span style={{ color: '#ff5252', fontSize: '0.6rem', marginLeft: '4px' }}>%{values.aiConf}</span>
                    </div>
                )}
                {Object.entries(indicators).map(([id, active]) => {
                    if (!active || ['rsi', 'macd', 'stoch', 'atr', 'mfi', 'cci', 'williams_r', 'cmf', 'volume', 'ai_patterns'].includes(id)) return null;
                    const colors = { ma20: '#2962ff', ma50: '#ff9800', ma200: '#f44336', ema9: '#4caf50', ema21: '#e91e63', bb: '#2196f3', bb_pct: '#2196f3', nw: '#00bcd4', supertrend: '#00c853', vwap: '#ffeb3b' };
                    return (
                        <div key={id} className="legend-indicator-item">
                            <div className="legend-dot" style={{ background: colors[id] || '#787b86' }} />
                            <span>{id.toUpperCase()}</span>
                            <button className="legend-close" onClick={() => onCloseIndicator(id)}><X size={10} /></button>
                        </div>
                    );
                })}
            </div>
        )}
        {type === 'sub' && onClose && (
            <button className="legend-close" onClick={onClose}>
                <X size={12} />
            </button>
        )}
    </div>
);

const IndicatorItem = ({ active, label, color, onClick }) => (
    <div className={`indicator-item ${active ? 'active' : ''}`} onClick={onClick}>
        <span className="item-label">{label}</span>
        <div className="status-dot" style={{ background: active ? color : '#5d606b', boxShadow: active ? `0 0 8px ${color}` : 'none' }} />
    </div>
);

export default ChartComponent;
