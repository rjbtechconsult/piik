interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {label && <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider group-hover:text-[var(--text-muted)] transition-colors">{label}</span>}
      <div 
        className="relative"
        onClick={() => !disabled && onChange(!checked)}
      >
        {/* Track */}
        <div className={`w-7 h-4 rounded-full transition-all duration-300 border ${
          checked 
            ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)]/50 shadow-[0_0_8px_rgba(0,122,255,0.2)]' 
            : 'bg-[var(--card-bg-subtle)] border-[var(--border-main)]'
        }`} />
        
        {/* Knob */}
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 transform shadow-sm ${
          checked ? 'translate-x-3' : 'translate-x-0'
        }`} />
      </div>
    </label>
  );
}
