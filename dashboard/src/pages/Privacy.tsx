import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

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
    <div className="page-content" style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
      <motion.div initial="hidden" animate="visible" variants={containerVars}>
        
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', textDecoration: 'none', marginBottom: 30, fontSize: 14, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back
        </Link>

        <div style={{ marginBottom: 30 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Last updated: July 2026</p>
        </div>

        <motion.section variants={itemVars} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px 40px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>1. Data We Collect</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0, marginBottom: 12 }}>
                SyncInk Voice is designed to collect only the absolute minimum amount of data required to function. We store:
              </p>
              <ul style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li><strong>Identifiers:</strong> Discord Server IDs, Channel IDs, Role IDs, and User IDs for configuration routing.</li>
                <li><strong>Caching:</strong> We temporarily cache your Discord Tag and Avatar URL solely for displaying them in your server's audit logs.</li>
                <li><strong>Settings:</strong> Any toggles, configurations, or text inputs you explicitly save via our Dashboard or Bot commands.</li>
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--error)', marginBottom: 12 }}>2. Data We DO NOT Collect</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                We <strong>never</strong> read, monitor, or store the content of your text messages, voice conversations, or direct messages. SyncInk Voice operates strictly on Discord's structural events (like joining or leaving a voice channel).
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>3. Data Retention & Deletion</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                All temporary room data is automatically deleted from our database the moment the voice channel becomes empty. Server configurations remain stored until the bot is kicked from your server, at which point you may request a complete data wipe by contacting our support team.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>4. Why We Need Specific Permissions</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0, marginBottom: 12 }}>
                SyncInk requests Administrator by default to ensure a seamless setup experience, but you can restrict it to granular permissions. Here is exactly what we use each permission for:
              </p>
              <ul style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li><strong>Manage Channels:</strong> Allows the bot to dynamically create, edit, and delete temporary voice and text channels.</li>
                <li><strong>Manage Roles:</strong> Required to modify channel permission overrides when a room owner clicks the "Lock", "Hide", or "Permit User" buttons.</li>
                <li><strong>Move Members:</strong> Used to automatically drag users from the "Join to Create" hub into their new temporary room, or to kick users.</li>
                <li><strong>Manage Webhooks:</strong> Powers the "Custom Branding" feature, allowing the bot to send disguised messages into text channels using your custom Avatar and Nickname.</li>
                <li><strong>Send Messages & Embed Links:</strong> Required to post the interactive Control Panel and "Looking for Members" alerts.</li>
              </ul>
            </div>

          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
