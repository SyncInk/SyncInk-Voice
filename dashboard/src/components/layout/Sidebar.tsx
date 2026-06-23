import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Settings, ToggleLeft, Shield, Wrench, User, Globe,
  Monitor, BookOpen, ChevronDown, RefreshCw, Mic2,
  Lock, Plus
} from 'lucide-react';
import type { Guild } from '../../types';

interface SidebarProps {
  guilds: Guild[];
  selectedGuild: Guild | null;
  onSelectGuild: (g: Guild) => void;
}

export type PermLevel = 'Owner' | 'Administrator' | 'Moderator' | 'Staff' | 'Member';

const IconImg = ({ src }: { src: string }) => <img src={src} style={{ width: 12, height: 12, objectFit: 'contain' }} alt="" />;

const PERM_CONFIG: Record<PermLevel, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  Owner:         { color: '#c084fc', bg: 'rgba(192,132,252,0.12)',  icon: <IconImg src="https://cdn.discordapp.com/emojis/1517253606686986323.webp?size=40" />, label: 'Owner'         },
  Administrator: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    icon: <IconImg src="https://cdn.discordapp.com/emojis/1518924309668823160.webp?size=40" />, label: 'Administrator' },
  Moderator:     { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',    icon: <IconImg src="https://cdn.discordapp.com/emojis/1518924931482779809.webp?size=40" />, label: 'Moderator'     },
  Staff:         { color: '#64748b', bg: 'rgba(100,116,139,0.12)',  icon: <IconImg src="https://cdn.discordapp.com/emojis/1513328514529624185.webp?size=40" />, label: 'Staff'         },
  Member:        { color: '#6b7280', bg: 'rgba(107,114,128,0.12)',  icon: <User   size={10} />, label: 'Member'        },
};

const PermBadge = ({ level }: { level: PermLevel }) => {
  const cfg = PERM_CONFIG[level] ?? PERM_CONFIG.Member;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      color: cfg.color, background: cfg.bg,
      padding: '2px 7px', borderRadius: 20,
    }}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

const getRequirementLabel = (to: string) => {
  if (to === '/setup' || to === '/role-toggles' || to === '/access' || to === '/bot-profile') {
    return 'Owner / Administrator';
  }

  if (to === '/server-toggles' || to === '/misc') {
    return 'Moderator / Above';
  }

  if (to === '/interface') {
    return 'Staff / Above';
  }

  return 'Available to all';
};

// Which nav items each role can access (true = visible, false = locked/hidden)
export const NAV_ACCESS: Record<string, Record<PermLevel, boolean>> = {
  '/setup':          { Owner: true,  Administrator: true,  Moderator: false, Staff: false, Member: false },
  '/server-toggles': { Owner: true,  Administrator: true,  Moderator: true,  Staff: false, Member: false },
  '/role-toggles':   { Owner: true,  Administrator: true,  Moderator: false, Staff: false, Member: false },
  '/access':         { Owner: true,  Administrator: true,  Moderator: false, Staff: false, Member: false },
  '/misc':           { Owner: true,  Administrator: true,  Moderator: true,  Staff: false, Member: false },
  '/bot-profile':    { Owner: true,  Administrator: true,  Moderator: false, Staff: false, Member: false },
  '/interface':      { Owner: true,  Administrator: true,  Moderator: true,  Staff: true,  Member: false },
  '/global-profile': { Owner: true,  Administrator: true,  Moderator: true,  Staff: true,  Member: true  },
  '/invite':         { Owner: true,  Administrator: true,  Moderator: true,  Staff: true,  Member: true  },
  '/guide':          { Owner: true,  Administrator: true,  Moderator: true,  Staff: true,  Member: true  },
};

