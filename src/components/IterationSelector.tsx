import { useState, useRef, useEffect } from "react";

interface Iteration {
  id: string;
  name: string;
  attributes?: {
    timeframe: string;
  };
}

interface IterationSelectorProps {
  iterations: Iteration[];
  selectedIteration: Iteration | null;
  onSelect: (iteration: Iteration) => void;
  isLoading?: boolean;
}

export function IterationSelector({ iterations, selectedIteration, onSelect, isLoading }: IterationSelectorProps) {
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

  if (iterations.length === 0 && !isLoading) return null;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all text-[11px] font-medium border border-[var(--border-subtle)]"
      >
        <span className="truncate text-left flex-1" title={selectedIteration?.name || "Select Iteration"}>
          {isLoading ? "Loading..." : (selectedIteration?.name || "Select Iteration")}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in duration-200">
          <div className="px-3 py-1 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Team Iterations</div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {iterations.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  onSelect(it);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${selectedIteration?.id === it.id ? 'bg-[var(--accent-blue)]/5' : ''}`}
              >
                <div className="flex flex-col">
                  <span className={`text-[11px] font-medium ${selectedIteration?.id === it.id ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                    {it.name}
                  </span>
                  {it.attributes?.timeframe === "current" && (
                    <span className="text-[8px] text-[var(--accent-blue)] font-bold uppercase tracking-tighter">Current Sprint</span>
                  )}
                  {it.attributes?.timeframe === "past" && (
                    <span className="text-[8px] text-[var(--text-dim)]">Past</span>
                  )}
                  {it.attributes?.timeframe === "future" && (
                    <span className="text-[8px] text-green-500/60">Upcoming</span>
                  )}
                </div>
                {selectedIteration?.id === it.id && (
                  <svg className="text-[var(--accent-blue)]" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
