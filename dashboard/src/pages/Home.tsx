import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { NAV_ACCESS, type PermLevel } from '../components/layout/Sidebar';

const cards = [
  { to: '/setup', icon: '⚙️', title: 'Setup', desc: 'Configure your Discord server settings', bg: 'rgba(124,58,237,0.15)' },
  { to: '/server-toggles', icon: '🔀', title: 'Server Toggles', desc: 'Enable/disable features for your server', bg: 'rgba(59,130,246,0.15)' },
  { to: '/role-toggles', icon: '🛡️', title: 'Role Toggles', desc: 'Configure role-based feature toggles', bg: 'rgba(34,197,94,0.15)' },
  { to: '/misc', icon: '🔧', title: 'Misc', desc: 'Additional server settings', bg: 'rgba(245,158,11,0.15)' },
  { to: '/bot-profile', icon: '🤖', title: 'Bot Profile', desc: 'Configure bot appearance and behavior', bg: 'rgba(124,58,237,0.15)' },
  { to: '/global-profile', icon: '🌐', title: 'Global Profile', desc: 'Manage your personal preferences', bg: 'rgba(59,130,246,0.15)' },
  { to: '/interface', icon: '📐', title: 'Interface', desc: 'Customize your dashboard experience', bg: 'rgba(107,114,128,0.15)' },
  { to: '/guide', icon: '📚', title: 'Dashboard Guide', desc: 'How to use Syncink Voice', bg: 'rgba(245,158,11,0.15)' },
];

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const item = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Home({ guildName, permLevel }: { guildName: string; permLevel: PermLevel }) {
  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <h1 className="page-title" style={{ fontSize: 28, marginBottom: 8 }}>Dashboard</h1>
        <p className="page-subtitle" style={{ fontSize: 14 }}>
          Select a section to configure your Syncink Voice settings for <strong style={{ color: 'var(--text-primary)' }}>{guildName}</strong>
        </p>
      </div>
      <motion.div className="home-cards-grid" variants={container} initial="initial" animate="animate">
        {cards.map(c => {
          const allowed = NAV_ACCESS[c.to]?.[permLevel] ?? false;
          return (
            <motion.div key={c.to} variants={item}>
              <NavLink 
                to={allowed ? c.to : '#'} 
                className="home-nav-card" 
                style={!allowed ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' } : {}}
                onClick={(e) => {
                  if (!allowed) e.preventDefault();
                }}
              >
                <div className="home-nav-card-icon" style={{ background: c.bg }}>
                  {c.icon}
                </div>
                <div className="home-nav-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.title}
                  {!allowed && <Lock size={14} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div className="home-nav-card-desc">{c.desc}</div>
              </NavLink>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
