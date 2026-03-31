import { useState } from "react";

interface TeamMember {
  identity: {
    displayName: string;
    uniqueName: string; // This is usually the email
    imageUrl: string;
  };
}

interface CreateItemModalProps {
  onClose: () => void;
  onSave: (title: string, type: string, assigneeUniqueName: string, parentId?: number, areaPath?: string, status?: string) => Promise<void>;
  teamMembers: TeamMember[];
  availableStatuses?: string[];
  isLoading: boolean;
  parentItem?: { id: number; title: string; areaPath: string; iterationPath: string };
  defaultAssigneeUniqueName?: string;
  epics?: any[];
  teams?: any[];
  selectedTeam?: string;
  onEpicTeamChange?: (teamName: string) => void;
}

export function CreateItemModal({ 
  onClose, 
  onSave, 
  teamMembers, 
  isLoading, 
  parentItem, 
  defaultAssigneeUniqueName, 
  epics = [], 
  teams = [],
  selectedTeam,
  onEpicTeamChange,
  availableStatuses = ["New", "Active", "To Do", "Doing", "InProgress", "In-Progress", "Open", "Approved", "Committed"]
}: CreateItemModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(parentItem ? "Task" : "User Story");
  const [status, setStatus] = useState("Active");
  const [assignee, setAssignee] = useState(defaultAssigneeUniqueName || "");
  const [selectedParentEpic, setSelectedParentEpic] = useState<string>("");
  const [modalSelectedTeam, setModalSelectedTeam] = useState(selectedTeam || "");
  const [epicSearch, setEpicSearch] = useState("");
  const [showEpicDropdown, setShowEpicDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter epics based on search query
  const filteredEpics = epics.filter(epic => {
    if (!epicSearch) return true;
    const searchLower = epicSearch.toLowerCase();
    const title = (epic.fields?.["System.Title"] || "").toLowerCase();
    const type = (epic.fields?.["System.WorkItemType"] || "").toLowerCase();
    const id = epic.id.toString();
    return title.includes(searchLower) || type.includes(searchLower) || id.includes(searchLower);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Use parentItem.id if it's a sub-item, otherwise use selectedParentEpic if it's a Story
      const effectiveParentId = parentItem?.id || (selectedParentEpic ? parseInt(selectedParentEpic) : undefined);
      await onSave(title, type, assignee, effectiveParentId, parentItem?.areaPath, status);
      onClose();
    } catch (error) {
      console.error("Failed to create item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[340px] bg-[var(--card-bg)] border border-[var(--border-main)] rounded-[20px] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">
        <div className="p-5 overflow-y-auto max-h-[85vh]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-widest">
              {parentItem ? "New Sub-Item" : "New story"}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-full text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          {parentItem && (
            <div className="mb-4 px-3 py-1.5 bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 rounded-lg">
              <span className="text-[10px] font-bold text-[var(--accent-blue)] uppercase tracking-tighter">Adding to #{parentItem.id}</span>
              <p className="text-[11px] text-[var(--text-muted)] truncate italic">{parentItem.title}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider ml-1">Title</label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-white/5 border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-[12px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-blue)]/50 focus:bg-white/[0.08] transition-all"
                required
              />
            </div>

            <div className={`grid ${parentItem ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {parentItem ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider ml-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-white/5 border border-[var(--border-main)] rounded-xl px-3 py-2.5 text-[12px] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-blue)]/50 appearance-none transition-all cursor-pointer"
                  >
                    <option value="Task" className="bg-[var(--app-bg-solid)]">Task</option>
                    <option value="Bug" className="bg-[var(--app-bg-solid)]">Bug</option>
                  </select>
                </div>
              ) : (
                <div className="bg-white/5 p-4 rounded-2xl border border-[var(--border-main)] space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--accent-blue)] ml-1">Team (Parent Scope)</label>
                    <select
                      value={modalSelectedTeam}
                      onChange={(e) => {
                        const newTeam = e.target.value;
                        setModalSelectedTeam(newTeam);
                        onEpicTeamChange?.(newTeam);
                      }}
                      className="w-full bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-[12px] text-[var(--text-main)] focus:ring-1 focus:ring-[var(--accent-blue)] transition-all outline-none"
                    >
                      <option value="Global" className="bg-[var(--app-bg-solid)] font-bold italic">
                        Project-wide (All Teams)
                      </option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.name} className="bg-[var(--app-bg-solid)]">
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--accent-blue)] ml-1">
                      Epic (Parent)
                    </label>
                    <div 
                      onClick={() => setShowEpicDropdown(true)}
                      className="w-full bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-xl px-4 py-2 text-[12px] text-[var(--text-main)] cursor-pointer hover:border-[var(--accent-blue)]/50 transition-all flex items-center justify-between group"
                    >
                      <span className={selectedParentEpic ? "text-[var(--text-main)] truncate max-w-[200px]" : "text-[var(--text-dim)]"}>
                        {selectedParentEpic ? (
                          epics.find(e => e.id.toString() === selectedParentEpic)?.fields?.["System.Title"] || `Item ${selectedParentEpic}`
                        ) : "Select a parent..."}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-dim)] group-hover:text-[var(--accent-blue)] transition-colors"><path d="m6 9 6 6 6-6"/></svg>
                    </div>

                    {showEpicDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-[105]" 
                          onClick={() => {
                            setShowEpicDropdown(false);
                            setEpicSearch(""); 
                          }} 
                        />
                        <div className="absolute top-0 left-0 right-0 max-h-[220px] overflow-hidden bg-[var(--app-bg-solid)] border border-[var(--accent-blue)]/50 rounded-2xl shadow-2xl z-[110] flex flex-col animate-in fade-in zoom-in duration-150 backdrop-blur-xl">
                          <div className="p-2 border-b border-[var(--border-main)] bg-[var(--app-bg-solid)] relative z-[2]">
                            <div className="relative">
                              <input
                                autoFocus
                                type="text"
                                value={epicSearch}
                                onChange={(e) => setEpicSearch(e.target.value)}
                                placeholder="Filter list..."
                                className="w-full bg-black/40 border border-[var(--border-main)] rounded-lg px-8 py-1.5 text-[11px] text-[var(--text-main)] outline-none focus:border-[var(--accent-blue)]/50 placeholder:text-[var(--text-dim)]"
                              />
                              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                              </div>
                            </div>
                          </div>
                          
                          <div className="overflow-y-auto flex-1 custom-scrollbar min-h-0 relative z-[1]">
                            <div 
                              className="px-4 py-2 hover:bg-[var(--accent-blue)]/10 cursor-pointer text-[11px] text-[var(--text-dim)] border-b border-[var(--border-main)] transition-colors sticky top-0 bg-[var(--app-bg-solid)] z-[1]"
                              onClick={() => {
                                setSelectedParentEpic("");
                                setEpicSearch("");
                                setShowEpicDropdown(false);
                              }}
                            >
                              No Epic (Root)
                            </div>
                            {isLoading ? (
                              <div className="px-4 py-8 text-center text-[10px] text-[var(--text-dim)]">
                                Fetching items...
                              </div>
                            ) : filteredEpics.length === 0 ? (
                              <div className="px-4 py-8 text-center text-[10px] text-[var(--text-dim)]">
                                No matching items found
                              </div>
                            ) : (
                              filteredEpics.map((epic) => (
                                <div
                                  key={epic.id}
                                  className={`px-4 py-1.5 hover:bg-[var(--accent-blue)]/10 cursor-pointer text-[11px] text-[var(--text-main)] border-b last:border-0 border-[var(--border-main)] transition-all flex flex-col gap-0 ${selectedParentEpic === epic.id.toString() ? 'bg-[var(--accent-blue)]/5 border-l-2 border-l-[var(--accent-blue)]' : ''}`}
                                  onClick={() => {
                                    setSelectedParentEpic(epic.id.toString());
                                    setEpicSearch("");
                                    setShowEpicDropdown(false);
                                  }}
                                >
                                  <div className="flex items-center gap-2 opacity-70">
                                    <span className="text-[7px] uppercase tracking-tighter font-black text-[var(--accent-blue)] px-1 rounded-sm bg-[var(--accent-blue)]/10">
                                      {epic.fields?.["System.WorkItemType"]}
                                    </span>
                                    <span className="text-[8px]">#{epic.id}</span>
                                    <span className="text-[8px] ml-auto text-[var(--accent-blue)] font-bold">{epic.fields?.["System.State"]}</span>
                                  </div>
                                  <span className="truncate font-medium">{epic.fields?.["System.Title"] || `Item ${epic.id}`}</span>
                                  <span className="text-[9px] text-[var(--text-dim)] truncate mt-0.5 italic flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                    {epic.fields?.["System.AreaPath"]}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider ml-1">Assignee</label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--border-main)] rounded-xl px-3 py-2.5 text-[12px] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-blue)]/50 appearance-none transition-all cursor-pointer"
                >
                  <option value="" className="bg-[var(--app-bg-solid)]">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option
                      key={member.identity.uniqueName}
                      value={member.identity.uniqueName}
                      className="bg-[var(--app-bg-solid)]"
                    >
                      {member.identity.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider ml-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--border-main)] rounded-xl px-3 py-2.5 text-[12px] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-blue)]/50 appearance-none transition-all cursor-pointer"
                >
                  {availableStatuses.map((s) => (
                    <option key={s} value={s} className="bg-[var(--app-bg-solid)]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading || !title.trim()}
              className="w-full mt-2 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] disabled:bg-[var(--accent-blue)]/30 disabled:text-[var(--text-dim)] text-white text-[12px] font-bold py-3 rounded-xl shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting || isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                  {parentItem ? "Create Sub Item" : "Create Story"}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
