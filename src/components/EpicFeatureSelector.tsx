import { useState, useRef, useEffect } from "react";

interface AzureWorkItem {
  id: number;
  fields: {
    "System.Title": string;
    "System.WorkItemType": string;
  };
}

interface EpicFeatureSelectorProps {
  items: AzureWorkItem[];
  selectedIds: number[];
  onSelect: (ids: number[]) => void;
  isLoading?: boolean;
}

export function EpicFeatureSelector({ items, selectedIds, onSelect, isLoading }: EpicFeatureSelectorProps) {
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

  const uniqueItems = items.filter((item, index, self) => 
    (item.fields["System.WorkItemType"] === "Epic" || item.fields["System.WorkItemType"] === "Feature") &&
    self.findIndex(t => t.id === item.id) === index
  ).sort((a, b) => a.fields["System.Title"].localeCompare(b.fields["System.Title"]));

  const getButtonLabel = () => {
    if (isLoading) return "...";
    if (selectedIds.length === 0) return "All Epics/Features";
    if (selectedIds.length === 1) {
      const item = uniqueItems.find(i => i.id === selectedIds[0]);
      return item?.fields["System.Title"] || `#${selectedIds[0]}`;
    }
    return `${selectedIds.length} initiatives`;
  };

  const toggleItem = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter(i => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  const filteredItems = uniqueItems.filter(item => 
    item.fields["System.Title"].toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toString().includes(searchQuery)
  );

  if (uniqueItems.length === 0 && !isLoading) return null;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-[var(--card-hover)] transition-all text-[11px] font-medium border ${selectedIds.length > 0 ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/5' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
      >
        <span className="truncate text-left flex-1" title={getButtonLabel()}>
          {getButtonLabel()}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-[var(--app-bg-solid)] border border-[var(--border-main)] rounded-lg shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in duration-200 origin-top-right">
          <div className="px-3 py-1 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest border-b border-[var(--border-subtle)]/30 mb-1">Filter by Epic/Feature</div>
          
          <div className="px-2 py-1.5">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 text-[11px] text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {!searchQuery && (
              <button
                onClick={() => {
                  onSelect([]);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${selectedIds.length === 0 ? 'bg-[var(--accent-blue)]/5' : ''}`}
              >
                <span className={`text-[11px] font-medium ${selectedIds.length === 0 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                  All Initiatives
                </span>
                {selectedIds.length === 0 && (
                  <svg className="text-[var(--accent-blue)]" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </button>
            )}

            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--card-hover)] text-left transition-colors group ${selectedIds.includes(item.id) ? 'bg-[var(--accent-blue)]/5' : ''}`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1 rounded ${item.fields["System.WorkItemType"] === "Epic" ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                      {item.fields["System.WorkItemType"]}
                    </span>
                    <span className="text-[9px] text-[var(--text-dim)] font-mono">#{item.id}</span>
                  </div>
                  <span className={`text-[11px] font-medium truncate ${selectedIds.includes(item.id) ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}>
                    {item.fields["System.Title"]}
                  </span>
                </div>
                {selectedIds.includes(item.id) && (
                  <svg className="text-[var(--accent-blue)] shrink-0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
