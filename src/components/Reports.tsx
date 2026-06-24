import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import Switch from "./Switch";
import { AssigneeSelector } from "./AssigneeSelector";

interface ReportsProps {
  organization: string;
  project: string;
  token: string;
  selectedTeam?: string;
  defaultAreaPath?: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  "Epic": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Feature": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "User Story": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Story": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Product Backlog Item": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Task": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Bug": "bg-red-500/10 text-red-400 border-red-500/20",
};

const getAssigneeName = (assignedTo: any): string => {
  if (!assignedTo) return "Unassigned";
  if (typeof assignedTo === "string") return assignedTo;
  return assignedTo.displayName || assignedTo.uniqueName || "Unassigned";
};

interface InitiativeSelectorProps {
  items: any[];
  selectedIds: number[];
  onSelect: (ids: number[]) => void;
}

function InitiativeSelector({ items, selectedIds, onSelect }: InitiativeSelectorProps) {
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
    if (selectedIds.length === 0) return "All Stories / Epics";
    const selectedTitles = selectedIds
      .map(id => {
        const item = items.find(i => Number(i.fields?.["System.Id"] || i.id) === id);
        return item?.fields?.["System.Title"] || `#${id}`;
      });
    return selectedTitles.join(", ");
  };

  const toggleItem = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter(i => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  const filteredItems = items.filter(item => {
    const title = item.fields?.["System.Title"] || "";
    const id = item.fields?.["System.Id"] || item.id || "";
    return title.toLowerCase().includes(searchQuery.toLowerCase()) || id.toString().includes(searchQuery);
  });

  return (
    <div className="relative w-full text-[10px]" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--card-hover)] transition-all font-semibold border ${selectedIds.length > 0 ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/5' : 'border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--app-bg-solid)]'}`}
      >
        <span className="truncate text-left flex-1 font-medium" title={getButtonLabel()}>
          {getButtonLabel()}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 w-full bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top">
          <div className="px-2 py-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories or epics..."
              className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[10px] text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
            />
          </div>

          <div className="max-h-48 overflow-y-auto custom-scrollbar mt-1 border-t border-[var(--border-subtle)]/30">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-2 text-center text-[9px] text-[var(--text-dim)] font-medium">
                No items found
              </div>
            ) : (
              filteredItems.map((item) => {
                const id = Number(item.fields?.["System.Id"] || item.id);
                const type = item.fields?.["System.WorkItemType"] || "";
                const title = item.fields?.["System.Title"] || "";
                const isSelected = selectedIds.includes(id);

                return (
                  <button
                    key={id}
                    onClick={() => toggleItem(id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[var(--card-hover)] text-left transition-colors group ${isSelected ? 'bg-[var(--accent-blue)]/5' : ''}`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[7px] font-black uppercase tracking-widest px-1 rounded border shrink-0 ${TYPE_COLORS[type] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                          {type}
                        </span>
                        <span className="text-[7px] text-[var(--text-dim)] font-mono">#{id}</span>
                      </div>
                      <span className={`text-[10px] font-medium truncate ${isSelected ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                        {title}
                      </span>
                    </div>
                    {isSelected && (
                      <svg className="text-[var(--accent-blue)] shrink-0" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Reports({ organization, project, token, selectedTeam, defaultAreaPath }: ReportsProps) {
  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const today = new Date();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(today.getDate() - 14);

  const [startDate, setStartDate] = useState<string>(formatDateString(fourteenDaysAgo));
  const [endDate, setEndDate] = useState<string>(formatDateString(today));
  const [useTeamScope, setUseTeamScope] = useState<boolean>(!!selectedTeam && !!defaultAreaPath);
  const [items, setItems] = useState<any[]>([]);
  const [parentItems, setParentItems] = useState<any[]>([]);
  const [selectedInitiatives, setSelectedInitiatives] = useState<number[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  const fetchReportItems = async () => {
    if (!organization || !project || !token) {
      setError("Azure DevOps credentials are not fully configured.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const areaPath = useTeamScope ? defaultAreaPath : null;
      console.log(`Reports: Fetching items from ${startDate} to ${endDate} (Area: ${areaPath})`);
      const data = await invoke<any>("fetch_report_work_items", {
        organization,
        project,
        token,
        startDate,
        endDate,
        areaPath,
      });
      setItems(data?.items || []);
      setParentItems(data?.parents || []);
      setSelectedInitiatives([]); // Reset filters when date/scope changes
      setSelectedAssignees([]); // Reset assignee filters when date/scope changes
    } catch (err: any) {
      console.error("Reports: Error fetching report items:", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!organization || !project || !token || !selectedTeam) return;
    try {
      const data: any = await invoke("fetch_team_members", {
        organization,
        project,
        team: selectedTeam,
        token
      });
      if (data?.value) {
        setTeamMembers(data.value);
      } else if (Array.isArray(data)) {
        setTeamMembers(data);
      }
    } catch (err) {
      console.error("Reports: Failed to fetch team members:", err);
    }
  };

  useEffect(() => {
    fetchReportItems();
  }, [startDate, endDate, useTeamScope, organization, project, token, defaultAreaPath]);

  useEffect(() => {
    fetchMembers();
  }, [organization, project, token, selectedTeam]);

  useEffect(() => {
    if (selectedTeam && defaultAreaPath) {
      setUseTeamScope(true);
    } else {
      setUseTeamScope(false);
    }
  }, [selectedTeam, defaultAreaPath]);

  const parentMap = useMemo(() => {
    const map = new Map<number, number>();
    const all = [...items, ...parentItems];
    all.forEach(item => {
      const id = item.fields?.["System.Id"] || item.id;
      const parentId = item.fields?.["System.Parent"];
      if (id && parentId) {
        map.set(Number(id), Number(parentId));
      }
    });
    return map;
  }, [items, parentItems]);

  const isChildOfAny = (itemId: number, targetParentIds: number[]): boolean => {
    let currentId = itemId;
    const visited = new Set<number>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      if (targetParentIds.includes(currentId)) {
        return true;
      }
      const parentId = parentMap.get(currentId);
      if (!parentId) break;
      currentId = parentId;
    }
    return false;
  };

  const selectableInitiatives = useMemo(() => {
    const list: any[] = [];
    const addedIds = new Set<number>();

    const addIfStoryOrEpic = (item: any) => {
      if (!item?.fields) return;
      const id = item.fields["System.Id"] || item.id;
      if (!id || addedIds.has(Number(id))) return;

      const type = item.fields["System.WorkItemType"] || "";
      const isEpic = type === "Epic" || type === "Feature";
      const isStory = type === "Story" || type === "User Story" || type === "Product Backlog Item" || type === "Requirement" || type === "Issue";
      
      if (isEpic || isStory) {
        list.push(item);
        addedIds.add(Number(id));
      }
    };

    items.forEach(item => addIfStoryOrEpic(item));
    parentItems.forEach(item => addIfStoryOrEpic(item));

    return list.sort((a, b) => {
      const typeA = a.fields["System.WorkItemType"] || "";
      const typeB = b.fields["System.WorkItemType"] || "";
      const titleA = a.fields["System.Title"] || "";
      const titleB = b.fields["System.Title"] || "";

      const isEpicA = typeA === "Epic" || typeA === "Feature";
      const isEpicB = typeB === "Epic" || typeB === "Feature";

      if (isEpicA && !isEpicB) return -1;
      if (!isEpicA && isEpicB) return 1;
      return titleA.localeCompare(titleB);
    });
  }, [items, parentItems]);

  const filteredItems = useMemo(() => {
    let result = items;

    // 1. Filter by Assignees
    if (selectedAssignees.length > 0) {
      result = result.filter(item => {
        const assignedTo = item.fields?.["System.AssignedTo"];
        const uniqueName = assignedTo?.uniqueName || (typeof assignedTo === "string" ? assignedTo : "");
        return uniqueName && selectedAssignees.includes(uniqueName);
      });
    }

    // 2. Filter by Stories / Epics
    if (selectedInitiatives.length > 0) {
      result = result.filter(item => {
        const id = item.fields?.["System.Id"] || item.id;
        if (!id) return false;

        const type = item.fields?.["System.WorkItemType"] || "";
        const isEpic = type === "Epic" || type === "Feature";
        const isStory = type === "Story" || type === "User Story" || type === "Product Backlog Item" || type === "Requirement" || type === "Issue";

        if (selectedInitiatives.includes(Number(id))) {
          return true;
        }

        if (isEpic || isStory) {
          return false;
        }

        return isChildOfAny(Number(id), selectedInitiatives);
      });
    }

    return result;
  }, [items, selectedInitiatives, selectedAssignees, parentMap]);

  const summary = useMemo(() => {
    let epicsCount = 0;
    let storiesCount = 0;
    let tasksCount = 0;

    filteredItems.forEach((item) => {
      if (!item?.fields) return;
      const type = item.fields["System.WorkItemType"] || "";
      if (type === "Epic" || type === "Feature") {
        epicsCount++;
      } else if (
        type === "Story" ||
        type === "User Story" ||
        type === "Product Backlog Item" ||
        type === "Requirement" ||
        type === "Issue"
      ) {
        storiesCount++;
      } else if (type === "Task" || type === "Bug") {
        tasksCount++;
      }
    });

    return {
      epics: epicsCount,
      stories: storiesCount,
      tasks: tasksCount,
      total: filteredItems.length,
    };
  }, [filteredItems]);

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(formatDateString(start));
    setEndDate(formatDateString(end));
  };

  const handleThisMonth = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setStartDate(formatDateString(start));
    setEndDate(formatDateString(end));
  };

  const handleLastMonth = () => {
    const endOfLastMonth = new Date();
    endOfLastMonth.setDate(1);
    endOfLastMonth.setDate(0);
    
    const startOfLastMonth = new Date(endOfLastMonth.getFullYear(), endOfLastMonth.getMonth(), 1);
    setStartDate(formatDateString(startOfLastMonth));
    setEndDate(formatDateString(endOfLastMonth));
  };

  const handleExport = () => {
    const itemsToExport = filteredItems.filter(item => {
      if (selectedInitiatives.length > 0) {
        const type = item.fields?.["System.WorkItemType"] || "";
        return type === "Task" || type === "Bug";
      }
      return true;
    });

    if (itemsToExport.length === 0) return;

    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    // Header row
    let csvContent = "ID,Title,Work Item Type,State,Created Date,Closed Date,Created By,Assigned To,Area Path\n";

    // Data rows
    itemsToExport.forEach((item) => {
      const fields = item.fields || {};
      const id = fields["System.Id"] || item.id || "";
      const title = fields["System.Title"] || "";
      const type = fields["System.WorkItemType"] || "";
      const state = fields["System.State"] || "";
      const createdDate = fields["System.CreatedDate"]
        ? new Date(fields["System.CreatedDate"]).toLocaleDateString()
        : "";
      const closedDate = fields["Microsoft.VSTS.Common.ClosedDate"]
        ? new Date(fields["Microsoft.VSTS.Common.ClosedDate"]).toLocaleDateString()
        : "";
      const creator = getAssigneeName(fields["System.CreatedBy"]);
      const assignee = getAssigneeName(fields["System.AssignedTo"]);
      const areaPath = fields["System.AreaPath"] || "";

      csvContent += [
        escapeCSV(id),
        escapeCSV(title),
        escapeCSV(type),
        escapeCSV(state),
        escapeCSV(createdDate),
        escapeCSV(closedDate),
        escapeCSV(creator),
        escapeCSV(assignee),
        escapeCSV(areaPath)
      ].join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const exportPrefix = selectedInitiatives.length > 0 ? "Tasks_Report" : "Created_Items_Report";
    link.download = `Piik_${exportPrefix}_${startDate}_to_${endDate}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
    }, 2000);
  };

  return (
    <div className="px-3 py-3 space-y-3 animate-in fade-in duration-300">
      {/* Date controls header */}
      <div className="bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--text-main)] uppercase tracking-wider">Date Filters</span>
          {selectedTeam && defaultAreaPath && (
            <Switch
              checked={useTeamScope}
              onChange={setUseTeamScope}
              label="Team Scope"
            />
          )}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-wider pl-0.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-wider pl-0.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>
        </div>

        {/* Quick Range Presets */}
        <div className="flex flex-wrap gap-1 pt-1 border-t border-[var(--border-subtle)]">
          {[
            { label: "7D", onClick: () => handlePreset(7) },
            { label: "14D", onClick: () => handlePreset(14) },
            { label: "This Month", onClick: handleThisMonth },
            { label: "Last Month", onClick: handleLastMonth }
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={preset.onClick}
              className="px-2 py-1 rounded bg-[var(--app-bg-solid)] hover:bg-[var(--card-hover)] border border-[var(--border-main)] text-[8px] font-bold text-[var(--text-muted)] transition-colors active:scale-95 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Work Item Filters */}
      {(selectableInitiatives.length > 0 || teamMembers.length > 0) && (
        <div className="bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-main)] uppercase tracking-wider">Filters</span>
            {(selectedInitiatives.length > 0 || selectedAssignees.length > 0) && (
              <button 
                onClick={() => {
                  setSelectedInitiatives([]);
                  setSelectedAssignees([]);
                }} 
                className="text-[9px] font-semibold text-[var(--accent-blue)] hover:underline active:scale-95 transition-all cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Stories / Epics Filter */}
            {selectableInitiatives.length > 0 && (
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-wider pl-0.5">Stories / Epics</label>
                <InitiativeSelector 
                  items={selectableInitiatives}
                  selectedIds={selectedInitiatives}
                  onSelect={setSelectedInitiatives}
                />
              </div>
            )}

            {/* Assignee Filter */}
            {teamMembers.length > 0 && (
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-wider pl-0.5">Assignees</label>
                <AssigneeSelector 
                  teamMembers={teamMembers}
                  selectedAssignees={selectedAssignees}
                  onSelect={setSelectedAssignees}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-[var(--accent-blue)]/30 border-t-[var(--accent-blue)] rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-xl p-3 leading-relaxed">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Epics", value: summary.epics, color: "text-sky-400" },
              { label: "Stories", value: summary.stories, color: "text-blue-400" },
              { label: "Tasks/Bugs", value: summary.tasks, color: "text-amber-400" },
              { label: "Total", value: summary.total, color: "text-[var(--accent-blue)]" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl p-2 text-center"
              >
                <div className={`text-[15px] font-black ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-[7px] font-bold text-[var(--text-dim)] uppercase tracking-wider mt-0.5 truncate">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                {selectedInitiatives.length > 0 
                  ? "Filtered Tasks" 
                  : (selectedAssignees.length > 0 ? "Filtered Items" : "Created Items")
                } ({
                  selectedInitiatives.length > 0 
                    ? filteredItems.filter(item => {
                        const type = item.fields?.["System.WorkItemType"] || "";
                        return type === "Task" || type === "Bug";
                      }).length 
                    : filteredItems.length
                })
              </span>
              <button
                onClick={handleExport}
                disabled={exportSuccess}
                className={`flex items-center gap-1 px-3 py-1 text-white text-[9px] font-bold rounded-lg transition-all active:scale-[0.97] cursor-pointer shadow-lg ${
                  exportSuccess 
                    ? "bg-emerald-600 hover:bg-emerald-600 shadow-emerald-500/10" 
                    : "bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] shadow-blue-500/10"
                }`}
              >
                {exportSuccess ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Exported!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export to CSV
                  </>
                )}
              </button>
            </div>
          )}

          {/* List of items */}
          <div className="space-y-1.5 max-h-[175px] overflow-y-auto pr-0.5 custom-scrollbar">
            {filteredItems.map((item) => {
              const fields = item.fields || {};
              const type = fields["System.WorkItemType"] || "Other";
              const title = fields["System.Title"] || "";
              const id = fields["System.Id"] || item.id || "";
              const state = fields["System.State"] || "";
              const creator = getAssigneeName(fields["System.CreatedBy"]);

              return (
                <div
                  key={id}
                  className="bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-lg p-2 flex items-center justify-between gap-3 text-[10px] hover:border-[var(--accent-blue)]/30 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-[var(--text-dim)] shrink-0">#{id}</span>
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${TYPE_COLORS[type] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}
                      >
                        {type}
                      </span>
                      <span className="text-[8px] text-[var(--text-dim)] font-medium truncate max-w-[90px]">by {creator}</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-main)] font-semibold truncate leading-tight">
                      {title}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--app-bg-solid)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded">
                      {state}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl">
                <p className="text-[10px] text-[var(--text-dim)] font-medium">
                  {items.length > 0 ? "No work items match the active filters." : "No work items created in this date range."}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
