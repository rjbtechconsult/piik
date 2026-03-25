import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getSetting } from "../lib/db";

interface AzureWorkItem {
  id: number;
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.WorkItemType": string;
    "System.AssignedTo": any;
    "System.CreatedDate"?: string;
    "System.AreaPath": string;
    "System.IterationPath": string;
    "System.Parent"?: number;
  };
}

interface HierarchyNode {
  item: AzureWorkItem;
  children: HierarchyNode[];
}

interface HierarchyExplorerProps {
  hierarchy: HierarchyNode[];
  isLoading: boolean;
  selectedStoryId: number | null;
  onSelectStory: (id: number | null) => void;
  statusFilters: string[];
  assigneeFilters: string[];
  epicFilter: number[];
  searchQuery: string;
  baseUrl: string;
  onUpdateStatus: (id: number, newStatus: string) => Promise<void>;
  onUpdateTitle: (id: number, newTitle: string) => Promise<void>;
  onCreateSubItem: (id: number, title: string, areaPath: string, iterationPath: string) => void;
  allWorkItems: AzureWorkItem[];
  onLinkParent: (id: number) => void;
}

interface NodeViewProps {
  node: HierarchyNode;
  level: number;
  selectedStoryId: number | null;
  onSelectStory: (id: number | null) => void;
  statusFilters: string[];
  onUpdateStatus: (id: number, newStatus: string) => Promise<void>;
  onUpdateTitle: (id: number, newTitle: string) => Promise<void>;
  onCreateSubItem: (id: number, title: string, areaPath: string, iterationPath: string) => void;
  baseUrl: string;
  parentEpicTitle?: string;
  workItemLookup: Record<number, AzureWorkItem>;
  onLinkParent: (id: number) => void;
}

const STATUS_OPTIONS = [
  "New", "Active", "Resolved", "Closed", "Removed", // Agile
  "To Do", "Doing", "Done",                       // Basic & Tasks
  "Approved", "Committed"                         // Scrum
];

// Cache for work item type states to avoid redundant fetches
const typeStatesCache: Record<string, string[]> = {};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return "";
  }
};

const getAssigneeUniqueName = (assignedTo: any): string => {
  if (!assignedTo) return "";
  if (typeof assignedTo === 'string') return assignedTo;
  return assignedTo.uniqueName || assignedTo.displayName || "";
};

