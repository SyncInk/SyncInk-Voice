import { Shield, Lock, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Privacy() {
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
          <Shield size={48} color="var(--primary)" style={{ margin: '0 auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>
            We believe in complete transparency. Here's exactly what data we collect, why we need it, and how we protect it.
          </p>
        </div>

        {/* Privacy Policy */}
        <motion.section variants={itemVars} className="card" style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <Lock size={24} color="var(--primary)" />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Data We Collect</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
                SyncInk Voice is designed to collect only the absolute minimum amount of data required to function. We store:
              </p>
              <ul style={{ color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><strong>Identifiers:</strong> Discord Server IDs, Channel IDs, Role IDs, and User IDs for configuration routing.</li>
                <li><strong>Caching:</strong> We temporarily cache your Discord Tag and Avatar URL solely for displaying them in your server's audit logs.</li>
                <li><strong>Settings:</strong> Any toggles, configurations, or text inputs you explicitly save via our Dashboard or Bot commands.</li>
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Data We DO NOT Collect</h3>
              <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--error)', fontWeight: 600, marginBottom: 8 }}>
                  <AlertCircle size={18} /> Zero Content Monitoring
                </div>
                <p style={{ color: 'var(--error)', opacity: 0.9, margin: 0, lineHeight: 1.5, fontSize: 14 }}>
                  We <strong>never</strong> read, monitor, or store the content of your text messages, voice conversations, or direct messages. SyncInk Voice operates strictly on Discord's structural events (like joining or leaving a voice channel).
                </p>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Data Retention & Deletion</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                All temporary room data is automatically deleted from our database the moment the voice channel becomes empty. Server configurations remain stored until the bot is kicked from your server, at which point you may request a complete data wipe by contacting our support team.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Permissions Breakdown */}
        <motion.section variants={itemVars} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <Eye size={24} color="var(--primary)" />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Why We Need Specific Permissions</h2>
          </div>
          
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
            SyncInk requests Administrator by default to ensure a seamless setup experience, but you can restrict it to granular permissions. Here is exactly what we use each permission for:
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { perm: 'Manage Channels', desc: 'Allows the bot to dynamically create, edit, and delete temporary voice and text channels.' },
              { perm: 'Manage Roles', desc: 'Required to modify channel permission overrides when a room owner clicks the "Lock", "Hide", or "Permit User" buttons.' },
              { perm: 'Move Members', desc: 'Used to automatically drag users from the "Join to Create" hub into their new temporary room, or to kick users.' },
              { perm: 'Manage Webhooks', desc: 'Powers the "Custom Branding" feature, allowing the bot to send disguised messages into text channels using your custom Avatar and Nickname.' },
              { perm: 'Send Messages / Embed Links', desc: 'Required to post the interactive Control Panel and "Looking for Members" alerts.' },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-primary)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <CheckCircle2 size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{p.perm}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
