import React from 'react';

const CorrelationCard = ({ data }) => {
    if (!data || data.length === 0) return null;

    const getColor = (val) => {
        if (val > 0.7) return '#4caf50'; // Strong Positive (Green)
        if (val < -0.7) return '#f44336'; // Strong Negative (Red)
        if (val > 0.4) return '#81c784'; // Moderate Positive (Light Green)
        if (val < -0.4) return '#e57373'; // Moderate Negative (Light Red)
        return '#9e9e9e'; // Neutral (Grey)
    };

    return (
        <div className="correlation-panel" style={{
            background: 'var(--card-bg)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginTop: '16px'
        }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔗 Piyasa Korelasyonu
                <span style={{ fontSize: '0.7em', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>Son 1 Yıl</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                {data.map((item) => (
                    <div key={item.id} style={{
                        background: 'var(--bg-dark)',
                        padding: '8px',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${getColor(item.correlation)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{item.label}</span>
                            <span style={{ color: getColor(item.correlation), fontWeight: 'bold' }}>
                                {item.correlation > 0 ? '+' : ''}{item.correlation}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            {item.status}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CorrelationCard;
