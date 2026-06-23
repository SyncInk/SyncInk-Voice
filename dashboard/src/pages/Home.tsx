import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { Lock, Settings, ToggleLeft, Shield, Wrench, Bot, Globe, Monitor, BookOpen } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { NAV_ACCESS, type PermLevel } from '../components/layout/Sidebar';

const cards = [
  { to: '/setup', icon: <Settings size={22} />, title: 'Setup', desc: 'Configure your Discord server settings', bg: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
  { to: '/server-toggles', icon: <ToggleLeft size={22} />, title: 'Server Toggles', desc: 'Enable/disable features for your server', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  { to: '/role-toggles', icon: <Shield size={22} />, title: 'Role Toggles', desc: 'Configure role-based feature toggles', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  { to: '/misc', icon: <Wrench size={22} />, title: 'Misc', desc: 'Additional server settings', bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  { to: '/bot-profile', icon: <Bot size={22} />, title: 'Bot Profile', desc: 'Configure bot appearance and behavior', bg: 'rgba(236,72,153,0.15)', color: '#f472b6' },
  { to: '/global-profile', icon: <Globe size={22} />, title: 'Global Profile', desc: 'Manage your personal preferences', bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  { to: '/interface', icon: <Monitor size={22} />, title: 'Interface', desc: 'Customize your dashboard experience', bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  { to: '/guide', icon: <BookOpen size={22} />, title: 'Dashboard Guide', desc: 'How to use Syncink Voice', bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
];

const container = { animate: { transition: { staggerChildren: 0.05 } } };
const item = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

export default function Home({ guildName, permLevel }: { guildName: string; permLevel: PermLevel }) {
  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      
      <div className="home-hero">
        <h1 className="home-title">Dashboard</h1>
        <p className="home-subtitle">
          Select a section to configure your Syncink Voice settings for <strong>{guildName}</strong>
        </p>
        <p className="home-hint">
          Locked pages stay visible, so everyone can see what features are available at their access tier.
        </p>
      </div>

      <motion.div className="home-cards-grid" variants={container} initial="initial" animate="animate">
        {cards.map(c => {
          const allowed = NAV_ACCESS[c.to]?.[permLevel] ?? false;
          return (
            <motion.div key={c.to} variants={item} style={{ height: '100%' }}>
              <NavLink 
                to={allowed ? c.to : '#'} 
                className={`home-nav-card ${!allowed ? 'locked' : ''}`}
                onClick={(e) => {
                  if (!allowed) e.preventDefault();
                }}
              >
                <div className="home-nav-card-icon" style={{ background: c.bg, color: c.color }}>
                  {c.icon}
                </div>
                <div className="home-nav-card-content">
                  <div className="home-nav-card-title">
                    {c.title}
                    {!allowed && <Lock size={14} className="lock-icon" />}
                  </div>
                  <div className="home-nav-card-desc">{c.desc}</div>
                </div>
              </NavLink>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
