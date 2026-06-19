import { LogOut } from 'lucide-react';

interface TopbarProps {
  user?: { username: string; avatarUrl?: string; globalName?: string | null; id?: string };
  onLogout?: () => void;
}

export const Topbar = ({ user, onLogout }: TopbarProps) => {
  const displayName = user?.globalName || user?.username || 'User';
  return (
    <header className="topbar">
      <nav className="topbar-nav">
        <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" className="topbar-link">Support</a>
        <a href="/guide" className="topbar-link">Guide</a>
        <a href="/" className="topbar-link active">Dashboard</a>
      </nav>
      <div className="topbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="user-avatar">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={displayName} />
              : displayName[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{displayName}</span>
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
