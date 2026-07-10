import { LogOut, ChevronDown, Shield, FileText } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

interface TopbarProps {
  user?: { username: string; avatarUrl?: string; globalName?: string | null; id?: string };
  onLogout?: () => void;
}

export const Topbar = ({ user, onLogout }: TopbarProps) => {
  const displayName = user?.globalName || user?.username || 'User';
  const [legalOpen, setLegalOpen] = useState(false);
  const legalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (legalRef.current && !legalRef.current.contains(e.target as Node)) {
        setLegalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <nav className="topbar-nav">
        <a href="https://syncink.github.io/syncink-portfolio/#contact" target="_blank" rel="noopener noreferrer" className="topbar-link">Support</a>
        <NavLink to="/faq" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>FAQ</NavLink>
        
        <div className="topbar-dropdown" ref={legalRef} style={{ position: 'relative' }}>
          <button 
            className={`topbar-link ${legalOpen ? 'active' : ''}`}
            onClick={() => setLegalOpen(!legalOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            Legal <ChevronDown size={14} style={{ transform: legalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          
          {legalOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 6, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <NavLink to="/privacy" onClick={() => setLegalOpen(false)} className={({ isActive }) => `topbar-dropdown-item ${isActive ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', textDecoration: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                <Shield size={14} /> Privacy Policy
              </NavLink>
              <NavLink to="/terms" onClick={() => setLegalOpen(false)} className={({ isActive }) => `topbar-dropdown-item ${isActive ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', textDecoration: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                <FileText size={14} /> Terms of Service
              </NavLink>
            </div>
          )}
        </div>
        <NavLink to="/invite" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>Invite Bot</NavLink>
        <NavLink to="/guide" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>Guide</NavLink>
        <NavLink to="/" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
      </nav>
      <div className="topbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="user-avatar">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={displayName} />
              : displayName[0]?.toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1 }}>{displayName}</span>
            {user?.username && <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1, marginTop: 4 }}>@{user.username}</span>}
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 6, transition: 'color 0.2s, background 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
