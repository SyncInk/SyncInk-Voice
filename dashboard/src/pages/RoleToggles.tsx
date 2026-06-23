import { useState, useEffect } from 'react';
import { Shield, X, Plus } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { ThreeToggle } from '../components/ui/ThreeToggle';
import { UnsavedBar } from '../components/ui/UnsavedBar';
import type { ToggleState } from '../types';
import { fetchJsonWithRetry } from '../api';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  guildId: string | null;
  permLevel?: string;
  addToast: (type: 'success'|'error'|'warning'|'info', msg: string) => void;
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
  isOrphaned?: boolean;
}

const TOGGLE_FEATURES = [
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
  { key: 'channelTransfer', label: 'Channel Transfer', desc: 'Transfer channel ownership' },
  { key: 'channelRequest', label: 'Channel Request', desc: 'Request to join private channels' },
];

const defaultToggles = () => Object.fromEntries(TOGGLE_FEATURES.map(f => [f.key, 'inherit' as ToggleState])) as Record<string, ToggleState>;

export default function RoleToggles({ guildId, permLevel, addToast }: Props) {
  const [allRoles, setAllRoles] = useState<DiscordRole[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Record<string, ToggleState>>>(new Map());
  const [savedProfiles, setSavedProfiles] = useState<Map<string, Record<string, ToggleState>>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [fetchError, setFetchError] = useState(false);

  const canEdit = permLevel === 'Owner' || permLevel === 'Administrator';

  const loadData = () => {
    if (!guildId) return;
    setLoading(true);
    setFetchError(false);
    setAllRoles([]);
    setProfiles(new Map());
    setSavedProfiles(new Map());
    setSelectedId(null);
    setShowAdd(false);
    Promise.all([
      fetchJsonWithRetry<{ roles?: DiscordRole[] }>(`/api/guilds/${guildId}/roles`, { credentials: 'include' }),
      fetchJsonWithRetry<{ roleToggles?: Record<string, Record<string, ToggleState>> }>(`/api/guilds/${guildId}/role-toggles`, { credentials: 'include' }),
    ])
      .then(([rolesData, togglesData]) => {
        if (!rolesData.ok) {
          throw new Error((rolesData.data as any)?.error || 'Failed to load roles');
        }
        if (!togglesData.ok) {
          throw new Error((togglesData.data as any)?.error || 'Failed to load role toggles');
        }

        if (rolesData.data?.roles) {
          setAllRoles(rolesData.data.roles);
        }
        if (togglesData.data?.roleToggles) {
          const map = new Map<string, Record<string, ToggleState>>();
          for (const [rId, val] of Object.entries(togglesData.data.roleToggles)) {
            map.set(rId, val as Record<string, ToggleState>);
          }
          setProfiles(map);
          setSavedProfiles(new Map(map));
        }
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const hasChanges = JSON.stringify([...profiles]) !== JSON.stringify([...savedProfiles]);

  const addableRoles = allRoles.filter(r => !profiles.has(r.id));

  const addRole = (roleId: string) => {
    setProfiles(p => { const m = new Map(p); m.set(roleId, defaultToggles()); return m; });
    setSelectedId(roleId);
    setShowAdd(false);
  };

  const removeRole = (roleId: string) => {
    setProfiles(p => { const m = new Map(p); m.delete(roleId); return m; });
    if (selectedId === roleId) setSelectedId(null);
  };

  const setToggle = (key: string, val: ToggleState) => {
    if (!selectedId) return;
    setProfiles(p => {
      const m = new Map(p);
      const cur = m.get(selectedId) ?? defaultToggles();
      m.set(selectedId, { ...cur, [key]: val });
      return m;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const obj = Object.fromEntries(profiles);
      const result = await fetchJsonWithRetry<{ success?: boolean; error?: string }>(`/api/guilds/${guildId}/role-toggles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleToggles: obj }),
      });
      if (!result.ok) {
        throw new Error((result.data as any)?.error || 'Failed to save role toggles');
      }
      setSavedProfiles(new Map(profiles));
      addToast('success', 'Role toggles saved successfully!');
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Failed to save role toggles.');
    } finally {
      setSaving(false);
    }
  };

  const selected = selectedId ? allRoles.find(r => r.id === selectedId) : null;
  const selectedToggles = selectedId ? (profiles.get(selectedId) ?? defaultToggles()) : null;

  if (!guildId) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 16, color: 'var(--text-muted)' }}>
          <Shield size={48} style={{ opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Select a server from the sidebar</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: 'var(--text-muted)' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading role permissions...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 16, background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', textAlign: 'center', marginTop: 40 }}>
          <div style={{ color: 'var(--error)' }}><AlertTriangle size={32} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Failed to load role permissions</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Please try refreshing or check your connection.</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Role Toggles</div>
          <div className="page-subtitle">Role toggles override server-level settings. Priority: Role Toggle &gt; Setup Toggle &gt; Server Toggle</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left Panel */}
        <div className="card" style={{ width: 240, flexShrink: 0 }}>
          <div style={{ padding: '0 10px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profiles</div>
            {canEdit && (
              <button
                onClick={() => setShowAdd(!showAdd)}
                style={{ background: showAdd ? 'var(--bg-elevated)' : 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                title="Add Profile"
              >
                <Plus size={13} />
              </button>
            )}
          </div>

          {showAdd && addableRoles.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {addableRoles.map(r => (
                <div key={r.id} onClick={() => addRole(r.id)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:13, color:'var(--text-secondary)', transition:'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ width:10, height:10, borderRadius:'50%', background: r.color === '#000000' ? '#99aab5' : r.color, flexShrink:0 }} />
                  {r.name}
                </div>
              ))}
            </div>
          )}

          {profiles.size === 0 && !showAdd && (
            <div className="empty-state" style={{ padding: '24px 10px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🛡️</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No role profiles yet. Click + to add one.</div>
            </div>
          )}

          {[...profiles.keys()].map(roleId => {
            const role = allRoles.find(r => r.id === roleId);
            if (!role) return null;
            return (
              <div key={roleId}
                onClick={() => setSelectedId(roleId)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:'var(--radius-sm)', cursor:'pointer', background: selectedId===roleId ? 'var(--primary-light)' : 'transparent', marginBottom:2, transition:'background 0.2s' }}
              >
                <span style={{ width:10, height:10, borderRadius:'50%', background: role.color === '#000000' ? '#99aab5' : role.color, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:13, fontWeight:500, color: selectedId===roleId ? '#c4b5fd' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {role.name}
                    {role.isOrphaned && <span title="This role no longer exists on Discord. It will be ignored." style={{ color: '#ef4444', fontSize: 12 }}>⚠️</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {(() => {
                      const t = profiles.get(roleId);
                      if (!t) return 'No overrides';
                      const active = Object.keys(t).filter(k => t[k as keyof typeof t] === 'enabled').length;
                      const inactive = Object.keys(t).filter(k => t[k as keyof typeof t] === 'disabled').length;
                      if (active === 0 && inactive === 0) return 'No overrides';
                      return `${active} allowed, ${inactive} denied`;
                    })()}
                  </div>
                </span>
                {canEdit && (
                  <button onClick={e => { e.stopPropagation(); removeRole(roleId); }} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:2, display:'flex', borderRadius:4 }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Panel */}
        <div className="card" style={{ flex: 1 }}>
          {!selected ? (
            <div className="empty-state">
              <Shield size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div className="empty-state-title">Select a role profile</div>
              <div className="empty-state-desc">Choose a role from the left panel to configure its toggles</div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
                <span style={{ width:14, height:14, borderRadius:'50%', background:selected.color }} />
                <span style={{ fontWeight:700, fontSize:16, color:'var(--text-primary)' }}>{selected.name}</span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>— Override server toggles for this role</span>
              </div>
              {TOGGLE_FEATURES.map((f, i) => (
                <div key={f.key} className="section" style={i===0 ? {paddingTop:0} : {}}>
                  <div className="section-header">
                    <div>
                      <div className="section-label">{f.label}</div>
                      <div className="section-desc">{f.desc}</div>
                    </div>
                    <ThreeToggle disabled={!canEdit} value={selectedToggles![f.key]} onChange={v => setToggle(f.key, v)} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      {canEdit && <UnsavedBar visible={hasChanges} onSave={handleSave} onReset={() => setProfiles(new Map(savedProfiles))} saving={saving} />}
    </div>
  );
}
