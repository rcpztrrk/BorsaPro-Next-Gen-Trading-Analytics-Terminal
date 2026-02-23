import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Newspaper, ExternalLink, Clock, Info } from 'lucide-react';

const API = 'http://localhost:8000/api';

const NewsPanel = ({ symbol }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const endpoint = symbol ? `${API}/news/${symbol}` : `${API}/news`;
            const res = await axios.get(endpoint);
            setNews(res.data);
        } catch (err) {
            console.error("News fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
        // Refresh news every 5 minutes if tab is open
        const interval = setInterval(fetchNews, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [symbol]);

    if (loading && news.length === 0) {
        return (
            <div className="news-panel loading" style={{ padding: '20px' }}>
                <div className="skeleton-line" style={{ width: '80%', height: '16px', marginBottom: '16px' }}></div>
                <div className="skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '16px' }}></div>
                <div className="skeleton-line" style={{ width: '90%', height: '16px', marginBottom: '16px' }}></div>
            </div>
        );
    }

    return (
        <div className="news-panel" style={styles.container}>
            <div className="news-header" style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Newspaper size={16} color="var(--accent)" />
                    <span style={styles.title}>{symbol ? `${symbol} Haberleri` : 'Piyasa Haberleri'}</span>
                </div>
                <button onClick={fetchNews} style={styles.refreshBtn}>Yenile</button>
            </div>

            <div className="news-list" style={styles.list}>
                {news.length === 0 ? (
                    <div style={styles.empty}>Haber bulunamadı.</div>
                ) : (
                    news.map((item, idx) => (
                        <a
                            key={idx}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="news-item"
                            style={styles.item}
                        >
                            <div style={styles.itemTop}>
                                <span style={{
                                    ...styles.sourceBadge,
                                    backgroundColor: item.source === 'KAP' ? '#e91e63' : 'rgba(255,255,255,0.05)'
                                }}>
                                    {item.source}
                                </span>
                                {item.provider_publish_time && (
                                    <div style={styles.timeInfo}>
                                        <Clock size={10} />
                                        <span>{new Date(item.provider_publish_time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                            </div>
                            <h4 style={styles.newsTitle}>{item.title}</h4>
                            <div style={styles.itemBottom}>
                                <span style={styles.publisher}>{item.publisher}</span>
                                <ExternalLink size={12} style={styles.extIcon} />
                            </div>
                        </a>
                    ))
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .news-item {
                    display: block;
                    padding: 14px;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                    text-decoration: none;
                    transition: 0.2s;
                }
                .news-item:hover {
                    background: rgba(255,255,255,0.03);
                }
                .news-item:hover h4 {
                    color: var(--accent);
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
        color: '#d1d4dc'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)'
    },
    title: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    refreshBtn: {
        background: 'transparent',
        border: 'none',
        color: 'var(--accent)',
        fontSize: '0.7rem',
        cursor: 'pointer'
    },
    list: {
        flex: 1,
        overflowY: 'auto'
    },
    item: {
        // className handles this
    },
    itemTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
    },
    sourceBadge: {
        fontSize: '0.6rem',
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    timeInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.65rem',
        color: '#787b86'
    },
    newsTitle: {
        margin: '0 0 8px 0',
        fontSize: '0.85rem',
        lineHeight: '1.4',
        color: '#fff',
        transition: '0.2s',
        fontWeight: '500'
    },
    itemBottom: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    publisher: {
        fontSize: '0.7rem',
        color: '#787b86'
    },
    extIcon: {
        color: '#363a45'
    },
    empty: {
        padding: '40px 20px',
        textAlign: 'center',
        color: '#787b86',
        fontSize: '0.8rem'
    }
};

export default NewsPanel;
