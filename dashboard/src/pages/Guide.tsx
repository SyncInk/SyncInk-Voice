import { useState } from 'react';
import { 
  BookOpen, 
  Wrench, 
  Mic2, 
  Sparkles, 
  Search, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap
} from 'lucide-react';

interface GuideItem {
  id: string;
  number: string;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  bullets: string[];
  meta: {
    category: string;
    requirement: string;
    target: string;
  };
}

const SETUP_STEPS: GuideItem[] = [
  {
    id: 'step-1-invite',
    number: 'Step 1',
    title: 'Invite SyncInk Voice & Position Bot Role',
    badge: 'Initial Setup',
    badgeClass: 'chip-blue',
    description: 'Add SyncInk Voice to your Discord server using the official invite link with the required least-privilege permission integer.',
    bullets: [
      'Ensure the bot is granted Manage Channels, Manage Roles, and Move Members permissions.',
      'In Discord Server Settings -> Roles, drag the "SyncInk Voice" role higher in the list than the general roles it will manage.',
      'Do not assign full Administrator privileges unless required by your organizational policy; our least-privilege scope is 100% sufficient.'
    ],
    meta: {
      category: 'Deployment',
      requirement: 'Manage Channels, Move Members',
      target: 'Server Settings'
    }
  },
  {
    id: 'step-2-setup-command',
    number: 'Step 2',
    title: 'Run /setup to Deploy the Join-to-Create Hub',
    badge: 'Core Engine',
    badgeClass: 'chip-emerald',
    description: 'Execute the automated provisioner command directly inside any text channel of your Discord server.',
    bullets: [
      'Type /setup in any channel where the bot has permission to post and press Enter.',
      'The bot automatically generates a designated category, a master "➕ Join to Create" voice hub, and the primary control channel.',
      'Members joining the "➕ Join to Create" hub are immediately moved into their freshly generated private room in under 150ms.'
    ],
    meta: {
      category: 'Slash Command',
      requirement: 'Staff / Moderator or Above',
      target: 'Guild Category & Hub'
    }
  },
  {
    id: 'step-3-server-toggles',
    number: 'Step 3',
    title: 'Select Server in Dashboard & Configure Toggles',
    badge: 'Web Dashboard',
    badgeClass: 'chip-purple',
    description: 'Log into this web dashboard via Discord OAuth2 to customize automated room naming templates and feature locks.',
    bullets: [
      'Click your server icon in the left sidebar selector to load active configuration documents.',
      'Navigate to the "Server Toggles" tab to configure room naming patterns (e.g., "{user}\'s Lounge" or "{game} Arena").',
      'Set server-wide defaults for default room bitrate, user limits, and whether companion text channels spawn automatically.'
    ],
    meta: {
      category: 'Configuration',
      requirement: 'Administrator / Whitelisted Role',
      target: 'Dashboard Controls'
    }
  },
  {
    id: 'step-4-role-overrides',
    number: 'Step 4',
    title: 'Configure Role-Based Permission Overrides',
    badge: 'Access Delegation',
    badgeClass: 'chip-amber',
    description: 'Grant or restrict specific channel capabilities per Discord role using the visual 3-state toggle matrix.',
    bullets: [
      'Open the "Role Toggles" page and select a role (e.g., @VIP, @Moderator, @Everyone).',
      'Toggle permissions for locking channels, changing channel bitrate, modifying user limits, or transferring ownership.',
      'Changes take effect instantly on live Discord voice rooms without requiring bot restarts.'
    ],
    meta: {
      category: 'Role Matrix',
      requirement: 'Server Owner / Admin',
      target: 'ACL Permission Matrix'
    }
  }
];

