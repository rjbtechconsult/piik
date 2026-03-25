import { useState, useRef, useEffect } from "react";

interface AzureTeam {
  id: string;
  name: string;
}

interface TeamSelectorProps {
  teams: AzureTeam[];
  selectedTeam: string;
  onSelect: (teamName: string) => void;
  disabled?: boolean;
}

export function TeamSelector({ teams, selectedTeam, onSelect, disabled = false }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 py-1.5 rounded-lg text-[var(--text-main)] transition-all active:scale-95 group px-2 ${disabled ? 'opacity-40 cursor-not-allowed filter grayscale' : ''}`}
      >
        <div className="p-1 rounded bg-[var(--card-bg-subtle)] group-hover:bg-[var(--card-hover)] transition-colors shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </div>
        <span className="text-xs font-bold truncate min-w-0 text-left flex-1">{selectedTeam || "Select Sprint Team"}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-[var(--text-dim)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in duration-200">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">My Sprint Teams</div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  onSelect(team.name);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--card-hover)] text-left transition-colors group"
              >
                <div className={`w-1 h-4 rounded-full transition-colors ${selectedTeam === team.name ? 'bg-[var(--accent-blue)]' : 'bg-transparent group-hover:bg-[var(--card-hover)]'}`} />
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${selectedTeam === team.name ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{team.name}</span>
                </div>
                {selectedTeam === team.name && (
                  <svg className="ml-auto text-[var(--accent-blue)]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] px-2">
            <button className="w-full text-left px-3 py-2 text-[11px] font-semibold text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors">
              View all sprints directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
