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
  selectedAssignees: string[];
  onSelect: (uniqueNames: string[]) => void;
  isLoading?: boolean;
}

export function AssigneeSelector({ teamMembers, selectedAssignees, onSelect, isLoading }: AssigneeSelectorProps) {
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
    if (selectedAssignees.length === 0) return "All Assignees";
    if (selectedAssignees.length === 1) {
      const member = teamMembers.find(m => m.identity.uniqueName === selectedAssignees[0]);
      return member?.identity.displayName || selectedAssignees[0];
    }
    return `${selectedAssignees.length} Selected`;
  };

  const toggleMember = (uniqueName: string) => {
    if (selectedAssignees.includes(uniqueName)) {
      onSelect(selectedAssignees.filter(name => name !== uniqueName));
    } else {
      onSelect([...selectedAssignees, uniqueName]);
    }
  };

  if (teamMembers.length === 0 && !isLoading) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--card-hover)] transition-all text-[11px] font-medium border ${selectedAssignees.length > 0 ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/5' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
      >
        <span className="truncate max-w-[100px]">
          {getButtonLabel()}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in duration-200">
          <div className="px-3 py-1 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Filter by Assignee</div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                onSelect([]);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${selectedAssignees.length === 0 ? 'bg-[var(--accent-blue)]/5' : ''}`}
            >
              <span className={`text-[11px] font-medium ${selectedAssignees.length === 0 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                All Assignees
              </span>
              {selectedAssignees.length === 0 && (
                <svg className="text-[var(--accent-blue)]" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
            </button>
            {teamMembers.map((member) => (
              <button
                key={member.identity.uniqueName}
                onClick={() => toggleMember(member.identity.uniqueName)}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${selectedAssignees.includes(member.identity.uniqueName) ? 'bg-[var(--accent-blue)]/5' : ''}`}
              >
                <span className={`text-[11px] font-medium truncate pr-2 ${selectedAssignees.includes(member.identity.uniqueName) ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                  {member.identity.displayName}
                </span>
                {selectedAssignees.includes(member.identity.uniqueName) && (
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
