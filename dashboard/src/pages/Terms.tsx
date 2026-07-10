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
            Last updated: July 2026
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
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>1. Acceptance of Terms</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                By inviting our bot to your Discord server and using the dashboard, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not use our service.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>2. Use of Service</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
                You agree to use the bot and dashboard only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the service.
              </p>
              <ul style={{ color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>You must not use the service to harass, abuse, or harm another person.</li>
                <li>You must not attempt to gain unauthorized access to our dashboard or database.</li>
                <li>You must comply with Discord's Terms of Service and Community Guidelines.</li>
              </ul>
            </div>
            
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>3. Service Availability</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                We strive to ensure 99.9% uptime, but we do not guarantee that the service will always be available or be uninterrupted. We reserve the right to suspend or withdraw the service at any time without notice.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>4. Termination</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>5. Changes to Terms</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                We reserve the right to modify or replace these Terms at any time. We will notify users of any significant changes via our Support Server or Dashboard announcements.
              </p>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
