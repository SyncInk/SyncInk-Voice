import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
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
import Interface from './pages/Interface';
import Guide from './pages/Guide';
import type { Guild } from './types';
import './index.css';

// Demo data for testing without OAuth
const DEMO_GUILDS: Guild[] = [
  { id: '1', name: 'SyncInk Community', icon: null, owner: true, permissions: '8', permissionLevel: 'Owner', botPresent: true },
  { id: '2', name: 'Gaming Hub', icon: null, owner: false, permissions: '8', permissionLevel: 'Administrator', botPresent: true },
  { id: '3', name: 'Support Server', icon: null, owner: false, permissions: '32', permissionLevel: 'Moderator', botPresent: true },
];

const DEMO_USER = { id: '123456789', username: 'DemoUser', discriminator: '0001', avatar: null };

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function DashboardLayout({ user, guilds, selectedGuild, onSelectGuild, addToast }: {
  user: typeof DEMO_USER;
  guilds: Guild[];
  selectedGuild: Guild | null;
  onSelectGuild: (g: Guild) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}) {
  return (
    <div className="app-layout">
      <Sidebar guilds={guilds} selectedGuild={selectedGuild} onSelectGuild={onSelectGuild} />
      <div className="main-content">
        <Topbar user={user} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <Home guildName={selectedGuild?.name ?? 'your server'} />
              </motion.div>
            } />
            <Route path="/setup" element={
              <motion.div key="setup" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <Setup addToast={addToast} />
              </motion.div>
            } />
            <Route path="/server-toggles" element={
              <motion.div key="st" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <ServerToggles addToast={addToast} />
              </motion.div>
            } />
            <Route path="/role-toggles" element={
              <motion.div key="rt" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <RoleToggles addToast={addToast} />
              </motion.div>
            } />
            <Route path="/misc" element={
              <motion.div key="misc" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <Misc addToast={addToast} />
              </motion.div>
            } />
            <Route path="/bot-profile" element={
              <motion.div key="bp" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <BotProfile addToast={addToast} />
              </motion.div>
            } />
            <Route path="/global-profile" element={
              <motion.div key="gp" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <GlobalProfile addToast={addToast} />
              </motion.div>
            } />
            <Route path="/interface" element={
              <motion.div key="iface" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <Interface addToast={addToast} />
              </motion.div>
            } />
            <Route path="/guide" element={
              <motion.div key="guide" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <Guide />
              </motion.div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(DEMO_GUILDS[0]);
  const { toasts, addToast, removeToast } = useToast();

  const handleLogin = useCallback(() => {
    // In production: redirect to Discord OAuth
    setLoggedIn(true);
  }, []);

  const handleDemo = useCallback(() => {
    setLoggedIn(true);
  }, []);

  return (
    <BrowserRouter>
      {!loggedIn ? (
        <LoginPage onLogin={handleLogin} onDemo={handleDemo} />
      ) : (
        <DashboardLayout
          user={DEMO_USER}
          guilds={DEMO_GUILDS}
          selectedGuild={selectedGuild}
          onSelectGuild={setSelectedGuild}
          addToast={addToast}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </BrowserRouter>
  );
}
