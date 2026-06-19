import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { ThreeToggle } from '../components/ui/ThreeToggle';
import { UnsavedBar } from '../components/ui/UnsavedBar';
import type { ToggleState } from '../types';

interface Props { addToast: (type: 'success'|'error'|'warning'|'info', msg: string) => void; }

const features: { key: string; label: string; desc: string }[] = [
  { key: 'channelName', label: 'Channel Name', desc: 'Allow users to change their channel name' },
  { key: 'userLimit', label: 'User Limit', desc: 'Set user limits for voice channels' },
  { key: 'channelStatus', label: 'Channel Status', desc: 'Enable channel status messages' },
  { key: 'channelLock', label: 'Channel Lock', desc: 'Allow locking and unlocking channels' },
  { key: 'channelClaim', label: 'Channel Claim', desc: 'Allow users to claim unowned channels' },
  { key: 'rejectUsers', label: 'Reject Users', desc: 'Allow rejecting users from channels' },
  { key: 'permitUsers', label: 'Permit Users', desc: 'Allow permitting users to join channels' },
  { key: 'ghostMode', label: 'Ghost Mode', desc: 'Allow hiding channels from the channel list' },
  { key: 'lfmSystem', label: 'LFM System', desc: 'Looking For Members posting system' },
  { key: 'textChannel', label: 'Text Channel', desc: 'Create temporary text channels' },
  { key: 'bitrateControl', label: 'Bitrate Control', desc: 'Adjust channel audio bitrate' },
  { key: 'inviteControl', label: 'Invite Control', desc: 'Create invite links for channels' },
  { key: 'nsfwToggle', label: 'NSFW Toggle', desc: 'Mark channels as NSFW' },
  { key: 'regionControl', label: 'Region Control', desc: 'Change voice channel RTC region' },
  { key: 'channelTransfer', label: 'Channel Transfer', desc: 'Transfer channel ownership to another user' },
  { key: 'channelRequest', label: 'Channel Request', desc: 'Request to join private channels' },
];

const defaults = Object.fromEntries(features.map(f => [f.key, 'enabled' as ToggleState])) as Record<string, ToggleState>;

export default function ServerToggles({ addToast }: Props) {
  const [saved, setSaved] = useState(defaults);
  const [toggles, setToggles] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const hasChanges = JSON.stringify(saved) !== JSON.stringify(toggles);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaved({ ...toggles });
    setSaving(false);
    addToast('success', 'Server toggles saved!');
  };

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Server Feature Toggles</div>
          <div className="page-subtitle">Configure which features are available in your server</div>
        </div>
        <button className="btn btn-secondary" onClick={() => setToggles(defaults)}>
          <RotateCcw size={14} /> Reset to Defaults
        </button>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Server toggles apply to all setups in your server by default. Settings can be overridden by setup-specific toggles or role-based toggles.
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Priority Order: Role Toggles → Setup Toggles → Server Toggles</div>
      </div>

      <div className="card">
        {features.map((f, i) => (
          <div key={f.key} className="section" style={i === 0 ? { paddingTop: 0 } : {}}>
            <div className="section-header">
              <div>
                <div className="section-label">{f.label}</div>
                <div className="section-desc">{f.desc}</div>
              </div>
              <ThreeToggle value={toggles[f.key]} onChange={v => setToggles(t => ({ ...t, [f.key]: v }))} />
            </div>
          </div>
        ))}
      </div>
      <UnsavedBar visible={hasChanges} onSave={handleSave} onReset={() => setToggles(saved)} saving={saving} />
    </div>
  );
}
