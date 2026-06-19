import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ui/Toast';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import LoginPage from './pages/Login';
import Home from './pages/Home';
import Setup from './pages/Setup';
import ServerToggles from './pages/ServerToggles';
import RoleToggles from './pages/RoleToggles';
import Misc from './pages/Misc';
import BotProfile from './pages/BotProfile';
import GlobalProfile from './pages/GlobalProfile';
import Interface, { applyPrefs } from './pages/Interface';
import Guide from './pages/Guide';
import type { Guild } from './types';

import './index.css';

// ── Auth state ────────────────────────────────────────────────────────────────
interface AuthUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────
const API = {
  async session(): Promise<AuthUser | null> {
    try {
      const r = await fetch('/api/auth/session', { credentials: 'include' });
      if (!r.ok) return null;
      const d = await r.json();
      return d.authenticated ? d.user : null;
    } catch { return null; }
  },
  async guilds(): Promise<Guild[]> {
    try {
      const r = await fetch('/api/guilds', { credentials: 'include' });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.guilds ?? []).map((g: { id: string; name: string; iconUrl: string | null; botConnected: boolean; permissionLevel?: string }) => ({
        id: g.id,
        name: g.name,
        icon: g.iconUrl ? g.iconUrl.match(/icons\/\d+\/([^.?]+)/)?.[1] ?? null : null,
        owner: g.permissionLevel === 'Owner',
        permissions: '0',
        permissionLevel: (g.permissionLevel as 'Owner' | 'Administrator' | 'Moderator' | 'Member') ?? 'Member',
        botPresent: g.botConnected,
      }));
    } catch { return []; }
  },
  async logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  },
};

// ── Page animation ────────────────────────────────────────────────────────────
const pv = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function DashboardLayout({ user, guilds, selectedGuild, onSelectGuild, onLogout, addToast }: {
  user: AuthUser;
  guilds: Guild[];
  selectedGuild: Guild | null;
  onSelectGuild: (g: Guild) => void;
  onLogout: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}) {
  return (
    <div className="app-layout">
      <Sidebar guilds={guilds} selectedGuild={selectedGuild} onSelectGuild={onSelectGuild} />
      <div className="main-content">
        <Topbar user={user} onLogout={onLogout} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<motion.div key="home" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><Home guildName={selectedGuild?.name ?? 'your server'} /></motion.div>} />
            <Route path="/setup" element={<motion.div key="setup" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><Setup guildId={selectedGuild?.id ?? null} addToast={addToast} /></motion.div>} />
            <Route path="/server-toggles" element={<motion.div key="st" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><ServerToggles addToast={addToast} /></motion.div>} />
            <Route path="/role-toggles" element={<motion.div key="rt" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><RoleToggles addToast={addToast} /></motion.div>} />
            <Route path="/misc" element={<motion.div key="misc" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><Misc addToast={addToast} /></motion.div>} />
            <Route path="/bot-profile" element={<motion.div key="bp" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><BotProfile addToast={addToast} /></motion.div>} />
            <Route path="/global-profile" element={<motion.div key="gp" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><GlobalProfile addToast={addToast} /></motion.div>} />
            <Route path="/interface" element={<motion.div key="iface" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><Interface addToast={addToast} /></motion.div>} />
            <Route path="/guide" element={<motion.div key="guide" variants={pv} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}><Guide /></motion.div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();

  // Apply saved interface preferences (theme/compact/animations) immediately
  useEffect(() => {
    try {
      const raw = localStorage.getItem('syncink_prefs');
      if (raw) applyPrefs(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // On mount, check if already logged in (cookie session)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loginStatus = params.get('login');

    API.session().then(async u => {
      if (u) {
        setUser(u);
        const gs = await API.guilds();
        setGuilds(gs);
        if (gs.length > 0) setSelectedGuild(gs[0]);
        if (loginStatus === 'success') {
          // Clean URL
          window.history.replaceState({}, '', '/');
          addToast('success', `Welcome back, ${u.globalName ?? u.username}! 👋`);
        }
      } else if (loginStatus === 'failed') {
        window.history.replaceState({}, '', '/');
        addToast('error', 'Login failed. Please try again.');
      }
      setLoading(false);
    });
  }, []);

  const handleLogin = useCallback(() => {
    // Redirect to backend OAuth — works both locally and on Railway
    window.location.href = '/api/auth/discord/login';
  }, []);

  const handleLogout = useCallback(async () => {
    await API.logout();
    setUser(null);
    setGuilds([]);
    setSelectedGuild(null);
    addToast('info', 'You have been logged out.');
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="Syncink Voice" style={{ width: 72, height: 72, borderRadius: '50%', marginBottom: 16, opacity: 0.9 }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <DashboardLayout
          user={user}
          guilds={guilds}
          selectedGuild={selectedGuild}
          onSelectGuild={setSelectedGuild}
          onLogout={handleLogout}
          addToast={addToast}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </BrowserRouter>
  );
}
