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
          <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="currentColor">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.73,67.73,0,0,1-10.87,5.19,77.68,77.68,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c0,0,.04-.06.05-.09A71.09,71.09,0,0,0,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
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
