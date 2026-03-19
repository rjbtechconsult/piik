import { useState } from "react";

interface ManualTaskFormProps {
  onClose: () => void;
  onSave: (title: string, description: string) => void;
  initialTitle?: string;
  initialDescription?: string;
  isEditing?: boolean;
}

export function ManualTaskForm({ onClose, onSave, initialTitle = "", initialDescription = "", isEditing = false }: ManualTaskFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title, description);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e]/90 backdrop-blur-3xl w-full max-w-sm rounded-t-[28px] border-t border-white/10 pt-5 pb-6 px-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Add Manual Task</h2>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            Cancel
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold ml-1">Task Title</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold ml-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/20 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full bg-[#007aff] hover:bg-[#0a84ff] disabled:opacity-50 disabled:hover:bg-[#007aff] text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] mt-2"
          >
            {isEditing ? "Update Task" : "Save Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
