import { useState } from 'react';
import { User, Camera, FileText } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { UnsavedBar } from '../components/ui/UnsavedBar';

interface BotProfileProps {
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export default function BotProfile({ addToast }: BotProfileProps) {
  const initial = { nickname: 'Syncink Voice', bio: '' };
  const [state, setState] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const hasChanges = JSON.stringify(state) !== JSON.stringify(saved);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaved(state);
    setSaving(false);
    addToast('success', 'Bot profile saved!');
  };

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Bot Profile</div>
          <div className="page-subtitle">Customize how Syncink Voice appears in this server</div>
        </div>
      </div>

      <div className="card">
        {/* Bot Avatar Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-light)', border: '2px solid var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="/logo.png" alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
              <User size={32} color="var(--primary)" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{state.nickname || 'Syncink Voice'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bot • Syncink Voice</div>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label"><User size={14} style={{ display: 'inline', marginRight: 6 }} />Custom Nickname</div>
              <div className="section-desc">Change the bot's nickname for this server only. Leave blank to use default.</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="input-with-counter">
              <input
                className="input-field"
                style={{ paddingRight: 50 }}
                maxLength={32}
                value={state.nickname}
                onChange={e => setState(s => ({ ...s, nickname: e.target.value }))}
                placeholder="Syncink Voice"
              />
              <span className="input-counter">{state.nickname.length}/32</span>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label"><FileText size={14} style={{ display: 'inline', marginRight: 6 }} />Custom Bio</div>
              <div className="section-desc">A short description displayed in the bot's profile. Supports basic markdown.</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <textarea
              className="textarea-field"
              maxLength={400}
              rows={4}
              value={state.bio}
              onChange={e => setState(s => ({ ...s, bio: e.target.value }))}
              placeholder="Your custom bot bio..."
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>{state.bio.length}/400</div>
          </div>
        </div>

        <div className="section" style={{ border: 'none' }}>
          <div className="section-label"><Camera size={14} style={{ display: 'inline', marginRight: 6 }} />Custom Avatar</div>
          <div className="section-desc" style={{ marginBottom: 12 }}>Upload a custom avatar for the bot in this server. (PNG, JPG, WEBP — max 10MB)</div>
          <div style={{ background: 'var(--bg-input)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <Camera size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drag & drop or click to upload</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG, WEBP up to 10MB</div>
          </div>
        </div>
      </div>

      <UnsavedBar visible={hasChanges} onSave={handleSave} onReset={() => setState(saved)} saving={saving} />
    </div>
  );
}
