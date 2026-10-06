import { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  CheckCircle2, 
  Search, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Database, 
  Trash2, 
  Layers, 
  Sparkles
} from 'lucide-react';

interface PrivacySection {
  id: string;
  number: string;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  bullets: string[];
  meta: {
    category: string;
    retention: string;
    enforcement: string;
  };
}

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'identifiers',
    number: 'Section 1',
    title: 'Essential Metadata & Account Identifiers',
    badge: 'Essential Routing',
    badgeClass: 'chip-blue',
    description: 'SyncInk Voice operates on a least-data policy. We store only the absolute structural metadata required to route voice connections and maintain server configurations.',
    bullets: [
      'Discord Guild IDs, Channel IDs, Role IDs, and User IDs are stored to link configurations to the appropriate server.',
      'User tags and avatars are temporarily cached in-memory solely for displaying your dashboard profile during active sessions.',
      'Custom configurations (channel names, user limits, role toggles) explicitly saved via the dashboard or bot commands are stored in our secure database.'
    ],
    meta: {
      category: 'Data Collection',
      retention: 'Persisted until server removal',
      enforcement: 'Automated Encryption'
    }
  },
  {
    id: 'zero-logging',
    number: 'Section 2',
    title: 'Zero Voice Surveillance & Content Monitoring',
    badge: 'Absolute Guarantee',
    badgeClass: 'chip-rose',
    description: 'We maintain an unwavering zero-monitoring guarantee across all Discord voice and text communications on your server.',
    bullets: [
      'We NEVER listen to, record, intercept, or process audio transmissions inside your voice channels.',
      'We NEVER read, analyze, or archive text messages sent in temporary room chats or server channels.',
      'SyncInk Voice interacts purely with Discord API gateway state events (such as VoiceStateUpdate when a user joins the Hub).'
    ],
    meta: {
      category: 'Surveillance Exclusion',
      retention: 'Zero Bytes Stored',
      enforcement: 'Hard-Coded Isolation'
    }
  },
  {
    id: 'ephemeral-rooms',
    number: 'Section 3',
    title: 'Ephemeral Room Lifecycle & Automatic Database Purging',
    badge: 'Stateless Cleanup',
    badgeClass: 'chip-emerald',
    description: 'Temporary voice channels and their linked companion text channels exist only as long as members occupy them.',
    bullets: [
      'When the last participant disconnects from a temporary room, the channel is permanently deleted from Discord within seconds.',
      'Associated in-memory state and temporary session trackers are immediately pruned from our active cluster.',
      'If the bot restarts unexpectedly, our startup garbage collector sweeps all hubs and cleans orphaned empty rooms immediately.'
    ],
    meta: {
      category: 'Lifecycle Protocol',
      retention: 'Deleted on channel exit',
      enforcement: 'Real-time Event Worker'
    }
  },
  {
    id: 'data-deletion',
    number: 'Section 4',
    title: 'Right to Erasure & Server Data Deletion',
    badge: 'GDPR / CCPA Compliant',
    badgeClass: 'chip-purple',
    description: 'Server administrators maintain full ownership and control over all stored configurations and preference records.',
    bullets: [
      'When SyncInk Voice is removed from a Discord server, active channel provisioning halts immediately.',
      'Server owners may request an immediate, total purge of all database documents linked to their Guild ID by opening a support ticket.',
      'We do not sell, license, rent, or monetize any user or server metadata to third-party data brokers or advertisers.'
    ],
    meta: {
      category: 'User Rights',
      retention: 'On-demand wipe supported',
      enforcement: 'Full Security Purge'
    }
  }
];

interface PermissionAudit {
  id: string;
  number: string;
  name: string;
  badge: string;
  badgeClass: string;
  rationale: string;
  securityImpact: string;
}

