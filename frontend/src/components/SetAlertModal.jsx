import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, X, AlertTriangle } from 'lucide-react';

const API = 'http://localhost:8000/api';

const SetAlertModal = ({ isOpen, onClose, symbol, currentPrice }) => {
    const [targetPrice, setTargetPrice] = useState('');
    const [condition, setCondition] = useState('ABOVE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setTargetPrice(currentPrice ? currentPrice.toString() : '');
            setError(null);
        }
    }, [isOpen, currentPrice]);

    // Auto-update condition based on target price vs current price
    useEffect(() => {
        const target = parseFloat(targetPrice);
        if (!isNaN(target) && currentPrice) {
            if (target > currentPrice) setCondition('ABOVE');
            else setCondition('BELOW');
        }
    }, [targetPrice, currentPrice]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await axios.post(`${API}/alerts`, {
                symbol: symbol,
                target_price: parseFloat(targetPrice),
                condition: condition
            });
            window.dispatchEvent(new CustomEvent('alertsUpdated'));
            onClose();
        } catch (err) {
            let msg = "Alarm kurulurken hata oluştu";
            const detail = err.response?.data?.detail;

            if (typeof detail === 'string') {
                msg = detail;
            } else if (Array.isArray(detail)) {
                // Handle FastAPI/Pydantic validation errors
                msg = detail.map(d => d.msg || JSON.stringify(d)).join(", ");
            } else if (detail && typeof detail === 'object') {
                msg = detail.msg || JSON.stringify(detail);
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={18} color="var(--accent)" />
                        <h3 style={styles.title}>Fiyat Alarmı Kur: {symbol}</h3>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Hedef Fiyat (₺)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            style={styles.input}
                            autoFocus
                            required
                        />
                        <div style={styles.currentPriceHint}>
                            Şu anki fiyat: {currentPrice?.toLocaleString()} ₺
                        </div>
                    </div>

                    <div style={styles.conditionDisplay}>
                        Koşul: <span style={condition === 'ABOVE' ? styles.condAbove : styles.condBelow}>
                            Fiyat {targetPrice} ₺ {condition === 'ABOVE' ? 'Üzerine Çıkınca' : 'Altına İnince'}
                        </span>
                    </div>

                    {error && (
                        <div style={styles.error}>
                            <AlertTriangle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div style={styles.footer}>
                        <button type="button" style={styles.cancelBtn} onClick={onClose}>İptal</button>
                        <button type="submit" style={styles.submitBtn} disabled={loading}>
                            {loading ? 'Kuruluyor...' : 'Alarmı Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
    },
    modal: {
        background: '#1e222d',
        width: '400px',
        borderRadius: '12px',
        border: '1px solid #30363d',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #30363d',
    },
    title: {
        margin: 0,
        fontSize: '1rem',
        color: 'white'
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: '#787b86',
        cursor: 'pointer',
    },
    form: {
        padding: '20px'
    },
    inputGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        fontSize: '0.8rem',
        color: '#787b86',
        marginBottom: '8px'
    },
    input: {
        width: '100%',
        background: '#131722',
        border: '1px solid #30363d',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        outline: 'none',
        boxSizing: 'border-box'
    },
    currentPriceHint: {
        fontSize: '0.7rem',
        color: '#787b86',
        marginTop: '6px'
    },
    conditionDisplay: {
        fontSize: '0.9rem',
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        marginBottom: '20px'
    },
    condAbove: { color: '#00c853', fontWeight: 'bold' },
    condBelow: { color: '#ff5252', fontWeight: 'bold' },
    footer: {
        display: 'flex',
        gap: '12px'
    },
    cancelBtn: {
        flex: 1,
        padding: '12px',
        background: 'transparent',
        border: '1px solid #30363d',
        color: '#d1d4dc',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    submitBtn: {
        flex: 2,
        padding: '12px',
        background: 'var(--accent)',
        border: 'none',
        color: 'white',
        fontWeight: 'bold',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    error: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#ff5252',
        fontSize: '0.8rem',
        marginBottom: '16px',
        padding: '10px',
        background: 'rgba(255, 82, 82, 0.1)',
        borderRadius: '6px'
    }
};

export default SetAlertModal;
