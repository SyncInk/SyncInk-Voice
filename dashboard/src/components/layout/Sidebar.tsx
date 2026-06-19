import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Settings, ToggleLeft, Shield, Wrench, User, Globe,
  Monitor, BookOpen, ChevronDown, RefreshCw, Gem, Mic2
} from 'lucide-react';
import type { Guild } from '../../types';

interface SidebarProps {
  guilds: Guild[];
  selectedGuild: Guild | null;
  onSelectGuild: (g: Guild) => void;
}

const permColor: Record<string, string> = {
  Owner: '#f59e0b',
  Administrator: '#ef4444',
  Moderator: '#22c55e',
  Member: '#6b7280',
};

export const Sidebar = ({ guilds, selectedGuild, onSelectGuild }: SidebarProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

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
            {selectedGuild ? (
              iconUrl(selectedGuild)
                ? <img src={iconUrl(selectedGuild)!} alt={selectedGuild.name} />
                : selectedGuild.name[0]
            ) : <Mic2 size={16} />}
          </div>
          <div className="server-info">
            <div className="server-name">{selectedGuild?.name ?? 'Select a Server'}</div>
            {selectedGuild && (
              <div className="server-role" style={{ color: permColor[selectedGuild.permissionLevel] }}>
                {selectedGuild.permissionLevel}
              </div>
            )}
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
            {filtered.map(g => (
              <div
                key={g.id}
                className={`server-list-item ${selectedGuild?.id === g.id ? 'active' : ''}`}
                onClick={() => { onSelectGuild(g); setOpen(false); }}
              >
                <div className="server-icon">
                  {iconUrl(g) ? <img src={iconUrl(g)!} alt={g.name} /> : g.name[0]}
                </div>
                <div className="server-info">
                  <div className="server-name">{g.name}</div>
                  <div className="server-role" style={{ color: permColor[g.permissionLevel] }}>{g.permissionLevel}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{fontSize:12,color:'var(--text-muted)',padding:'8px 4px',textAlign:'center'}}>No servers found</div>}
          </div>
        )}
      </div>

      {/* Server Settings Nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Server Settings</div>
        <NavLink to="/setup" className={({isActive}) => `nav-item ${isActive?'active':''}` }>
          <Settings size={16} /> Setup
        </NavLink>
        <NavLink to="/server-toggles" className={({isActive}) => `nav-item ${isActive?'active':''}` }>
          <ToggleLeft size={16} /> Server Toggles
        </NavLink>
        <NavLink to="/role-toggles" className={({isActive}) => `nav-item ${isActive?'active':''}` }>
          <Shield size={16} /> Role Toggles
        </NavLink>
        <NavLink to="/misc" className={({isActive}) => `nav-item ${isActive?'active':''}` }>
          <Wrench size={16} /> Misc
        </NavLink>
        <NavLink to="/bot-profile" className={({isActive}) => `nav-item ${isActive?'active':''}` }>
          <User size={16} /> Bot Profile
        </NavLink>
        <NavLink to="/interface" className={({isActive}) => `nav-item ${isActive?'active':''}` }>
          <Monitor size={16} /> Interface
        </NavLink>
      </div>

      <div className="sidebar-divider" />

      {/* Personal Settings Nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Personal Settings</div>
        <NavLink to="/global-profile" className={({isActive}) => `nav-item ${isActive?'active':''}` }>
          <Globe size={16} /> Global Profile
        </NavLink>
        <span className="nav-item coming-soon">
          <User size={16} /> Server Profiles <span className="tag tag-purple" style={{fontSize:9,padding:'1px 6px'}}>Soon</span>
        </span>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-section-title">Premium</div>
        <span className="nav-item premium">
          <Gem size={16} /> Upgrade
        </span>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-section-title">Help</div>
        <NavLink to="/guide" className={({isActive}) => `nav-item ${isActive?'active':''}` }>
          <BookOpen size={16} /> Dashboard Guide
        </NavLink>
      </div>

      <div className="sidebar-bottom">
        <button className="refresh-btn" onClick={() => window.location.reload()}>
          <RefreshCw size={13} /> Refresh Data
        </button>
      </div>
    </aside>
  );
};
