import React, { useState, useEffect, useRef } from 'react';

const InteractiveOverlay = ({ chart, series, drawings, setDrawings, isDrawingMode, drawingType }) => {
    const overlayRef = useRef(null);
    const [dragInfo, setDragInfo] = useState(null); // { id, type: 'point1' | 'point2' | 'move' }
    const [tempDrawing, setTempDrawing] = useState(null);


    // Sync with chart changes (scroll/zoom)
    useEffect(() => {
        if (!chart) return;

        const handleTimeRangeChange = () => {
            // Force re-render to update drawing positions
            overlayRef.current.style.display = 'none';
            // eslint-disable-next-line no-unused-expressions
            overlayRef.current.offsetHeight; // trigger reflow
            overlayRef.current.style.display = 'block';

            // In a real optimized app, we would use a state or ref update here
            // For now, simpler force update approach:
            setDrawings(d => [...d]);
        };

        chart.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);

        return () => {
            chart.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
        };
    }, [chart]);


    // Coordinate conversion
    const getCoords = (dataPoint) => {
        if (!chart || !series || !dataPoint) return { x: -100, y: -100 };

        const timeScale = chart.timeScale();
        const priceScale = series.priceScale();

        // timeToCoordinate return null if out of range, but we want to draw lines even if partially out
        // However, lightweight-charts v4+ might return null for points far off screen
        const x = timeScale.timeToCoordinate(dataPoint.time);
        const y = series.priceToCoordinate(dataPoint.price);

        return {
            x: x ?? -1000,
            y: y ?? -1000
        };
    };

    // --- MOUSE HANDLERS ---
    const handleMouseDown = (e) => {
        if (!chart || !series) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check handle click
        const clickedHandle = findClickedHandle(x, y);
        if (clickedHandle) {
            setDragInfo(clickedHandle);
            return;
        }

        // Start new drawing if tool is active
        if (isDrawingMode) {
            const timeScale = chart.timeScale();
            const time = timeScale.coordinateToTime(x);
            const price = series.coordinateToPrice(y);

            if (time && price) {
                const newId = Date.now();
                const newDrawing = {
                    id: newId,
                    type: drawingType,
                    p1: { time, price },
                    p2: { time, price },
                    preview: true
                };
                setTempDrawing(newDrawing);
            }
        }
    };

    const handleMouseMove = (e) => {
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 1. Dragging Point
        if (dragInfo) {
            updateDrawing(dragInfo.id, dragInfo.type, x, y);
            return;
        }

        // 2. Creating Preview
        if (tempDrawing) {
            const timeScale = chart.timeScale();
            const time = timeScale.coordinateToTime(x);
            const price = series.coordinateToPrice(y);

            if (time && price) {
                setTempDrawing(prev => ({
                    ...prev,
                    p2: { time, price }
                }));
            }
        }
    };

    const handleMouseUp = () => {
        if (dragInfo) {
            setDragInfo(null);
        }
        if (tempDrawing) {
            // Finalize drawing
            setDrawings([...drawings, { ...tempDrawing, preview: false }]);
            setTempDrawing(null);
            // Reset drawing mode externally if needed
        }
    };

    const findClickedHandle = (x, y) => {
        // Loop through drawings and check distance to p1, p2
        // Threshold for clicking
        const THRESHOLD = 10;

        for (const d of drawings) {
            const p1Coords = getCoords(d.p1);
            const p2Coords = getCoords(d.p2);

            if (Math.hypot(p1Coords.x - x, p1Coords.y - y) < THRESHOLD) return { id: d.id, type: 'p1' };
            if (Math.hypot(p2Coords.x - x, p2Coords.y - y) < THRESHOLD) return { id: d.id, type: 'p2' };
        }
        return null;
    };

    const updateDrawing = (id, handleType, x, y) => {
        if (!chart || !series) return;
        const timeScale = chart.timeScale();

        const time = timeScale.coordinateToTime(x);
        const price = series.coordinateToPrice(y);

        if (!time || !price) return;

        setDrawings(prev => prev.map(d => {
            if (d.id !== id) return d;
            return {
                ...d,
                [handleType]: { time, price }
            };
        }));
    };

    // RENDER
    return (
        <svg
            ref={overlayRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 2,
                cursor: isDrawingMode ? 'crosshair' : 'default',
                pointerEvents: isDrawingMode || dragInfo || tempDrawing ? 'auto' : 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Background layer to catch clicks when drawing but pass through otherwise */}
            {isDrawingMode && (
                <rect width="100%" height="100%" fill="transparent" style={{ pointerEvents: 'auto' }} />
            )}

            {/* Existing Drawings */}
            {drawings.map(d => {
                const c1 = getCoords(d.p1);
                const c2 = getCoords(d.p2);

                // If both points are off-screen, don't render
                if (c1.x < -500 && c2.x < -500) return null;

                return (
                    <g key={d.id} style={{ pointerEvents: 'auto' }}>
                        {/* The Line */}
                        <line
                            x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y}
                            stroke="#2962ff" strokeWidth="2"
                            style={{ cursor: 'pointer' }}
                        />

                        {/* Handles for Dragging */}
                        <circle
                            cx={c1.x} cy={c1.y} r="6" fill="white" stroke="#2962ff"
                            style={{ cursor: 'grab', pointerEvents: 'auto' }}
                        />
                        <circle
                            cx={c2.x} cy={c2.y} r="6" fill="white" stroke="#2962ff"
                            style={{ cursor: 'grab', pointerEvents: 'auto' }}
                        />
                    </g>
                );
            })}

            {/* Temp Drawing Preview */}
            {tempDrawing && (
                <line
                    x1={getCoords(tempDrawing.p1).x}
                    y1={getCoords(tempDrawing.p1).y}
                    x2={getCoords(tempDrawing.p2).x}
                    y2={getCoords(tempDrawing.p2).y}
                    stroke="#2962ff"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.8"
                    style={{ pointerEvents: 'none' }}
                />
            )}
        </svg>
    );
};

export default InteractiveOverlay;
