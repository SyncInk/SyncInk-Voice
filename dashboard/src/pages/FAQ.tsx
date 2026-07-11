import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const FAQS = [
  {
    q: "Why doesn't the bot respond to commands?",
    a: "Ensure that SyncInk Voice has the `Send Messages` and `Embed Links` permissions in the channel you are trying to use commands. Also, check that your server has not restricted slash commands for regular members in Server Settings > Integrations."
  },
  {
    q: "How do I setup Custom Bot Branding?",
    a: "Go to the 'Bot Profile' tab on the Dashboard. From there, you can set a custom Username and Avatar. Make sure the bot has the `Manage Webhooks` permission, as it uses Discord Webhooks to dynamically change its identity in your temporary rooms."
  },
  {
    q: "Why are empty temporary rooms not being deleted?",
    a: "The bot deletes rooms immediately when everyone leaves. If a room is stuck, it means the bot lacks the `Manage Channels` permission, or a discord API outage delayed the voice update event."
  },
  {
    q: "How does the 'Lock' button work?",
    a: "When a room owner clicks 'Lock' on the Control Panel, the bot removes the `Connect` permission for the @everyone role on that specific voice channel. Members who are already inside will not be kicked."
  },
  {
    q: "Can I restrict who can use the Dashboard?",
    a: "Yes! By default, only the Server Owner and Administrators can log into the Dashboard. However, you can use the 'Dashboard Access' page to grant lower-tier access (like Moderator or Staff) to specific Discord roles."
  },
  {
    q: "What permissions does the bot require?",
    a: "The bot only requests the specific permissions it needs to function properly (Permission Integer: 823151632). It requires permissions such as `Manage Channels`, `Manage Roles`, `Move Members`, `Manage Webhooks`, and `Send Messages`, rather than requiring full Administrator access."
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
