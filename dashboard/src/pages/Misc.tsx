import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { Switch } from '../components/ui/Switch';
import { UnsavedBar } from '../components/ui/UnsavedBar';

interface Props { 
  guildId: string | null;
  addToast: (type: 'success'|'error'|'warning'|'info', msg: string) => void; 
}

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
  loggingChannelId: '',
  loggingEnabled: true,
  loggingEvents: Object.fromEntries(loggingEvents.map(e => [e, true])),
};

export default function Misc({ guildId, addToast }: Props) {
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [textChannels, setTextChannels] = useState<{id: string; name: string}[]>([]);

  const hasChanges = JSON.stringify(saved) !== JSON.stringify(state);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }).then(res => res.json()),
      fetch(`/api/guilds/${guildId}/logging`, { credentials: 'include' }).then(res => res.json())
    ]).then(([channelsData, loggingData]) => {
      setTextChannels(channelsData.text || []);
      
      const loadedState = {
        loggingChannelId: loggingData.loggingChannelId || '',
        loggingEnabled: !!loggingData.loggingChannelId,
        loggingEvents: { ...initial.loggingEvents, ...(loggingData.loggingEvents || {}) },
      };
      
      setSaved(loadedState);
      setState(loadedState);
      setLoading(false);
    }).catch(() => {
      addToast('error', 'Failed to load settings.');
      setLoading(false);
    });
  }, [guildId, addToast]);

  const setLogEvent = (key: string, val: boolean) => setState(s => ({ ...s, loggingEvents: { ...s.loggingEvents, [key]: val } }));

  const handleSave = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/logging`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          loggingChannelId: state.loggingEnabled ? state.loggingChannelId : '',
          loggingEvents: state.loggingEvents,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved({ ...state, loggingChannelId: state.loggingEnabled ? state.loggingChannelId : '' });
      addToast('success', 'Logging settings saved successfully!');
    } catch {
      addToast('error', 'Failed to save logging settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading settings...</div>;
  }

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Logging Settings</div>
          <div className="page-subtitle">Configure which events are logged for this server</div>
        </div>
        <button className="btn btn-secondary" onClick={() => setState(saved)}>
          <RotateCcw size={14} /> Reset to Defaults
        </button>
      </div>

      <div className="card">
        <div className="section" style={{ borderBottom: 'none' }}>
          <div className="section-header">
            <div>
              <div className="section-label">Log Channel</div>
              <div className="section-desc">The channel where all audit logs are sent</div>
            </div>
            <div className="select-wrapper" style={{ minWidth: 220 }}>
              <select 
                className="select-input" 
                value={state.loggingChannelId} 
                onChange={e => setState(s => ({ ...s, loggingChannelId: e.target.value }))}
                disabled={!state.loggingEnabled}
              >
                <option value="">No Log Channel Selected</option>
                {textChannels.map(c => <option key={c.id} value={c.id}># {c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>Logging System</div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Enable or disable the entire logging system</div>
          </div>
          <Switch checked={state.loggingEnabled} onChange={v => setState(s => ({...s, loggingEnabled: v}))} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, opacity: state.loggingEnabled ? 1 : 0.4, pointerEvents: state.loggingEnabled ? 'all' : 'none' }}>
          {loggingEvents.map(e => (
            <div key={e} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--bg-input)', borderRadius:'var(--radius-sm)' }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{loggingLabels[e]}</span>
              <Switch checked={state.loggingEvents[e as keyof typeof state.loggingEvents] as boolean} onChange={v => setLogEvent(e, v)} />
            </div>
          ))}
        </div>
      </div>

      <UnsavedBar visible={hasChanges} onSave={handleSave} onReset={() => setState(saved)} saving={saving} />
    </div>
  );
}
