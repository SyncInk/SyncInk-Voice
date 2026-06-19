import { InfoBanner } from '../components/layout/InfoBanner';

export default function Guide() {
  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div className="page-title">Dashboard Guide</div>
      </div>

      <div className="guide-section">
        <div className="guide-section-title">🚀 Getting Started</div>
        <ul className="guide-list">
          <li>Run <code style={{ background:'var(--bg-elevated)', padding:'1px 6px', borderRadius:3, fontSize:12 }}>/setup</code> in your Discord server to create the Join to Create channel system</li>
          <li>Select your server from the dropdown selector in the sidebar on the left</li>
          <li>Navigate to <strong>Setup</strong> to create and manage your voice channel setups</li>
          <li>Configure server-wide feature toggles from the <strong>Server Toggles</strong> page</li>
          <li>Set up per-role permission overrides using the <strong>Role Toggles</strong> page</li>
        </ul>
      </div>

      <div className="guide-section">
        <div className="guide-section-title">🎙️ Voice Channel Features</div>
        <ul className="guide-list">
          <li><strong>Lock / Unlock</strong> — Prevent others from joining your channel or allow public access again</li>
          <li><strong>Claim</strong> — Take ownership of an empty channel whose owner has left</li>
          <li><strong>Ghost / Visible</strong> — Hide or show your channel from the server channel list</li>
          <li><strong>Transfer</strong> — Give your channel ownership to another member in the channel</li>
          <li><strong>Permit / Reject</strong> — Allow or block specific users from joining your channel</li>
          <li><strong>LFM</strong> — Post a Looking For Members announcement in the configured LFM channel</li>
          <li><strong>Text Channel</strong> — Create a private temporary text channel alongside your voice channel</li>
        </ul>
      </div>

      <div className="guide-section">
        <div className="guide-section-title">🔧 Troubleshooting</div>
        <ul className="guide-list">
          <li><strong>Bot shows offline:</strong> Check that Syncink Voice has been added to your server with all required permissions</li>
          <li><strong>Commands not working:</strong> Make sure you ran <code style={{ background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:3, fontSize:12 }}>/setup</code> and the bot has <em>Manage Channels</em> permission</li>
          <li><strong>No Join to Create channel:</strong> Run <code style={{ background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:3, fontSize:12 }}>/setup</code> again or check your server category permissions</li>
          <li><strong>Control panel not showing:</strong> Ensure the bot has permission to send messages in the voice-control channel</li>
          <li><strong>MongoDB connection error:</strong> If self-hosting, verify your MONGO_URI environment variable is set correctly in Railway</li>
        </ul>
      </div>

      <div className="guide-section">
        <div className="guide-section-title">❓ FAQ</div>
        <ul className="guide-list">
          <li><strong>Can I have multiple setups?</strong> Free servers are limited to 1 setup. Upgrade to Premium for unlimited setups.</li>
          <li><strong>Does the bot store my messages?</strong> No, Syncink Voice only stores server configuration settings, not message content.</li>
          <li><strong>Can I use the bot on multiple servers?</strong> Yes! Add the bot to as many servers as you want. Each server has its own independent settings.</li>
          <li><strong>What happens to my temporary channel when I leave?</strong> The channel is automatically deleted once it becomes empty.</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ fontWeight:700, fontSize:16, color:'var(--text-primary)', marginBottom:8 }}>Need more help?</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
          Join our support server to get help from the community and the Syncink Voice development team.
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-primary">Join Support Server</button>
          <button className="btn btn-secondary">Read Documentation</button>
        </div>
      </div>
    </div>
  );
}
