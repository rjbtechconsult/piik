import { useState } from "react";
import { AzureWorkItem } from "../App";

interface LinkParentModalProps {
  onClose: () => void;
  onLink: (parentId: number) => Promise<void>;
  workItem: { id: number; title: string };
  epics: AzureWorkItem[];
  isLoading: boolean;
}

export function LinkParentModal({
  onClose,
  onLink,
  workItem,
  epics,
  isLoading
}: LinkParentModalProps) {
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  const filteredEpics = epics.filter(epic => {
    const q = search.toLowerCase();
    const title = (epic.fields["System.Title"] || "").toLowerCase();
    const id = epic.id.toString();
    const type = (epic.fields["System.WorkItemType"] || "").toLowerCase();
    return title.includes(q) || id.includes(q) || type.includes(q);
  });

  const handleLink = async () => {
    if (!selectedParentId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onLink(selectedParentId);
      onClose();
    } catch (err) {
      console.error("Failed to link parent:", err);
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

      <div className="relative w-full max-w-[360px] max-h-[90vh] bg-[var(--card-bg)] border border-[var(--border-main)] rounded-[24px] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">
        {/* Header Section (Sticky) */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-[var(--text-main)] uppercase tracking-[0.2em]">
              Link Parent
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          <div className="mb-6 p-4 bg-[var(--accent-blue)]/5 border border-[var(--accent-blue)]/10 rounded-xl">
            <div className="text-[10px] font-bold text-[var(--accent-blue)] uppercase tracking-wider mb-1">Target Story</div>
            <div className="text-[11px] text-[var(--text-main)] font-medium leading-relaxed">
              <span className="opacity-50 font-mono mr-1">#{workItem.id}</span>
              {workItem.title}
            </div>
          </div>

          <div className="relative mb-4">
            <input
              autoFocus
              type="text"
              placeholder="Filter list..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-[var(--border-main)] rounded-lg px-8 py-2 text-[11px] text-[var(--text-main)] outline-none focus:border-[var(--accent-blue)]/50 placeholder:text-[var(--text-dim)]"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
          </div>
        </div>

        {/* Scrollable Body Section */}
        <div className="px-6 flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-[var(--card-bg)]">
          <div className="border border-[var(--border-main)] rounded-xl bg-transparent overflow-hidden divide-y divide-[var(--border-main)]">
            {isLoading ? (
              <div className="py-12 text-center text-[10px] text-[var(--text-dim)] animate-pulse">Fetching items...</div>
            ) : filteredEpics.length === 0 ? (
              <div className="py-12 text-center text-[10px] text-[var(--text-dim)] italic">No matching items found</div>
            ) : (
              filteredEpics.map(epic => (
                <div
                  key={epic.id}
                  onClick={() => setSelectedParentId(epic.id)}
                  className={`relative px-4 py-2 hover:bg-[var(--accent-blue)]/10 cursor-pointer text-[11px] text-[var(--text-main)] transition-all flex flex-col gap-0 ${selectedParentId === epic.id ? 'bg-[var(--accent-blue)]/5 border-l-2 border-l-[var(--accent-blue)]' : ''}`}
                >
                  <div className="flex items-center gap-2 opacity-70">
                    <span className="text-[7px] uppercase tracking-tighter font-black text-[var(--accent-blue)] px-1 rounded-sm bg-[var(--accent-blue)]/10">
                      {epic.fields?.["System.WorkItemType"]}
                    </span>
                    <span className="text-[8px]">#{epic.id}</span>
                  </div>
                  <span className="truncate font-medium pr-8">{epic.fields?.["System.Title"] || `Item ${epic.id}`}</span>
                  {selectedParentId === epic.id && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--accent-blue)] animate-in zoom-in duration-150">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="h-4" /> {/* Spacer */}
        </div>

        {/* Footer Section (Sticky) */}
        <div className="p-4 border-t border-[var(--border-main)] bg-[var(--card-bg)]">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl text-[11px] font-bold text-[var(--text-dim)] hover:bg-white/5 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedParentId || isSubmitting}
              className={`flex-1 px-4 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-[0.98] shadow-lg ${selectedParentId && !isSubmitting ? 'bg-[var(--accent-blue)] text-white shadow-blue-500/20 hover:bg-[var(--accent-blue-hover)]' : 'bg-[var(--card-bg-subtle)] text-[var(--text-dim)] opacity-50 cursor-not-allowed border border-[var(--border-main)]'}`}
            >
              {isSubmitting ? 'Linking...' : 'Link Parent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
