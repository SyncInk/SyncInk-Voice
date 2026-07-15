import { LogOut, ChevronDown, Shield, FileText } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <a href="https://discord.gg/uuVzD5ky4y" target="_blank" rel="noopener noreferrer" className="topbar-link">Support</a>
        <NavLink to="/faq" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>FAQ</NavLink>
        
        <div className="topbar-dropdown" ref={legalRef} style={{ position: 'relative' }}>
          <button 
            className={`topbar-link ${legalOpen ? 'active' : ''}`}
            onClick={() => setLegalOpen(!legalOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            Legal <ChevronDown size={14} style={{ transform: legalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          
          <AnimatePresence>
            {legalOpen && (
              <motion.div 
                key="legal-dropdown-menu"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ 
                  position: 'absolute', top: '100%', left: 0, marginTop: 8, 
                  background: 'rgba(14, 10, 26, 0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--border)', 
                  borderRadius: '12px', padding: 6, minWidth: 180, 
                  display: 'flex', flexDirection: 'column', gap: 4, zIndex: 100, 
                  boxShadow: '0 10px 40px rgba(0,0,0,0.6)' 
                }}
              >
                <NavLink to="/privacy" onClick={() => setLegalOpen(false)} className={({ isActive }) => `topbar-dropdown-item ${isActive ? 'active' : ''}`}>
                  <Shield size={14} /> Privacy Policy
                </NavLink>
                <NavLink to="/terms" onClick={() => setLegalOpen(false)} className={({ isActive }) => `topbar-dropdown-item ${isActive ? 'active' : ''}`}>
                  <FileText size={14} /> Terms of Service
                </NavLink>
              </motion.div>
            )}
          </AnimatePresence>
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
