import { useState } from "react";

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
  activeOnly: boolean;
  assigneeFilters: string[];
  searchQuery: string;
  onUpdateStatus: (id: number, newStatus: string) => Promise<void>;
  onCreateSubItem: (id: number, title: string, areaPath: string, iterationPath: string) => void;
}

interface NodeViewProps {
  node: HierarchyNode;
  level: number;
  selectedStoryId: number | null;
  onSelectStory: (id: number | null) => void;
  activeOnly: boolean;
  onUpdateStatus: (id: number, newStatus: string) => Promise<void>;
  onCreateSubItem: (id: number, title: string, areaPath: string, iterationPath: string) => void;
}

const STATUS_OPTIONS = [
  "New", "Active", "Resolved", "Closed", "Removed", // Agile
  "To Do", "Doing", "Done",                       // Basic & Tasks
  "Approved", "Committed"                         // Scrum
];

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

function NodeView({ node, level, selectedStoryId, onSelectStory, activeOnly, onUpdateStatus, onCreateSubItem }: NodeViewProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const isSelected = selectedStoryId === node.item.id;
  const [isExpanded, setIsExpanded] = useState(level < 1 || isSelected);
  const hasChildren = node.children.length > 0;
  const type = node.item.fields?.["System.WorkItemType"] || "";
  const isStory = type === "User Story" || type === "Story";
  const state = node.item.fields?.["System.State"] || "New";
  const stateLower = state.toLowerCase();

  const isActive = stateLower === "active" || stateLower === "new" || stateLower === "open" || stateLower === "to do";
  const isCompleted = ["closed", "done", "removed", "resolved"].includes(stateLower);

  if (!node.item.fields || (activeOnly && isCompleted && !isActive)) return null;

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

          <div className="flex items-start gap-3 pl-2">
            {/* Type Icon */}
            <div className="mt-0.5 text-[var(--accent-blue)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
            </div>

            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] text-[9px] font-black uppercase tracking-wider border border-[var(--accent-blue)]/30">
                      Story
                    </span>
                    <span className="text-[11px] font-bold text-[var(--text-dim)] tracking-tight flex items-center gap-1.5">
                      #{node.item.id} <span className="text-[var(--text-dim)]/50">•</span> Hubtel
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
                  <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
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
                <span className="text-[11px] font-medium text-[var(--text-muted)] group-hover:text-[var(--accent-blue)] transition-colors">
                  {getAssigneeName()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Child Tasks */}
        {isExpanded && hasChildren && (
          <div className="flex flex-col gap-2 ml-8 mt-1 border-l-2 border-[var(--border-subtle)] pl-4 py-1">
            <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1">Sub Tasks</div>
            {node.children.map(child => (
              <NodeView
                key={child.item.id}
                node={child}
                level={level + 1}
                selectedStoryId={selectedStoryId}
                onSelectStory={onSelectStory}
                activeOnly={activeOnly}
                onUpdateStatus={onUpdateStatus}
                onCreateSubItem={onCreateSubItem}
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
            <span className="text-[9px] font-mono text-[var(--text-dim)]">#{node.item.id}</span>

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
              <span className="text-[9px] text-[var(--text-dim)] flex items-center gap-1">
                <span className="opacity-50">•</span>
                <span>{getAssigneeName()}</span>
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
              activeOnly={activeOnly}
              onUpdateStatus={onUpdateStatus}
              onCreateSubItem={onCreateSubItem}
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
  activeOnly,
  assigneeFilters,
  searchQuery,
  onUpdateStatus,
  onCreateSubItem
}: HierarchyExplorerProps) {
  // 1. Filter by Assignee
  const filteredByAssignee = filterHierarchy(hierarchy, assigneeFilters);

  // 2. Filter by Search
  const filteredBySearch = searchHierarchy(filteredByAssignee, searchQuery);

  // 3. Filter by Status (Closed/Active)
  const visibleHierarchy = filteredBySearch.filter(node => {
    const state = node.item.fields["System.State"]?.toLowerCase() || "";
    const isActive = state === "active" || state === "new" || state === "open" || state === "to do";

    if (!activeOnly) return true;
    if (isActive) return true;

    const hasActiveChild = (n: HierarchyNode): boolean => {
      return n.children.some(c => {
        const s = c.item.fields["System.State"]?.toLowerCase() || "";
        if (s === "active" || s === "new" || s === "open" || s === "to do") return true;
        return hasActiveChild(c);
      });
    };
    return hasActiveChild(node);
  });

  if (visibleHierarchy.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-[var(--text-dim)] gap-4 px-8 text-center bg-black/10 m-3 rounded-2xl border border-[var(--border-subtle)] border-dashed">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
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
      {visibleHierarchy.map(node => (
        <NodeView
          key={node.item.id}
          node={node}
          level={0}
          selectedStoryId={selectedStoryId}
          onSelectStory={onSelectStory}
          activeOnly={activeOnly}
          onUpdateStatus={onUpdateStatus}
          onCreateSubItem={onCreateSubItem}
        />
      ))}
    </div>
  );
}
