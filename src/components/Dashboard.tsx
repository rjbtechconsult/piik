import { useMemo } from "react";

interface DashboardProps {
  workItems: any[];
  teamMembers: any[];
  isLoading: boolean;
  teamName: string;
}

const TYPE_COLORS: Record<string, string> = {
  "User Story": "#5ac8fa",
  "Story": "#5ac8fa",
  "Task": "#ff9f0a",
  "Bug": "#ff453a",
  "Product Backlog Item": "#bf5af2",
  "Feature": "#30d158",
  "Epic": "#64d2ff",
};

const getAssigneeName = (assignedTo: any): string => {
  if (!assignedTo) return "Unassigned";
  if (typeof assignedTo === "string") return assignedTo;
  return assignedTo.displayName || assignedTo.uniqueName || "Unassigned";
};

export function Dashboard({ workItems, isLoading, teamName }: DashboardProps) {
  const analytics = useMemo(() => {
    if (!workItems || workItems.length === 0) return null;

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const memberLoad: Record<string, number> = {};
    let staleCount = 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    workItems.forEach((item) => {
      if (!item?.fields) return;
      const state = item.fields["System.State"] || "Unknown";
      const type = item.fields["System.WorkItemType"] || "Other";
      const assignee = getAssigneeName(item.fields["System.AssignedTo"]);
      const createdDate = item.fields["System.CreatedDate"]
        ? new Date(item.fields["System.CreatedDate"])
        : null;

      statusCounts[state] = (statusCounts[state] || 0) + 1;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      memberLoad[assignee] = (memberLoad[assignee] || 0) + 1;

      if (
        (state === "New" || state === "To Do") &&
        createdDate &&
        createdDate < sevenDaysAgo
      ) {
        staleCount++;
      }
    });

    const total = workItems.length;
    const completed = (statusCounts["Closed"] || 0) + (statusCounts["Done"] || 0) + (statusCounts["Resolved"] || 0);
    const active = (statusCounts["Active"] || 0) + (statusCounts["Doing"] || 0) + (statusCounts["In Progress"] || 0) + (statusCounts["InProgress"] || 0) + (statusCounts["In-Progress"] || 0);
    const newItems = (statusCounts["New"] || 0) + (statusCounts["To Do"] || 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Sort members by load descending
    const sortedMembers = Object.entries(memberLoad)
      .sort((a, b) => b[1] - a[1]);
    const maxLoad = sortedMembers.length > 0 ? sortedMembers[0][1] : 1;

    // Sort types by count
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

    return {
      total,
      completed,
      active,
      newItems,
      completionRate,
      staleCount,
      sortedMembers,
      maxLoad,
      sortedTypes,
      statusCounts,
    };
  }, [workItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-[var(--accent-blue)]/30 border-t-[var(--accent-blue)] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-12 h-12 bg-[var(--accent-blue)]/10 rounded-2xl flex items-center justify-center mb-3 border border-[var(--accent-blue)]/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent-blue)]"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
        </div>
        <p className="text-[11px] text-[var(--text-dim)] font-medium">No data available yet.<br/>Select a team to view analytics.</p>
      </div>
    );
  }

  const { total, completed, active, newItems, completionRate, staleCount, sortedMembers, maxLoad, sortedTypes } = analytics;
  const circumference = 2 * Math.PI * 28;
  const strokeDash = (completionRate / 100) * circumference;

  return (
    <div className="px-3 py-3 space-y-3 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wide">{teamName}</h2>
          <p className="text-[9px] text-[var(--text-dim)] font-medium">{total} work items tracked</p>
        </div>
        {staleCount > 0 && (
          <div className="flex items-center gap-1 bg-[#ff9f0a]/10 border border-[#ff9f0a]/20 rounded-lg px-2 py-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span className="text-[9px] font-bold text-[#ff9f0a]">{staleCount} stale</span>
          </div>
        )}
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "New", value: newItems, color: "#5ac8fa" },
          { label: "Active", value: active, color: "#ff9f0a" },
          { label: "Done", value: completed, color: "#30d158" },
          { label: "Total", value: total, color: "var(--accent-blue)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl p-2.5 text-center"
          >
            <div className="text-[18px] font-black" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-wider mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Completion ring + work type breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {/* Completion Rate Ring */}
        <div className="bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="relative w-[68px] h-[68px]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border-main)" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke={completionRate >= 70 ? "#30d158" : completionRate >= 40 ? "#ff9f0a" : "#ff453a"}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - strokeDash}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[15px] font-black text-[var(--text-main)]">{completionRate}%</span>
            </div>
          </div>
          <div className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-wider mt-1.5">Completion</div>
        </div>

        {/* Work Item Types */}
        <div className="bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl p-3">
          <div className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2">By Type</div>
          <div className="space-y-1.5">
            {sortedTypes.slice(0, 5).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[type] || "#8e8e93" }} />
                  <span className="text-[9px] text-[var(--text-muted)] font-medium truncate">{type}</span>
                </div>
                <span className="text-[10px] font-bold text-[var(--text-main)] tabular-nums shrink-0 ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Member Workload */}
      <div className="bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-xl p-3">
        <div className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Member Workload</div>
        <div className="text-[8px] text-[var(--text-dim)] font-medium mt-0.5 mb-2.5 normal-case tracking-normal">Total assigned items (all statuses)</div>
        <div className="space-y-2">
          {sortedMembers.map(([name, count]) => {
            const barWidth = Math.max((count / maxLoad) * 100, 8);
            const firstName = name.split(" ")[0];
            return (
              <div key={name} className="flex items-center gap-2">
                <span className="text-[9px] text-[var(--text-muted)] font-medium w-[72px] truncate shrink-0" title={name}>
                  {firstName}
                </span>
                <div className="flex-1 h-[14px] bg-[var(--border-main)] rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      background: `linear-gradient(90deg, var(--accent-blue), var(--accent-blue-hover))`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold text-[var(--text-main)] tabular-nums w-[20px] text-right shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
          {sortedMembers.length === 0 && (
            <p className="text-[9px] text-[var(--text-dim)] text-center py-2">No assignee data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
