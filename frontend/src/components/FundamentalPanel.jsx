import React, { useState } from 'react';
import { Target, Activity, Landmark, TrendingUp, DollarSign, Wallet } from 'lucide-react';

const FundamentalPanel = ({ data, loading }) => {
    const [activeTab, setActiveTab] = useState('ozet');

    if (loading) {
        return (
            <div className="fundamental-panel loading">
                <div className="skeleton-line" style={{ width: '60%', height: '24px', marginBottom: '20px' }}></div>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="skeleton-row"></div>
                ))}
            </div>
        );
    }

    if (!data) return <div className="fundamental-panel empty">Veri bulunamadı.</div>;

    const formatCurrency = (val) => {
        if (val === null || val === undefined) return '---';
        const sign = val < 0 ? '-' : '';
        const absVal = Math.abs(val);
        if (absVal >= 1e12) return sign + (absVal / 1e12).toFixed(2) + ' T';
        if (absVal >= 1e9) return sign + (absVal / 1e9).toFixed(2) + ' B';
        if (absVal >= 1e6) return sign + (absVal / 1e6).toFixed(2) + ' M';
        return sign + absVal.toLocaleString();
    };

    const formatPercent = (val) => {
        if (val === null || val === undefined) return '---';
        return val.toFixed(2) + '%';
    };

    const formatNum = (val) => (val !== null && val !== undefined) ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---';

    const renderOzet = () => (
        <div className="tab-content">
            <div className="glass-card analyst-hero">
                <div className="card-header">
                    <Target size={14} color="var(--accent)" />
                    <span>Analist Beklentisi</span>
                </div>
                <div className="hero-stats">
                    <label>Hedef Fiyat (Medyan)</label>
                    <span className="hero-value mono">{formatNum(data.hedef_medyan)} ₺</span>
                    <div className={`rec-badge-large ${data.rekomendasyon?.toLowerCase().includes('strong_buy') ? 'strong-buy-glow' : ''}`}>
                        {data.rekomendasyon?.replace('_', ' ').toUpperCase() || 'HOLD'}
                    </div>
                </div>
            </div>

            <div className="metrics-grid">
                <MetricCard label="F/K" value={formatNum(data.fk_orani)} />
                <MetricCard label="PD/DD" value={formatNum(data.pd_dd_orani)} />
                <MetricCard label="Özsermaye K." value={formatPercent(data.ozsermaye_karliligi)} />
                <MetricCard label="PEG" value={formatNum(data.peg_orani)} />
            </div>

            <div className="glass-card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                    <Activity size={14} color="var(--accent)" />
                    <span>Önemli Veriler</span>
                </div>
                <FinancialRow label="Satışlar" data={data.gelir_tablosu?.satislar} format={formatCurrency} />
                <FinancialRow label="Net Kâr" data={data.gelir_tablosu?.net_kar} format={formatCurrency} />
                <FinancialRow label="Özsermaye" data={data.bilanco?.ozsermaye} format={formatCurrency} />
            </div>
        </div>
    );

    const renderFinancialList = (sourceData, title, icon, formatFn = formatCurrency) => {
        const hasData = sourceData && Object.keys(sourceData).length > 0;
        const isAnnual = hasData && Object.values(sourceData)[0]?.is_annual;

        return (
            <div className="tab-content glass-card">
                <div className="card-header">
                    {icon}
                    <span>{title} {isAnnual && <span className="annual-badge">(Yıllık)</span>}</span>
                </div>
                {hasData ? (
                    Object.entries(sourceData).map(([key, val]) => (
                        <FinancialRow key={key} label={key.replace(/_/g, ' ')} data={val} format={formatFn} />
                    ))
                ) : (
                    <div className="empty-state">Yeterli veri yok. (yfinance üzerinde mali tablo bulunamadı)</div>
                )}
            </div>
        );
    };

    const renderRatios = () => (
        <div className="tab-content glass-card">
            <div className="card-header">
                <Activity size={14} />
                <span>Kârlılık ve Verimlilik</span>
            </div>
            {data.oranlar && Object.keys(data.oranlar).length > 0 ? (
                Object.entries(data.oranlar).map(([key, val]) => (
                    <FinancialRow key={key} label={key.replace(/_/g, ' ')} data={val} format={formatPercent} />
                ))
            ) : (
                <div className="empty-state">Oranlar hesaplanamadı (Eksik mali tablo verisi).</div>
            )}
        </div>
    );

    return (
        <div className="fundamental-panel">
            <div className="glass-card panel-header" style={{ marginBottom: '16px' }}>
                <div className="stock-title">
                    <h3>{data.name}</h3>
                    <span className="sector-badge">{data.sector || 'Genel'}</span>
                </div>
                <div className="price-summary">
                    <span className="current-price mono">{formatNum(data.son_fiyat)} ₺</span>
                    {data.onceki_kapanis && data.son_fiyat && (
                        <span className={`price-change mono ${data.son_fiyat >= data.onceki_kapanis ? 'pos' : 'neg'}`}>
                            {data.son_fiyat >= data.onceki_kapanis ? '▲' : '▼'} %{Math.abs(((data.son_fiyat - data.onceki_kapanis) / data.onceki_kapanis) * 100).toFixed(2)}
                        </span>
                    )}
                </div>
            </div>

            <div className="panel-tabs">
                <button className={`tab-btn ${activeTab === 'ozet' ? 'active' : ''}`} onClick={() => setActiveTab('ozet')}>Özet</button>
                <button className={`tab-btn ${activeTab === 'oranlar' ? 'active' : ''}`} onClick={() => setActiveTab('oranlar')}>Oranlar</button>
                <button className={`tab-btn ${activeTab === 'gelir' ? 'active' : ''}`} onClick={() => setActiveTab('gelir')}>Gelir</button>
                <button className={`tab-btn ${activeTab === 'bilanco' ? 'active' : ''}`} onClick={() => setActiveTab('bilanco')}>Bilanço</button>
                <button className={`tab-btn ${activeTab === 'nakit' ? 'active' : ''}`} onClick={() => setActiveTab('nakit')}>Nakit</button>
            </div>

            {activeTab === 'ozet' && renderOzet()}
            {activeTab === 'oranlar' && renderRatios()}
            {activeTab === 'gelir' && renderFinancialList(data.gelir_tablosu, "Gelir Tablosu", <TrendingUp size={14} />)}
            {activeTab === 'bilanco' && renderFinancialList(data.bilanco, "Bilanço", <Landmark size={14} />)}
            {activeTab === 'nakit' && renderFinancialList(data.nakit_akim, "Nakit Akışı", <Wallet size={14} />)}
        </div>
    );
};

