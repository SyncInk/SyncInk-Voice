import { useState } from 'react';
import { 
  FileText, 
  Shield, 
  AlertTriangle, 
  Search, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Scale, 
  Lock, 
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TermItem {
  id: string;
  number: string;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  bullets: string[];
  meta: {
    category: string;
    enforcement: string;
    target: string;
  };
}

const TERMS: TermItem[] = [
  {
    id: 'acceptance',
    number: 'Term 1',
    title: 'Acceptance of Terms & Binding Agreement',
    badge: 'Binding Agreement',
    badgeClass: 'chip-blue',
    description: 'By inviting SyncInk Voice to your Discord guild, accessing our web dashboard, or utilizing bot slash commands, you explicitly agree to be legally bound by these Terms of Service.',
    bullets: [
      'If you disagree with any provision contained herein, you must immediately remove the bot from your guild and cease accessing this dashboard.',
      'You represent and warrant that you possess the necessary administrative authority within your Discord server to install applications and bind your community.',
      'Usage of SyncInk Voice must at all times remain compliant with Discord’s official Developer Terms of Service and Community Guidelines.'
    ],
    meta: {
      category: 'Legal Precedent',
      enforcement: 'Immediate Disqualification',
      target: 'All Guild Admins & Members'
    }
  },
  {
    id: 'use-of-service',
    number: 'Term 2',
    title: 'Permitted Use & Anti-Abuse Standards',
    badge: 'Zero Abuse Policy',
    badgeClass: 'chip-rose',
    description: 'SyncInk Voice provides dynamic voice infrastructure intended exclusively for lawful, constructive community communication.',
    bullets: [
      'Prohibited: Attempting to crash bot gateway sockets, flooding channel creation endpoints via macros, abusing rate limits, or exploiting bugs.',
      'Prohibited: Utilizing temporary room naming features to display hate speech, discriminatory slurs, sexual solicitation, doxed information, or illegal content.',
      'Prohibited: Reverse-engineering API routes, scraping private guild configurations, or launching denial-of-service attacks against our cluster infrastructure.'
    ],
    meta: {
      category: 'Acceptable Use',
      enforcement: 'Global API Blacklist',
      target: 'Platform-Wide'
    }
  },
  {
    id: 'service-availability',
    number: 'Term 3',
    title: 'Service Availability, Reliability & 99.9% Target Uptime',
    badge: 'Infrastructure Target',
    badgeClass: 'chip-emerald',
    description: 'We continuously maintain multi-region infrastructure to ensure uninterrupted voice hub provisioning and seamless dashboard responsiveness.',
    bullets: [
      'While we target 99.9% uptime, we do not guarantee uninterrupted, error-free operation during upstream Discord API outages or major infrastructure maintenance.',
      'SyncInk Voice reserves the right to deploy hotfixes, rolling cluster updates, or scheduled database maintenance without prior written notice.',
      'Scheduled downtime announcements and real-time status updates are posted on our official Status page and Support Server.'
    ],
    meta: {
      category: 'Service Level',
      enforcement: 'High-Availability Cluster',
      target: 'Cloud Infrastructure'
    }
  },
  {
    id: 'termination',
    number: 'Term 4',
    title: 'Sanctions, Blacklisting & Account Termination',
    badge: 'Automated Defense',
    badgeClass: 'chip-amber',
    description: 'SyncInk operates an automated defense shield alongside manual human moderation to protect our shared cloud resources.',
    bullets: [
      'We reserve the exclusive right to immediately terminate, revoke, or permanently blacklist any user or Discord guild from using SyncInk Voice without prior warning.',
      'Severe infractions (such as raiding with channel spam, attempting DDoS attacks, or exploiting zero-day bugs) result in an irreversible global network ban.',
      'Blacklisted entities lose all access to dashboard controls and temporary room generation across all mutual servers.'
    ],
    meta: {
      category: 'Compliance Enforcement',
      enforcement: 'Network-Wide Blacklist',
      target: 'Hostile Entities'
    }
  },
  {
    id: 'ip-copyright',
    number: 'Term 5',
    title: 'Exclusive Intellectual Property & UI Copyright',
    badge: 'Protected Assets',
    badgeClass: 'chip-purple',
    description: 'The "SyncInk Voice" name, custom UI layouts, visual designs, control panel architecture, logos, and codebases are the exclusive intellectual property of SyncInk.',
    bullets: [
      'Unauthorized copying, public distribution, commercial imitation, or pixel-by-pixel cloning of our dashboard interface is strictly prohibited.',
      'You may not replicate our visual design, custom components, or brand identity to mislead consumers or launch competing bot services.',
      'All proprietary software algorithms and bot management architectures remain protected under international copyright and intellectual property legislation.'
    ],
    meta: {
      category: 'Intellectual Property',
      enforcement: 'DMCA & Legal Sanctions',
      target: 'Proprietary Assets'
    }
  },
  {
    id: 'liability',
    number: 'Term 6',
    title: 'Limitation of Liability & Warranty Disclaimers',
    badge: 'As-Is Provision',
    badgeClass: 'chip-cyan',
    description: 'SyncInk Voice is provided on an "as is" and "as available" basis without express or implied warranties of any kind.',
    bullets: [
      'In no event shall SyncInk, its developers, or infrastructure operators be liable for indirect, incidental, punitive, or consequential damages.',
      'We are not liable for accidental server misconfigurations made by guild staff, channel deletions caused by human error, or Discord permission conflicts.',
      'Guild owners remain solely responsible for the management and oversight of their server members inside temporary voice rooms.'
    ],
    meta: {
      category: 'Legal Disclaimer',
      enforcement: 'Full Disclaimers Apply',
      target: 'All Operations'
    }
  },
  {
    id: 'modifications',
    number: 'Term 7',
    title: 'Policy Evolution, Notifications & Continuous Updates',
    badge: 'Active Protocol',
    badgeClass: 'chip-blue',
    description: 'We reserve the right to revise, update, or expand these Terms of Service periodically to reflect platform enhancements and legal standards.',
    bullets: [
      'Significant alterations to these Terms will be announced in our official Discord Support Server in the announcements channel.',
      'Your continued use of SyncInk Voice following posted changes constitutes full legal acceptance of the updated terms.',
      'The date of the most recent revision will always be clearly visible at the top of this documentation page.'
    ],
    meta: {
      category: 'Version Control',
      enforcement: 'Continuous Compliance',
      target: 'All Active Users'
    }
  }
];

export default function Terms() {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (id: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/dashboard/voice/terms#${id}`;
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredTerms = TERMS.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.bullets.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="doc-page-container">
      {/* Hero Header */}
      <section className="doc-hero-section">
        <div className="doc-hero-glow" />

        <div className="doc-pill-badge doc-pill-purple">
          <FileText size={14} />
          Official Legal Terms & Service Policies
        </div>

        <h1 className="doc-hero-title">
          SyncInk Voice Terms of Service & Compliance
        </h1>

        <p className="doc-hero-subtitle">
          Please review the binding conditions and community standards governing your use of the SyncInk Voice
          Discord bot, web dashboard, and cloud synchronization tools across your servers.
        </p>

        {/* Quick Action Pills */}
        <div className="doc-quick-actions">
          <a
            href="https://discord.gg/rB6gNZaK9u"
            target="_blank"
            rel="noopener noreferrer"
            className="doc-quick-pill doc-quick-pill-discord"
          >
            <span>Official Discord Support (#tickets)</span>
            <ExternalLink size={12} />
          </a>

          <a href="#use-of-service" className="doc-quick-pill doc-quick-pill-accent">
            <Shield size={13} />
            <span>Jump to Anti-Abuse Policy</span>
          </a>

          <a href="#ip-copyright" className="doc-quick-pill">
            <Lock size={13} />
            <span>Intellectual Property</span>
          </a>

          <Link to="/privacy" className="doc-quick-pill">
            <span>View Privacy Policy</span>
          </Link>
        </div>

        {/* Live Search Input */}
        <div className="doc-search-wrapper">
          <Search size={15} className="doc-search-icon" />
          <input
            type="text"
            placeholder="Search terms of service (e.g., copyright, termination, uptime, abuse)..."
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

      {/* Main Terms Section */}
      <section className="doc-section">
        <div className="doc-section-header">
          <div className="doc-section-title-wrap">
            <h2>
              <Scale size={22} style={{ color: '#a855f7' }} />
              Platform Terms of Use & Obligations
            </h2>
            <p>Official guidelines governing all interactions with our bot and web services.</p>
          </div>
          <span className="doc-counter-badge">
            Showing {filteredTerms.length} of {TERMS.length} Terms
          </span>
        </div>

        <div className="doc-cards-grid">
          {filteredTerms.map((term) => (
            <div key={term.id} id={term.id} className="doc-card">
              <div className="doc-card-top">
                <div className="doc-card-title-wrap">
                  <span className="doc-num-badge">{term.number}</span>
                  <h3 className="doc-card-title">{term.title}</h3>
                </div>

                <div className="doc-card-actions">
                  <span className={`doc-status-chip ${term.badgeClass}`}>
                    {term.badge}
                  </span>
                  <button
                    onClick={() => handleCopyLink(term.id)}
                    className="doc-copy-btn"
                    title="Copy direct anchor link"
                  >
                    {copiedId === term.id ? (
                      <Check size={14} style={{ color: '#34d399' }} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>

              <p className="doc-card-desc">{term.description}</p>

              <div className="doc-bullet-list">
                {term.bullets.map((b, idx) => (
                  <div key={idx} className="doc-bullet-item">
                    <span className="doc-bullet-dot">•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="doc-meta-footer">
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Category:</span>
                  <span>{term.meta.category}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Enforcement:</span>
                  <span style={{ color: '#fda4af' }}>{term.meta.enforcement}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Applies To:</span>
                  <span>{term.meta.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Special Copyright & IP Protection Callout Banner */}
      <div className="doc-callout-box">
        <div className="doc-callout-content">
          <div className="doc-callout-badge">
            <Sparkles size={16} />
            <span>Proprietary Visual Design & Copyright Notice</span>
          </div>
          <p className="doc-callout-text">
            SyncInk Voice's unique dashboard layout, custom color palettes, and interactive voice control
            interfaces are protected under copyright. Imitating or redistributing our frontend designs without written
            authorization is actionable under international intellectual property law.
          </p>
        </div>
        <a
          href="https://discord.gg/rB6gNZaK9u"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap' }}
        >
          Legal Inquiries
        </a>
      </div>

      {/* Moderation Appeals & Inquiries Card */}
      <section className="doc-support-box">
        <div className="doc-support-header">
          <div className="doc-support-icon">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              How Sanctions, Blacklists & Appeals Work
            </h3>
            <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '3px 0 0' }}>
              All enforcement actions are logged with immutable audit records.
            </p>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
          If you believe your server or user ID was blacklisted or sanctioned mistakenly:
        </p>

        <ol style={{ paddingLeft: 20, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: '#cbd5e1' }}>
          <li>
            Join our official Discord server at{' '}
            <a
              href="https://discord.gg/rB6gNZaK9u"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'underline' }}
            >
              https://discord.gg/rB6gNZaK9u
            </a>
            .
          </li>
          <li>Navigate to the <span style={{ color: '#ffffff', fontWeight: 600 }}># 🎟️・create-ticket</span> channel.</li>
          <li>Open an <span style={{ color: '#ffffff', fontWeight: 600 }}>Appeal & Blacklist Inquiry</span> ticket with your Guild or User ID.</li>
          <li>A senior administrator will inspect the server telemetry logs and deliver a formal review.</li>
        </ol>
      </section>
    </div>
  );
}
