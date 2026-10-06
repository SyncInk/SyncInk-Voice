import { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  Search, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Cpu, 
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItem {
  id: string;
  number: string;
  category: string;
  badgeClass: string;
  question: string;
  answer: string;
  codeSnippets?: string[];
  meta: {
    topic: string;
    target: string;
  };
}

const FAQS: FAQItem[] = [
  {
    id: 'join-to-create-mechanics',
    number: 'FAQ 1',
    category: 'Architecture',
    badgeClass: 'chip-cyan',
    question: "How does the 'Join to Create' system actually work under the hood?",
    answer: "When a server administrator designates a voice channel as a Hub via /setup or the dashboard, SyncInk Voice registers an event listener on Discord's VoiceStateUpdate gateway stream. The moment any member connects to that Hub, our worker instantly creates a private, cloned child voice channel under the designated category with custom permissions, and immediately executes a member move operation to transfer the user into their freshly provisioned room. The Hub channel remains perpetually empty and waiting for subsequent users.",
    meta: {
      topic: 'Voice Provisioning',
      target: 'Core Engine'
    }
  },
  {
    id: 'bot-restart-rooms',
    number: 'FAQ 2',
    category: 'Reliability',
    badgeClass: 'chip-emerald',
    question: "What happens to active rooms if the bot restarts or redeploys?",
    answer: "SyncInk Voice is engineered with a stateless channel lifecycle architecture. The bot does not rely on volatile in-memory session arrays to track active channels. If the bot restarts or redeploys, it executes a startup sweep across all registered Hub categories. Any temporary channel that has become empty is cleanly deleted, while active rooms with users chatting remain completely undisturbed.",
    meta: {
      topic: 'Stateless Lifecycle',
      target: 'Zero Data Loss'
    }
  },
  {
    id: 'lock-button-functioning',
    number: 'FAQ 3',
    category: 'Security',
    badgeClass: 'chip-purple',
    question: "How does the 'Lock' button technically function on Discord?",
    answer: "When a room owner clicks 'Lock' on their interactive Control Panel or types /voice lock, the bot updates the channel's permission overwrite (ACL) for the @everyone role. It sets the Connect permission flag to DENIED. Members already inside the room are never kicked, but any external users trying to enter are prevented by Discord's native client-side voice security.",
    meta: {
      topic: 'Channel ACL Overwrites',
      target: 'Voice Security'
    }
  },
  {
    id: 'manage-roles-permission',
    number: 'FAQ 4',
    category: 'Permissions',
    badgeClass: 'chip-amber',
    question: "Why does the bot require 'Manage Roles' if it only manages voice channels?",
    answer: "Discord's internal permission schema groups channel-level access control overwrites under the Manage Roles permission. In order for SyncInk Voice to grant specific users access via 'Permit User', or lock out @everyone on a single temporary channel, the bot must possess Manage Roles in the channel hierarchy. The bot NEVER modifies, assigns, or creates server-wide member roles.",
    meta: {
      topic: 'Discord API Overwrites',
      target: 'Least-Privilege'
    }
  },
  {
    id: 'dashboard-security-oauth2',
    number: 'FAQ 5',
    category: 'Dashboard',
    badgeClass: 'chip-blue',
    question: "How is web dashboard authentication secured?",
    answer: "Dashboard logins utilize Discord's official OAuth2 Authorization Code flow. When you sign in, Discord securely delivers an encrypted access token directly to our backend. We query Discord's API to confirm your User ID and inspect whether you hold Administrator or Owner permissions on each server. We never ask for or store Discord account passwords.",
    meta: {
      topic: 'OAuth2 Authentication',
      target: 'Session Security'
    }
  },
  {
    id: 'moderator-dashboard-access',
    number: 'FAQ 6',
    category: 'Administration',
    badgeClass: 'chip-purple',
    question: "Can I grant dashboard management access to my server Moderators?",
    answer: "Yes! While the dashboard defaults to Server Owners and Administrators for strict security, you can use the 'Dashboard Access' page to whitelist specific Discord roles (such as Moderator or Staff). Whitelisted role holders can sign in via OAuth2 and configure bot features without needing server-wide Administrator permissions.",
    meta: {
      topic: 'Role Whitelisting',
      target: 'Staff Delegation'
    }
  },
  {
    id: 'minimal-permissions-integer',
    number: 'FAQ 7',
    category: 'Permissions',
    badgeClass: 'chip-cyan',
    question: "What is the exact minimal permission integer required to invite the bot?",
    answer: "SyncInk Voice operates strictly on least privilege. The minimal required permissions are: Manage Channels, Manage Roles, Move Members, View Channel, Send Messages, Embed Links, Read Message History, and Connect (Discord Permission Integer: 286346256). You never have to grant the dangerous Administrator permission.",
    meta: {
      topic: 'Permission Calculation',
      target: 'Server Safety'
    }
  },
  {
    id: 'companion-text-channels',
    number: 'FAQ 8',
    category: 'Features',
    badgeClass: 'chip-emerald',
    question: "How do dynamic companion text channels work?",
    answer: "When a room owner clicks the 'Text Channel' option in the Control Panel or executes /voice text, the bot provisions a private companion text channel accessible solely to members currently inside that specific voice room. When the voice channel empties and closes, the companion text channel and its chat history are purged automatically.",
    meta: {
      topic: 'Dynamic Room Chat',
      target: 'Privacy & Cleanliness'
    }
  }
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Architecture', 'Reliability', 'Security', 'Permissions', 'Dashboard', 'Administration', 'Features'];

  const handleCopyLink = (id: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/dashboard/voice/faq#${id}`;
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.meta.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="doc-page-container">
      {/* Hero Header */}
      <section className="doc-hero-section">
        <div className="doc-hero-glow" />

        <div className="doc-pill-badge doc-pill-purple">
          <HelpCircle size={14} />
          Official Knowledge Base & Community FAQ
        </div>

        <h1 className="doc-hero-title">
          SyncInk Voice Frequently Asked Questions
        </h1>

        <p className="doc-hero-subtitle">
          Find comprehensive architectural answers, security specifications, permission requirements, 
          and troubleshooting steps for running SyncInk Voice at scale.
        </p>

        {/* Quick Action Pills */}
        <div className="doc-quick-actions">
          <a
            href="https://discord.gg/rB6gNZaK9u"
            target="_blank"
            rel="noopener noreferrer"
            className="doc-quick-pill doc-quick-pill-discord"
          >
            <span>Discord Support (#support-chat)</span>
            <ExternalLink size={12} />
          </a>

          <a href="#join-to-create-mechanics" className="doc-quick-pill doc-quick-pill-accent">
            <Cpu size={13} />
            <span>Join-to-Create Mechanics</span>
          </a>

          <a href="#manage-roles-permission" className="doc-quick-pill">
            <ShieldCheck size={13} />
            <span>Permissions Breakdown</span>
          </a>
        </div>

        {/* Live Search Input */}
        <div className="doc-search-wrapper">
          <Search size={15} className="doc-search-icon" />
          <input
            type="text"
            placeholder="Search questions by keyword (e.g., lock, permissions, restart, oauth2)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="doc-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="doc-search-clear"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </section>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: activeCategory === cat ? '1px solid rgba(124, 58, 237, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeCategory === cat ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255, 255, 255, 0.03)',
              color: activeCategory === cat ? '#ffffff' : '#94a3b8'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main FAQ Cards List */}
      <section className="doc-section">
        <div className="doc-section-header">
          <div className="doc-section-title-wrap">
            <h2>
              <MessageSquare size={22} style={{ color: '#a855f7' }} />
              Questions & In-Depth Technical Solutions
            </h2>
            <p>Select any item below to expand the full architectural breakdown.</p>
          </div>
          <span className="doc-counter-badge">
            Showing {filteredFaqs.length} of {FAQS.length} Questions
          </span>
        </div>

        <div className="doc-cards-grid">
          {filteredFaqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={faq.id}
                id={faq.id}
                className="doc-card"
                style={{
                  borderColor: isOpen ? 'rgba(124, 58, 237, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer'
                }}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <div className="doc-card-top" style={{ marginBottom: 0 }}>
                  <div className="doc-card-title-wrap" style={{ flex: 1 }}>
                    <span className="doc-num-badge">{faq.number}</span>
                    <h3 className="doc-card-title" style={{ color: isOpen ? '#c4b5fd' : '#ffffff' }}>
                      {faq.question}
                    </h3>
                  </div>

                  <div className="doc-card-actions" onClick={(e) => e.stopPropagation()}>
                    <span className={`doc-status-chip ${faq.badgeClass}`}>
                      {faq.category}
                    </span>
                    <button
                      onClick={() => handleCopyLink(faq.id)}
                      className="doc-copy-btn"
                      title="Copy link to question"
                    >
                      {copiedId === faq.id ? (
                        <Check size={14} style={{ color: '#34d399' }} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <div
                      style={{
                        padding: 4,
                        color: '#64748b',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <p className="doc-card-desc">{faq.answer}</p>

                        <div className="doc-meta-footer" style={{ marginTop: 14, paddingTop: 10 }}>
                          <div className="doc-meta-item">
                            <span className="doc-meta-label">Topic:</span>
                            <span>{faq.meta.topic}</span>
                          </div>
                          <div className="doc-meta-item">
                            <span className="doc-meta-label">Design Standard:</span>
                            <span style={{ color: '#34d399' }}>{faq.meta.target}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Special Help & Community Callout */}
      <div className="doc-callout-box">
        <div className="doc-callout-content">
          <div className="doc-callout-badge">
            <Sparkles size={16} />
            <span>Still Need Clarification or Experiencing an Edge Case?</span>
          </div>
          <p className="doc-callout-text">
            Our active developer team and support staff are available 24/7 in our Discord server. 
            Ask any question in #support-chat or file a private technical inquiry.
          </p>
        </div>
        <a
          href="https://discord.gg/rB6gNZaK9u"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap' }}
        >
          Join Discord Support
        </a>
      </div>
    </div>
  );
}