const MetricCard = ({ label, value }) => (
    <div className="glass-card" style={{ padding: '10px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
        <div className="mono" style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{value}</div>
    </div>
);

const FinancialRow = ({ label, data, format }) => {
    if (!data) return null;
    return (
        <div className="financial-row">
            <div className="fin-info">
                <span className="fin-label">{label}</span>
                <span className="fin-value mono">{format(data.current)}</span>
            </div>

            <Sparkline history={data.history} />

            <div className="fin-growth">
                <span className={`growth-badge ${data.yoy_growth >= 0 ? 'pos' : 'neg'}`}>
                    {data.yoy_growth >= 0 ? '+' : ''}{data.yoy_growth?.toFixed(1)}%
                </span>
                <span className="growth-label">YOY</span>
            </div>
        </div>
    );
};

const Sparkline = ({ history }) => {
    if (!history || history.length < 2) return <div className="fin-sparkline"></div>;

    // Reverse historical data for left-to-right display
    const data = [...history].reverse();
    const max = Math.max(...data.filter(v => v !== null).map(v => Math.abs(v)));

    return (
        <div className="fin-sparkline">
            {data.map((v, i) => (
                <div
                    key={i}
                    className="spark-bar"
                    style={{
                        height: v !== null ? `${Math.max(10, (Math.abs(v) / max) * 100)}%` : '2px',
                        backgroundColor: v < 0 ? 'var(--red)' : 'var(--accent)'
                    }}
                />
            ))}
        </div>
    );
};

export default FundamentalPanel;