const ROOM_CONTROLS: GuideItem[] = [
  {
    id: 'ctrl-lock-unlock',
    number: 'Control 1',
    title: 'Channel Lock & Unlock ACL Shield',
    badge: 'Privacy Shield',
    badgeClass: 'chip-rose',
    description: 'Restricts channel entry to authorized members by toggling the Connect permission overwrite for @everyone.',
    bullets: [
      'Locking denies Connect for @everyone while maintaining existing users inside the call uninterrupted.',
      'Unlocking resets the channel overwrite so any server member can enter freely.',
      'Owners can still manually allow friends in via the Permit dropdown or /voice permit.'
    ],
    meta: {
      category: 'Access Overwrite',
      requirement: 'Room Owner',
      target: 'Channel Overwrite'
    }
  },
  {
    id: 'ctrl-ghost-unghost',
    number: 'Control 2',
    title: 'Ghost & Unghost (Stealth Mode)',
    badge: 'Channel Cloak',
    badgeClass: 'chip-cyan',
    description: 'Hides the voice channel completely from the Discord channel sidebar for non-permitted members.',
    bullets: [
      'Toggles View Channel permission overwrite for @everyone on the active voice channel.',
      'Hidden rooms remain visible only to members currently connected or explicitly permitted.',
      'Ideal for private staff meetings, gaming squads, or focused study sessions.'
    ],
    meta: {
      category: 'Visibility Overwrite',
      requirement: 'Room Owner',
      target: 'ViewChannel Overwrite'
    }
  },
  {
    id: 'ctrl-claim-transfer',
    number: 'Control 3',
    title: 'Claim & Transfer Room Ownership',
    badge: 'Ownership Sync',
    badgeClass: 'chip-purple',
    description: 'Allows room ownership handoffs or automatic succession when the original creator disconnects.',
    bullets: [
      'If the original room owner departs, any active participant can click "Claim" to assume master control of the room.',
      'Owners can intentionally hand off control to a friend via the Transfer menu or /voice transfer @user.',
      'Control panel buttons and dropdowns update dynamically to recognize the new room master.'
    ],
    meta: {
      category: 'State Transfer',
      requirement: 'Connected Participant',
      target: 'Room Master State'
    }
  },
  {
    id: 'ctrl-voice-status-lfm',
    number: 'Control 4',
    title: 'Voice Channel Status & LFM Announcements',
    badge: 'Community Pulse',
    badgeClass: 'chip-amber',
    description: 'Display custom status text directly under your voice channel in the Discord sidebar and broadcast for players.',
    bullets: [
      'Sets Discord native voice status text visible to the whole server without changing channel name.',
      'The LFM (Looking For Members) toggle broadcasts an announcement embed to server chat calling for teammates.',
      'Status text updates in real-time through the interactive modal.'
    ],
    meta: {
      category: 'Rich Presence',
      requirement: 'Room Owner',
      target: 'Voice Channel Status'
    }
  },
  {
    id: 'ctrl-companion-text',
    number: 'Control 5',
    title: 'Dynamic Companion Text Channels',
    badge: 'Ephemeral Chat',
    badgeClass: 'chip-emerald',
    description: 'Instant private text channel paired exclusively with your voice room for links, screenshots, and music commands.',
    bullets: [
      'Accessible solely to members currently inside that specific voice room.',
      'When the voice room empties, the companion text channel and all chat history are instantly purged.',
      'Ensures public channels remain uncluttered by gaming banter or media spam.'
    ],
    meta: {
      category: 'Text Companion',
      requirement: 'Room Owner',
      target: 'Dynamic Text Channel'
    }
  }
];

const TROUBLESHOOTING_ITEMS: GuideItem[] = [
  {
    id: 'diag-bot-offline',
    number: 'Diagnostic 1',
    title: 'Bot Shows Offline or Commands Not Responding',
    badge: 'Gateway Sync',
    badgeClass: 'chip-rose',
    description: 'Troubleshooting connectivity and permission roadblocks with Discord slash command dispatchers.',
    bullets: [
      'Confirm the bot is in your server and check our official /status page to rule out upstream Discord API incidents.',
      'Make sure SyncInk Voice has the Use Application Commands permission enabled for @everyone in the server.',
      'If slash commands do not autocomplete, kick and re-invite the bot using the official dashboard Invite link.'
    ],
    meta: {
      category: 'Connection',
      requirement: 'Check /status Page',
      target: 'Discord Gateway'
    }
  },
  {
    id: 'diag-hub-not-creating',
    number: 'Diagnostic 2',
    title: 'User Joins Hub but No Child Channel is Created',
    badge: 'Permissions Hierarchy',
    badgeClass: 'chip-amber',
    description: 'Resolving channel creation and member moving permission bottlenecks.',
    bullets: [
      'Verify that SyncInk Voice has Manage Channels and Move Members inside the Hub category.',
      'Check if the server channel limit (500 channels max per Discord server) has been reached.',
      'Ensure the category permissions allow SyncInk Voice to view and create voice channels.'
    ],
    meta: {
      category: 'Channel Engine',
      requirement: 'Manage Channels',
      target: 'Category ACL'
    }
  },
  {
    id: 'diag-panel-missing',
    number: 'Diagnostic 3',
    title: 'Control Panel Not Posting or Updating',
    badge: 'Message Dispatch',
    badgeClass: 'chip-blue',
    description: 'Ensuring interactive control panels display properly in room text channels.',
    bullets: [
      'The bot must possess Send Messages and Embed Links inside the created temporary channels.',
      'If Discord rate limits are triggered due to rapid clicking, buttons reset automatically after a brief cooldown.',
      'Run /voice panel to force-regenerate a fresh control panel if one was accidentally deleted by an admin.'
    ],
    meta: {
      category: 'Interactive UI',
      requirement: 'Embed Links, Send Messages',
      target: 'Channel Messages'
    }
  }
];

