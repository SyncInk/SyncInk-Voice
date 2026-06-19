interface SwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}

export const Switch = ({ checked, onChange, label }: SwitchProps) => (
  <div className="switch-wrapper">
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="switch-track" />
    </label>
    {label && <span style={{fontSize:13,color:'var(--text-secondary)'}}>{label}</span>}
  </div>
);