const PERMISSIONS_AUDIT: PermissionAudit[] = [
  {
    id: 'perm-manage-channels',
    number: 'Perm 1',
    name: 'Manage Channels',
    badge: 'Core Engine',
    badgeClass: 'chip-cyan',
    rationale: 'Allows the bot to dynamically provision new child voice channels when users join the hub, rename rooms on command, and cleanly delete empty channels.',
    securityImpact: 'Scoped exclusively to the voice hub category. The bot cannot modify server channels outside its designated workspace.'
  },
  {
    id: 'perm-manage-roles',
    number: 'Perm 2',
    name: 'Manage Roles & Channel Overwrites',
    badge: 'Access Control',
    badgeClass: 'chip-purple',
    rationale: 'Required by the Discord API to modify channel permission overwrites (ACLs) when a room owner uses Lock, Unlock, Ghost, or Permit User.',
    securityImpact: 'Used strictly to adjust voice channel permission overrides. The bot never modifies or assigns server-wide administrative roles.'
  },
  {
    id: 'perm-move-members',
    number: 'Perm 3',
    name: 'Move Members',
    badge: 'Voice Routing',
    badgeClass: 'chip-amber',
    rationale: 'Instantly transfers users from the "Join to Create" generator channel into their freshly generated private voice room without latency.',
    securityImpact: 'Only acts on users who deliberately connect to the Hub, or when a room owner executes a kick command within their own room.'
  },
  {
    id: 'perm-send-messages',
    number: 'Perm 4',
    name: 'Send Messages & Embed Links',
    badge: 'Interactive UI',
    badgeClass: 'chip-blue',
    rationale: 'Used to deliver the interactive Control Panel, system notifications, and Looking for Members (LFM) alerts directly in the room chat.',
    securityImpact: 'Messages are strictly generated by system event handlers; the bot does not spam or message users unprompted.'
  }
];

