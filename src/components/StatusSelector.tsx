import { useState, useRef, useEffect } from "react";

interface StatusSelectorProps {
  availableStatuses: string[];
  selectedStatuses: string[];
  onSelect: (statuses: string[]) => void;
  isLoading?: boolean;
}

export function StatusSelector({ availableStatuses, selectedStatuses, onSelect, isLoading }: StatusSelectorProps) {
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

  const getButtonLabel = () => {
    if (isLoading) return "...";
    if (selectedStatuses.length === 0) return "No Status";
    
    // Check if it matches exactly the "Active" subset
    const activeStates = ["New", "Active", "To Do", "Doing", "InProgress", "In-Progress", "Open", "Approved", "Committed"];
    
    // Logic: If all selected statuses are in the active list, AND all available active statuses are selected
    const selectedAreAllActive = selectedStatuses.every(s => activeStates.includes(s));
    const availableActiveStates = availableStatuses.filter(s => activeStates.includes(s));
    const allAvailableActiveSelected = availableActiveStates.every(s => selectedStatuses.includes(s));
    
    if (selectedAreAllActive && allAvailableActiveSelected && selectedStatuses.length > 0) return "Active Only";
    if (selectedStatuses.length === 1) return selectedStatuses[0];
    if (selectedStatuses.length === availableStatuses.length && availableStatuses.length > 0) return "All Statuses";
    
    return `${selectedStatuses.length} Statuses`;
  };

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onSelect(selectedStatuses.filter(s => s !== status));
    } else {
      onSelect([...selectedStatuses, status]);
    }
  };

  const isSelected = (status: string) => selectedStatuses.includes(status);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1 rounded-md hover:bg-[var(--card-hover)] transition-all text-[11px] font-medium border ${selectedStatuses.length > 0 ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/5' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
      >
        <span className="truncate text-left flex-1" title={getButtonLabel()}>
          {getButtonLabel()}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in duration-200 origin-top-left">
          <div className="px-3 py-1 flex items-center justify-between border-b border-[var(--border-subtle)]/30 mb-1">
            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Filter by Status</span>
            {selectedStatuses.length > 0 && (
              <button 
                onClick={() => onSelect([])}
                className="text-[9px] font-bold text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] uppercase tracking-tighter"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {availableStatuses.length > 0 ? (
              availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${isSelected(status) ? 'bg-[var(--accent-blue)]/10' : ''}`}
                >
                  <span className={`text-[11px] font-medium ${isSelected(status) ? 'text-[var(--accent-blue)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                    {status}
                  </span>
                  {isSelected(status) && (
                    <svg className="text-[var(--accent-blue)]" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-[10px] text-[var(--text-dim)] italic">No statuses found</div>
            )}
          </div>
          
          <div className="border-t border-[var(--border-subtle)]/30 mt-1 pt-1.5 px-2 flex gap-1.5">
             <button 
               onClick={() => {
                 const activeStates = ["New", "Active", "To Do", "Doing", "InProgress", "In-Progress", "Open", "Approved", "Committed"];
                 onSelect(availableStatuses.filter(s => activeStates.includes(s)));
                 setIsOpen(false);
               }}
               className="flex-1 py-1.5 text-[10px] font-medium text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 rounded border border-[var(--accent-blue)]/20 transition-all"
             >
               Active Only
             </button>
             <button 
               onClick={() => {
                 onSelect(availableStatuses);
                 setIsOpen(false);
               }}
               className="flex-1 py-1.5 text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-hover)] rounded border border-[var(--border-subtle)] transition-all"
             >
               Show All
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
