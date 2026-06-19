import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { Switch } from '../components/ui/Switch';
import { UnsavedBar } from '../components/ui/UnsavedBar';

interface Props { addToast: (type: 'success'|'error'|'warning'|'info', msg: string) => void; }

const mockChannels = ['#general', '#bot-commands', '#server-logs-voice', '#voice-control', '#announcements'];
const mockRoles = ['@everyone', '@Moderator', '@VIP', '@Member', '@Booster'];
const languages = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Russian'];

const loggingEvents = [
  'channelCreated', 'channelDeleted', 'ownershipTransfer', 'userMovement',
  'commandUsage', 'interfaceUsage', 'permissionChanges', 'channelRenamed',
  'channelLocked', 'channelUnlocked'
];
const loggingLabels: Record<string, string> = {
  channelCreated: 'Channel Created', channelDeleted: 'Channel Deleted',
  ownershipTransfer: 'Ownership Transfer', userMovement: 'User Movement',
  commandUsage: 'Command Usage', interfaceUsage: 'Interface Usage',
  permissionChanges: 'Permission Changes', channelRenamed: 'Channel Renamed',
  channelLocked: 'Channel Locked', channelUnlocked: 'Channel Unlocked',
};

const initial = {
  logChannelId: mockChannels[2], lfmChannelId: '', staffRoleId: mockRoles[1],
  memberRoleId: '', textChannelRoleId: '', joinRoleId: '', language: 'English',
  welcomeMessage: '',
  loggingEnabled: true,
  logging: Object.fromEntries(loggingEvents.map(e => [e, true])),
  autoTextChannel: false, autoDeleteEmpty: true, syncVoicePermissions: true, sendWelcomeMessage: false,
};

export default function Misc({ addToast }: Props) {
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);
  const hasChanges = JSON.stringify(saved) !== JSON.stringify(state);

  const set = (key: string, val: unknown) => setState(s => ({ ...s, [key]: val }));
  const setLog = (key: string, val: boolean) => setState(s => ({ ...s, logging: { ...s.logging, [key]: val } }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaved({ ...state });
    setSaving(false);
    addToast('success', 'Misc settings saved!');
  };

  const SelectField = ({ label, desc, value, onChange, options }: { label: string; desc: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-label">{label}</div>
          <div className="section-desc">{desc}</div>
        </div>
        <div className="select-wrapper" style={{ minWidth: 220 }}>
          <select className="select-input" value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Choose an option...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Misc Settings</div>
          <div className="page-subtitle">General bot configuration for this server</div>
        </div>
        <button className="btn btn-secondary" onClick={() => setState(saved)}>
          <RotateCcw size={14} /> Reset to Defaults
        </button>
      </div>

      <div className="card">
        <SelectField label="Log Channel" desc="The channel where all logs are sent" value={state.logChannelId} onChange={v => set('logChannelId', v)} options={mockChannels} />
        <SelectField label="LFM Channel" desc="The channel where Looking For Members posts are sent" value={state.lfmChannelId} onChange={v => set('lfmChannelId', v)} options={mockChannels} />
        <SelectField label="Staff Role" desc="The role that has staff permissions" value={state.staffRoleId} onChange={v => set('staffRoleId', v)} options={mockRoles} />
        <SelectField label="Server Language" desc="The language used for the bot responses in this server" value={state.language} onChange={v => set('language', v)} options={languages} />
        <SelectField label="Member Role" desc="Role used for permission adjustment" value={state.memberRoleId} onChange={v => set('memberRoleId', v)} options={mockRoles} />
        <SelectField label="Text Channel Access Role" desc="Role allowed to access temporary text channels" value={state.textChannelRoleId} onChange={v => set('textChannelRoleId', v)} options={mockRoles} />
        <SelectField label="Join Role" desc="Role automatically granted when joining a temporary channel" value={state.joinRoleId} onChange={v => set('joinRoleId', v)} options={mockRoles} />
        <div className="section" style={{ borderBottom: 'none' }}>
          <div className="section-label">Welcome Message</div>
          <div className="section-desc" style={{ marginBottom: 10 }}>Supports <code style={{ background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:3, fontSize:12 }}>{'{mention} {user} {username} {channel} {server}'}</code></div>
          <div style={{ position: 'relative' }}>
            <textarea className="textarea-field" maxLength={4000} rows={4} value={state.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)} placeholder="Welcome {mention} to {channel}! Enjoy your stay." />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>{state.welcomeMessage.length}/4000</div>
          </div>
        </div>
      </div>

      {/* Logging */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>Logging System</div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Choose which events to log</div>
          </div>
          <Switch checked={state.loggingEnabled} onChange={v => set('loggingEnabled', v)} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, opacity: state.loggingEnabled ? 1 : 0.4, pointerEvents: state.loggingEnabled ? 'all' : 'none' }}>
          {loggingEvents.map(e => (
            <div key={e} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--bg-input)', borderRadius:'var(--radius-sm)' }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{loggingLabels[e]}</span>
              <Switch checked={state.logging[e]} onChange={v => setLog(e, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Automation */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>Automation Settings</div>
        {[
          { key:'autoTextChannel', label:'Auto Text Channel', desc:'Automatically create text channels for each voice channel' },
          { key:'autoDeleteEmpty', label:'Auto Delete Empty Channels', desc:'Delete empty temporary channels automatically' },
          { key:'syncVoicePermissions', label:'Sync Voice Permissions', desc:'Sync text channel permissions with voice channel' },
          { key:'sendWelcomeMessage', label:'Send Welcome Message', desc:'Send the welcome message when users join' },
        ].map((item, i, arr) => (
          <div key={item.key} className="section" style={{ paddingTop: i===0?0:undefined, borderBottom: i===arr.length-1?'none':undefined }}>
            <div className="section-header">
              <div>
                <div className="section-label">{item.label}</div>
                <div className="section-desc">{item.desc}</div>
              </div>
              <Switch checked={(state as Record<string, unknown>)[item.key] as boolean} onChange={v => set(item.key, v)} />
            </div>
          </div>
        ))}
      </div>

      <UnsavedBar visible={hasChanges} onSave={handleSave} onReset={() => setState(saved)} saving={saving} />
    </div>
  );
}
