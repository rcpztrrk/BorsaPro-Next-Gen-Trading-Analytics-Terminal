import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Plus, TrendingUp, TrendingDown, GripVertical, Search, Bell } from 'lucide-react';
import SetAlertModal from './SetAlertModal';

const API = 'http://localhost:8000/api';

const Watchlist = ({ onSelectSymbol }) => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlertSymbol, setSelectedAlertSymbol] = useState(null);
    const prevPricesRef = useRef({});

    const fetchWatchlist = async () => {
        try {
            const res = await axios.get(`${API}/watchlist/data`);
            const { watchlist, triggered } = res.data;

            if (triggered && triggered.length > 0) {
                window.dispatchEvent(new CustomEvent('priceAlertTriggered', { detail: triggered }));
                window.dispatchEvent(new CustomEvent('alertsUpdated'));
            }

            setList(prevList => {
                return watchlist.map(item => {
                    const prev = prevPricesRef.current[item.symbol];
                    let flashClass = '';
                    if (prev !== undefined) {
                        if (item.price > prev) flashClass = 'flash-up';
                        else if (item.price < prev) flashClass = 'flash-down';
                    }
                    prevPricesRef.current[item.symbol] = item.price;
                    return { ...item, flashClass };
                });
            });
            setLoading(false);
        } catch (err) {
            console.error("Watchlist fetch error:", err);
        }
    };

    useEffect(() => {
        fetchWatchlist();
        const interval = setInterval(fetchWatchlist, 10000); // Poll every 10s

        const handleUpdate = () => fetchWatchlist();
        window.addEventListener('watchlistUpdated', handleUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('watchlistUpdated', handleUpdate);
        };
    }, []);

    // Clear flash classes after animation
    useEffect(() => {
        const timer = setTimeout(() => {
            setList(curr => curr.map(item => ({ ...item, flashClass: '' })));
        }, 1000);
        return () => clearTimeout(timer);
    }, [list]);

    const removeFromWatchlist = async (e, symbol) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API}/watchlist/${symbol}`);
            setList(curr => curr.filter(i => i.symbol !== symbol));
        } catch (err) {
            console.error("Remove from watchlist error:", err);
        }
    };

    if (loading && list.length === 0) {
        return <div style={styles.empty}>Yükleniyor...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>İzleme Listesi</span>
                <button style={styles.addBtn} onClick={() => window.dispatchEvent(new CustomEvent('openSymbolSearch'))}>
                    <Plus size={14} />
                </button>
            </div>
            <div style={styles.list}>
                {list.length === 0 ? (
                    <div style={styles.empty}>Listeniz boş.</div>
                ) : (
                    list.map((item) => (
                        <div
                            key={item.symbol}
                            className="watchlist-item"
                            style={styles.item}
                            onClick={() => onSelectSymbol(item.symbol)}
                        >
                            <div style={styles.itemLeft}>
                                <GripVertical size={12} style={styles.grip} />
                                <span style={styles.symbol}>{item.symbol}</span>
                            </div>
                            <div style={styles.itemRight}>
                                <span className={`price ${item.flashClass}`} style={styles.price}>
                                    {item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                                <span style={{
                                    ...styles.percent,
                                    color: item.percent >= 0 ? '#00c853' : '#ff5252'
                                }}>
                                    {item.percent >= 0 ? '+' : ''}{item.percent.toFixed(2)}%
                                </span>
                                <button
                                    className="alert-btn"
                                    style={styles.alertBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAlertSymbol(item);
                                    }}
                                    title="Alarm Kur"
                                >
                                    <Bell size={12} />
                                </button>
                                <button className="remove-btn" style={styles.removeBtn} onClick={(e) => removeFromWatchlist(e, item.symbol)}>
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <SetAlertModal
                isOpen={!!selectedAlertSymbol}
                onClose={() => setSelectedAlertSymbol(null)}
                symbol={selectedAlertSymbol?.symbol}
                currentPrice={selectedAlertSymbol?.price}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .watchlist-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                    cursor: pointer;
                    transition: 0.2s;
                    position: relative;
                }
                .watchlist-item:hover {
                    background: rgba(255,255,255,0.03);
                }
                .watchlist-item:hover .remove-btn,
                .watchlist-item:hover .alert-btn {
                    opacity: 1;
                }
                .watchlist-item .alert-btn {
                    opacity: 0;
                    transition: 0.2s;
                }
                .price {
                    transition: background 0.5s ease;
                    padding: 2px 4px;
                    border-radius: 3px;
                }
                .flash-up {
                    background: rgba(0, 200, 83, 0.4);
                    color: white;
                }
                .flash-down {
                    background: rgba(255, 82, 82, 0.4);
                    color: white;
                }
            `}} />
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#131722',
        color: '#d1d4dc',
        borderLeft: '1px solid #30363d',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #30363d',
        background: '#1e222d'
    },
    title: {
        fontSize: '0.8rem',
        fontWeight: 'bold',
        color: '#787b86',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    addBtn: {
        background: 'transparent',
        border: 'none',
        color: '#2962ff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    list: {
        flex: 1,
        overflowY: 'auto',
    },
    item: {
        // className handles this
    },
    itemLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    grip: {
        color: '#363a45',
        cursor: 'grab'
    },
    symbol: {
        fontWeight: '700',
        fontSize: '0.85rem'
    },
    itemRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    price: {
        fontSize: '0.85rem',
        fontWeight: '600',
        fontFamily: "'Roboto Mono', monospace"
    },
    percent: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        minWidth: '55px',
        textAlign: 'right'
    },
    removeBtn: {
        background: 'transparent',
        border: 'none',
        color: '#787b86',
        cursor: 'pointer',
        padding: '2px'
    },
    alertBtn: {
        background: 'transparent',
        border: 'none',
        color: '#787b86',
        cursor: 'pointer',
        padding: '2px'
    },
    empty: {
        padding: '20px',
        textAlign: 'center',
        color: '#787b86',
        fontSize: '0.8rem'
    }
};

export default Watchlist;