const NavItem = ({
  to, icon, label, permLevel,
}: { to: string; icon: React.ReactNode; label: string; permLevel: PermLevel }) => {
  const allowed = NAV_ACCESS[to]?.[permLevel] ?? false;

  if (!allowed) {
    return (
      <div
        title={`Requires ${getRequirementLabel(to)}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12, margin: '1px 0',
          color: 'var(--text-muted)', opacity: 0.72, cursor: 'not-allowed',
          fontSize: 13, userSelect: 'none',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <span style={{ opacity: 0.62 }}>{icon}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{getRequirementLabel(to)}</span>
        </div>
        <Lock size={11} style={{ marginLeft: 'auto', opacity: 0.75 }} />
      </div>
    );
  }

  return (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      {icon} {label}
    </NavLink>
  );
};

export const Sidebar = ({ guilds, selectedGuild, onSelectGuild }: SidebarProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const permLevel: PermLevel = (selectedGuild?.permissionLevel as PermLevel) ?? 'Member';
  const filtered = guilds.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) && g.botPresent);
  const iconUrl = (g: Guild) => g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Syncink Voice" />
        <span className="sidebar-logo-text">Syncink Voice</span>
      </div>

      {/* Server Selector */}
      <div className="server-selector">
        <div className="server-selector-header" onClick={() => setOpen(o => !o)}>
          <div className="server-icon">
            {selectedGuild
              ? iconUrl(selectedGuild)
                ? <img src={iconUrl(selectedGuild)!} alt={selectedGuild.name} />
                : selectedGuild.name[0]
              : <Mic2 size={16} />}
          </div>
          <div className="server-info">
            <div className="server-name">{selectedGuild?.name ?? 'Select a Server'}</div>
            {selectedGuild && <PermBadge level={permLevel} />}
          </div>
          <ChevronDown size={14} className={`server-chevron ${open ? 'open' : ''}`} />
        </div>

        {open && (
          <div className="server-dropdown">
            <input
              className="server-search"
              placeholder="Search servers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {filtered.map(g => {
              const lvl = (g.permissionLevel as PermLevel) ?? 'Member';
              return (
                <div
                  key={g.id}
                  className={`server-list-item ${selectedGuild?.id === g.id ? 'active' : ''}`}
                  onClick={() => { onSelectGuild(g); setOpen(false); setSearch(''); }}
                >
                  <div className="server-icon">
                    {iconUrl(g) ? <img src={iconUrl(g)!} alt={g.name} /> : g.name[0]}
                  </div>
                  <div className="server-info">
                    <div className="server-name">{g.name}</div>
                    <PermBadge level={lvl} />
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 4px', textAlign: 'center' }}>No servers found</div>
            )}
          </div>
        )}
      </div>

      {/* Server Settings Nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Server Settings</div>
        <NavItem to="/setup"          icon={<Settings    size={16} />} label="Setup"          permLevel={permLevel} />
        <NavItem to="/server-toggles" icon={<ToggleLeft  size={16} />} label="Server Toggles" permLevel={permLevel} />
        <NavItem to="/role-toggles"   icon={<Shield      size={16} />} label="Role Toggles"   permLevel={permLevel} />
        <NavItem to="/access"         icon={<Lock        size={16} />} label="Dashboard Access" permLevel={permLevel} />
        <NavItem to="/misc"           icon={<Wrench      size={16} />} label="Miscellaneous"  permLevel={permLevel} />
        <NavItem to="/bot-profile"    icon={<User        size={16} />} label="Bot Profile"     permLevel={permLevel} />
        <NavItem to="/interface"      icon={<Monitor     size={16} />} label="Interface"       permLevel={permLevel} />
      </div>

      <div className="sidebar-divider" />

      {/* Personal Settings Nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Personal Settings</div>
        <NavItem to="/global-profile" icon={<Globe size={16} />} label="Global Profile" permLevel={permLevel} />
        <span className="nav-item coming-soon">
          <User size={16} /> Server Profiles <span className="tag tag-purple" style={{ fontSize: 9, padding: '1px 6px' }}>Soon</span>
        </span>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-section-title">Help</div>
        <NavItem to="/invite" icon={<Plus size={16} />} label="Invite Bot" permLevel={permLevel} />
        <NavItem to="/guide" icon={<BookOpen size={16} />} label="Dashboard Guide" permLevel={permLevel} />
      </div>

      <div className="sidebar-bottom">
        <button className="refresh-btn" onClick={() => window.location.reload()}>
          <RefreshCw size={13} /> Refresh Data
        </button>
      </div>
    </aside>
  );
};
