import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { SettingsModal } from "./components/SettingsModal";
import { TeamSelector } from "./components/TeamSelector";
import { IterationSelector } from "./components/IterationSelector";
import { HierarchyExplorer } from "./components/HierarchyExplorer";
import { CreateItemModal } from "./components/CreateItemModal";
import { AssigneeSelector } from "./components/AssigneeSelector";
import { getSetting, saveSetting } from "./lib/db";
import Switch from "./components/Switch";
import "./App.css";

interface AzureWorkItem {
  id: number;
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.WorkItemType": string;
    "System.AssignedTo": any;
    "System.AreaPath": string;
    "System.IterationPath": string;
  };
}

interface HierarchyNode {
  item: AzureWorkItem;
  children: HierarchyNode[];
}

interface AzureTeam {
  id: string;
  name: string;
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState<"azure" | "general">("general");
  const [teams, setTeams] = useState<AzureTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [iterations, setIterations] = useState<any[]>([]);
  const [selectedIteration, setSelectedIteration] = useState<any | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [teamSettings, setTeamSettings] = useState<{ defaultAreaPath: string | null }>({ defaultAreaPath: null });
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState<string>("dark");
  const [creatingSubItemFor, setCreatingSubItemFor] = useState<{ id: number; title: string; areaPath: string; iterationPath: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [azureConfig, setAzureConfig] = useState<{ org: string; project: string }>({ org: "", project: "" });
 
  const lastWorkItemsRef = useRef<Record<number, string | null>>({});
  
  const isConnected = teams.length > 0;
 
  useEffect(() => {
    const initNotifications = async () => {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
    };
    initNotifications();
  }, []);
 
  useEffect(() => {
    if (!selectedTeam || !selectedIteration) return;
 
    const interval = setInterval(() => {
      fetchHierarchy(selectedIteration.id, true);
    }, 120000); // 2 minutes
 
    return () => clearInterval(interval);
  }, [selectedTeam, selectedIteration]);

  useEffect(() => {
    fetchTeams();
    loadTheme();
    loadNotificationSettings();
    fetchCurrentUser();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const loadTheme = async () => {
    const savedTheme = await getSetting("theme") || "dark";
    setTheme(savedTheme);
  };

  const loadNotificationSettings = async () => {
    const saved = await getSetting("notifications_enabled") || "true";
    setNotificationsEnabled(saved === "true");
  };

  const fetchCurrentUser = async () => {
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      const token = await getSetting("azure_pat") || await invoke("get_token", { key: "azure_pat" });
      if (org && project) {
        setAzureConfig({ org, project });
      }
      if (org && token) {
        const iden: any = await invoke("identify_me", { organization: org, token });
        setCurrentUser(iden);
      }
    } catch (e) {
      console.error("Failed to identify user:", e);
    }
  };

  const refreshTrayBadge = (itemsOverride?: any[]) => {
    // If no items are provided, flatten the current hierarchy to get all items (including sub-tasks)
    const flattenNodes = (nodes: HierarchyNode[]): AzureWorkItem[] => {
      let result: AzureWorkItem[] = [];
      nodes.forEach(node => {
        result.push(node.item);
        if (node.children && node.children.length > 0) {
          result = result.concat(flattenNodes(node.children));
        }
      });
      return result;
    };

    const itemsToCount = itemsOverride || flattenNodes(hierarchy);
    
    // If we don't have a current user, we can't count "my" tasks, so we clear the badge
    if (!currentUser) {
      invoke("update_tray_badge", { count: 0 }).catch(() => {});
      return;
    }

    const myTasks = itemsToCount.filter((item: any) => {
      if (!item || !item.fields) return false;
      const assignedTo = item.fields["System.AssignedTo"];
      const type = item.fields["System.WorkItemType"];
      const state = (item.fields["System.State"] || "").toLowerCase();
      
      const isMe = assignedTo && currentUser && (
        assignedTo.uniqueName === currentUser.uniqueName ||
        assignedTo.id === currentUser.id ||
        assignedTo.displayName === currentUser.displayName
      );

      // Only count active Tasks and Bugs
      const isActiveState = ["new", "active", "open", "to do", "committed", "doing", "approved"].includes(state);
      const isWorkItem = type === "Task" || type === "Bug";
      
      return isMe && isWorkItem && isActiveState;
    });
    
    invoke("update_tray_badge", { count: myTasks.length }).catch(console.error);
  };

  // Update tray badge whenever the current user or hierarchy changes
  useEffect(() => {
    refreshTrayBadge();
  }, [currentUser, hierarchy]);

  useEffect(() => {
    if (selectedTeam) {
      saveSetting("last_selected_team", selectedTeam);
    }
  }, [selectedTeam]);

  const getEffectiveTheme = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  useEffect(() => {
    if (selectedTeam) {
      fetchIterations();
      fetchTeamMembers();
      fetchTeamSettings();
      setSelectedStoryId(null);
    } else {
      setIterations([]);
      setSelectedIteration(null);
      setSelectedStoryId(null);
      setTeamSettings({ defaultAreaPath: null });
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedIteration) {
      fetchHierarchy(selectedIteration.id);
      setSelectedStoryId(null);
    }
  }, [selectedIteration]);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      if (!org || !project) {
        setIsLoading(false);
        return;
      }

      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";
      if (!token) {
        setError("Please configure your Azure DevOps PAT in Settings.");
        setIsLoading(false);
        return;
      }

      const teamsData = await invoke<any>("fetch_azure_teams", { organization: org, project, token });
      if (teamsData.value) {
        setTeams(teamsData.value);
        
        // Try to restore last selected team
        const lastSelected = await getSetting("last_selected_team");
        const exists = teamsData.value.find((t: any) => t.name === lastSelected);
        
        if (exists) {
          setSelectedTeam(lastSelected!);
        } else if (!selectedTeam && teamsData.value.length > 0) {
          setSelectedTeam(teamsData.value[0].name);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch teams:", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIterations = async () => {
    setIsLoading(true);
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      const data = await invoke<any>("fetch_azure_iterations", {
        organization: org,
        project,
        team: selectedTeam,
        token
      });

      if (data.value) {
        setIterations(data.value);
        const current = data.value.find((it: any) => it.attributes?.timeframe === "current");
        if (current) {
          setSelectedIteration(current);
        } else if (data.value.length > 0) {
          setSelectedIteration(data.value[data.value.length - 1]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch iterations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHierarchy = async (iterationId?: string, silent = false) => {
    if (!selectedTeam) return;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");

      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      if (!org || !project || !token) {
        if (!silent) setIsLoading(false);
        return;
      }

      const itId = iterationId || selectedIteration?.id;

      const hData: any = await invoke("fetch_azure_hierarchy", {
        organization: org,
        project,
        team: selectedTeam,
        token,
        iterationId: itId
      });

      if (hData.workItems && hData.relations) {
        const tree = buildTree(hData.workItems, hData.relations);
        setHierarchy(tree);
        refreshTrayBadge(hData.workItems);

        const newItems = hData.workItems as any[];
        const hasPreviousState = Object.keys(lastWorkItemsRef.current).length > 0;

        newItems.forEach(item => {
          if (!item || !item.fields) return;
          const id = item.fields["System.Id"];
          if (!id) return;
          
          const currentAssignee = item.fields["System.AssignedTo"]?.displayName || item.fields["System.AssignedTo"]?.uniqueName || null;
          const prevAssignee = lastWorkItemsRef.current[id];
          
          if (hasPreviousState && currentAssignee && currentAssignee !== prevAssignee) {
            if (notificationsEnabled) {
              sendNotification({
                title: "Task Assigned",
                body: `"${item.fields["System.Title"] || 'Work Item'}" is now assigned to ${currentAssignee}`,
              });
            }
          }
          lastWorkItemsRef.current[id] = currentAssignee;
        });

        if (!hasPreviousState) {
          newItems.forEach(item => {
            const id = item.fields["System.Id"];
            lastWorkItemsRef.current[id] = item.fields["System.AssignedTo"]?.displayName || item.fields["System.AssignedTo"]?.uniqueName || null;
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch hierarchy:", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamSettings = async () => {
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      if (!org || !project || !token || !selectedTeam) return;

      const settingsData: any = await invoke("fetch_azure_team_settings", {
        organization: org,
        project,
        team: selectedTeam,
        token
      });

      if (settingsData && settingsData.defaultValue) {
        setTeamSettings({ defaultAreaPath: settingsData.defaultValue });
        console.log("App: Team default area path set to:", settingsData.defaultValue);
      }
    } catch (err) {
      console.error("App: Failed to fetch team settings:", err);
    }
  };

  const fetchTeamMembers = async () => {
    if (!selectedTeam) return;
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      if (!org || !project || !token) return;

      const data: any = await invoke("fetch_team_members", {
        organization: org,
        project,
        team: selectedTeam,
        token
      });

      if (data.value) {
        setTeamMembers(data.value);
      }
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    }
  };

  const handleCreateWorkItem = async (title: string, type: string, assigneeUniqueName: string, parentId?: number, areaPath?: string) => {
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      if (!org || !project || !token) return;

      await invoke("create_azure_work_item", {
        organization: org,
        project,
        token,
        itemType: type,
        title,
        assignee: assigneeUniqueName || null,
        iterationPath: selectedIteration?.path || null,
        areaPath: areaPath || teamSettings.defaultAreaPath || null,
        parentId: parentId || null
      });

      fetchHierarchy();
    } catch (err: any) {
      console.error("Failed to create work item:", err);
      setError(err.toString());
      throw err;
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      if (!org || !project || !token) return;

      await invoke("update_azure_item_status", {
        organization: org,
        project,
        token,
        id,
        status: newStatus
      });

      fetchHierarchy();
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const buildTree = (items: AzureWorkItem[], relations: any[]): HierarchyNode[] => {
    const itemMap = new Map<number, HierarchyNode>();
    items.forEach(item => {
      itemMap.set(item.id, { item, children: [] });
    });

    const childIds = new Set<number>();

    if (relations) {
      relations.forEach(rel => {
        const sourceId = rel.source?.id;
        const targetId = rel.target?.id;

        if (sourceId && targetId && itemMap.has(sourceId) && itemMap.has(targetId)) {
          itemMap.get(sourceId)!.children.push(itemMap.get(targetId)!);
          childIds.add(targetId);
        }
      });
    }

    const rootNodes: HierarchyNode[] = [];
    itemMap.forEach((node, id) => {
      if (!childIds.has(id)) {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  };

  const handleDisconnect = () => {
    console.log("App: handleDisconnect initiated");
    setTeams([]);
    setIterations([]);
    setHierarchy([]);
    setSelectedTeam("");
    setSelectedIteration(null);
    setSelectedStoryId(null);
    setAssigneeFilter([]);
    setCurrentUser(null);
    invoke("update_tray_badge", { count: 0 }).catch(() => {});
    setError(null);
    setShowSettings(false); // Close settings to show landing screen
    console.log("App: State reset complete, showing landing screen");
  };

  return (
    <div className="h-[524px] w-[364px] flex items-center justify-center bg-transparent" data-theme={getEffectiveTheme()}>
      <div className="h-[520px] w-[360px] flex flex-col bg-[var(--app-bg)] text-[var(--text-main)] select-none overflow-hidden rounded-[12px] border border-[var(--border-main)] relative">
        <div className="shrink-0 bg-[var(--header-bg)] border-b border-[var(--border-subtle)] flex flex-col">
          <div className="flex items-center justify-between pr-3 py-1.5">
            {isSearchOpen ? (
              <div className="flex-1 flex items-center gap-2 pl-3 mr-2">
                <div className="relative flex-1 group">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent-blue)] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </div>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search work items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--card-bg-subtle)] border border-[var(--border-main)] rounded-lg pl-8 pr-8 py-1.5 text-[11px] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/30 transition-all font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--text-dim)] hover:text-[var(--text-main)]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 6-12 12M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }}
                  className="px-2 py-1.5 rounded-lg hover:bg-[var(--card-hover)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-all font-bold text-[10px] uppercase tracking-tight shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <TeamSelector
                teams={teams}
                selectedTeam={selectedTeam}
                onSelect={(name) => setSelectedTeam(name)}
                disabled={!isConnected}
              />
            )}
            <div className="flex items-center gap-1.5">
              {!isSearchOpen && (
                <button
                  onClick={() => isConnected && setIsSearchOpen(true)}
                  disabled={!isConnected}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
                  title="Search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </button>
              )}
              <button
                onClick={() => isConnected && (selectedTeam ? fetchHierarchy() : fetchTeams())}
                disabled={isLoading || !isConnected}
                className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-main)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale cursor-pointer"
                title="Retry Sync"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9c-2.67 0-5.1-1.1-6.8-2.9L3 16"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 1 9-9c2.67 0 5.1 1.1 6.8 2.9L21 8"></path><path d="M21 21v-5h-5"></path></svg>
              </button>
              <button
                onClick={() => {
                  if (!isConnected) return;
                  setCreatingSubItemFor(null);
                  setShowCreateModal(true);
                }}
                disabled={!isConnected}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
                title="New Story"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              </button>
              <button
                onClick={() => {
                  setInitialSettingsTab("general");
                  setShowSettings(true);
                }}
                className="pl-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95 cursor-pointer"
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </button>
            </div>
          </div>

          {selectedTeam && (
            <div className="px-3 pb-3 pt-3 flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--card-bg-subtle)]">
              <div className="flex items-center gap-2">
                <Switch
                  checked={activeOnly}
                  onChange={setActiveOnly}
                  label="Active"
                />
                <AssigneeSelector
                  teamMembers={teamMembers}
                  selectedAssignees={assigneeFilter}
                  onSelect={setAssigneeFilter}
                  isLoading={isLoading}
                />
              </div>
              <IterationSelector
                iterations={iterations}
                selectedIteration={selectedIteration}
                onSelect={setSelectedIteration}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--app-bg)] custom-scrollbar">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-[var(--accent-blue)]/30 border-t-[var(--accent-blue)] rounded-full animate-spin"></div>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
              </div>
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-2">Sync Error</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">{error}</p>
              <button onClick={() => {
                setInitialSettingsTab("azure");
                setShowSettings(true);
              }} disabled={isLoading} className="p-1 px-3 bg-[var(--card-bg-subtle)] hover:bg-[var(--card-hover)] text-[var(--accent-blue)] text-[11px] rounded border border-[var(--border-main)] transition-all">
                Edit Settings and Retry
              </button>
            </div>
          )}

          {!isLoading && !error && !selectedTeam && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
              <div className="w-20 h-20 mb-6 bg-[var(--accent-blue)]/10 rounded-[24px] flex items-center justify-center text-[var(--accent-blue)] shadow-xl shadow-blue-500/5">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </div>
              <h1 className="text-base font-bold mb-2 text-[var(--text-main)]">Connect to Azure DevOps</h1>
              <p className="text-[10px] text-[var(--text-dim)] max-w-[200px] leading-relaxed mb-8">
                Configure your organization and PAT token to start tracking your work items.
              </p>
              <button
                onClick={() => {
                  setInitialSettingsTab("azure");
                  setShowSettings(true);
                }}
                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white px-8 py-2.5 rounded-xl text-[10px] font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
              >
                Connect Azure DevOps
              </button>
            </div>
          )}

          {!isLoading && !error && selectedTeam && (
          <HierarchyExplorer
            hierarchy={hierarchy}
            isLoading={isLoading}
            selectedStoryId={selectedStoryId}
            onSelectStory={setSelectedStoryId}
            activeOnly={activeOnly}
            assigneeFilters={assigneeFilter}
            searchQuery={searchQuery}
            baseUrl={azureConfig.org && azureConfig.project ? `https://dev.azure.com/${azureConfig.org}/${azureConfig.project}/_workitems/edit/` : ""}
            onUpdateStatus={handleUpdateStatus}
            onCreateSubItem={(id, title, areaPath, iterationPath) => {
              setCreatingSubItemFor({ id, title, areaPath, iterationPath });
              setShowCreateModal(true);
            }}
          />
          )}
        </div>

        {showCreateModal && (
          <CreateItemModal
            onClose={() => {
              setShowCreateModal(false);
              setCreatingSubItemFor(null);
            }}
            onSave={handleCreateWorkItem}
            teamMembers={teamMembers}
            isLoading={isLoading}
            parentItem={creatingSubItemFor || undefined}
          />
        )}

        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            initialTab={initialSettingsTab}
            onSave={(_config, _token, notifs) => {
              setShowSettings(false);
              setNotificationsEnabled(notifs);
              fetchTeams();
              loadTheme();
              fetchCurrentUser();
            }}
            onDisconnect={handleDisconnect}
            isConnected={teams.length > 0}
          />
        )}
      </div>
    </div>
  );
}

export default App;
