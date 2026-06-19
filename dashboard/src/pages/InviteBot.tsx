import { motion, type Variants } from 'framer-motion';
import { Mic2, Settings, Shield, ExternalLink, X } from 'lucide-react';

const INVITE_LINK = "https://discord.com/oauth2/authorize?client_id=1516578887109181520&permissions=8&integration_type=0&scope=bot+applications.commands";

export default function InviteBot() {
  const containerVars: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVars: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <div className="page-content" style={{ padding: 0, position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Background Animated Elements */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.3, 0.15],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '70vw',
            height: '70vw',
            background: 'radial-gradient(circle, var(--primary) 0%, transparent 60%)',
            filter: 'blur(100px)',
            opacity: 0.2,
          }}
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.25, 0.1],
            x: [0, 100, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '60vw',
            height: '60vw',
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 60%)',
            filter: 'blur(120px)',
            opacity: 0.15,
          }}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            y: [0, -50, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            top: '20%',
            left: '30%',
            width: '40vw',
            height: '40vw',
            background: 'radial-gradient(circle, #3b82f6 0%, transparent 50%)',
            filter: 'blur(90px)',
            opacity: 0.15,
          }}
        />
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          opacity: 0.5
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <motion.div variants={containerVars} initial="initial" animate="animate" style={{ width: '100%', maxWidth: 800, textAlign: 'center' }}>
          
          {/* Logos */}
          <motion.div variants={itemVars} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 40 }}>
            <motion.div 
              whileHover={{ scale: 1.05, rotate: -5 }}
              style={{
                width: 100, height: 100, borderRadius: '50%', padding: 4,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <img src="/syncink-og.jpg" alt="SyncInk OG" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            </motion.div>

            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <X size={24} style={{ color: 'var(--text-muted)' }} />
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              style={{
                width: 100, height: 100, borderRadius: '50%', padding: 4,
                background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.4), inset 0 0 0 1px rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative'
              }}
            >
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--primary-glow)', filter: 'blur(20px)', opacity: 0.6, zIndex: -1 }} />
              <img src="/logo.png" alt="SyncInk Voice" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            </motion.div>
          </motion.div>

          {/* Hero Text */}
          <motion.div variants={itemVars}>
            <h1 style={{ fontSize: 42, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Add <span style={{ color: 'var(--primary)', textShadow: '0 0 20px rgba(99,102,241,0.5)' }}>SyncInk Voice</span><br/>to your server
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
              The ultimate Join-to-Create voice channel management system. Beautiful dashboard, complete control, zero clutter.
            </p>
          </motion.div>

          {/* Action Button */}
          <motion.div variants={itemVars}>
            <a 
              href={INVITE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 10px 40px -10px var(--primary)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  padding: '16px 32px', borderRadius: 16, fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 8px 20px -8px var(--primary)',
                  transition: 'background 0.2s'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="currentColor" style={{ marginRight: 4 }}>
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.73,67.73,0,0,1-10.87,5.19,77.68,77.68,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c0,0,.04-.06.05-.09A71.09,71.09,0,0,0,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
                Invite to Discord
                <ExternalLink size={16} style={{ opacity: 0.7, marginLeft: 4 }} />
              </motion.button>
            </a>
          </motion.div>

          {/* Features Showcase */}
          <motion.div variants={itemVars} style={{ marginTop: 60, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, textAlign: 'left' }}>
            <FeatureCard 
              icon={<Mic2 size={20} />} 
              title="Join-to-Create" 
              desc="Automatic temporary voice channels with customizable templates."
              color="#3b82f6"
            />
            <FeatureCard 
              icon={<Settings size={20} />} 
              title="Web Dashboard" 
              desc="Manage settings, permissions, and features from a sleek web UI."
              color="#8b5cf6"
            />
            <FeatureCard 
              icon={<Shield size={20} />} 
              title="Full Control" 
              desc="Give users control over their rooms: lock, rename, limit, and more."
              color="#10b981"
            />
          </motion.div>
          
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 16, padding: 24,
      backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'transform 0.2s, background 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      e.currentTarget.style.borderColor = `rgba(${hexToRgb(color)}, 0.3)`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
    }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `rgba(${hexToRgb(color)}, 0.15)`,
        color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

// Helper to convert hex to rgb string for rgba
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
