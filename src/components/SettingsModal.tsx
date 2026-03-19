import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { saveSetting, getSetting } from "../lib/db";
import Switch from "./Switch";

interface AzureConfig {
  organization: string;
  project: string;
}

interface SettingsModalProps {
  onClose: () => void;
  onSave: (config: AzureConfig, token: string, notificationsEnabled: boolean) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  initialTab?: SettingsView;
}

type SettingsView = "azure" | "general";

export function SettingsModal({ onClose, onSave, onDisconnect, isConnected, initialTab = "general" }: SettingsModalProps) {
  const [activeView, setActiveView] = useState<SettingsView>(initialTab);
  const [organization, setOrganization] = useState("");
  const [project, setProject] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [token, setToken] = useState("");
  const [theme, setTheme] = useState("dark");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const savedOrg = await getSetting("azure_org") || localStorage.getItem("azure_org") || "";
      const savedProject = await getSetting("azure_project") || localStorage.getItem("azure_project") || "";
      setOrganization(savedOrg);
      setProject(savedProject);
      if (savedOrg && savedProject) {
        setProjectUrl(`https://dev.azure.com/${savedOrg}/${savedProject}`);
      }
      const savedTheme = await getSetting("theme") || "dark";
      const savedNotifications = await getSetting("notifications_enabled") || "true";

      setTheme(savedTheme);
      setNotificationsEnabled(savedNotifications === "true");

      try {
        const keyToken = await invoke<string>("get_token", { key: "azure_pat" });
        if (keyToken) {
          setToken(keyToken);
        } else {
          const dbToken = await getSetting("azure_pat");
          if (dbToken) setToken(dbToken);
        }
      } catch (e) {
        const dbToken = await getSetting("azure_pat");
        if (dbToken) setToken(dbToken);
      }
    };
    loadSettings();
  }, []);

  const handleDisconnect = async () => {
    // Temporarily removing confirm to verify if it's the hurdle
    try {
      await invoke("delete_token", { key: "azure_pat" });
      
      await saveSetting("azure_org", "");
      await saveSetting("azure_project", "");
      await saveSetting("azure_pat", "");
      
      localStorage.removeItem("azure_org");
      localStorage.removeItem("azure_project");
      localStorage.removeItem("azure_pat");
      
      onDisconnect();
      onClose();
    } catch (error) {
      console.error("Disconnect Error:", error);
      alert(`Could not disconnect: ${error}`);
    }
  };

  const extractOrgAndProject = (url: string) => {
    try {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) return { org: "", proj: "" };

      // Pattern 1: https://dev.azure.com/org/project
      if (trimmedUrl.includes("dev.azure.com")) {
        const parts = trimmedUrl.split("dev.azure.com/")[1]?.split("/");
        if (parts && parts.length >= 2) {
          return { 
            org: decodeURIComponent(parts[0]), 
            proj: decodeURIComponent(parts[1]) 
          };
        }
      }

      // Pattern 2: https://org.visualstudio.com/project
      if (trimmedUrl.includes(".visualstudio.com")) {
        const org = trimmedUrl.split("https://")[1]?.split(".visualstudio.com")[0];
        const proj = trimmedUrl.split(".visualstudio.com/")[1]?.split("/")[0];
        if (org && proj) {
          return { 
            org: decodeURIComponent(org), 
            proj: decodeURIComponent(proj) 
          };
        }
      }
    } catch (e) {
      console.error("Url parse error", e);
    }
    return { org: "", proj: "" };
  };

  const handleUrlChange = (url: string) => {
    setProjectUrl(url);
    const { org, proj } = extractOrgAndProject(url);
    if (org) setOrganization(org);
    if (proj) setProject(proj);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedToken = token.trim();
    const trimmedOrg = organization.trim();
    const trimmedProject = project.trim();

    try {
      await saveSetting("azure_org", trimmedOrg);
      await saveSetting("azure_project", trimmedProject);
      await saveSetting("azure_pat", trimmedToken);
      await saveSetting("theme", theme);
      await saveSetting("notifications_enabled", notificationsEnabled.toString());

      try {
        await invoke("set_token", { key: "azure_pat", token: trimmedToken });
      } catch (err) {
        console.warn("Keyring save failed, but SQLite fallback is active:", err);
      }

      onSave({ organization: trimmedOrg, project: trimmedProject }, trimmedToken, notificationsEnabled);
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert(`Critical Error: Could not save settings. ${error}`);
    }
  };

  const [showPATGuide, setShowPATGuide] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 rounded-[12px]">
      <div className="bg-[var(--app-bg)] backdrop-blur-xl w-full max-w-[340px] rounded-[12px] border border-[var(--border-main)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="pt-7 pb-5 px-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <h2 className="text-sm font-bold text-[var(--text-main)]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex px-4 pt-4 border-b border-[var(--border-subtle)] gap-4">
          <button
            onClick={() => setActiveView("general")}
            className={`pb-3 px-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeView === "general" ? "border-[var(--accent-blue)] text-[var(--text-main)]" : "border-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]"}`}
          >
            General
          </button>
          <button
            onClick={() => setActiveView("azure")}
            className={`pb-3 px-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeView === "azure" ? "border-[var(--accent-blue)] text-[var(--text-main)]" : "border-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]"}`}
          >
            Azure DevOps
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="p-6 space-y-6 min-h-[300px]">
            {activeView === "azure" ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">


                <div className="bg-[var(--accent-blue)]/5 rounded-2xl border border-[var(--accent-blue)]/10 p-3 mb-2">
                  <div className="flex flex-col gap-0.5 mb-2 px-1">
                    <p className="text-[10px] text-[var(--accent-blue)] font-bold uppercase tracking-wider">Azure DevOps Project URL</p>
                    <p className="text-[9px] text-[var(--text-dim)] italic font-medium">Copy from browser address bar while viewing board/backlog</p>
                    <div className="mt-1 bg-black/20 px-1.5 py-0.5 rounded border border-white/5 font-mono text-[8px] text-[var(--text-muted)] break-all truncate">
                      e.g. https://dev.azure.com/Org/Project/...
                    </div>
                  </div>
                  <input
                    type="text"
                    value={projectUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://dev.azure.com/org/project"
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-blue)]/50 transition-all mb-2"
                  />
                  <div className="flex items-center gap-2 px-1 opacity-60">
                    <div className="flex-1 h-[1px] bg-[var(--border-subtle)]" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-[var(--text-dim)]">Extracted Details</span>
                    <div className="flex-1 h-[1px] bg-[var(--border-subtle)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-[var(--text-dim)] ml-1 tracking-tighter">Org</label>
                      <div className="bg-[var(--card-bg)]/50 border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--text-muted)] truncate min-h-[28px]">
                        {organization || "---"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-[var(--text-dim)] ml-1 tracking-tighter">Project</label>
                      <div className="bg-[var(--card-bg)]/50 border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--text-muted)] truncate min-h-[28px]">
                        {project || "---"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 ml-1">
                    <label className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Personal Access Token (PAT)</label>
                    <button
                      type="button"
                      onClick={() => setShowPATGuide(!showPATGuide)}
                      className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </button>
                  </div>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-blue)]/50 transition-all"
                    required
                  />
                </div>

                {showPATGuide && (
                  <div className="bg-[var(--accent-blue)]/10 rounded-2xl border border-[var(--accent-blue)]/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <h3 className="text-[11px] font-bold text-[var(--accent-blue)] uppercase tracking-widest mb-2 text-center">How to get your PAT</h3>
                    <div className="space-y-3">
                      <ol className="text-[10px] text-[var(--text-muted)] space-y-2 list-decimal ml-4 leading-relaxed">
                        <li>Open <a href="https://dev.azure.com" target="_blank" className="text-[var(--accent-blue)] hover:underline">Azure DevOps</a></li>
                        <li>User Settings (Top Right) → <strong>Personal access tokens</strong></li>
                        <li>Click <strong>+ New Token</strong></li>
                        <li>Set Scopes to <strong>Work Items (Read, Write & Manage)</strong></li>
                        <li>Create, copy, and paste the token above.</li>
                      </ol>
                      <div className="bg-[var(--accent-blue)]/5 p-2 rounded-lg border border-[var(--accent-blue)]/10">
                        <p className="text-[9px] text-[var(--text-dim)] text-center leading-normal italic">
                          "Read, Write & Manage" is required to track your tasks and update their status directly from Piik.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-dim)] ml-1 tracking-wider">Theme Mode</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: "dark", name: "Dark", icon: "🌙" },
                      { id: "light", name: "Light", icon: "☀️" },
                      { id: "system", name: "System", icon: "🌓" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${theme === t.id ? "bg-[var(--accent-blue)]/10 border-[var(--accent-blue)] text-[var(--text-main)]" : "bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] hover:border-[var(--text-dim)]"}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">{t.icon}</span>
                          <span className="text-xs font-semibold">{t.name}</span>
                        </div>
                        {theme === t.id && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent-blue)]"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between px-1">
                    <div className="space-y-0.5">
                      <label className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Enable Notifications</label>
                      <p className="text-[9px] text-[var(--text-dim)] leading-tight">Get alerted for new task assignments</p>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onChange={setNotificationsEnabled}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                className="w-full bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98]"
              >
                {activeView === "azure" ? "Save Configuration" : "Apply Settings"}
              </button>
              
              {activeView === "azure" && isConnected && (
                <button
                  type="button"
                  onClick={() => {
                    console.log("Disconnect button clicked!");
                    handleDisconnect();
                  }}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all border border-red-500/20 active:scale-[0.98]"
                >
                  Disconnect Azure DevOps
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
