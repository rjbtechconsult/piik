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

function NodeView({ node, level, selectedStoryId, onSelectStory, statusFilters, onUpdateStatus, onCreateSubItem, baseUrl, parentEpicTitle, workItemLookup, onLinkParent }: NodeViewProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyTitleFeedback, setCopyTitleFeedback] = useState(false);
  const [allowedStates, setAllowedStates] = useState<string[]>(STATUS_OPTIONS);

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
        // Fallback to default if fetch fails
      }
    };

    fetchAllowedStates();
  }, [node.item.fields["System.WorkItemType"]]);

  const itemUrl = baseUrl ? `${baseUrl}${node.item.id}` : "";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!itemUrl) return;
    navigator.clipboard.writeText(itemUrl);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const title = node.item.fields["System.Title"];
    if (!title) return;
    navigator.clipboard.writeText(title);
    setCopyTitleFeedback(true);
    setTimeout(() => setCopyTitleFeedback(false), 2000);
  };

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!itemUrl) return;
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(itemUrl);
    } catch (err) {
      console.error("Failed to open URL:", err);
      // Fallback
      window.open(itemUrl, "_blank");
    }
  };

  const isSelected = selectedStoryId === node.item.id;
  const [isExpanded, setIsExpanded] = useState(level < 1 || isSelected);
  const hasChildren = node.children.length > 0;
  const type = node.item.fields?.["System.WorkItemType"] || "";
  const isStory = type === "User Story" || type === "Story";
  const isEpic = type === "Epic";
  const state = node.item.fields?.["System.State"] || "New";
  const stateLower = state.toLowerCase();
  const isActive = stateLower === "active" || stateLower === "new" || stateLower === "open" || stateLower === "to do" || stateLower === "doing" || stateLower === "inprogress" || stateLower === "in progress";

  // If we don't have a parent title from the tree, try to resolve it from the flat lookup
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
        {/* Story Card */}
        <div
          onClick={() => {
            onSelectStory(isSelected ? null : node.item.id);
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
          className={`relative flex flex-col p-4 bg-[var(--card-bg)] border rounded-xl transition-all cursor-pointer group ${isSelected ? 'border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]/30 shadow-lg shadow-blue-500/5' : 'border-[var(--border-main)] hover:border-[var(--accent-blue)]/50'}`}
        >
          {/* Left accent border for active/selected */}
          <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-colors ${isSelected ? 'bg-[var(--accent-blue)]' : isActive ? 'bg-[var(--accent-blue)]/40' : 'bg-[var(--border-main)]'}`} />

          <div className="flex items-start pl-2">

            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5 min-w-0">
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
                      <span className="text-[var(--text-dim)]/50">•</span>
                      <div className="flex items-center gap-1 ml-1 scale-90 origin-left">
                        <button
                          onClick={handleCopy}
                          className={`p-1 rounded hover:bg-[var(--accent-blue)]/10 transition-colors cursor-pointer ${copyFeedback ? 'text-green-500' : 'text-[var(--text-dim)] hover:text-[var(--accent-blue)]'}`}
                          title={copyFeedback ? "Link Copied!" : "Copy Work Item Link"}
                        >
                          {copyFeedback ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          )}
                        </button>
                        <button
                          onClick={handleCopyTitle}
                          className={`p-1 rounded hover:bg-orange-500/10 transition-colors cursor-pointer ${copyTitleFeedback ? 'text-orange-500' : 'text-[var(--text-dim)] hover:text-orange-400'}`}
                          title={copyTitleFeedback ? "Title Copied!" : "Copy Work Item Title"}
                        >
                          {copyTitleFeedback ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/></svg>
                          )}
                        </button>
                        <button
                          onClick={handleOpen}
                          className="p-1 rounded text-[var(--text-dim)] hover:text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 transition-colors cursor-pointer"
                          title="Open in Browser"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                        </button>
                      </div>
                    </span>
                  </div>
                  <h3 className="text-[13px] font-bold text-[var(--text-main)] leading-snug group-hover:text-[var(--accent-blue)] transition-colors break-words">
                    {node.item.fields["System.Title"]}
                  </h3>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateSubItem(
                      node.item.id,
                      node.item.fields["System.Title"],
                      node.item.fields["System.AreaPath"],
                      node.item.fields["System.IterationPath"]
                    );
                  }}
                  className="shrink-0 p-1 px-2 flex items-center gap-1.5 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 hover:bg-[var(--accent-blue)]/20 hover:border-[var(--accent-blue)]/40 transition-all active:scale-95 group/sub"
                  title="Add Sub-item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Task</span>
                </button>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <div
                    className="relative"
                    onMouseEnter={() => setShowStatusMenu(true)}
                    onMouseLeave={() => setShowStatusMenu(false)}
                  >
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30' : 'bg-[var(--card-bg-subtle)] text-[var(--text-muted)] border border-[var(--border-main)]'} hover:bg-[var(--accent-blue)]/30 hover:text-[var(--text-main)] transition-all cursor-pointer flex items-center gap-1.5`}>
                      <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-[var(--accent-blue)]' : 'bg-[var(--text-dim)]'}`} />
                      {isUpdating ? 'Updating...' : state}
                    </div>

                    {showStatusMenu && (
                      <div className="absolute top-[calc(100%-4px)] left-0 pt-1 z-50">
                        <div className="bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl py-1 min-w-[100px] backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
                          {STATUS_OPTIONS.map(status => (
                            <button
                              key={status}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsUpdating(true);
                                setShowStatusMenu(false);
                                try {
                                  await onUpdateStatus(node.item.id, status);
                                } finally {
                                  setIsUpdating(false);
                                }
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-[var(--card-hover)] transition-colors ${state === status.toLowerCase() ? 'text-[var(--accent-blue)] font-bold bg-[var(--accent-blue)]/5' : 'text-[var(--text-muted)]'}`}
                            >
                              {status}
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>{getAssigneeName()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Child Tasks */}
        {isExpanded && hasChildren && (
          <div className="flex flex-col gap-2 ml-8 mt-1 border-l-2 border-[var(--border-subtle)] pl-4 py-1">
            <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1">Sub Tasks</div>
            {node.children
              .filter(child => {
                if (statusFilters.length > 0) {
                  const s = child.item.fields["System.State"];
                  return statusFilters.includes(s);
                }
                return true;
              })
              .map((child) => (
              <NodeView
                key={child.item.id}
                node={child}
                level={level + 1}
                selectedStoryId={selectedStoryId}
                onSelectStory={onSelectStory}
                statusFilters={statusFilters}
                onUpdateStatus={onUpdateStatus}
                onCreateSubItem={onCreateSubItem}
                onLinkParent={onLinkParent}
                baseUrl={baseUrl}
                parentEpicTitle={isEpic ? node.item.fields["System.Title"] : parentEpicTitle}
                workItemLookup={workItemLookup}
              />
            ))}
          </div>
        )}
        {isExpanded && !hasChildren && (
          <div className="ml-8 text-[10px] text-[var(--text-dim)] italic p-2 border border-dashed border-[var(--border-subtle)] rounded-lg text-center">
            No active tasks found for this story
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
          <span className={`text-[12px] leading-tight transition-colors break-words ${isActive ? 'text-[var(--text-main)] group-hover:text-[var(--accent-blue)]' : 'text-[var(--text-dim)]'}`}>
            {node.item.fields["System.Title"]}
          </span>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[9px] font-mono text-[var(--text-dim)] flex items-center gap-1.5">
            #{node.item.id}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className={`p-0.5 rounded hover:bg-[var(--accent-blue)]/10 transition-all cursor-pointer ${copyFeedback ? 'text-green-500' : 'text-[var(--text-dim)] hover:text-[var(--accent-blue)]'}`}
                title={copyFeedback ? "Link Copied!" : "Copy Link"}
              >
                {copyFeedback ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                )}
              </button>
              <button
                onClick={handleCopyTitle}
                className={`p-0.5 rounded hover:bg-orange-500/10 transition-all cursor-pointer ${copyTitleFeedback ? 'text-orange-500' : 'text-[var(--text-dim)] hover:text-orange-400'}`}
                title={copyTitleFeedback ? "Title Copied!" : "Copy Title"}
              >
                {copyTitleFeedback ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/></svg>
                )}
              </button>
              <button
                onClick={handleOpen}
                className="p-0.5 rounded text-[var(--text-dim)] hover:text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 transition-all cursor-pointer"
                title="Open in Browser"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              </button>
            </div>
          </span>

            <div
              className="relative"
              onMouseEnter={() => setShowStatusMenu(true)}
              onMouseLeave={() => setShowStatusMenu(false)}
            >
              <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded border transition-all cursor-pointer ${isActive ? 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/20 text-[var(--accent-blue)]' : 'bg-[var(--card-bg-subtle)] border-[var(--border-main)] text-[var(--text-muted)]'}`}>
                <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-[var(--accent-blue)] shadow-[0_0_4px_rgba(0,122,255,0.5)]' : 'bg-white/10'}`} />
                <span className="text-[9px] font-bold uppercase tracking-tighter">{isUpdating ? '...' : state}</span>
              </div>

              {showStatusMenu && (
                <div className="absolute top-[calc(100%-4px)] left-0 pt-1 z-50">
                  <div className="bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl py-1 min-w-[100px] backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
                    {allowedStates.map(status => (
                      <button
                        key={status}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsUpdating(true);
                          setShowStatusMenu(false);
                          try {
                            await onUpdateStatus(node.item.id, status);
                          } finally {
                            setIsUpdating(false);
                          }
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[9px] hover:bg-[var(--card-hover)] transition-colors ${state === status.toLowerCase() ? 'text-[var(--accent-blue)] font-bold bg-[var(--accent-blue)]/5' : 'text-[var(--text-muted)]'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {node.item.fields["System.CreatedDate"] && (
              <span className="text-[9px] text-[var(--text-dim)] italic">
                {formatDate(node.item.fields["System.CreatedDate"])}
              </span>
            )}

            {getAssigneeName() && (
              <span className="text-[9px] text-[var(--text-dim)] flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>{getAssigneeName()}</span>
                </div>
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="flex flex-col gap-1 ml-6 mt-0.5 border-l border-[var(--border-subtle)] pl-4 pb-2">
          {node.children.map(child => (
            <NodeView
              key={child.item.id}
              node={child}
              level={level + 1}
              selectedStoryId={selectedStoryId}
              onSelectStory={onSelectStory}
              statusFilters={statusFilters}
              onUpdateStatus={onUpdateStatus}
              onCreateSubItem={onCreateSubItem}
              onLinkParent={onLinkParent}
              baseUrl={baseUrl}
              parentEpicTitle={isEpic ? node.item.fields["System.Title"] : parentEpicTitle}
              workItemLookup={workItemLookup}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const filterHierarchy = (nodes: HierarchyNode[], filters: string[]): HierarchyNode[] => {
  if (filters.length === 0) return nodes;

  return nodes
    .map(node => {
      if (!node.item.fields) return null;
      const assignedTo = node.item.fields["System.AssignedTo"];
      const matchesSelf = filters.includes(getAssigneeUniqueName(assignedTo));

      const filteredChildren = filterHierarchy(node.children, filters);
      const hasMatchingChild = filteredChildren.length > 0;

      if (matchesSelf || hasMatchingChild) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    })
    .filter((n): n is HierarchyNode => n !== null);
};

const searchHierarchy = (nodes: HierarchyNode[], query: string, forceMatch = false): HierarchyNode[] => {
  if (!query && !forceMatch) return nodes;
  const q = query.toLowerCase();

  return nodes
    .map(node => {
      if (!node.item.fields) return null;
      const title = node.item.fields["System.Title"]?.toLowerCase() || "";
      const id = node.item.id.toString();
      const matchesSelf = forceMatch || title.includes(q) || id.includes(q);

      // If this node matches, we force match all its children (show all sub-tasks)
      const filteredChildren = searchHierarchy(node.children, query, matchesSelf);
      const hasMatchingChild = filteredChildren.length > 0;

      if (matchesSelf || hasMatchingChild) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    })
    .filter((n): n is HierarchyNode => n !== null);
};

export function HierarchyExplorer({
  hierarchy,
  isLoading,
  selectedStoryId,
  onSelectStory,
  statusFilters, // Added statusFilters prop
  assigneeFilters,
  epicFilter,
  searchQuery,
  baseUrl,
  onUpdateStatus,
  onCreateSubItem,
  onLinkParent,
  allWorkItems,
}: HierarchyExplorerProps) {
  // Built-in lookup for off-sprint parent resolution
  const workItemLookup = (allWorkItems || []).reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<number, AzureWorkItem>);
  // 1. Filter by Assignee
  const filteredByAssignee = filterHierarchy(hierarchy, assigneeFilters);

  // 2. Filter by Search
  const filteredBySearch = searchHierarchy(filteredByAssignee, searchQuery);

  // 3. Filter by Status (Closed/Active)
  const visibleHierarchy = filteredBySearch.filter(node => {
    const state = node.item.fields["System.State"];
    if (statusFilters.length === 0) return true; // If no status filters, show all
    // If the item itself matches or if it has visible children (handled recursively by children filter)
    return statusFilters.includes(state);
  });

  // 4. Filter by Epic/Feature
  const finalHierarchy = visibleHierarchy.filter(node => {
    if (!epicFilter || epicFilter.length === 0) return true;

    // Helper to check if any ancestor (in lookup) matches epicFilter
    const hasFilteredAncestor = (workItem: AzureWorkItem): boolean => {
      const parentId = workItem.fields["System.Parent"];
      if (!parentId) return false;
      if (epicFilter.includes(parentId)) return true;

      const parent = workItemLookup[parentId];
      if (parent) return hasFilteredAncestor(parent);
      return false;
    };

    // Helper to check if any descendant matches epicFilter
    const hasFilteredDescendant = (n: HierarchyNode): boolean => {
      return n.children.some(c => {
        if (epicFilter.includes(c.item.id)) return true;
        return hasFilteredDescendant(c);
      });
    };

    const isMatch = epicFilter.includes(node.item.id) || hasFilteredAncestor(node.item);
    const isAncestorOfFiltered = hasFilteredDescendant(node);

    return isMatch || isAncestorOfFiltered;
  });

  if (finalHierarchy.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-[var(--text-dim)] gap-4 px-8 text-center bg-black/10 m-3 rounded-2xl border border-[var(--border-subtle)] border-dashed">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 animate-in fade-in zoom-in duration-1000"><path d="M18 10a6 6 0 0 0-12 0v8l3-2 3 2 3-2 3 2V10Z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-[var(--text-muted)]">
            {assigneeFilters.length > 0 ? "No matching work items found for these assignees" : "No active work items found"}
          </p>
          <p className="text-[10px] text-[var(--text-dim)] italic">
            {assigneeFilters.length > 0 ? "Try clearing the assignee filter or selecting other users." : "Select an iteration or click \"+\" to create a new task."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-3 h-full gap-1">
      {finalHierarchy.map(node => (
        <NodeView
          key={node.item.id}
          node={node}
          level={0}
          selectedStoryId={selectedStoryId}
          onSelectStory={onSelectStory}
          statusFilters={statusFilters}
          onUpdateStatus={onUpdateStatus}
          onCreateSubItem={onCreateSubItem}
          onLinkParent={onLinkParent}
          baseUrl={baseUrl}
          workItemLookup={workItemLookup}
        />
      ))}
    </div>
  );
}
