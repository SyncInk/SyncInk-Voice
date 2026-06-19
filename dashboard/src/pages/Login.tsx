import { motion } from 'framer-motion';
import { Mic2, Settings, Shield } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

const features = [
  { icon: <Mic2 size={20} />, title: 'Temporary Voice Channels', desc: 'Auto-create and manage dynamic voice rooms' },
  { icon: <Settings size={20} />, title: 'Granular Permissions', desc: 'Full role and server-level toggle control' },
  { icon: <Shield size={20} />, title: 'Secure & Private', desc: 'Discord OAuth2 protected dashboard' },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:500, height:500, background:'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'5%', right:'-5%', width:400, height:400, background:'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <img src="/logo.png" className="login-logo" alt="Syncink Voice"
          onError={e => { e.currentTarget.style.display = 'none'; }} />

        <h1 className="login-title">Syncink Voice</h1>
        <p className="login-subtitle">
          The premium temporary voice channel bot. Manage your servers, customize your voice rooms, and take full control.
        </p>

        <div className="login-features">
          {features.map(f => (
            <div key={f.title} className="login-feature">
              <div className="login-feature-icon" style={{ 
                color: 'var(--primary)', 
                background: 'rgba(99,102,241,0.15)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-discord" onClick={onLogin}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.112 18.1.13 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Login with Discord
        </button>

        <div className="login-footer" style={{ marginTop: 24 }}>
          Syncink Voice Dashboard • Free for everyone • Built with ♥
        </div>
      </motion.div>
    </div>
  );
}
