import { useState, useRef, useEffect } from "react";

interface TeamMember {
  identity: {
    displayName: string;
    uniqueName: string;
    imageUrl: string;
  };
}

interface AssigneeSelectorProps {
  teamMembers: TeamMember[];
  selectedAssignee: string | null;
  onSelect: (uniqueName: string | null) => void;
  isLoading?: boolean;
}

export function AssigneeSelector({ teamMembers, selectedAssignee, onSelect, isLoading }: AssigneeSelectorProps) {
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

  const selectedMember = teamMembers.find(m => m.identity.uniqueName === selectedAssignee);

  if (teamMembers.length === 0 && !isLoading) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all text-[11px] font-medium border border-[var(--border-subtle)]"
      >
        <span className="truncate max-w-[100px]">
          {isLoading ? "..." : (selectedMember?.identity.displayName || "All Assignees")}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in duration-200">
          <div className="px-3 py-1 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Filter by Assignee</div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${!selectedAssignee ? 'bg-[var(--accent-blue)]/5' : ''}`}
            >
              <span className={`text-[11px] font-medium ${!selectedAssignee ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                All Assignees
              </span>
              {!selectedAssignee && (
                <svg className="text-[var(--accent-blue)]" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
            </button>
            {teamMembers.map((member) => (
              <button
                key={member.identity.uniqueName}
                onClick={() => {
                  onSelect(member.identity.uniqueName);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${selectedAssignee === member.identity.uniqueName ? 'bg-[var(--accent-blue)]/5' : ''}`}
              >
                <span className={`text-[11px] font-medium truncate pr-2 ${selectedAssignee === member.identity.uniqueName ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                  {member.identity.displayName}
                </span>
                {selectedAssignee === member.identity.uniqueName && (
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
