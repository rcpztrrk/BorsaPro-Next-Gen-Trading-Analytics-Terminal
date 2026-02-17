import React, { useState, useEffect, useRef } from 'react';

const InteractiveOverlay = ({ chart, series, drawings, setDrawings, isDrawingMode, drawingType }) => {
    const overlayRef = useRef(null);
    const [dragInfo, setDragInfo] = useState(null); // { id, part: 'p1'|'p2'|'body', startX, startY, originalDrawing }
    const [tempDrawing, setTempDrawing] = useState(null);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, id }
    const [, forceUpdate] = useState(0);

    // Sync with chart scrolling/zooming immediately
    useEffect(() => {
        if (!chart) return;
        const handleSync = () => forceUpdate(v => v + 1);
        chart.timeScale().subscribeVisibleLogicalRangeChange(handleSync);
        return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleSync);
    }, [chart]);

    // Coordinate conversion utilities
    const getCoords = (point) => {
        if (!chart || !series || !point) return { x: -1000, y: -1000 };
        const x = chart.timeScale().timeToCoordinate(point.time);
        const y = series.priceToCoordinate(point.price);
        return { x: x ?? -1000, y: y ?? -1000 };
    };

    const getPointFromCoords = (x, y) => {
        const time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);
        return { time, price };
    };

    // Fibonacci Level calculation
    const getFiboLevels = (p1, p2) => {
        const diff = p1.price - p2.price;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        return levels.map(lv => ({
            level: lv,
            price: p1.price - (diff * lv)
        }));
    };

    // --- MOUSE HANDLERS ---
    const handleMouseDown = (e) => {
        if (contextMenu) setContextMenu(null);
        if (!chart || !series || e.button !== 0) return; // Left click only for drawing/drag

        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 1. Check for Handle clicks (Resize)
        const THRESHOLD = 12;
        for (const d of drawings) {
            const c1 = getCoords(d.p1);
            const c2 = getCoords(d.p2);
            if (Math.hypot(c1.x - x, c1.y - y) < THRESHOLD) {
                setDragInfo({ id: d.id, part: 'p1' });
                return;
            }
            if (Math.hypot(c2.x - x, c2.y - y) < THRESHOLD) {
                setDragInfo({ id: d.id, part: 'p2' });
                return;
            }
        }

        // 2. Check for Body clicks (Move)
        for (const d of drawings) {
            const c1 = getCoords(d.p1);
            const c2 = getCoords(d.p2);
            let isInside = false;
            if (d.type === 'box') {
                const minX = Math.min(c1.x, c2.x);
                const maxX = Math.max(c1.x, c2.x);
                const minY = Math.min(c1.y, c2.y);
                const maxY = Math.max(c1.y, c2.y);
                isInside = x >= minX && x <= maxX && y >= minY && y <= maxY;
            } else {
                const dist = distToSegment({ x, y }, c1, c2);
                isInside = dist < 10;
            }

            if (isInside) {
                setDragInfo({
                    id: d.id,
                    part: 'body',
                    startX: x,
                    startY: y,
                    originalDrawing: { ...d }
                });
                return;
            }
        }

        // 3. New Drawing
        if (isDrawingMode) {
            const point = getPointFromCoords(x, y);
            if (point.time && point.price) {
                setTempDrawing({
                    id: Date.now(),
                    type: drawingType,
                    p1: point,
                    p2: point,
                    color: drawingType === 'fib' ? '#ff9800' : '#2962ff'
                });
            }
        }
    };

    const handleMouseMove = (e) => {
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (dragInfo) {
            const point = getPointFromCoords(x, y);
            if (!point.time || !point.price) return;

            setDrawings(prev => prev.map(d => {
                if (d.id !== dragInfo.id) return d;
                if (dragInfo.part === 'p1' || dragInfo.part === 'p2') return { ...d, [dragInfo.part]: point };
                if (dragInfo.part === 'body') {
                    const dx = x - dragInfo.startX;
                    const dy = y - dragInfo.startY;
                    const origC1 = getCoords(dragInfo.originalDrawing.p1);
                    const origC2 = getCoords(dragInfo.originalDrawing.p2);
                    const newP1 = getPointFromCoords(origC1.x + dx, origC1.y + dy);
                    const newP2 = getPointFromCoords(origC2.x + dx, origC2.y + dy);
                    if (newP1.time && newP2.time) return { ...d, p1: newP1, p2: newP2 };
                }
                return d;
            }));
        }

        if (tempDrawing) {
            const point = getPointFromCoords(x, y);
            if (point.time && point.price) setTempDrawing(prev => ({ ...prev, p2: point }));
        }
    };

    const handleMouseUp = () => {
        setDragInfo(null);
        if (tempDrawing) {
            setDrawings(prev => [...prev, tempDrawing]);
            setTempDrawing(null);
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find which drawing was clicked
        for (const d of drawings) {
            const c1 = getCoords(d.p1);
            const c2 = getCoords(d.p2);
            let isInside = false;
            if (d.type === 'box') {
                const minX = Math.min(c1.x, c2.x), maxX = Math.max(c1.x, c2.x), minY = Math.min(c1.y, c2.y), maxY = Math.max(c1.y, c2.y);
                isInside = x >= minX && x <= maxX && y >= minY && y <= maxY;
            } else {
                isInside = distToSegment({ x, y }, c1, c2) < 15;
            }

            if (isInside) {
                setContextMenu({ x: e.clientX, y: e.clientY, id: d.id });
                return;
            }
        }
    };

    const deleteDrawing = (id) => {
        setDrawings(prev => prev.filter(d => d.id !== id));
        setContextMenu(null);
    };

    const distToSegment = (p, v, w) => {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    };

    // --- RENDERING HELPERS ---
    const renderDrawing = (d, isGhost = false) => {
        const c1 = getCoords(d.p1);
        const c2 = getCoords(d.p2);
        const color = d.color || '#2962ff';
        const opacity = isGhost ? 0.5 : 1;

        const commonProps = isGhost ? {} : {
            onMouseDown: (e) => handleMouseDown(e),
            onContextMenu: (e) => handleContextMenu(e, d.id),
            style: { pointerEvents: 'all', cursor: isDrawingMode ? 'crosshair' : 'pointer' }
        };

        if (d.type === 'trend') {
            return (
                <g key={d.id} opacity={opacity} {...commonProps}>
                    <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke={color} strokeWidth="3" />
                    {!isGhost && <circle cx={c1.x} cy={c1.y} r="5" fill="white" stroke={color} strokeWidth="2" />}
                    {!isGhost && <circle cx={c2.x} cy={c2.y} r="5" fill="white" stroke={color} strokeWidth="2" />}
                </g>
            );
        }

        if (d.type === 'hline') {
            return (
                <g key={d.id} opacity={opacity} {...commonProps}>
                    <line x1="0" y1={c1.y} x2="100%" y2={c1.y} stroke={color} strokeWidth="3" />
                    {!isGhost && <circle cx={c1.x} cy={c1.y} r="5" fill="white" stroke={color} strokeWidth="2" />}
                </g>
            );
        }

        if (d.type === 'box') {
            const x = Math.min(c1.x, c2.x), y = Math.min(c1.y, c2.y), w = Math.abs(c1.x - c2.x), h = Math.abs(c1.y - c2.y);
            return (
                <g key={d.id} opacity={opacity} {...commonProps}>
                    <rect x={x} y={y} width={w} height={h} fill={`${color}22`} stroke={color} strokeWidth="1" />
                    {!isGhost && <circle cx={c1.x} cy={c1.y} r="5" fill="white" stroke={color} strokeWidth="2" />}
                    {!isGhost && <circle cx={c2.x} cy={c2.y} r="5" fill="white" stroke={color} strokeWidth="2" />}
                </g>
            );
        }

        if (d.type === 'fib') {
            const levels = getFiboLevels(d.p1, d.p2);
            const minX = Math.min(c1.x, c2.x);
            const maxX = Math.max(c1.x, c2.x);
            return (
                <g key={d.id} opacity={opacity} {...commonProps}>
                    <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke={color} strokeWidth="1" strokeDasharray="3,3" />
                    {levels.map((lv, k) => {
                        const yCoord = series.priceToCoordinate(lv.price);
                        return (
                            <g key={k}>
                                <line x1={minX} y1={yCoord} x2={maxX} y2={yCoord} stroke={color} strokeWidth="1" opacity="0.6" />
                                <text x={minX + 5} y={yCoord - 4} fill={color} fontSize="10" fontWeight="bold">{lv.level} ({lv.price.toFixed(2)})</text>
                            </g>
                        );
                    })}
                    {!isGhost && <circle cx={c1.x} cy={c1.y} r="5" fill="white" stroke={color} strokeWidth="2" />}
                    {!isGhost && <circle cx={c2.x} cy={c2.y} r="5" fill="white" stroke={color} strokeWidth="2" />}
                </g>
            );
        }
        return null;
    };

    return (
        <>
            <svg
                ref={overlayRef}
                style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    zIndex: 10, cursor: isDrawingMode ? 'crosshair' : 'default',
                    pointerEvents: (isDrawingMode || dragInfo || tempDrawing) ? 'auto' : 'none'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
            >
                {isDrawingMode && <rect width="100%" height="100%" fill="transparent" pointerEvents="all" />}
                {drawings.map(d => renderDrawing(d))}
                {tempDrawing && renderDrawing(tempDrawing, true)}
            </svg>

            {contextMenu && (
                <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000, background: '#1e222d', border: '1px solid #30363d', borderRadius: '4px', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', minWidth: '120px' }}>
                    <button onClick={() => deleteDrawing(contextMenu.id)} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#ef5350', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Sil</span>
                    </button>
                    <button onClick={() => setContextMenu(null)} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#d1d4dc', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '2px' }}>Vazgeç</button>
                </div>
            )}
        </>
    );
};

export default InteractiveOverlay;
