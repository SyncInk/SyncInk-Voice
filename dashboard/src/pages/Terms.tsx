import { FileText, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Terms() {
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>
      <motion.div initial="hidden" animate="visible" variants={containerVars}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <FileText size={48} color="var(--primary)" style={{ margin: '0 auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Terms of Service</h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>
            Please read these terms carefully before using SyncInk Voice.
          </p>
        </div>

        {/* Terms of Service */}
        <motion.section variants={itemVars} className="card" style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <Shield size={24} color="var(--primary)" />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Terms of Use</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>1. Acceptable Use</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                By inviting SyncInk Voice to your server, you agree to not abuse its systems (e.g., intentionally spamming voice joins to overload the API, or using custom branding to impersonate official Discord staff).
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>2. Service Availability</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                While we strive for 99.9% uptime, SyncInk Voice is provided "as is" without guarantees. We reserve the right to suspend service to servers that are intentionally degrading performance for others.
              </p>
            </div>
            
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>3. Liability</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                SyncInk Voice and its developers are not responsible for any moderation actions, server disruptions, or damages that may occur from configuring or using the bot. Users configure permissions and automation at their own risk.
              </p>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
