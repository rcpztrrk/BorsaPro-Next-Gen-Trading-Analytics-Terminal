import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SymbolSearchModal from '../components/SymbolSearchModal';
import { Search, Plus, Trash2, TrendingUp, TrendingDown, Briefcase, Info } from 'lucide-react';

const API = 'http://localhost:8000/api';

const PortfolioView = ({ onSelectSymbol }) => {
    const [portfolio, setPortfolio] = useState(null);
    const [availableSymbols, setAvailableSymbols] = useState({ bist_100: [], forex: [], commodities: [], crypto: [] });
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [form, setForm] = useState({ symbol: '', quantity: '', avg_cost: '', sector: '', notes: '' });

    const fetchPortfolioData = useCallback(async () => {
        try {
            setLoading(true);
            const [pRes, sRes] = await Promise.all([
                axios.get(`${API}/portfolio`),
                axios.get(`${API}/symbols`)
            ]);
            setPortfolio(pRes.data);
            setAvailableSymbols(sRes.data);
        } catch (e) {
            console.error("Error fetching portfolio data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPortfolioData(); }, [fetchPortfolioData]);

    const handleAdd = async () => {
        if (!form.symbol || !form.quantity || !form.avg_cost) return;
        try {
            await axios.post(`${API}/portfolio`, {
                symbol: form.symbol.toUpperCase().trim(),
                quantity: parseFloat(form.quantity),
                avg_cost: parseFloat(form.avg_cost),
                sector: form.sector,
                notes: form.notes
            });
            setForm({ symbol: '', quantity: '', avg_cost: '', sector: '', notes: '' });
            setShowAddModal(false);
            fetchPortfolio();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (symbol) => {
        if (!window.confirm(`${symbol} pozisyonunu silmek istediginize emin misiniz?`)) return;
        try {
            await axios.delete(`${API}/portfolio/${symbol}`);
            fetchPortfolio();
        } catch (e) { console.error(e); }
    };

    if (loading && !portfolio) {
        return <div style={styles.container}><div style={styles.loadingText}>Portfoy yukleniyor...</div></div>;
    }

    const { positions = [], summary = {}, risk = {} } = portfolio || {};

    // Pie chart data
    const pieColors = ['#2962ff', '#00c853', '#ff6d00', '#aa00ff', '#d50000', '#00bfa5', '#ffd600', '#304ffe', '#c51162', '#64dd17'];

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>Portfoy Yonetimi</h2>
                <button onClick={() => setShowAddModal(true)} style={styles.addBtn}>+ Pozisyon Ekle</button>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
                <SummaryCard label="Toplam Maliyet" value={`${summary.total_cost?.toLocaleString('tr-TR')} TL`} />
                <SummaryCard label="Piyasa Degeri" value={`${summary.total_value?.toLocaleString('tr-TR')} TL`} />
                <SummaryCard
                    label="Kar / Zarar"
                    value={`${summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl?.toLocaleString('tr-TR')} TL`}
                    sub={`${summary.total_pnl_pct >= 0 ? '+' : ''}${summary.total_pnl_pct?.toFixed(2)}%`}
                    color={summary.total_pnl >= 0 ? '#00c853' : '#ff1744'}
                />
                <SummaryCard label="Pozisyon Sayisi" value={summary.position_count} />
            </div>

            {/* Risk Warning */}
            {risk.concentration_warning && (
                <div style={styles.warningBox}>
                    <strong>Risk Uyarisi:</strong> {risk.max_weight_symbol} pozisyonunuz portfoyunuzun %{risk.max_weight}'ini olusturuyor.
                    Tek bir varliktaki asiri yogunlasma risk tasir.
                </div>
            )}

            <div style={styles.mainContent}>
                {/* Position Table */}
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Sembol</th>
                                <th style={styles.thRight}>Adet</th>
                                <th style={styles.thRight}>Maliyet</th>
                                <th style={styles.thRight}>Guncel</th>
                                <th style={styles.thRight}>K/Z</th>
                                <th style={styles.thRight}>K/Z %</th>
                                <th style={styles.thRight}>Agirlik</th>
                                <th style={styles.thCenter}>Islem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map((pos, i) => (
                                <tr key={pos.symbol} style={styles.tr}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={styles.tdSymbol}>
                                        <span style={{ cursor: 'pointer', color: '#58a6ff' }}
                                            onClick={() => onSelectSymbol && onSelectSymbol(pos.symbol)}>
                                            {pos.symbol.replace('.IS', '')}
                                        </span>
                                        {pos.sector && <span style={styles.sectorBadge}>{pos.sector}</span>}
                                    </td>
                                    <td style={styles.tdRight}>{pos.quantity}</td>
                                    <td style={styles.tdRight}>{pos.avg_cost.toFixed(2)}</td>
                                    <td style={styles.tdRight}>{pos.current_price.toFixed(2)}</td>
                                    <td style={{ ...styles.tdRight, color: pos.pnl >= 0 ? '#00c853' : '#ff1744', fontWeight: 600 }}>
                                        {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toLocaleString('tr-TR')}
                                    </td>
                                    <td style={{ ...styles.tdRight, color: pos.pnl_pct >= 0 ? '#00c853' : '#ff1744' }}>
                                        {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct.toFixed(2)}%
                                    </td>
                                    <td style={styles.tdRight}>
                                        <div style={styles.weightBar}>
                                            <div style={{ ...styles.weightFill, width: `${Math.min(pos.weight, 100)}%`, background: pieColors[i % pieColors.length] }} />
                                            <span style={styles.weightLabel}>{pos.weight.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td style={styles.tdCenter}>
                                        <button onClick={() => handleDelete(pos.symbol)} style={styles.deleteBtn}>Sil</button>
                                    </td>
                                </tr>
                            ))}
                            {positions.length === 0 && (
                                <tr><td colSpan={8} style={styles.emptyRow}>Henuz pozisyon eklenmedi. "Pozisyon Ekle" butonuyla baslayabilirsiniz.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Allocation Pie */}
                {positions.length > 0 && (
                    <div style={styles.pieContainer}>
                        <h4 style={styles.pieTitle}>Dagilim</h4>
                        <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 220 }}>
                            {(() => {
                                let cumAngle = 0;
                                return positions.map((pos, i) => {
                                    const angle = (pos.weight / 100) * 360;
                                    const startAngle = cumAngle;
                                    cumAngle += angle;
                                    const startRad = (startAngle - 90) * Math.PI / 180;
                                    const endRad = (startAngle + angle - 90) * Math.PI / 180;
                                    const largeArc = angle > 180 ? 1 : 0;
                                    const x1 = 100 + 80 * Math.cos(startRad);
                                    const y1 = 100 + 80 * Math.sin(startRad);
                                    const x2 = 100 + 80 * Math.cos(endRad);
                                    const y2 = 100 + 80 * Math.sin(endRad);
                                    const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                    return <path key={pos.symbol} d={path} fill={pieColors[i % pieColors.length]} opacity="0.85" stroke="#0d1117" strokeWidth="2" />;
                                });
                            })()}
                            <circle cx="100" cy="100" r="45" fill="#0d1117" />
                            <text x="100" y="96" textAnchor="middle" fill="#d1d4dc" fontSize="12" fontWeight="bold">
                                {summary.position_count}
                            </text>
                            <text x="100" y="112" textAnchor="middle" fill="#787b86" fontSize="9">pozisyon</text>
                        </svg>
                        <div style={styles.pieLegend}>
                            {positions.map((pos, i) => (
                                <div key={pos.symbol} style={styles.legendItem}>
                                    <div style={{ ...styles.legendDot, background: pieColors[i % pieColors.length] }} />
                                    <span style={styles.legendText}>{pos.symbol.replace('.IS', '')} ({pos.weight.toFixed(1)}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Position Modal */}
            {showAddModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Pozisyon Ekle</h3>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Sembol</label>
                            <div
                                onClick={() => setIsSearchModalOpen(true)}
                                style={{
                                    ...styles.input,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: 'rgba(255,255,255,0.03)'
                                }}
                            >
                                <span>{form.symbol || 'Sembol Seçin...'}</span>
                                <Search size={14} color="#787b86" />
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Adet</label>
                                <input style={styles.input} type="number" placeholder="100" value={form.quantity}
                                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Maliyet (TL)</label>
                                <input style={styles.input} type="number" step="0.01" placeholder="163.50" value={form.avg_cost}
                                    onChange={e => setForm(f => ({ ...f, avg_cost: e.target.value }))} />
                            </div>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Sektor (opsiyonel)</label>
                            <input style={styles.input} placeholder="Havacılık" value={form.sector}
                                onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Not (opsiyonel)</label>
                            <input style={styles.input} placeholder="Uzun vadeli" value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={() => setShowAddModal(false)} style={styles.cancelBtn}>Vazgec</button>
                            <button onClick={handleAdd} style={styles.submitBtn}>Ekle</button>
                        </div>
                    </div>
                </div>
            )}

            <SymbolSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                symbols={availableSymbols}
                onSelect={(val) => {
                    setForm(f => ({ ...f, symbol: val }));
                    if (val.includes('.IS')) {
                        setForm(f => ({ ...f, sector: 'BIST' }));
                    } else if (val.includes('=X')) {
                        setForm(f => ({ ...f, sector: 'Forex' }));
                    } else if (val.includes('=F')) {
                        setForm(f => ({ ...f, sector: 'Emtia' }));
                    } else if (val.includes('-USD')) {
                        setForm(f => ({ ...f, sector: 'Kripto' }));
                    }
                }}
            />
        </div>
    );
};

const SummaryCard = ({ label, value, sub, color }) => (
    <div style={styles.summaryCard}>
        <div style={styles.summaryLabel}>{label}</div>
        <div style={{ ...styles.summaryValue, color: color || '#d1d4dc' }}>{value}</div>
        {sub && <div style={{ ...styles.summarySub, color: color || '#787b86' }}>{sub}</div>}
    </div>
);

const styles = {
    container: { padding: '24px', height: '100%', overflowY: 'auto', background: '#0d1117', color: '#d1d4dc' },
    loadingText: { textAlign: 'center', padding: '60px', color: '#787b86', fontSize: '0.9rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#e6edf3' },
    addBtn: {
        background: '#238636', border: 'none', color: '#fff', padding: '8px 16px',
        borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
    },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 },
    summaryCard: {
        background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '16px 20px'
    },
    summaryLabel: { fontSize: '0.7rem', color: '#787b86', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 },
    summaryValue: { fontSize: '1.2rem', fontWeight: 700 },
    summarySub: { fontSize: '0.8rem', marginTop: 2 },
    warningBox: {
        background: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)',
        borderRadius: 8, padding: '12px 16px', fontSize: '0.8rem', color: '#ff9800', marginBottom: 20
    },
    mainContent: { display: 'flex', gap: 20, alignItems: 'flex-start' },
    tableContainer: { flex: 1, overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
    th: { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #30363d', color: '#787b86', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' },
    thRight: { textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid #30363d', color: '#787b86', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' },
    thCenter: { textAlign: 'center', padding: '10px 12px', borderBottom: '1px solid #30363d', color: '#787b86', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid rgba(48, 54, 61, 0.5)', transition: 'background 0.15s' },
    tdSymbol: { padding: '10px 12px', fontWeight: 600 },
    tdRight: { padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
    tdCenter: { padding: '10px 12px', textAlign: 'center' },
    sectorBadge: {
        marginLeft: 8, fontSize: '0.6rem', background: 'rgba(41, 98, 255, 0.15)',
        color: '#58a6ff', padding: '2px 6px', borderRadius: 4
    },
    weightBar: { display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
    weightFill: { height: 6, borderRadius: 3, minWidth: 4 },
    weightLabel: { fontSize: '0.75rem', color: '#787b86', minWidth: 40, textAlign: 'right' },
    deleteBtn: {
        background: 'rgba(255, 23, 68, 0.1)', border: '1px solid rgba(255, 23, 68, 0.2)',
        color: '#ff1744', padding: '4px 10px', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer'
    },
    emptyRow: { padding: 40, textAlign: 'center', color: '#787b86' },
    pieContainer: { width: 260, flexShrink: 0, background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    pieTitle: { margin: '0 0 12px', fontSize: '0.8rem', color: '#787b86', textTransform: 'uppercase', fontWeight: 600 },
    pieLegend: { marginTop: 12, width: '100%' },
    legendItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' },
    legendDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
    legendText: { fontSize: '0.7rem', color: '#d1d4dc' },
    // Modal
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 24, width: 420, maxWidth: '90vw' },
    modalTitle: { margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#e6edf3' },
    formGroup: { marginBottom: 14, flex: 1 },
    formRow: { display: 'flex', gap: 12 },
    label: { display: 'block', fontSize: '0.7rem', color: '#787b86', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 },
    input: {
        width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d',
        borderRadius: 6, color: '#d1d4dc', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
    },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
    cancelBtn: { background: 'transparent', border: '1px solid #30363d', color: '#d1d4dc', padding: '8px 16px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' },
    submitBtn: { background: '#238636', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
};

export default PortfolioView;
