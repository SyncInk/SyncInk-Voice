import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { Switch } from '../components/ui/Switch';
import { UnsavedBar } from '../components/ui/UnsavedBar';

interface Props { addToast: (type: 'success'|'error'|'warning'|'info', msg: string) => void; }

const initial = {
  channelName: "{user}'s Room",
  channelStatus: '',
  channelLimit: 0,
  channelBitrate: 64,
  channelRegion: 'auto',
  channelNsfw: false,
  channelLock: false,
  channelGhost: false,
  textChannel: false,
};

const regions = ['Automatic', 'US East', 'US West', 'Brazil', 'Europe', 'India', 'Singapore', 'Japan'];

export default function GlobalProfile({ addToast }: Props) {
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);
  const hasChanges = JSON.stringify(saved) !== JSON.stringify(state);

  const set = <K extends keyof typeof initial>(key: K, val: typeof initial[K]) =>
    setState(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaved({ ...state });
    setSaving(false);
    addToast('success', 'Global profile saved!');
  };

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Global Profile</div>
          <div className="page-subtitle">Default settings applied when you create a temporary voice channel</div>
        </div>
        <button className="btn btn-secondary" onClick={() => setState(initial)}>
          <RotateCcw size={14} /> Reset to Defaults
        </button>
      </div>

      <div className="card">
        {/* Channel Name */}
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="section-label">Channel Name</div>
          <div className="section-desc" style={{ marginBottom: 10 }}>Upon creating a channel, the bot will automatically set the channel name to this value.</div>
          <div className="input-with-counter">
            <input className="input-field" style={{ paddingRight: 50 }} maxLength={32} value={state.channelName}
              onChange={e => set('channelName', e.target.value)} placeholder="{user}'s Room" />
            <span className="input-counter">{state.channelName.length}/32</span>
          </div>
        </div>

        {/* Channel Status */}
        <div className="section">
          <div className="section-label">Channel Status</div>
          <div className="section-desc" style={{ marginBottom: 10 }}>Upon creating a channel, your channel status will be set to this value.</div>
          <div className="input-with-counter">
            <input className="input-field" style={{ paddingRight: 60 }} maxLength={500} value={state.channelStatus}
              onChange={e => set('channelStatus', e.target.value)} placeholder="Channel Status" />
            <span className="input-counter">{state.channelStatus.length}/500</span>
          </div>
        </div>

        {/* Channel Limit */}
        <div className="section">
          <div className="section-label">Channel Limit</div>
          <div className="section-desc">User limit (0 = unlimited)</div>
          <div className="slider-wrapper">
            <div className="slider-value">{state.channelLimit === 0 ? 'Unlimited' : state.channelLimit}</div>
            <input type="range" min={0} max={99} value={state.channelLimit}
              onChange={e => set('channelLimit', Number(e.target.value))}
              style={{ accentColor: 'var(--primary)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              <span>0</span><span>99</span>
            </div>
          </div>
        </div>

        {/* Channel Bitrate */}
        <div className="section">
          <div className="section-label">Channel Bitrate</div>
          <div className="section-desc">Set the bitrate for your channel.</div>
          <div className="slider-wrapper">
            <div className="slider-value">{state.channelBitrate} kbps</div>
            <input type="range" min={8} max={384} value={state.channelBitrate}
              onChange={e => set('channelBitrate', Number(e.target.value))}
              style={{ accentColor: 'var(--primary)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              <span>8 kbps</span><span>384 kbps</span>
            </div>
          </div>
        </div>

        {/* Channel Region */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label">Channel Region</div>
              <div className="section-desc">Set the RTC region for your channel</div>
            </div>
            <div className="select-wrapper" style={{ minWidth: 180 }}>
              <select className="select-input" value={state.channelRegion} onChange={e => set('channelRegion', e.target.value)}>
                {regions.map(r => <option key={r} value={r.toLowerCase().replace(' ', '-')}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Toggles */}
        {[
          { key: 'channelNsfw' as const, label: 'Channel NSFW', desc: 'Automatically mark your channel as NSFW' },
          { key: 'channelLock' as const, label: 'Channel Lock', desc: 'Automatically lock your channel on creation' },
          { key: 'channelGhost' as const, label: 'Channel Ghost', desc: 'Automatically hide your channel from the channel list' },
          { key: 'textChannel' as const, label: 'Text Channel', desc: 'Automatically create a temporary text channel' },
        ].map((item, i, arr) => (
          <div key={item.key} className="section" style={{ borderBottom: i===arr.length-1?'none':undefined }}>
            <div className="section-header">
              <div>
                <div className="section-label">{item.label}</div>
                <div className="section-desc">{item.desc}</div>
              </div>
              <Switch checked={state[item.key]} onChange={v => set(item.key, v)} />
            </div>
          </div>
        ))}
      </div>

      <UnsavedBar visible={hasChanges} onSave={handleSave} onReset={() => setState(saved)} saving={saving} />
    </div>
  );
}
