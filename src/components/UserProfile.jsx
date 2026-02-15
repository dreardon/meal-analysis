import { useState } from 'react';
import { LogOut, History, User } from 'lucide-react';
import md5 from 'md5';

export default function UserProfile({ user, onSignOut, onViewHistory }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [imageError, setImageError] = useState(false);

    if (!user) return null;

    return (
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50 }}>
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.25rem',
                    borderRadius: '50px',
                    transition: 'background 0.2s',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                }}
            >
                {user.photoURL && !imageError ? (
                    <img
                        src={user.photoURL}
                        alt="Profile"
                        onError={() => setImageError(true)}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
                    />
                ) : user.email ? (
                    <img
                        src={`https://www.gravatar.com/avatar/${md5(user.email.toLowerCase().trim())}?d=mp`}
                        alt="Profile"
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
                    />
                ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={18} color="white" />
                    </div>
                )}
            </button>

            {menuOpen && (
                <div
                    className="glass-panel fade-in"
                    style={{
                        position: 'absolute',
                        top: '120%',
                        right: 0,
                        width: '220px',
                        padding: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                    }}
                >
                    <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.displayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                    </div>

                    <button
                        onClick={() => { setMenuOpen(false); onViewHistory(); }}
                        className="menu-item"
                    >
                        <History size={16} /> Scan History
                    </button>

                    <button
                        onClick={() => { setMenuOpen(false); onSignOut(); }}
                        className="menu-item"
                        style={{ color: '#ef4444' }}
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}