export default function Guide() {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (id: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/dashboard/voice/guide#${id}`;
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filterItems = (items: GuideItem[]) => {
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.bullets.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const filteredSteps = filterItems(SETUP_STEPS);
  const filteredControls = filterItems(ROOM_CONTROLS);
  const filteredTroubleshooting = filterItems(TROUBLESHOOTING_ITEMS);

  return (
    <div className="doc-page-container">
      {/* Hero Header */}
      <section className="doc-hero-section">
        <div className="doc-hero-glow" />

        <div className="doc-pill-badge doc-pill-purple">
          <BookOpen size={14} />
          Official Setup Guide & Architecture Manual
        </div>

        <h1 className="doc-hero-title">
          SyncInk Voice Setup & Configuration Playbook
        </h1>

        <p className="doc-hero-subtitle">
          Complete step-by-step documentation for deploying Join-to-Create hubs, configuring granular server toggles,
          mastering temporary voice channel controls, and running robust voice infrastructure.
        </p>

        {/* Quick Jump Action Pills */}
        <div className="doc-quick-actions">
          <a
            href="https://discord.gg/rB6gNZaK9u"
            target="_blank"
            rel="noopener noreferrer"
            className="doc-quick-pill doc-quick-pill-discord"
          >
            <span>Official Discord Support (#guides)</span>
            <ExternalLink size={12} />
          </a>

          <a href="#setup-sequence" className="doc-quick-pill doc-quick-pill-accent">
            <Zap size={13} />
            <span>Core Setup Sequence</span>
          </a>

          <a href="#voice-controls" className="doc-quick-pill">
            <Mic2 size={13} />
            <span>Voice Room Controls</span>
          </a>

          <a href="#troubleshooting" className="doc-quick-pill">
            <Wrench size={13} />
            <span>Troubleshooting Playbook</span>
          </a>
        </div>

        {/* Live Search Input */}
        <div className="doc-search-wrapper">
          <Search size={15} className="doc-search-icon" />
          <input
            type="text"
            placeholder="Search setup steps, commands, and guides by keyword..."
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

      {/* Section 1: Setup Sequence */}
      <section id="setup-sequence" className="doc-section scroll-mt-20">
        <div className="doc-section-header">
          <div className="doc-section-title-wrap">
            <h2>
              <Zap size={22} style={{ color: '#a855f7' }} />
              Quick-Start Deployment Sequence
            </h2>
            <p>From zero to fully functional temporary voice channels in under two minutes.</p>
          </div>
          <span className="doc-counter-badge">
            Showing {filteredSteps.length} of {SETUP_STEPS.length} Steps
          </span>
        </div>

        <div className="doc-cards-grid">
          {filteredSteps.map((step) => (
            <div key={step.id} id={step.id} className="doc-card">
              <div className="doc-card-top">
                <div className="doc-card-title-wrap">
                  <span className="doc-num-badge">{step.number}</span>
                  <h3 className="doc-card-title">{step.title}</h3>
                </div>

                <div className="doc-card-actions">
                  <span className={`doc-status-chip ${step.badgeClass}`}>
                    {step.badge}
                  </span>
                  <button
                    onClick={() => handleCopyLink(step.id)}
                    className="doc-copy-btn"
                    title="Copy step link"
                  >
                    {copiedId === step.id ? (
                      <Check size={14} style={{ color: '#34d399' }} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>

              <p className="doc-card-desc">{step.description}</p>

              <div className="doc-bullet-list">
                {step.bullets.map((b, idx) => (
                  <div key={idx} className="doc-bullet-item">
                    <span className="doc-bullet-dot">•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="doc-meta-footer">
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Category:</span>
                  <span>{step.meta.category}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Permissions:</span>
                  <span style={{ color: '#cbd5e1' }}>{step.meta.requirement}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Target:</span>
                  <span style={{ color: '#c4b5fd' }}>{step.meta.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Room Controls */}
      <section id="voice-controls" className="doc-section scroll-mt-20">
        <div className="doc-section-header">
          <div className="doc-section-title-wrap">
            <h2>
              <Mic2 size={22} style={{ color: '#06b6d4' }} />
              Temporary Voice Channel Controls
            </h2>
            <p>Every feature available to room creators in the interactive Control Panel and slash commands.</p>
          </div>
          <span className="doc-counter-badge">
            Showing {filteredControls.length} of {ROOM_CONTROLS.length} Controls
          </span>
        </div>

        <div className="doc-cards-grid">
          {filteredControls.map((ctrl) => (
            <div key={ctrl.id} id={ctrl.id} className="doc-card">
              <div className="doc-card-top">
                <div className="doc-card-title-wrap">
                  <span className="doc-num-badge">{ctrl.number}</span>
                  <h3 className="doc-card-title">{ctrl.title}</h3>
                </div>

                <div className="doc-card-actions">
                  <span className={`doc-status-chip ${ctrl.badgeClass}`}>
                    {ctrl.badge}
                  </span>
                  <button
                    onClick={() => handleCopyLink(ctrl.id)}
                    className="doc-copy-btn"
                    title="Copy control link"
                  >
                    {copiedId === ctrl.id ? (
                      <Check size={14} style={{ color: '#34d399' }} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>

              <p className="doc-card-desc">{ctrl.description}</p>

              <div className="doc-bullet-list">
                {ctrl.bullets.map((b, idx) => (
                  <div key={idx} className="doc-bullet-item">
                    <span className="doc-bullet-dot doc-bullet-dot-cyan">•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="doc-meta-footer">
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Mechanism:</span>
                  <span>{ctrl.meta.category}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Authority:</span>
                  <span style={{ color: '#cbd5e1' }}>{ctrl.meta.requirement}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Target Scope:</span>
                  <span style={{ color: '#67e8f9' }}>{ctrl.meta.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Diagnostic Playbook */}
      <section id="troubleshooting" className="doc-section scroll-mt-20">
        <div className="doc-section-header">
          <div className="doc-section-title-wrap">
            <h2>
              <Wrench size={22} style={{ color: '#f59e0b' }} />
              Diagnostic & Troubleshooting Playbook
            </h2>
            <p>Immediate steps to diagnose and resolve permission snags and Discord API edge cases.</p>
          </div>
          <span className="doc-counter-badge">
            Showing {filteredTroubleshooting.length} of {TROUBLESHOOTING_ITEMS.length} Diagnostics
          </span>
        </div>

        <div className="doc-cards-grid">
          {filteredTroubleshooting.map((diag) => (
            <div key={diag.id} id={diag.id} className="doc-card">
              <div className="doc-card-top">
                <div className="doc-card-title-wrap">
                  <span className="doc-num-badge">{diag.number}</span>
                  <h3 className="doc-card-title">{diag.title}</h3>
                </div>

                <div className="doc-card-actions">
                  <span className={`doc-status-chip ${diag.badgeClass}`}>
                    {diag.badge}
                  </span>
                  <button
                    onClick={() => handleCopyLink(diag.id)}
                    className="doc-copy-btn"
                    title="Copy diagnostic link"
                  >
                    {copiedId === diag.id ? (
                      <Check size={14} style={{ color: '#34d399' }} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>

              <p className="doc-card-desc">{diag.description}</p>

              <div className="doc-bullet-list">
                {diag.bullets.map((b, idx) => (
                  <div key={idx} className="doc-bullet-item">
                    <span className="doc-bullet-dot" style={{ color: '#f59e0b' }}>•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="doc-meta-footer">
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Category:</span>
                  <span>{diag.meta.category}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Recommendation:</span>
                  <span style={{ color: '#fcd34d' }}>{diag.meta.requirement}</span>
                </div>
                <div className="doc-meta-item">
                  <span className="doc-meta-label">Layer:</span>
                  <span style={{ color: '#cbd5e1' }}>{diag.meta.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Special Support & Help Callout */}
      <div className="doc-callout-box">
        <div className="doc-callout-content">
          <div className="doc-callout-badge">
            <Sparkles size={16} />
            <span>Need Custom Setup Guidance for Large Servers?</span>
          </div>
          <p className="doc-callout-text">
            For community servers with thousands of members, custom role architectures, or multi-hub configurations,
            our engineering team can provide tailored setup reviews inside our Discord support server.
          </p>
        </div>
        <a
          href="https://discord.gg/rB6gNZaK9u"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap' }}
        >
          Get Setup Assistance
        </a>
      </div>
    </div>
  );
}
