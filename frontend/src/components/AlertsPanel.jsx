import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Trash2, CheckCircle, Clock, TrendingUp, TrendingDown, X } from 'lucide-react';

const API = 'http://localhost:8000/api';

const AlertsPanel = ({ onRefresh }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        try {
            const res = await axios.get(`${API}/alerts`);
            setAlerts(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Alerts fetch error:", err);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 10000); // Check every 10s

        const handleUpdate = () => fetchAlerts();
        window.addEventListener('alertsUpdated', handleUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('alertsUpdated', handleUpdate);
        };
    }, []);

    const deleteAlert = async (id) => {
        try {
            await axios.delete(`${API}/alerts/${id}`);
            setAlerts(curr => curr.filter(a => a.id !== id));
        } catch (err) {
            console.error("Delete alert error:", err);
        }
    };

    if (loading && alerts.length === 0) {
        return <div style={styles.empty}>Yükleniyor...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>Fiyat Alarmları</span>
                <Bell size={14} color="#787b86" />
            </div>
            <div style={styles.list}>
                {alerts.length === 0 ? (
                    <div style={styles.empty}>Henüz alarm kurulmadı.</div>
                ) : (
                    alerts.map((alert) => (
                        <div key={alert.id} style={{
                            ...styles.item,
                            borderLeft: `3px solid ${alert.is_triggered ? '#787b86' : (alert.condition === 'ABOVE' ? '#00c853' : '#ff5252')}`
                        }}>
                            <div style={styles.itemMain}>
                                <div style={styles.symbolRow}>
                                    <span style={styles.symbol}>{alert.symbol}</span>
                                    {alert.is_triggered ? (
                                        <span style={styles.triggeredBadge}>Tetiklendi</span>
                                    ) : (
                                        <span style={alert.condition === 'ABOVE' ? styles.condAbove : styles.condBelow}>
                                            {alert.condition === 'ABOVE' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {alert.target_price.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                <div style={styles.dateRow}>
                                    <Clock size={10} />
                                    <span>{new Date(alert.created_at).toLocaleDateString()} {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <button style={styles.deleteBtn} onClick={() => deleteAlert(alert.id)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
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
    list: {
        flex: 1,
        overflowY: 'auto',
        padding: '8px'
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '6px',
        marginBottom: '8px',
        transition: '0.2s'
    },
    itemMain: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1
    },
    symbolRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    symbol: {
        fontWeight: '700',
        fontSize: '0.9rem'
    },
    condAbove: {
        fontSize: '0.75rem',
        color: '#00c853',
        background: 'rgba(0, 200, 83, 0.1)',
        padding: '2px 6px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '2px'
    },
    condBelow: {
        fontSize: '0.75rem',
        color: '#ff5252',
        background: 'rgba(255, 82, 82, 0.1)',
        padding: '2px 6px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '2px'
    },
    triggeredBadge: {
        fontSize: '0.7rem',
        color: '#787b86',
        background: 'rgba(120, 123, 134, 0.1)',
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: 'bold'
    },
    dateRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.65rem',
        color: '#787b86'
    },
    deleteBtn: {
        background: 'transparent',
        border: 'none',
        color: '#434651',
        cursor: 'pointer',
        padding: '4px',
        transition: 'color 0.2s',
        display: 'flex',
        alignItems: 'center'
    },
    empty: {
        padding: '30px 20px',
        textAlign: 'center',
        color: '#787b86',
        fontSize: '0.8rem'
    }
};

export default AlertsPanel;
