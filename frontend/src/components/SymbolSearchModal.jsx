import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Globe, TrendingUp, Cpu, Coins, X } from 'lucide-react';

const SymbolSearchModal = ({ isOpen, onClose, symbols, onSelect }) => {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const inputRef = useRef(null);

    // Auto-focus input on open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
        }
    }, [isOpen]);

    const categories = [
        { id: 'all', label: 'Tümü', icon: <Globe size={16} /> },
        { id: 'bist_100', label: 'Hisseler', icon: <TrendingUp size={16} /> },
        { id: 'forex', label: 'Forex', icon: <Globe size={16} /> },
        { id: 'commodities', label: 'Emtia', icon: <Cpu size={16} /> },
        { id: 'crypto', label: 'Kripto', icon: <Coins size={16} /> },
    ];

    const allSymbolsFlat = useMemo(() => {
        return [
            ...symbols.bist_100.map(s => ({ ...s, cat: 'bist_100' })),
            ...symbols.forex.map(s => ({ ...s, cat: 'forex' })),
            ...symbols.commodities.map(s => ({ ...s, cat: 'commodities' })),
            ...symbols.crypto.map(s => ({ ...s, cat: 'crypto' })),
        ];
    }, [symbols]);

    const filteredSymbols = useMemo(() => {
        let list = allSymbolsFlat;
        if (activeCategory !== 'all') {
            list = list.filter(s => s.cat === activeCategory);
        }
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.symbol.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q)
            );
        }
        return list;
    }, [allSymbolsFlat, activeCategory, search]);

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header & Search */}
                <div style={styles.header}>
                    <div style={styles.searchWrapper}>
                        <Search size={20} style={styles.searchIcon} />
                        <input
                            ref={inputRef}
                            style={styles.input}
                            placeholder="Sembol veya isim arayın... (THYAO, Altın, BTC...)"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div style={styles.tabs}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            style={{
                                ...styles.tab,
                                ...(activeCategory === cat.id ? styles.activeTab : {})
                            }}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.icon}
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* List Container */}
                <div style={styles.listContainer}>
                    {filteredSymbols.length > 0 ? (
                        filteredSymbols.map(s => (
                            <div
                                key={s.symbol}
                                style={styles.row}
                                onClick={() => {
                                    onSelect(s.symbol);
                                    onClose();
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={styles.symbolInfo}>
                                    <span style={styles.symbolText}>{s.symbol.replace('.IS', '').replace('=X', '')}</span>
                                    <span style={styles.nameText}>{s.name}</span>
                                </div>
                                <div style={styles.catBadge}>
                                    {s.cat.toUpperCase().replace('_', ' ')}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={styles.noResult}>Eşleşen sembol bulunamadı.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
    },
    modal: {
        width: '600px',
        maxWidth: '90vw',
        height: '500px',
        backgroundColor: '#1e222d',
        borderRadius: '12px',
        border: '1px solid #363c4e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
    },
    header: {
        padding: '24px',
        borderBottom: '1px solid #363c4e',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    searchWrapper: {
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
    },
    searchIcon: {
        position: 'absolute',
        left: '12px',
        color: '#787b86'
    },
    input: {
        width: '100%',
        backgroundColor: '#2a2e39',
        border: '1px solid #363c4e',
        borderRadius: '8px',
        padding: '12px 12px 12px 40px',
        color: '#d1d4dc',
        fontSize: '16px',
        outline: 'none'
    },
    closeBtn: {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#787b86',
        cursor: 'pointer',
        padding: '4px'
    },
    tabs: {
        display: 'flex',
        padding: '0 24px',
        borderBottom: '1px solid #363c4e',
        backgroundColor: '#1e222d',
        gap: '4px'
    },
    tab: {
        padding: '12px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '2px solid transparent',
        color: '#787b86',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    activeTab: {
        color: '#2962ff',
        borderBottomColor: '#2962ff'
    },
    listContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0'
    },
    row: {
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },
    symbolInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    symbolText: {
        color: '#d1d4dc',
        fontSize: '16px',
        fontWeight: '700'
    },
    nameText: {
        color: '#787b86',
        fontSize: '12px'
    },
    catBadge: {
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#787b86'
    },
    noResult: {
        padding: '40px',
        textAlign: 'center',
        color: '#787b86'
    }
};

export default SymbolSearchModal;
