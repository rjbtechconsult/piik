import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import Switch from "./Switch";

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
      const data = await invoke<any[]>("fetch_report_work_items", {
        organization,
        project,
        token,
        startDate,
        endDate,
        areaPath,
      });
      setItems(data || []);
    } catch (err: any) {
      console.error("Reports: Error fetching report items:", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportItems();
  }, [startDate, endDate, useTeamScope, organization, project, token, defaultAreaPath]);

  useEffect(() => {
    if (selectedTeam && defaultAreaPath) {
      setUseTeamScope(true);
    } else {
      setUseTeamScope(false);
    }
  }, [selectedTeam, defaultAreaPath]);

  const summary = useMemo(() => {
    let epicsCount = 0;
    let storiesCount = 0;
    let tasksCount = 0;

    items.forEach((item) => {
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
      total: items.length,
    };
  }, [items]);

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
    if (items.length === 0) return;

    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    // Header row
    let csvContent = "ID,Title,Work Item Type,State,Created Date,Created By,Assigned To,Area Path\n";

    // Data rows
    items.forEach((item) => {
      const fields = item.fields || {};
      const id = fields["System.Id"] || item.id || "";
      const title = fields["System.Title"] || "";
      const type = fields["System.WorkItemType"] || "";
      const state = fields["System.State"] || "";
      const createdDate = fields["System.CreatedDate"]
        ? new Date(fields["System.CreatedDate"]).toLocaleDateString()
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
        escapeCSV(creator),
        escapeCSV(assignee),
        escapeCSV(areaPath)
      ].join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Piik_Created_Items_Report_${startDate}_to_${endDate}.csv`;
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
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Created items ({items.length})</span>
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
            {items.map((item) => {
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

            {items.length === 0 && (
              <div className="text-center py-8 bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl">
                <p className="text-[10px] text-[var(--text-dim)] font-medium">No work items created in this date range.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
