import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const FAQS = [
  {
    q: "How does the 'Join to Create' system actually work?",
    a: "When you assign a Voice Channel as a Hub, the bot listens for the Discord API's voice state update events. The moment a user connects to the Hub, the bot dynamically provisions a new child voice channel and seamlessly moves the user into it. The Hub itself remains empty and ready for the next user."
  },
  {
    q: "What happens to active rooms if the bot restarts?",
    a: "SyncInk Voice is designed with a stateless architecture for voice channels. It does not rely on a fragile local database to track active rooms. If the bot goes offline and restarts, it instantly scans all child channels bound to your Hubs and cleanly deletes any that are empty, ensuring no orphaned channels are ever left behind."
  },
  {
    q: "How does the 'Lock' button technically function?",
    a: "When a room owner clicks 'Lock' on their Control Panel, the bot dynamically updates the channel's permission overwrites (ACL). It explicitly denies the `Connect` permission for the @everyone role on that specific voice channel. Members already inside remain unaffected, but new users cannot join."
  },
  {
    q: "Why does the bot need 'Manage Roles' if it only manages channels?",
    a: "To securely operate features like 'Permit User' or 'Hide Room', the bot must create user-specific permission overwrites on the voice channel. Discord's API requires the `Manage Roles` permission to modify any channel-level access controls, even when the bot is targeting individual users rather than server-wide roles."
  },
  {
    q: "How is the Web Dashboard secured?",
    a: "Dashboard authentication utilizes Discord's official OAuth2 flow. When you log in, we only retrieve your User ID and server list. We then query the Discord API in real-time to verify if you possess `Administrator` privileges or own the server. No user passwords or auth tokens are permanently stored."
  },
  {
    q: "Can I grant Dashboard access to my server Moderators?",
    a: "Yes. While we default to Server Owners and Administrators for strict security, you can use the 'Dashboard Access' page to grant lower-tier access. This allows you to whitelist specific Discord roles (like Staff or Moderators) to pass the OAuth2 check and configure the bot."
  },
  {
    q: "Exactly what permissions does the bot require?",
    a: "The bot operates on the principle of least privilege. It requires `Manage Channels` (to spawn rooms), `Manage Roles` (to handle lock/permit overwrites), `Move Members` (to drag users from the Hub), and `Send Messages` (to post the Control Panel). You can supply exactly these permissions (Permission Integer: 823151632) instead of granting full Administrator access."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  const renderAnswer = (text: string) => {
    const parts = text.split(/`([^`]+)`/g);
    return (
      <>
        {parts.map((part, i) => 
          i % 2 === 1 ? (
            <code key={i} style={{ 
              background: 'rgba(30, 31, 34, 1)', 
              padding: '2px 6px', 
              borderRadius: 4, 
              fontFamily: 'Consolas, monospace', 
              color: 'var(--text-primary)',
              fontSize: '0.9em'
            }}>
              {part}
            </code>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="page-content" style={{ maxWidth: 800, margin: '0 auto' }}>
      <motion.div initial="hidden" animate="visible" variants={containerVars}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <HelpCircle size={48} color="var(--primary)" style={{ margin: '0 auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Frequently Asked Questions</h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>
            Find quick answers to common questions about SyncInk Voice's setup and features.
          </p>
        </div>

        <motion.div variants={itemVars} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div 
                key={i} 
                className="card" 
                style={{ 
                  padding: 0, 
                  cursor: 'pointer', 
                  border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <div 
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{ 
                    padding: '20px 24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 16,
                    background: isOpen ? 'var(--bg-primary)' : 'var(--bg-card)'
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, color: isOpen ? 'var(--primary)' : 'var(--text-primary)' }}>
                    {faq.q}
                  </span>
                  {isOpen ? <ChevronUp size={20} color="var(--primary)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                </div>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div style={{ padding: '0 24px 24px 24px', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        {renderAnswer(faq.a)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
