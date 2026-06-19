import { Gem } from 'lucide-react';

interface TopbarProps {
  user?: { username: string; avatar: string | null; id: string };
}

export const Topbar = ({ user }: TopbarProps) => {
  const avatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : null;
  return (
    <header className="topbar">
      <nav className="topbar-nav">
        <a href="#" className="topbar-link">Guides</a>
        <a href="#" className="topbar-link">Docs</a>
        <a href="#" className="topbar-link">Support</a>
        <a href="#" className="topbar-link">Status</a>
        <a href="/" className="topbar-link active">Dashboard</a>
      </nav>
      <div className="topbar-right">
        <div className="topbar-premium">
          <Gem size={14} /> Premium
        </div>
        <div className="user-avatar">
          {avatarUrl ? <img src={avatarUrl} alt={user?.username} /> : (user?.username?.[0] ?? 'U')}
        </div>
      </div>
    </header>
  );
};
