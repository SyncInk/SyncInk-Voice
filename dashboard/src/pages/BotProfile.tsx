import { useState, useEffect } from 'react';
import { User, Camera, FileText, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { UnsavedBar } from '../components/ui/UnsavedBar';

type PermLevel = 'Owner' | 'Administrator' | 'Moderator' | 'Member';

interface BotProfileProps {
  guildId: string | null;
  permissionLevel: PermLevel;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

// What each role can edit
const CAN_EDIT: Record<PermLevel, { nickname: boolean; bio: boolean; avatar: boolean }> = {
  Owner:         { nickname: true,  bio: true,  avatar: true  },
  Administrator: { nickname: true,  bio: true,  avatar: false },
  Moderator:     { nickname: false, bio: false, avatar: false },
  Member:        { nickname: false, bio: false, avatar: false },
};

const LockedOverlay = ({ reason }: { reason: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
    background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)',
    fontSize: 13, color: 'var(--text-muted)',
  }}>
    <Lock size={14} style={{ flexShrink: 0 }} />
    <span>{reason}</span>
  </div>
);

export default function BotProfile({ guildId, permissionLevel, addToast }: BotProfileProps) {
  const can = CAN_EDIT[permissionLevel] ?? CAN_EDIT.Member;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const empty = { nickname: '', bio: '', avatarUrl: '', serverAvatarUrl: '', defaultName: 'Syncink Voice' };
  const [saved, setSaved] = useState(empty);
  const [state, setState] = useState(empty);

  const hasChanges = JSON.stringify(state) !== JSON.stringify(saved);

  // Load bot profile for this server
  useEffect(() => {
    if (!guildId) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/guilds/${guildId}/bot-profile`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const prof = {
            nickname: d.nickname ?? '',
            bio: d.bio ?? '',
            avatarUrl: d.avatarUrl ?? '',
            serverAvatarUrl: d.serverAvatarUrl ?? '',
            defaultName: d.defaultName ?? 'Syncink Voice',
          };
          setSaved(prof);
          setState(prof);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [guildId]);

  const handleSave = async () => {
    if (!guildId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: state.nickname, bio: state.bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSaved({ ...state });
      addToast('success', 'Bot profile updated for this server!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save bot profile';
      setError(msg);
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!guildId || !can.avatar) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'Avatar must be under 10MB');
      return;
    }
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`/api/guilds/${guildId}/bot-avatar`, {
        method: 'PUT', credentials: 'include', body: formData,
      });
      if (!res.ok) throw new Error('Avatar upload failed');
      addToast('success', 'Bot avatar updated! Note: Discord may take a moment to refresh.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!guildId) {
    return (
      <div className="page-content">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:16, color:'var(--text-muted)' }}>
          <User size={48} style={{ opacity:0.3 }} />
          <div style={{ fontSize:16, fontWeight:600 }}>Select a server from the sidebar</div>
        </div>
      </div>
    );
  }

  // Members and Moderators cannot access this page at all
  if (permissionLevel === 'Member' || permissionLevel === 'Moderator') {
    return (
      <div className="page-content">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:16, textAlign:'center', padding:20 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:'var(--error-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Lock size={28} style={{ color:'var(--error)' }} />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:18, color:'var(--text-primary)' }}>Access Restricted</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:8, maxWidth:360 }}>
              Bot Profile settings require <strong>Administrator</strong> or <strong>Owner</strong> permissions.
              You are currently signed in as <strong>{permissionLevel}</strong>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Bot Profile</div>
          <div className="page-subtitle">
            Customize how Syncink Voice appears in <strong style={{ color:'var(--primary)' }}>this server only</strong>
          </div>
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)', background:'var(--bg-elevated)', padding:'6px 12px', borderRadius:20, display:'flex', alignItems:'center', gap:6 }}>
          <User size={12} /> Editing as: <strong style={{ color: permissionLevel === 'Owner' ? '#f59e0b' : '#ef4444' }}>{permissionLevel}</strong>
        </div>
      </div>

      {error && (
        <div style={{ background:'var(--error-light)', border:'1px solid var(--error)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'var(--error)', display:'flex', gap:8, alignItems:'center', marginBottom:16 }}>
          <AlertTriangle size={15} />{error}
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, gap:12, color:'var(--text-muted)' }}>
          <Loader2 size={22} style={{ animation:'spin 1s linear infinite' }} />
          <span>Loading bot profile...</span>
        </div>
      ) : (
        <div className="card">
          {/* Bot Avatar Preview */}
          <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24, paddingBottom:24, borderBottom:'1px solid var(--border)' }}>
            <div style={{ position:'relative' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--primary-light)', border:'2px solid var(--primary-glow)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                {state.serverAvatarUrl || state.avatarUrl
                  ? <img src={state.serverAvatarUrl || state.avatarUrl} alt="Bot" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <User size={32} color="var(--primary)" />
                }
              </div>
              {can.avatar && (
                <label style={{ position:'absolute', bottom:-2, right:-2, width:26, height:26, background:'var(--primary)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid var(--bg-card)' }}>
                  {avatarUploading
                    ? <Loader2 size={12} color="#fff" style={{ animation:'spin 1s linear infinite' }} />
                    : <Camera size={12} color="#fff" />}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} style={{ display:'none' }} />
                </label>
              )}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>
                {state.nickname || state.defaultName || 'Syncink Voice'}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Bot • Syncink Voice</div>
              {state.bio && <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4, maxWidth:320 }}>{state.bio}</div>}
            </div>
          </div>

          {/* Nickname */}
          <div className="section">
            <div className="section-header">
              <div>
                <div className="section-label"><User size={14} style={{ display:'inline', marginRight:6 }} />Server Nickname</div>
                <div className="section-desc">Changes the bot's name <strong>only in this server</strong>. Leave blank to reset to default.</div>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              {can.nickname ? (
                <div className="input-with-counter">
                  <input
                    className="input-field" style={{ paddingRight:50 }}
                    maxLength={32} value={state.nickname}
                    onChange={e => setState(s => ({ ...s, nickname: e.target.value }))}
                    placeholder={state.defaultName || 'Syncink Voice'}
                  />
                  <span className="input-counter">{state.nickname.length}/32</span>
                </div>
              ) : (
                <LockedOverlay reason="Nickname editing requires Administrator or Owner" />
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="section">
            <div className="section-header">
              <div>
                <div className="section-label"><FileText size={14} style={{ display:'inline', marginRight:6 }} />Server Bio</div>
                <div className="section-desc">A short description stored for this server. Shown in the dashboard and control panel footer.</div>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              {can.bio ? (
                <>
                  <textarea
                    className="textarea-field" maxLength={400} rows={4}
                    value={state.bio}
                    onChange={e => setState(s => ({ ...s, bio: e.target.value }))}
                    placeholder="Your custom bot bio for this server..."
                  />
                  <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'right', marginTop:4 }}>{state.bio.length}/400</div>
                </>
              ) : (
                <LockedOverlay reason="Bio editing requires Administrator or Owner" />
              )}
            </div>
          </div>

          {/* Custom Avatar */}
          <div className="section" style={{ borderBottom:'none' }}>
            <div className="section-label"><Camera size={14} style={{ display:'inline', marginRight:6 }} />Custom Avatar (Server-wide)</div>
            <div className="section-desc" style={{ marginBottom:12 }}>
              {can.avatar
                ? 'Upload a custom avatar for the bot globally. This affects all servers. (PNG, JPG, WEBP — max 10MB)'
                : 'Only the server Owner can change the bot avatar globally.'}
            </div>
            {can.avatar ? (
              <label style={{ display:'block' }}>
                <div
                  style={{ background:'var(--bg-input)', border:'2px dashed var(--border)', borderRadius:'var(--radius)', padding:'32px', textAlign:'center', cursor:'pointer', transition:'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <Camera size={28} color="var(--text-muted)" style={{ margin:'0 auto 8px', display:'block' }} />
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>Click to upload custom avatar</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>PNG, JPG, WEBP up to 10MB</div>
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} style={{ display:'none' }} />
              </label>
            ) : (
              <LockedOverlay reason={permissionLevel === 'Administrator' ? 'Avatar changes are restricted to the server Owner' : 'Requires Owner permission'} />
            )}
          </div>
        </div>
      )}

      <UnsavedBar visible={hasChanges && (can.nickname || can.bio)} onSave={handleSave} onReset={() => setState(saved)} saving={saving} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
