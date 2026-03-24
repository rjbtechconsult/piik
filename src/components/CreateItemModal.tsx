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
  onSave: (title: string, type: string, assigneeUniqueName: string, parentId?: number, areaPath?: string) => Promise<void>;
  teamMembers: TeamMember[];
  isLoading: boolean;
  parentItem?: { id: number; title: string; areaPath: string; iterationPath: string };
}

export function CreateItemModal({ onClose, onSave, teamMembers, isLoading, parentItem }: CreateItemModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(parentItem ? "Task" : "User Story");
  const [assignee, setAssignee] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave(title, type, assignee, parentItem?.id, parentItem?.areaPath);
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

      <div className="relative w-full max-w-[320px] bg-[var(--card-bg)] border border-[var(--border-main)] rounded-[20px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5">
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
                <div className="hidden">
                  <input type="hidden" value="User Story" />
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