function NodeView({ node, level, selectedStoryId, onSelectStory, statusFilters, onUpdateStatus, onUpdateTitle, onCreateSubItem, baseUrl, parentEpicTitle, workItemLookup, onLinkParent }: NodeViewProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyTitleFeedback, setCopyTitleFeedback] = useState(false);
  const [allowedStates, setAllowedStates] = useState<string[]>(STATUS_OPTIONS);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.item.fields["System.Title"]);

  useEffect(() => {
    const fetchAllowedStates = async () => {
      const type = node.item.fields["System.WorkItemType"];
      if (!type) return;

      if (typeStatesCache[type]) {
        setAllowedStates(typeStatesCache[type]);
        return;
      }

      try {
        const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
        const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
        let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
        if (!token) token = (await getSetting("azure_pat")) || "";

        if (!org || !project || !token) return;

        const data: any = await invoke("fetch_work_item_states", {
          organization: org,
          project,
          token,
          workItemType: type
        });

        if (data && data.value) {
          const states = data.value.map((s: any) => s.name);
          typeStatesCache[type] = states;
          setAllowedStates(states);
        }
      } catch (err) {
        console.error(`Failed to fetch states for ${type}:`, err);
      }
    };

    fetchAllowedStates();
  }, [node.item.fields["System.WorkItemType"]]);

  const itemUrl = baseUrl ? `${baseUrl}${node.item.id}` : "";
  const itemTitle = node.item.fields["System.Title"];

  useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(itemTitle);
    }
  }, [itemTitle]);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!itemUrl) return;
    navigator.clipboard.writeText(itemUrl);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!itemTitle) return;
    navigator.clipboard.writeText(itemTitle);
    setCopyTitleFeedback(true);
    setTimeout(() => setCopyTitleFeedback(false), 2000);
  };

  const handleOpenLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!itemUrl) return;
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(itemUrl);
    } catch (err) {
      console.error("Failed to open URL:", err);
      window.open(itemUrl, "_blank");
    }
  };

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editedTitle.trim() === "" || editedTitle === itemTitle) {
      setIsEditingTitle(false);
      setEditedTitle(itemTitle);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateTitle(node.item.id, editedTitle.trim());
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Failed to save title:", err);
      setEditedTitle(itemTitle);
    } finally {
      setIsUpdating(false);
    }
  };

  const isSelected = selectedStoryId === node.item.id;
  const [isExpanded, setIsExpanded] = useState(level < 1 || isSelected);
  const hasChildren = node.children.length > 0;
  const type = node.item.fields?.["System.WorkItemType"] || "";
  const isStory = type === "User Story" || type === "Story";
  const state = node.item.fields?.["System.State"] || "New";
  const stateLower = state.toLowerCase();
  const isActive = stateLower === "active" || stateLower === "new" || stateLower === "open" || stateLower === "to do" || stateLower === "doing" || stateLower === "inprogress" || stateLower === "in progress";

  const resolvedParentEpic = parentEpicTitle || (() => {
    const getEpicTitle = (parentId: number | undefined): string | undefined => {
      if (!parentId || !workItemLookup[parentId]) return undefined;
      const parent = workItemLookup[parentId];
      const pType = parent.fields["System.WorkItemType"];
      if (pType === "Epic") return parent.fields["System.Title"];
      if (pType === "Feature") {
        return getEpicTitle(parent.fields["System.Parent"]);
      }
      return undefined;
    };
    return getEpicTitle(node.item.fields["System.Parent"]);
  })();

  if (!node.item.fields || (statusFilters.length > 0 && !statusFilters.includes(state))) return null;

  const getAssigneeName = () => {
    const assignedTo = node.item.fields["System.AssignedTo"];
    if (!assignedTo) return "";
    if (typeof assignedTo === 'string') return assignedTo;
    return assignedTo.displayName || assignedTo.uniqueName || "";
  };

  if (isStory) {
    return (
      <div className="flex flex-col gap-2 mb-4">
        <div
          onClick={() => {
            onSelectStory(isSelected ? null : node.item.id);
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
          className={`relative flex flex-col p-4 bg-[var(--card-bg)] border rounded-xl transition-all cursor-pointer group ${isSelected ? 'border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]/30 shadow-lg shadow-blue-500/5' : 'border-[var(--border-main)] hover:border-[var(--accent-blue)]/50'}`}
        >
          <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-colors ${isSelected ? 'bg-[var(--accent-blue)]' : isActive ? 'bg-[var(--accent-blue)]/40' : 'bg-[var(--border-main)]'}`} />

          <div className="flex items-start pl-2">
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  {resolvedParentEpic ? (
                    <div className="text-[10px] text-[var(--text-dim)] italic mb-1 truncate max-w-full opacity-70" title={`Parent Epic: ${resolvedParentEpic}`}>
                      {resolvedParentEpic}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
                      <div className="text-[9px] font-bold text-red-500/80 uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                        No Parent
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLinkParent(node.item.id);
                        }}
                        className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[8px] font-bold transition-all border border-red-500/20 uppercase tracking-tighter shrink-0"
                      >
                        Link Parent
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] text-[9px] font-black uppercase tracking-wider border border-[var(--accent-blue)]/30">
                      Story
                    </span>
                    <span className="text-[11px] font-bold text-[var(--text-dim)] tracking-tight flex items-center gap-1.5">
                      #{node.item.id}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0 group/title flex items-center gap-1.5">
                    {isEditingTitle ? (
                      <form 
                        onSubmit={handleSaveTitle} 
                        className="flex-1 flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onBlur={() => {
                            if (editedTitle === itemTitle) setIsEditingTitle(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setIsEditingTitle(false);
                              setEditedTitle(itemTitle);
                            }
                          }}
                          className="flex-1 bg-[var(--card-bg)] border border-[var(--accent-blue)] rounded px-1.5 py-0.5 text-[11px] font-bold text-[var(--text-main)] focus:outline-none shadow-sm"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="submit" className="p-1 hover:bg-green-500/10 rounded transition-colors cursor-pointer" title="Save title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                          <button type="button" onClick={() => { setIsEditingTitle(false); setEditedTitle(itemTitle); }} className="p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer" title="Cancel">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3 className="flex-1 text-[13px] font-bold text-[var(--text-main)] leading-snug group-hover:text-[var(--accent-blue)] transition-colors break-words">
                          {itemTitle}
                        </h3>
                        {/* Action icons beside title (Edit and Copy Title) */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/title:opacity-100 transition-all shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                            className="p-1 hover:bg-[var(--card-hover)] rounded transition-all cursor-pointer"
                            title="Edit title"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-dim)] hover:text-[var(--accent-blue)]">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleCopyTitle(e); }} className={`p-1 hover:bg-[var(--card-hover)] rounded transition-colors cursor-pointer ${copyTitleFeedback ? 'text-green-400' : 'text-orange-400/80 hover:text-orange-400'}`} title="Copy item title">
                            {copyTitleFeedback ? <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 pl-3">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <button onClick={handleCopyLink} className={`p-1 hover:bg-[var(--card-hover)] rounded transition-colors cursor-pointer ${copyFeedback ? 'text-green-400' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'}`} title="Copy direct link">
                      {copyFeedback ? <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>}
                    </button>
                    <button onClick={handleOpenLink} className="p-1 hover:bg-[var(--card-hover)] rounded text-[var(--text-dim)] hover:text-[var(--accent-blue)] transition-all cursor-pointer" title="Open in Browser">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateSubItem(node.item.id, itemTitle, node.item.fields["System.AreaPath"], node.item.fields["System.IterationPath"]);
                    }}
                    className="shrink-0 p-1 px-2 flex items-center gap-1.5 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 hover:bg-[var(--accent-blue)]/20 hover:border-[var(--accent-blue)]/40 transition-all active:scale-95 group/sub"
                    title="Add Sub-item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Task</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <div className="relative" onMouseEnter={() => setShowStatusMenu(true)} onMouseLeave={() => setShowStatusMenu(false)}>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30' : 'bg-[var(--card-bg-subtle)] text-[var(--text-muted)] border border-[var(--border-main)]'} hover:bg-[var(--accent-blue)]/30 hover:text-[var(--text-main)] transition-all cursor-pointer flex items-center gap-1.5`}>
                      <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-[var(--accent-blue)]' : 'bg-[var(--text-dim)]'}`} />
                      {isUpdating ? 'Updating...' : state}
                    </div>
                    {showStatusMenu && (
                      <div className="absolute top-[calc(100%-4px)] left-0 pt-1 z-50">
                        <div className="bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl py-1 min-w-[100px] backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
                          {STATUS_OPTIONS.map(s => (
                            <button key={s} onClick={async (e) => { e.stopPropagation(); setIsUpdating(true); setShowStatusMenu(false); try { await onUpdateStatus(node.item.id, s); } finally { setIsUpdating(false); } }} className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-[var(--card-hover)] transition-colors ${state === s ? 'text-[var(--accent-blue)] font-bold bg-[var(--accent-blue)]/5' : 'text-[var(--text-muted)]'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {node.item.fields["System.CreatedDate"] && (
                    <span className="text-[10px] text-[var(--text-dim)] italic">
                      {formatDate(node.item.fields["System.CreatedDate"])}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] group-hover:text-[var(--accent-blue)] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 text-[var(--accent-blue)]"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <span>{getAssigneeName()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col gap-2 ml-8 mt-1 border-l-2 border-[var(--border-subtle)] pl-4 py-1">
            {hasChildren ? (
              node.children
                .filter(child => statusFilters.length === 0 || statusFilters.includes(child.item.fields["System.State"]))
                .map(child => (
                  <NodeView key={child.item.id} node={child} level={level + 1} selectedStoryId={selectedStoryId} onSelectStory={onSelectStory} statusFilters={statusFilters} onUpdateStatus={onUpdateStatus} onUpdateTitle={onUpdateTitle} onCreateSubItem={onCreateSubItem} baseUrl={baseUrl} parentEpicTitle={resolvedParentEpic} workItemLookup={workItemLookup} onLinkParent={onLinkParent} />
                ))
            ) : (
              <div className="text-[10px] text-[var(--text-dim)] italic p-2 border border-dashed border-[var(--border-subtle)] rounded-lg text-center">
                No active tasks found for this story
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Regular Task View
  return (
    <div className={`flex flex-col ${level > 0 ? 'mb-1' : 'mb-3'}`}>
      <div
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        className={`flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--card-hover)] transition-all group border border-transparent hover:border-[var(--border-subtle)] ${hasChildren ? 'cursor-pointer' : ''}`}
      >
        <div className="mt-1 flex items-center justify-center w-4 h-4 shrink-0 transition-colors">
          {hasChildren ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-[var(--text-dim)] group-hover:text-[var(--accent-blue)] transition-transform duration-200 ${isExpanded ? 'rotate-90 text-[var(--accent-blue)]' : ''}`}><path d="m9 18 6-6-6-6" /></svg>
          ) : (
            node.item.fields["System.WorkItemType"] === "Bug" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"><circle cx="12" cy="12" r="10" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--accent-blue)] shadow-[0_0_8px_rgba(0,122,255,0.4)]"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /></svg>
            )
          )}
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex-1 min-w-0 group/title flex items-center gap-1.5">
            {isEditingTitle ? (
              <form 
                onSubmit={handleSaveTitle} 
                className="flex-1 flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  autoFocus
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={() => { if (editedTitle === itemTitle) setIsEditingTitle(false); }}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setIsEditingTitle(false); setEditedTitle(itemTitle); } }}
                  className="flex-1 bg-[var(--card-bg)] border border-[var(--accent-blue)] rounded px-1.5 py-0.5 text-[11px] font-bold text-[var(--text-main)] focus:outline-none shadow-sm"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button type="submit" className="p-1 hover:bg-green-500/10 rounded transition-colors cursor-pointer" title="Save title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button type="button" onClick={() => { setIsEditingTitle(false); setEditedTitle(itemTitle); }} className="p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer" title="Cancel">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h4 className="flex-1 text-[10.5px] font-semibold text-[var(--text-main)] break-words group-hover:text-[var(--accent-blue)] transition-colors">
                  {itemTitle}
                </h4>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                  className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-[var(--card-hover)] rounded transition-all shrink-0 cursor-pointer"
                  title="Edit title"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-dim)] hover:text-[var(--accent-blue)]">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-auto pl-2">
                  <button onClick={handleCopyTitle} className={`p-1 hover:bg-[var(--card-hover)] rounded transition-colors cursor-pointer ${copyTitleFeedback ? 'text-green-400' : 'text-orange-400/80 hover:text-orange-400'}`} title="Copy item title">
                    {copyTitleFeedback ? <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                  </button>
                  <button onClick={handleCopyLink} className={`p-1 hover:bg-[var(--card-hover)] rounded transition-colors cursor-pointer ${copyFeedback ? 'text-green-400' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'}`} title="Copy direct link">
                    {copyFeedback ? <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>}
                  </button>
                  <button onClick={handleOpenLink} className="p-1 hover:bg-[var(--card-hover)] rounded text-[var(--text-dim)] hover:text-[var(--accent-blue)] transition-all cursor-pointer" title="Open in Browser">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[9px] font-mono text-[var(--text-dim)] flex items-center gap-1.5">
              #{node.item.id}
            </span>
            <div className="relative" onMouseEnter={() => setShowStatusMenu(true)} onMouseLeave={() => setShowStatusMenu(false)}>
              <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded border transition-all cursor-pointer ${isActive ? 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/20 text-[var(--accent-blue)]' : 'bg-[var(--card-bg-subtle)] border-[var(--border-main)] text-[var(--text-muted)]'}`}>
                <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-[var(--accent-blue)]' : 'bg-white/10'}`} />
                <span className="text-[9px] font-bold uppercase tracking-tighter">{isUpdating ? '...' : state}</span>
              </div>
              {showStatusMenu && (
                <div className="absolute top-[calc(100%-4px)] left-0 pt-1 z-50">
                  <div className="bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl py-1 min-w-[100px] backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
                    {allowedStates.map(s => (
                      <button key={s} onClick={async (e) => { e.stopPropagation(); setIsUpdating(true); setShowStatusMenu(false); try { await onUpdateStatus(node.item.id, s); } finally { setIsUpdating(false); } }} className={`w-full text-left px-3 py-1.5 text-[9px] hover:bg-[var(--card-hover)] transition-colors ${state === s ? 'text-[var(--accent-blue)] font-bold bg-[var(--accent-blue)]/5' : 'text-[var(--text-muted)]'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {node.item.fields["System.CreatedDate"] && (
              <span className="text-[9px] text-[var(--text-dim)] italic">{formatDate(node.item.fields["System.CreatedDate"])}</span>
            )}
            {getAssigneeName() && (
              <span className="text-[9px] text-[var(--text-dim)] flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 text-[var(--accent-blue)]"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <span>{getAssigneeName()}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="flex flex-col gap-1 ml-6 mt-0.5 border-l border-[var(--border-subtle)] pl-4 pb-2">
          {node.children.map(child => (
            <NodeView key={child.item.id} node={child} level={level + 1} selectedStoryId={selectedStoryId} onSelectStory={onSelectStory} statusFilters={statusFilters} onUpdateStatus={onUpdateStatus} onUpdateTitle={onUpdateTitle} onCreateSubItem={onCreateSubItem} baseUrl={baseUrl} parentEpicTitle={resolvedParentEpic} workItemLookup={workItemLookup} onLinkParent={onLinkParent} />
          ))}
        </div>
      )}
    </div>
  );
}

const filterHierarchy = (nodes: HierarchyNode[], assigneeFilters: string[], searchQuery: string, statusFilters: string[], epicFilter: number[], workItemLookup: Record<number, AzureWorkItem>): HierarchyNode[] => {
  return nodes
    .map(node => {
      const assignedTo = node.item.fields["System.AssignedTo"];
      const assigneeMatches = assigneeFilters.length === 0 || assigneeFilters.includes(getAssigneeUniqueName(assignedTo));
      
      const title = node.item.fields["System.Title"]?.toLowerCase() || "";
      const id = node.item.id.toString();
      const q = searchQuery.toLowerCase();
      const searchMatches = !searchQuery || title.includes(q) || id.includes(q);
      
      const statusMatches = statusFilters.length === 0 || statusFilters.includes(node.item.fields["System.State"]);
      
      const matchesSelf = assigneeMatches && searchMatches && statusMatches;
      
      const filteredChildren = filterHierarchy(node.children, assigneeFilters, searchQuery, statusFilters, epicFilter, workItemLookup);
      const hasMatchingChild = filteredChildren.length > 0;
      
      if (matchesSelf || hasMatchingChild) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    })
    .filter((n): n is HierarchyNode => n !== null)
    .filter(node => {
      if (epicFilter.length === 0) return true;
      
      const hasFilteredAncestor = (workItem: AzureWorkItem): boolean => {
        const parentId = workItem.fields["System.Parent"];
        if (!parentId) return false;
        if (epicFilter.includes(parentId)) return true;
        const parent = workItemLookup[parentId];
        return parent ? hasFilteredAncestor(parent) : false;
      };

      const hasFilteredDescendant = (n: HierarchyNode): boolean => {
        return n.children.some(c => epicFilter.includes(c.item.id) || hasFilteredDescendant(c));
      };

      return epicFilter.includes(node.item.id) || hasFilteredAncestor(node.item) || hasFilteredDescendant(node);
    });
};

export function HierarchyExplorer({ hierarchy, isLoading, selectedStoryId, onSelectStory, statusFilters, assigneeFilters, epicFilter, searchQuery, baseUrl, onUpdateStatus, onUpdateTitle, onCreateSubItem, allWorkItems, onLinkParent }: HierarchyExplorerProps) {
  const workItemLookup = (allWorkItems || []).reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<number, AzureWorkItem>);

  const filteredHierarchy = filterHierarchy(hierarchy, assigneeFilters, searchQuery, statusFilters, epicFilter, workItemLookup);

  if (filteredHierarchy.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-[var(--text-dim)] gap-4 px-8 text-center bg-black/10 m-3 rounded-2xl border border-[var(--border-subtle)] border-dashed">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 animate-in fade-in zoom-in duration-1000"><path d="M18 10a6 6 0 0 0-12 0v8l3-2 3 2 3-2 3 2V10Z" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /></svg>
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm font-bold text-[var(--text-muted)]">No matching work items found</p>
          <p className="text-[10px] text-[var(--text-dim)] italic">Try adjusting your filters or search query.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 pt-4 custom-scrollbar">
      {filteredHierarchy.map(node => (
        <NodeView key={node.item.id} node={node} level={0} selectedStoryId={selectedStoryId} onSelectStory={onSelectStory} statusFilters={statusFilters} onUpdateStatus={onUpdateStatus} onUpdateTitle={onUpdateTitle} onCreateSubItem={onCreateSubItem} baseUrl={baseUrl} workItemLookup={workItemLookup} onLinkParent={onLinkParent} />
      ))}
    </div>
  );
}
