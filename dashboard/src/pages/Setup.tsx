import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Copy, Star, Settings, Mic, Hash, Zap,
  ChevronDown, Check, X, Search, AlertTriangle, Loader2, RefreshCw,
  MessageSquare, Users, Lock, Eye, Globe, Volume2, Shield
} from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DiscordChannel { id: string; name: string; type: number; }
interface GuildSetup {
  _id: string;
  name: string;
  generatorChannelId: string | null;
  categoryId: string | null;
  channelNameTemplate: string;
  defaultUserLimit: number;
  defaultBitrate: number;
  defaultRegion: string | null;
  defaultStatus: string;
  autoTextChannel: boolean;
  welcomeMessage: string;
  isDefault: boolean;
  features: Record<string, boolean>;
  createdAt: string;
}
const BLANK_FEATURES = {
  rename: true, userLimit: true, status: true, lock: true, claim: true,
  ghost: true, transfer: true, permit: true, reject: true, invite: true,
  bitrate: true, region: true, nsfw: false, textChannel: true, requestToJoin: false,
};
const BLANK_SETUP: Omit<GuildSetup, '_id' | 'createdAt'> = {
  name: 'Join to Create', generatorChannelId: null, categoryId: null,
  channelNameTemplate: "{user}'s Room", defaultUserLimit: 0, defaultBitrate: 64,
  defaultRegion: null, defaultStatus: '', autoTextChannel: false,
  welcomeMessage: '', isDefault: false, features: { ...BLANK_FEATURES },
};
const REGIONS = [
  { value: '', label: '🌐 Automatic' },
  { value: 'brazil', label: '🇧🇷 Brazil' },
  { value: 'hongkong', label: '🇭🇰 Hong Kong' },
  { value: 'india', label: '🇮🇳 India' },
  { value: 'japan', label: '🇯🇵 Japan' },
  { value: 'singapore', label: '🇸🇬 Singapore' },
  { value: 'sydney', label: '🇦🇺 Sydney' },
  { value: 'us-central', label: '🇺🇸 US Central' },
  { value: 'us-east', label: '🇺🇸 US East' },
  { value: 'us-south', label: '🇺🇸 US South' },
  { value: 'us-west', label: '🇺🇸 US West' },
];
const FEATURE_LIST: { key: string; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'rename', label: 'Rename Channel', icon: Edit2, desc: 'Allow owners to rename their channel' },
  { key: 'userLimit', label: 'User Limit', icon: Users, desc: 'Allow owners to set a user limit' },
  { key: 'status', label: 'Channel Status', icon: MessageSquare, desc: 'Allow setting a status on the voice channel' },
  { key: 'lock', label: 'Lock / Unlock', icon: Lock, desc: 'Allow owners to lock/unlock their channel' },
  { key: 'claim', label: 'Claim Channel', icon: Star, desc: 'Allow claiming ownership when owner leaves' },
  { key: 'ghost', label: 'Ghost Mode', icon: Eye, desc: 'Allow hiding/showing the channel' },
  { key: 'transfer', label: 'Transfer Ownership', icon: Shield, desc: 'Allow transferring ownership to another user' },
  { key: 'permit', label: 'Permit Users', icon: Check, desc: 'Allow explicitly permitting users' },
  { key: 'reject', label: 'Reject Users', icon: X, desc: 'Allow kicking/banning users from the channel' },
  { key: 'invite', label: 'Invite Control', icon: Plus, desc: 'Allow creating invites for users' },
  { key: 'bitrate', label: 'Bitrate Control', icon: Volume2, desc: 'Allow changing the channel bitrate' },
  { key: 'region', label: 'Region Control', icon: Globe, desc: 'Allow changing the voice region' },
  { key: 'nsfw', label: 'NSFW Toggle', icon: AlertTriangle, desc: 'Allow toggling NSFW mode' },
  { key: 'textChannel', label: 'Text Channels', icon: Hash, desc: 'Allow creating temporary text channels' },
  { key: 'requestToJoin', label: 'Request to Join', icon: MessageSquare, desc: 'Allow request-to-join for locked channels' },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  guildId: string | null;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

// ── Select helper ─────────────────────────────────────────────────────────────
const Select = ({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) => (
  <div style={{ position: 'relative' }}>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)',
        border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 12px',
        fontSize: 13, cursor: 'pointer', appearance: 'none', outline: 'none',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
  </div>
);

// ── Toggle ────────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label?: string; desc?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
    {(label || desc) && (
      <div>
        {label && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>}
        {desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
    )}
    <button
      onClick={() => onChange(!checked)}
      style={{
        flexShrink: 0, width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--primary)' : 'var(--bg-elevated)',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 20 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  </div>
);

// ── Label + Input ─────────────────────────────────────────────────────────────
const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</div>}
  </div>
);

