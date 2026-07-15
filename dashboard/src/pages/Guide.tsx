import { InfoBanner } from '../components/layout/InfoBanner';

export default function Guide() {
  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div className="page-title">Dashboard Guide</div>
      </div>

      <div className="guide-section">
        <div className="guide-section-title">🚀 Getting Started</div>
        <ul className="guide-list">
          <li>Add <strong>Syncink Voice</strong> to your server and make sure it has <strong>Manage Channels</strong> permission</li>
          <li>Run the <code style={{ background:'var(--bg-elevated)', padding:'1px 6px', borderRadius:3, fontSize:12 }}>/setup</code> command in your server to create the Join-to-Create system</li>
          <li>Select your server from the dropdown in the sidebar on the left</li>
          <li>Configure server-wide feature toggles from the <strong>Server Toggles</strong> page</li>
          <li>Set up per-role permission overrides using the <strong>Role Toggles</strong> page</li>
        </ul>
      </div>

      <div className="guide-section">
        <div className="guide-section-title">🎙️ Voice Channel Features</div>
        <ul className="guide-list">
          <li><strong>Lock / Unlock</strong> — Prevent others from joining your channel or allow public access again</li>
          <li><strong>Claim</strong> — Take ownership of an empty channel whose owner has left</li>
          <li><strong>Ghost / Unghost</strong> — Hide or show your channel from the server channel list</li>
          <li><strong>Transfer</strong> — Give your channel ownership to another member in the channel</li>
          <li><strong>Permit / Reject</strong> — Allow or block specific users from joining your channel</li>
          <li><strong>Status</strong> — Set a custom status shown under your voice channel name</li>
          <li><strong>LFM</strong> — Post a Looking For Members announcement</li>
          <li><strong>Text Channel</strong> — Create a private temporary text channel alongside your voice channel</li>
        </ul>
      </div>

      <div className="guide-section">
        <div className="guide-section-title">🔧 Troubleshooting</div>
        <ul className="guide-list">
          <li><strong>Bot shows offline:</strong> Check that Syncink Voice has been added to your server with all required permissions</li>
          <li><strong>Commands not working:</strong> Make sure the bot has <em>Manage Channels</em> and <em>Send Messages</em> permissions, then try again</li>
          <li><strong>No Join to Create channel:</strong> Run <code style={{ background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:3, fontSize:12 }}>/setup</code> again. Make sure the bot can create channels in your server</li>
          <li><strong>Control panel not showing:</strong> Make sure the bot has permission to send messages and embed links in your channels</li>
        </ul>
      </div>

      <div className="guide-section">
        <div className="guide-section-title">❓ FAQ</div>
        <ul className="guide-list">
          <li><strong>Is Syncink Voice free?</strong> Yes! Syncink Voice is completely free for all servers with no limits.</li>
          <li><strong>Does the bot store my messages?</strong> No, Syncink Voice only stores server configuration settings, not message content.</li>
          <li><strong>Can I use the bot on multiple servers?</strong> Yes! Add the bot to as many servers as you want. Each server has independent settings.</li>
          <li><strong>What happens to my channel when I leave?</strong> The channel is automatically deleted once it becomes empty.</li>
          <li><strong>Can I rename my channel?</strong> Yes! Use the Name option in the control panel dropdown menu or use <code style={{ background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:3, fontSize:12 }}>/voice rename</code>.</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ fontWeight:700, fontSize:16, color:'var(--text-primary)', marginBottom:8 }}>Need more help?</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
          Contact the Syncink Voice team directly through our website.
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <a href="https://discord.gg/uuVzD5ky4y" target="_blank" rel="noopener noreferrer">
            <button className="btn btn-primary">Contact Support</button>
          </a>
          <a href="https://syncink.github.io/syncink-portfolio/" target="_blank" rel="noopener noreferrer">
            <button className="btn btn-secondary">Visit Website</button>
          </a>
        </div>
      </div>
    </div>
  );
}
