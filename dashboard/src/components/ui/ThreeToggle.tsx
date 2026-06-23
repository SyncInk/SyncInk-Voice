import type { ToggleState } from '../../types';

interface ThreeToggleProps {
  value: ToggleState;
  disabled?: boolean;
  onChange: (val: ToggleState) => void;
}

export const ThreeToggle = ({ value, disabled, onChange }: ThreeToggleProps) => (
  <div className={`toggle-group ${disabled ? 'disabled' : ''}`} style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}>
    <button
      className={`toggle-btn ${value === 'disabled' ? 'active-disabled' : ''}`}
      onClick={() => onChange('disabled')}
      disabled={disabled}
      title="Disabled"
    >✕</button>
    <div className="toggle-divider" />
    <button
      className={`toggle-btn ${value === 'inherit' ? 'active-inherit' : ''}`}
      onClick={() => onChange('inherit')}
      disabled={disabled}
      title="Inherit"
    >—</button>
    <div className="toggle-divider" />
    <button
      className={`toggle-btn ${value === 'enabled' ? 'active-enabled' : ''}`}
      onClick={() => onChange('enabled')}
      disabled={disabled}
      title="Enabled"
    >✓</button>
  </div>
);
