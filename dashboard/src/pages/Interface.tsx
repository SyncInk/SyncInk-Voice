import { useState, useEffect } from 'react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { Switch } from '../components/ui/Switch';
import { UnsavedBar } from '../components/ui/UnsavedBar';

interface Props { addToast: (type: 'success'|'error'|'warning'|'info', msg: string) => void; }

type Theme = 'dark' | 'purple' | 'light';
type Sidebar = 'expanded' | 'collapsed';

interface Prefs {
  theme: Theme;
  animations: boolean;
  compact: boolean;
  sidebar: Sidebar;
  toastSuccess: boolean;
  toastError: boolean;
  toastWarning: boolean;
}

const STORAGE_KEY = 'syncink_prefs';

const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultPrefs;
};

const defaultPrefs: Prefs = {
  theme: 'dark',
  animations: true,
  compact: false,
  sidebar: 'expanded',
  toastSuccess: true,
  toastError: true,
  toastWarning: true,
};

// Apply preferences to the document root
export const applyPrefs = (prefs: Prefs) => {
  const root = document.documentElement;

  // Theme
  root.setAttribute('data-theme', prefs.theme);

  // Animations
  if (prefs.animations) {
    root.style.removeProperty('--transition-speed');
    root.classList.remove('no-animations');
  } else {
    root.classList.add('no-animations');
  }

  // Compact mode
  if (prefs.compact) {
    root.classList.add('compact');
  } else {
    root.classList.remove('compact');
  }
};

export default function Interface({ addToast }: Props) {
  const [saved, setSaved] = useState<Prefs>(loadPrefs);
  const [state, setState] = useState<Prefs>(loadPrefs);
  const [saving, setSaving] = useState(false);
  const hasChanges = JSON.stringify(saved) !== JSON.stringify(state);

  // Apply current theme preview live as user changes toggles
  useEffect(() => {
    applyPrefs(state);
  }, [state.theme, state.animations, state.compact]);

  const set = <K extends keyof Prefs>(key: K, val: Prefs[K]) =>
    setState(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    applyPrefs(state);
    setSaved({ ...state });
    setSaving(false);
    addToast('success', 'Interface preferences saved!');
  };

  const handleReset = () => {
    setState(saved);
    applyPrefs(saved);
  };

  const BtnGroup = ({
    value,
    options,
    onChange,
  }: {
    value: string;
    options: { label: string; val: string }[];
    onChange: (v: string) => void;
  }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(o => (
        <button
          key={o.val}
          className={`btn btn-sm ${value === o.val ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onChange(o.val)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Interface</div>
          <div className="page-subtitle">Customize your dashboard experience — changes apply instantly</div>
        </div>
      </div>

      <div className="card">
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <div className="section-label">Dashboard Theme</div>
              <div className="section-desc">Choose your preferred color theme</div>
            </div>
            <BtnGroup
              value={state.theme}
              options={[
                { label: 'Dark', val: 'dark' },
                { label: 'SyncInk Purple', val: 'purple' },
                { label: 'Light', val: 'light' },
              ]}
              onChange={v => set('theme', v as Theme)}
            />
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label">Dashboard Animations</div>
              <div className="section-desc">Enable smooth transitions and micro-animations</div>
            </div>
            <Switch checked={state.animations} onChange={v => set('animations', v)} />
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label">Compact Mode</div>
              <div className="section-desc">Reduce spacing and padding for a denser layout</div>
            </div>
            <Switch checked={state.compact} onChange={v => set('compact', v)} />
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label">Sidebar Behavior</div>
              <div className="section-desc">Default sidebar state when loading the dashboard</div>
            </div>
            <BtnGroup
              value={state.sidebar}
              options={[
                { label: 'Expanded', val: 'expanded' },
                { label: 'Collapsed', val: 'collapsed' },
              ]}
              onChange={v => set('sidebar', v as Sidebar)}
            />
          </div>
        </div>

        <div className="section" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 14 }}>
            Notification Settings
          </div>
          {[
            { key: 'toastSuccess' as const, label: 'Success Toasts', desc: 'Show green toasts on successful operations' },
            { key: 'toastError' as const, label: 'Error Toasts', desc: 'Show red toasts on failed operations' },
            { key: 'toastWarning' as const, label: 'Warning Toasts', desc: 'Show yellow toasts for warnings' },
          ].map((item, i, arr) => (
            <div
              key={item.key}
              className="section"
              style={{ borderBottom: i === arr.length - 1 ? 'none' : undefined, paddingTop: i === 0 ? 0 : undefined }}
            >
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
      </div>

      <UnsavedBar visible={hasChanges} onSave={handleSave} onReset={handleReset} saving={saving} />
    </div>
  );
}
