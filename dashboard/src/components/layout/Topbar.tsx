import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface TopbarProps {
  user?: { username: string; avatarUrl?: string; globalName?: string | null; id?: string };
  onLogout?: () => void;
}

export const Topbar = ({ user, onLogout }: TopbarProps) => {
  const displayName = user?.globalName || user?.username || 'User';
  return (
    <header className="topbar">
      <nav className="topbar-nav">
        <a href="https://syncink.github.io/syncink-portfolio/#contact" target="_blank" rel="noopener noreferrer" className="topbar-link">Support</a>
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