export default function Privacy() {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (id: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/dashboard/voice/privacy#${id}`;
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredSections = PRIVACY_SECTIONS.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.bullets.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPermissions = PERMISSIONS_AUDIT.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.rationale.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.securityImpact.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="doc-page-container">
      {/* Hero Header */}
      <section className="doc-hero-section">
        <div className="doc-hero-glow" />

        <div className="doc-pill-badge doc-pill-purple">
          <Shield size={14} />
          Official Data Governance & Privacy Protocol
        </div>

        <h1 className="doc-hero-title">
          SyncInk Voice Privacy Policy & Data Transparency
        </h1>

        <p className="doc-hero-subtitle">
          We believe in radical data privacy and zero surveillance. Learn what minimal metadata we process, 
          why we need granular Discord permissions, and how your community data is protected.
        </p>

        {/* Quick Jump Action Pills */}
        <div className="doc-quick-actions">
          <a
            href="https://discord.gg/rB6gNZaK9u"
            target="_blank"
            rel="noopener noreferrer"
            className="doc-quick-pill doc-quick-pill-discord"
          >
            <span>Official Discord Support</span>
            <ExternalLink size={12} />
          </a>

          <a href="#zero-logging" className="doc-quick-pill doc-quick-pill-accent">
            <Lock size={13} />
            <span>Zero-Logging Guarantee</span>
          </a>

          <a href="#permissions" className="doc-quick-pill">
            <Eye size={13} />
            <span>Permissions Audit</span>
          </a>
        </div>

        {/* Live Search Input */}
        <div className="doc-search-wrapper">
          <Search size={15} className="doc-search-icon" />
          <input
            type="text"
            placeholder="Search privacy policies (e.g., zero logging, permissions, retention)..."
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

      {/* Section 1: Data Collection & Retention Architecture */}
      <section className="doc-section">
        <div className="doc-section-header">
          <div className="doc-section-title-wrap">
            <h2>
              <Database size={22} style={{ color: '#a855f7' }} />
              Data Collection & Retention Architecture
            </h2>
            <p>Full breakdown of stored configurations, ephemeral lifecycles, and cryptographic standards.</p>
          </div>
          <span className="doc-counter-badge">
            Showing {filteredSections.length} of {PRIVACY_SECTIONS.length} Sections
          </span>
        </div>

        <div className="doc-cards-grid">
          {filteredSections.map((sec) => (
            <div key={sec.id} id={sec.id} className="doc-card">
              <div className="doc-card-top">
                <div className="doc-card-title-wrap">
                  <span className="doc-num-badge">{sec.number}</span>
                  <h3 className="doc-card-title">{sec.title}</h3>
                </div>

                <div className="doc-card-actions">
                  <span className={`doc-status-chip ${sec.badgeClass}`}>
                    {sec.badge}
                  </span>
                  <button
                    onClick={() => handleCopyLink(sec.id)}
                    className="doc-copy-btn"
                    title="Copy direct anchor link"
                  >
                    {copiedId === sec.id ? (
                      <Check size={14} style={{ color: '#34d399' }} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>

              <p className="doc-card-desc">{sec.description}</p>

              <div className="doc-bullet-list">
                {sec.bullets.map((b, idx) => (
                  <div key={idx} className="doc-bullet-item">
                    <span className="doc-bullet-dot">•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="doc-meta-footer">
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Category:</span>
                  <span>{sec.meta.category}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Retention:</span>
                  <span style={{ color: '#cbd5e1' }}>{sec.meta.retention}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Protection:</span>
                  <span style={{ color: '#34d399' }}>{sec.meta.enforcement}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Granular Permissions Audit */}
      <section id="permissions" className="doc-section scroll-mt-20">
        <div className="doc-section-header">
          <div className="doc-section-title-wrap">
            <h2>
              <Layers size={22} style={{ color: '#06b6d4' }} />
              Granular Discord Permissions Audit
            </h2>
            <p>Every permission requested is bound to a specific runtime feature under least-privilege security.</p>
          </div>
          <span className="doc-counter-badge">
            Showing {filteredPermissions.length} of {PERMISSIONS_AUDIT.length} Permissions
          </span>
        </div>

        <div className="doc-cards-grid-2col">
          {filteredPermissions.map((perm) => (
            <div key={perm.id} id={perm.id} className="doc-card">
              <div className="doc-card-top">
                <div className="doc-card-title-wrap">
                  <span className="doc-num-badge">{perm.number}</span>
                  <h3 className="doc-card-title">{perm.name}</h3>
                </div>

                <div className="doc-card-actions">
                  <span className={`doc-status-chip ${perm.badgeClass}`}>
                    {perm.badge}
                  </span>
                  <button
                    onClick={() => handleCopyLink(perm.id)}
                    className="doc-copy-btn"
                    title="Copy link to permission"
                  >
                    {copiedId === perm.id ? (
                      <Check size={14} style={{ color: '#34d399' }} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>

              <p className="doc-card-desc">{perm.rationale}</p>

              <div className="doc-bullet-list">
                <div className="doc-bullet-item">
                  <CheckCircle2 size={15} style={{ color: '#06b6d4', flexShrink: 0, marginTop: 2 }} />
                  <span>{perm.securityImpact}</span>
                </div>
              </div>

              <div className="doc-meta-footer">
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Scope:</span>
                  <span>Voice Channels Only</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Administrator:</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>NOT REQUIRED</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Special Security & Erasure Notice Box */}
      <div className="doc-callout-box">
        <div className="doc-callout-content">
          <div className="doc-callout-badge">
            <Sparkles size={16} />
            <span>Radical Zero-Surveillance Promise</span>
          </div>
          <p className="doc-callout-text">
            SyncInk Voice is engineered from the ground up without audio pipelines or text logging hooks. 
            All voice traffic flows directly through Discord's encrypted voice servers (WebRTC). We never capture,
            transcribe, or intercept conversations.
          </p>
        </div>
        <a
          href="https://discord.gg/rB6gNZaK9u"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap' }}
        >
          Contact Security Officer
        </a>
      </div>

      {/* Support & Inquiries Box */}
      <section className="doc-support-box">
        <div className="doc-support-header">
          <div className="doc-support-icon">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              GDPR & CCPA Data Deletion Requests
            </h3>
            <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '3px 0 0' }}>
              Instant complete data eradication on request for server owners.
            </p>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
          If you remove SyncInk Voice from your Discord server and wish to permanently wipe all stored role toggles,
          channel templates, and server settings from our MongoDB Atlas clusters, open an official ticket in our{' '}
          <a
            href="https://discord.gg/rB6gNZaK9u"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'underline' }}
          >
            Discord Support Server
          </a>
          . All guild records will be permanently expunged within 24 hours.
        </p>
      </section>
    </div>
  );
}
