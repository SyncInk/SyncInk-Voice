import type { ToggleState } from '../../types';

interface ThreeToggleProps {
  value: ToggleState;
  onChange: (val: ToggleState) => void;
}

export const ThreeToggle = ({ value, onChange }: ThreeToggleProps) => (
  <div className="toggle-group">
    <button
      className={`toggle-btn ${value === 'disabled' ? 'active-disabled' : ''}`}
      onClick={() => onChange('disabled')}
      title="Disabled"
    >✕</button>
    <div className="toggle-divider" />
    <button
      className={`toggle-btn ${value === 'inherit' ? 'active-inherit' : ''}`}
      onClick={() => onChange('inherit')}
      title="Inherit"
    >—</button>
    <div className="toggle-divider" />
    <button
      className={`toggle-btn ${value === 'enabled' ? 'active-enabled' : ''}`}
      onClick={() => onChange('enabled')}
      title="Enabled"
    >✓</button>
  </div>
);