const Input = ({ value, onChange, placeholder, maxLength }: { value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) => (
  <input
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    maxLength={maxLength}
    style={{
      width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)',
      border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px',
      fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
    }}
    onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
  />
);

// ── Setup Card ────────────────────────────────────────────────────────────────
const SetupCard = ({
  setup, channels, categories, onEdit, onDelete, onDuplicate,
}: {
  setup: GuildSetup;
  channels: DiscordChannel[];
  categories: DiscordChannel[];
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) => {
  const genCh = channels.find(c => c.id === setup.generatorChannelId);
  const cat = categories.find(c => c.id === setup.categoryId);
  const activeFeatures = Object.entries(setup.features).filter(([, v]) => v).length;

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${setup.isDefault ? 'var(--primary)' : 'var(--border)'}`,
      borderRadius: 12, padding: '18px 20px', transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: setup.isDefault ? '0 0 0 1px var(--primary-glow)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Mic size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {setup.name}
              </div>
              {setup.isDefault && (
                <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 7px', borderRadius: 20, letterSpacing: '0.04em' }}>
                  DEFAULT
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {genCh && <span>🎙️ {genCh.name}</span>}
              {cat && <span>📁 {cat.name}</span>}
              <span>📋 {setup.channelNameTemplate}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn btn-secondary btn-sm" onClick={onDuplicate} title="Duplicate">
            <Copy size={13} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>
            <Edit2 size={13} style={{ marginRight: 4 }} />Edit
          </button>
          <button className="btn btn-sm" style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid var(--error)', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }} onClick={onDelete}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <Stat icon={<Users size={13} />} label="User Limit" value={setup.defaultUserLimit === 0 ? 'Unlimited' : String(setup.defaultUserLimit)} />
        <Stat icon={<Volume2 size={13} />} label="Bitrate" value={`${setup.defaultBitrate} kbps`} />
        <Stat icon={<Globe size={13} />} label="Region" value={REGIONS.find(r => r.value === (setup.defaultRegion ?? ''))?.label ?? '🌐 Automatic'} />
        <Stat icon={<Zap size={13} />} label="Features" value={`${activeFeatures} / ${FEATURE_LIST.length} active`} />
        {setup.autoTextChannel && <Stat icon={<Hash size={13} />} label="Text Channel" value="Auto-create" />}
        <Stat icon={<Settings size={13} />} label="Created" value={new Date(setup.createdAt).toLocaleDateString()} />
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {icon} {label}
    </div>
    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
  </div>
);

// ── Modal ──────────────────────────────────────────────────────────────────────
const SetupModal = ({
  initial, channels, categories, guildId, onSave, onClose, addToast,
}: {
  initial: Omit<GuildSetup, '_id' | 'createdAt'> & { _id?: string };
  channels: DiscordChannel[];
  categories: DiscordChannel[];
  guildId: string;
  onSave: (setup: GuildSetup) => void;
  onClose: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}) => {
  const [tab, setTab] = useState<'general' | 'defaults' | 'permissions' | 'automation'>('general');
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const setFeature = (key: string, val: boolean) =>
    setForm(f => ({ ...f, features: { ...f.features, [key]: val } }));

  const handleSave = async () => {
    if (!form.generatorChannelId)
      return setError('Please select a Generator Voice Channel.');
    if (!form.categoryId)
      return setError('Please select a Target Category.');
    if (!form.name.trim())
      return setError('Setup name is required.');
    setSaving(true);
    setError('');
    try {
      const isEdit = Boolean(initial._id);
      const url = isEdit
        ? `/api/guilds/${guildId}/setups/${initial._id}`
        : `/api/guilds/${guildId}/setups`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save setup');
      onSave(data.setup);
      addToast('success', isEdit ? 'Setup updated successfully!' : 'Setup created successfully!');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save setup';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'defaults', label: 'Defaults', icon: Zap },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'automation', label: 'Automation', icon: MessageSquare },
  ] as const;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(4px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
              {initial._id ? 'Edit Setup' : 'Create Setup'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Configure your Join-to-Create system</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: 13,
                  fontWeight: tab === t.id ? 600 : 500,
                  background: tab === t.id ? 'var(--bg-elevated)' : 'none',
                  color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--error)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={15} />{error}
            </div>
          )}

          {/* ── TAB: GENERAL ── */}
          {tab === 'general' && (
            <>
              <Field label="Setup Name" hint="Give this configuration a recognizable name">
                <Input value={form.name} onChange={v => set('name', v)} placeholder="e.g. Gaming Rooms" maxLength={50} />
              </Field>
              <Field label="Generator Voice Channel *" hint="Users join this channel to automatically create their own VC">
                <Select
                  value={form.generatorChannelId ?? ''}
                  onChange={v => set('generatorChannelId', v || null)}
                  options={channels.map(c => ({ value: c.id, label: `🔊 ${c.name}` }))}
                  placeholder="Select a voice channel..."
                />
              </Field>
              <Field label="Target Category *" hint="Temporary channels will be created in this category">
                <Select
                  value={form.categoryId ?? ''}
                  onChange={v => set('categoryId', v || null)}
                  options={categories.map(c => ({ value: c.id, label: `📁 ${c.name}` }))}
                  placeholder="Select a category..."
                />
              </Field>
              <Field label="Channel Name Template" hint="Variables: {user}, {username}, {server}, {member_count}">
                <Input value={form.channelNameTemplate} onChange={v => set('channelNameTemplate', v)} placeholder="{user}'s Room" maxLength={80} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {["{user}'s Room", "{username}'s VC", "🎮 {user}", "🔊 {user}"].map(t => (
                    <button key={t} onClick={() => set('channelNameTemplate', t)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: form.channelNameTemplate === t ? 'var(--primary-light)' : 'var(--bg-input)', color: form.channelNameTemplate === t ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Toggle checked={form.isDefault} onChange={v => set('isDefault', v)} label="Set as Default Setup" desc="This setup will be used for all new channels unless overridden" />
            </>
          )}

          {/* ── TAB: DEFAULTS ── */}
          {tab === 'defaults' && (
            <>
              <Field label="User Limit" hint="0 = unlimited, max 99">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" min={0} max={99} value={form.defaultUserLimit}
                    onChange={e => set('defaultUserLimit', Number(e.target.value))}
                    style={{ width: 100, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{form.defaultUserLimit === 0 ? '(Unlimited)' : 'users max'}</span>
                </div>
              </Field>
              <Field label="Default Bitrate (kbps)" hint="8–384 kbps. Server boost affects maximum.">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range" min={8} max={384} step={8} value={form.defaultBitrate}
                    onChange={e => set('defaultBitrate', Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, minWidth: 60 }}>{form.defaultBitrate} kbps</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[64, 96, 128, 256, 384].map(b => (
                    <button key={b} onClick={() => set('defaultBitrate', b)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: form.defaultBitrate === b ? 'var(--primary-light)' : 'var(--bg-input)', color: form.defaultBitrate === b ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {b}kbps
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Default Region">
                <Select
                  value={form.defaultRegion ?? ''}
                  onChange={v => set('defaultRegion', v || null)}
                  options={REGIONS}
                />
              </Field>
              <Field label="Default Channel Status" hint="Pre-set status shown under the VC name (max 500 chars)">
                <Input value={form.defaultStatus} onChange={v => set('defaultStatus', v)} placeholder="e.g. 🎮 Gaming • Open to all" maxLength={500} />
              </Field>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Default Channel Behavior</div>
                <Toggle checked={Boolean(form.features?.nsfw)} onChange={v => setFeature('nsfw', v)} label="NSFW by Default" desc="New channels will have NSFW enabled" />
              </div>
            </>
          )}

          {/* ── TAB: PERMISSIONS ── */}
          {tab === 'permissions' && (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Toggle which actions channel owners can perform. Disabled features will be hidden from the control panel.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {FEATURE_LIST.map(f => {
                  const Icon = f.icon;
                  const active = Boolean(form.features?.[f.key]);
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFeature(f.key, !active)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        borderRadius: 10, border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                        background: active ? 'var(--primary-light)' : 'var(--bg-input)',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: active ? 'var(--primary)' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} style={{ color: active ? '#fff' : 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{f.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const all: Record<string, boolean> = {};
                  FEATURE_LIST.forEach(f => all[f.key] = true);
                  setForm(p => ({ ...p, features: all }));
                }}>Enable All</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const none: Record<string, boolean> = {};
                  FEATURE_LIST.forEach(f => none[f.key] = false);
                  setForm(p => ({ ...p, features: none }));
                }}>Disable All</button>
              </div>
            </>
          )}

          {/* ── TAB: AUTOMATION ── */}
          {tab === 'automation' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14, background: 'var(--bg-elevated)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Text Channel Automation</div>
                <Toggle
                  checked={form.autoTextChannel}
                  onChange={v => set('autoTextChannel', v)}
                  label="Auto-create Text Channel"
                  desc="Automatically creates a paired private text channel when a VC is created"
                />
                {form.autoTextChannel && (
                  <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      ✅ Text channel will be named <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>💬-{`{owner}`}-chat</code><br />
                      ✅ Only members in the voice channel can see it<br />
                      ✅ Automatically deleted when the voice channel is deleted
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14, background: 'var(--bg-elevated)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Welcome Message</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Sent in the voice channel when it is created. Leave blank to disable.
                </div>
                <textarea
                  value={form.welcomeMessage}
                  onChange={e => set('welcomeMessage', e.target.value)}
                  placeholder="Welcome to your room, {mention}! Use the control panel below to manage your channel."
                  maxLength={500}
                  rows={4}
                  style={{
                    width: '100%', background: 'var(--bg-card)', color: 'var(--text-primary)',
                    border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
                    fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['{mention}', '{user}', '{username}', '{channel}', '{server}'].map(v => (
                    <button key={v} onClick={() => set('welcomeMessage', (form.welcomeMessage + v).slice(0, 500))}
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--primary)', background: 'var(--primary-light)', color: 'var(--primary)', cursor: 'pointer' }}>
                      {v}
                    </button>
                  ))}
                </div>
                {form.welcomeMessage && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {500 - form.welcomeMessage.length} characters remaining
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Check size={14} /> {initial._id ? 'Save Changes' : 'Create Setup'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete Confirmation ────────────────────────────────────────────────────────
const DeleteModal = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 28, maxWidth: 420, width: '100%', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--error-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trash2 size={20} style={{ color: 'var(--error)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>Delete Setup</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{name}"</strong>?
            This cannot be undone. The generator channel will remain in Discord.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" style={{ background: 'var(--error)', borderColor: 'var(--error)' }} onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

// ── Main Setup Page ────────────────────────────────────────────────────────────
export default function Setup({ guildId, addToast }: Props) {
  const [setups, setSetups] = useState<GuildSetup[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [categories, setCategories] = useState<DiscordChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | (Omit<GuildSetup, '_id' | 'createdAt'> & { _id?: string })>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuildSetup | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [setupsRes, channelsRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/setups`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
      ]);
      if (setupsRes.ok) {
        const d = await setupsRes.json();
        setSetups(d.setups ?? []);
      }
      if (channelsRes.ok) {
        const d = await channelsRes.json();
        setChannels(d.voice ?? []);
        setCategories(d.categories ?? []);
      }
    } catch { /* handled gracefully */ }
    finally { setLoading(false); }
  }, [guildId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = (saved: GuildSetup) => {
    setSetups(prev => {
      const idx = prev.findIndex(s => s._id === saved._id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget || !guildId) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/setups/${deleteTarget._id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) throw new Error();
      setSetups(prev => prev.filter(s => s._id !== deleteTarget._id));
      addToast('success', `Setup "${deleteTarget.name}" deleted.`);
    } catch {
      addToast('error', 'Failed to delete setup. Please try again.');
    } finally { setDeleteTarget(null); }
  };

  const handleDuplicate = async (setup: GuildSetup) => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/setups/${setup._id}/duplicate`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSetups(prev => [...prev, data.setup]);
      addToast('success', `Setup duplicated as "${data.setup.name}". Select a new generator channel before using it.`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to duplicate setup');
    }
  };

  const filtered = setups.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.channelNameTemplate.toLowerCase().includes(search.toLowerCase()),
  );

  if (!guildId) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 16, color: 'var(--text-muted)' }}>
          <Mic size={48} style={{ opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Select a server from the sidebar</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please" />

      <div className="page-header" style={{ marginTop: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Voice Channel Setups</div>
          <div className="page-subtitle">Manage your Join-to-Create systems</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setModal({ ...BLANK_SETUP, features: { ...BLANK_FEATURES } })}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Create Setup
          </button>
        </div>
      </div>

      {/* Search */}
      {setups.length > 2 && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search setups…"
            style={{ width: '100%', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px 9px 36px', fontSize: 13, outline: 'none' }}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: 'var(--text-muted)' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading setups…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 14, border: '1px dashed var(--border)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>
              {search ? 'No setups match your search' : 'No setups configured yet'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, maxWidth: 380 }}>
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Create your first Join-to-Create setup to get started. Users will join the generator channel to automatically create their own temporary voice channel.'}
            </div>
          </div>
          {!search && (
            <button
              className="btn btn-primary"
              onClick={() => setModal({ ...BLANK_SETUP, features: { ...BLANK_FEATURES } })}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} /> Create Your First Setup
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(s => (
            <SetupCard
              key={s._id}
              setup={s}
              channels={channels}
              categories={categories}
              onEdit={() => setModal({ ...s })}
              onDelete={() => setDeleteTarget(s)}
              onDuplicate={() => handleDuplicate(s)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <SetupModal
          initial={modal}
          channels={channels}
          categories={categories}
          guildId={guildId}
          onSave={handleSave}
          onClose={() => setModal(null)}
          addToast={addToast}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
