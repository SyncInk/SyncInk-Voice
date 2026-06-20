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
  const [serverAvatar, setServerAvatar] = useState<string>('');
  const [serverBanner, setServerBanner] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

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
          setServerAvatar(d.serverAvatarUrl || '');
          setServerBanner(d.serverBannerUrl || '');
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

  // Helper to resize and convert image to base64
  const processImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type, 0.8));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guildId) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'File too large. Maximum size is 10MB.');
      return;
    }
    setAvatarUploading(true);
    try {
      const base64 = await processImage(file, 512, 512);
      const res = await fetch(`/api/guilds/${guildId}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ serverAvatar: base64 }),
      });
      if (!res.ok) throw new Error('Avatar upload failed');
      setServerAvatar(base64);
      addToast('success', 'Server Avatar updated successfully!');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guildId) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'File too large. Maximum size is 10MB.');
      return;
    }
    setBannerUploading(true);
    try {
      const base64 = await processImage(file, 1024, 512);
      const res = await fetch(`/api/guilds/${guildId}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ serverBanner: base64 }),
      });
      if (!res.ok) throw new Error('Banner upload failed');
      setServerBanner(base64);
      addToast('success', 'Server Banner updated successfully!');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Banner upload failed');
    } finally {
      setBannerUploading(false);
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
                {serverAvatar || state.avatarUrl
                  ? <img src={serverAvatar || state.avatarUrl} alt="Bot" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <User size={32} color="var(--primary)" />
                }
              </div>
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

          {/* Avatar Upload (Server-Specific) */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 style={{ display:'flex', alignItems:'center', gap:8 }}><Camera size={16} /> Server Avatar</h3>
              <p>Upload a custom avatar for the bot. This image is stored and used <strong>only in this server</strong> (e.g., in control panels and logs).</p>
            </div>
            
            <div style={{ position:'relative', borderRadius:16, border:'2px dashed var(--border)', background:'var(--bg-input)', padding:40, textAlign:'center', transition:'all 0.2s', cursor:'pointer' }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
            >
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleAvatarUpload}
                     style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}
                     disabled={avatarUploading || (permissionLevel !== 'Owner' && permissionLevel !== 'Administrator')} />
              
              {avatarUploading ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, color:'var(--primary)' }}>
                  <Loader2 size={32} className="spin" />
                  <div style={{ fontSize:14, fontWeight:500 }}>Compressing & Uploading...</div>
                </div>
              ) : serverAvatar ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                  <img src={serverAvatar} alt="Server Avatar" style={{ width:100, height:100, borderRadius:'50%', objectFit:'cover', boxShadow:'0 8px 16px rgba(0,0,0,0.3)' }} />
                  <div style={{ color:'var(--text-secondary)', fontSize:13 }}>Click or drag to change avatar</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, color:'var(--text-muted)' }}>
                  <Camera size={32} />
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:'var(--text-secondary)' }}>Click to upload server avatar</div>
                    <div style={{ fontSize:12, marginTop:4 }}>PNG, JPG, WEBP up to 10MB</div>
                  </div>
                </div>
              )}
            </div>
            {permissionLevel !== 'Owner' && permissionLevel !== 'Administrator' && (
              <div style={{ marginTop:12, fontSize:13, color:'var(--error)', display:'flex', alignItems:'center', gap:6 }}>
                <Lock size={14} /> Only Administrators can upload server branding.
              </div>
            )}
          </div>

          {/* Banner Upload (Server-Specific) */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 style={{ display:'flex', alignItems:'center', gap:8 }}><Camera size={16} /> Server Banner</h3>
              <p>Upload a custom banner for the bot. This image is used as the main image in control panels and embeds <strong>only in this server</strong>.</p>
            </div>
            
            <div style={{ position:'relative', borderRadius:16, border:'2px dashed var(--border)', background:'var(--bg-input)', padding:40, textAlign:'center', transition:'all 0.2s', cursor:'pointer', overflow:'hidden' }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
            >
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleBannerUpload}
                     style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%', zIndex:10 }}
                     disabled={bannerUploading || (permissionLevel !== 'Owner' && permissionLevel !== 'Administrator')} />
              
              {bannerUploading ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, color:'var(--primary)' }}>
                  <Loader2 size={32} className="spin" />
                  <div style={{ fontSize:14, fontWeight:500 }}>Compressing & Uploading...</div>
                </div>
              ) : serverBanner ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, position:'relative', zIndex:1 }}>
                  <img src={serverBanner} alt="Server Banner" style={{ width:'100%', maxHeight:150, borderRadius:8, objectFit:'cover', boxShadow:'0 8px 16px rgba(0,0,0,0.3)' }} />
                  <div style={{ color:'var(--text-secondary)', fontSize:13 }}>Click or drag to change banner</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, color:'var(--text-muted)', position:'relative', zIndex:1 }}>
                  <Camera size={32} />
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:'var(--text-secondary)' }}>Click to upload server banner</div>
                    <div style={{ fontSize:12, marginTop:4 }}>PNG, JPG, WEBP up to 10MB (Wide format recommended)</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <UnsavedBar visible={hasChanges && (can.nickname || can.bio)} onSave={handleSave} onReset={() => setState(saved)} saving={saving} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
