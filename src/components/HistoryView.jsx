import { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, Calendar, Loader } from 'lucide-react';
import { getScanHistory, deleteScan } from '../services/firebase';

export default function HistoryView({ user, onBack, onSelectScan }) {
    const [scans, setScans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadScans();
    }, [user.uid]);

    const loadScans = async () => {
        setLoading(true);
        try {
            const history = await getScanHistory(user.uid);
            setScans(history);
        } catch (error) {
            console.error("Error loading history:", error);
            alert("Failed to load scan history.");
        }
        setLoading(false);
    };

    const handleDelete = async (e, scan) => {
        e.stopPropagation(); // prevent selecting the scan
        if (window.confirm("Are you sure you want to delete this scan from your history?")) {
            try {
                await deleteScan(user.uid, scan.id, scan.timestamp);
                setScans(scans.filter(s => s.id !== scan.id));
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Failed to delete the scan.");
            }
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="fade-in" style={{ flex: 1, paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'var(--glass-border)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.6rem',
                        borderRadius: 'var(--radius-md)',
                        marginRight: '1rem',
                        transition: 'background 0.2s'
                    }}
                >
                    <ChevronLeft size={20} />
                </button>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Scan History</h2>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                    <Loader className="spin" size={32} />
                </div>
            ) : scans.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <p>No meal scans found.<br />Start tracking your meals to build your history!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {scans.map(scan => (
                        <div
                            key={scan.id}
                            className="glass-panel"
                            style={{
                                display: 'flex',
                                padding: '1rem',
                                gap: '1rem',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, background 0.2s',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                            onClick={() => onSelectScan(scan.data, scan.imageUrl)}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <img
                                src={scan.imageUrl}
                                alt={scan.data.foodName}
                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                            />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{scan.data.foodName}</h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {formatDate(scan.timestamp)}
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                    {scan.data.calories !== undefined && <Tag label=" cals" value={scan.data.calories} />}
                                    {scan.data.protein !== undefined && <Tag label=" protein" value={scan.data.protein} color="#ef4444" />}
                                    {scan.data.carbs !== undefined && <Tag label=" carbs" value={scan.data.carbs} color="#3b82f6" />}
                                    {scan.data.fat !== undefined && <Tag label=" fats" value={scan.data.fat} color="#10b981" />}
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, scan)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    alignSelf: 'center',
                                    transition: 'color 0.2s, background 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Tag({ label, value, color }) {
    return (
        <span style={{
            fontSize: '0.7rem',
            background: color ? `${color}20` : 'rgba(255,255,255,0.1)',
            color: color || 'var(--text-muted)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 'bold',
            border: `1px solid ${color ? `${color}40` : 'rgba(255,255,255,0.1)'}`
        }}>
            {value}{label}
        </span>
    );
}
