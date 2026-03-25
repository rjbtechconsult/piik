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
  workloads?: Record<string, number>;
}

export function AssigneeSelector({ teamMembers, selectedAssignees, onSelect, isLoading, workloads = {} }: AssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const getButtonLabel = () => {
    if (isLoading) return "...";
    if (selectedAssignees.length === 0) return "All Assignees";
    if (selectedAssignees.length === 1) {
      const member = teamMembers.find(m => m.identity.uniqueName === selectedAssignees[0]);
      const count = workloads[selectedAssignees[0]] || 0;
      const name = member?.identity.displayName || selectedAssignees[0];
      return count > 0 ? `${name} (${count})` : name;
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      "bg-orange-500/20 text-orange-400 border-orange-500/30",
      "bg-rose-500/20 text-rose-400 border-rose-500/30",
      "bg-amber-500/20 text-amber-400 border-amber-500/30",
      "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredMembers = teamMembers.filter(member => 
    member.identity.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.identity.uniqueName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (teamMembers.length === 0 && !isLoading) return null;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-[var(--card-hover)] transition-all text-[11px] font-medium border ${selectedAssignees.length > 0 ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/5' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
      >
        <span className="truncate text-left flex-1" title={getButtonLabel()}>
          {getButtonLabel()}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in duration-200">
          <div className="px-3 py-1 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest border-b border-[var(--border-subtle)]/30 mb-1">Filter by Assignee</div>
          
          <div className="px-2 py-1.5">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assignees..."
                className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 text-[11px] text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-main)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {!searchQuery && (
              <button
                onClick={() => {
                  onSelect([]);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${selectedAssignees.length === 0 ? 'bg-[var(--accent-blue)]/5' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[var(--card-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] text-[var(--text-dim)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <span className={`text-[11px] font-medium ${selectedAssignees.length === 0 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                    All Assignees
                  </span>
                </div>
                {selectedAssignees.length === 0 && (
                  <svg className="text-[var(--accent-blue)]" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </button>
            )}

            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <button
                  key={member.identity.uniqueName}
                  onClick={() => toggleMember(member.identity.uniqueName)}
                  className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${selectedAssignees.includes(member.identity.uniqueName) ? 'bg-[var(--accent-blue)]/5' : ''}`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {member.identity.imageUrl ? (
                      <img 
                        src={member.identity.imageUrl} 
                        alt="" 
                        className="w-5 h-5 rounded-full bg-[var(--card-hover)] border border-[var(--border-subtle)]/50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextSibling as HTMLDivElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border ${getAvatarColor(member.identity.displayName)} ${member.identity.imageUrl ? 'hidden' : ''}`}
                    >
                      {getInitials(member.identity.displayName)}
                    </div>
                    <span className={`text-[11px] font-medium truncate ${selectedAssignees.includes(member.identity.uniqueName) ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                      {member.identity.displayName}
                    </span>
                    {workloads[member.identity.uniqueName] > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] text-[9px] font-bold border border-[var(--accent-blue)]/20 animate-in fade-in zoom-in duration-300">
                        {workloads[member.identity.uniqueName]}
                      </span>
                    )}
                  </div>
                  {selectedAssignees.includes(member.identity.uniqueName) && (
                    <svg className="text-[var(--accent-blue)]" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-[10px] text-[var(--text-dim)] italic">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
