import { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { SettingsModal } from "./components/SettingsModal";
import { TeamSelector } from "./components/TeamSelector";
import { IterationSelector } from "./components/IterationSelector";
import { HierarchyExplorer } from "./components/HierarchyExplorer";
import { CreateItemModal } from "./components/CreateItemModal";
import { Dashboard } from "./components/Dashboard";
import { LinkParentModal } from "./components/LinkParentModal";
import { AssigneeSelector } from "./components/AssigneeSelector";
import { EpicFeatureSelector } from "./components/EpicFeatureSelector";
import { StatusSelector } from "./components/StatusSelector";
import { getSetting, saveSetting } from "./lib/db";
import "./App.css";

export interface AzureWorkItem {
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

const formatErrorMessage = (error: string | null): string => {
  if (!error) return "";

  // Strip common prefixes
  let clean = error.replace(/^(Failed to fetch teams: |Failed to update status: |Failed to fetch iterations: |Failed to fetch hierarchy: )/i, "");

  // Handle HTTP 404 (Resource not found)
  if (clean.includes("404 Not Found")) {
    if (clean.includes("Team") || clean.includes("Project") || clean.includes("TeamFoundation")) {
      return "The Team or Project name in your settings might be incorrect. Please check for typos or ensure the project exists.";
    }

    const jsonPart = clean.split("404 Not Found - ")[1];
    if (jsonPart) {
      try {
        const parsed = JSON.parse(jsonPart);
        return parsed.message || "The requested resource was not found. Please check your settings.";
      } catch {
        return "Could not find your project or organization. Please check your Azure DevOps settings.";
      }
    }
    return "Could not find your project or organization. Please check your Azure DevOps settings.";
  }

  // Handle HTTP 401/403 (Auth issues)
  if (clean.includes("401 Unauthorized") || clean.includes("403 Forbidden") || clean.includes("authentication failed") || clean.includes("login failed")) {
    return "Authentication failed. Your PAT token might be invalid, expired, or lacking necessary scopes (Work Items: Read/Write).";
  }

  // Handle Specific Azure DevOps error codes
  if (clean.includes("VS1530019")) {
    return "Your selected iteration could not be found. It may have been deleted or moved. Please go to Settings and re-select your current iteration.";
  }

  // Try to parse any JSON blob in the error string
  try {
    const jsonMatch = clean.match(/\{.*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.message || parsed.ErrorMessage || clean;
    }
  } catch {
    // Ignore parse errors, fallback to clean string
  }

  return clean;
};

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState<"azure" | "general">("general");
  const [teams, setTeams] = useState<AzureTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [iterations, setIterations] = useState<any[]>([]);
  const [selectedIteration, setSelectedIteration] = useState<any | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [statusFilters, setStatusFilters] = useState<string[]>(["New", "Active", "To Do", "Doing", "InProgress", "In-Progress", "Open", "Approved", "Committed", "Removed"]);
  const [hierarchyData, setHierarchyData] = useState<{ nodes: HierarchyNode[], items: any[] }>({ nodes: [], items: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [teamSettings, setTeamSettings] = useState<{ defaultAreaPath: string | null }>({ defaultAreaPath: null });
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [epicFilter, setEpicFilter] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [theme, setTheme] = useState<string>("dark");
  const [creatingSubItemFor, setCreatingSubItemFor] = useState<{ id: number; title: string; areaPath: string; iterationPath: string } | null>(null);
  const [linkingParentFor, setLinkingParentFor] = useState<{ id: number; title: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [azureConfig, setAzureConfig] = useState<{ org: string; project: string }>({ org: "", project: "" });
  const [azurePat, setAzurePat] = useState<string>("");
  const [epics, setEpics] = useState<any[]>([]);
  const [isEpicsLoading, setIsEpicsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"board" | "dashboard">("board");

  const lastWorkItemsRef = useRef<Record<number, string | null>>({});
  const appStartTimeRef = useRef<Date>(new Date());
  const isInitialLoadRef = useRef<boolean>(true);

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

  const workloads = useMemo(() => {
    const counts: Record<string, number> = {};

    const countActiveItems = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        const assignedTo = node.item.fields["System.AssignedTo"];
        const state = node.item.fields["System.State"];
        const type = node.item.fields["System.WorkItemType"];

        // Count as "Active" if it's a Tasks or Bug in an active state
        const isActiveState = ["New", "To Do", "Proposed", "Active", "Doing", "InProgress", "In-Progress"].includes(state);
        const isLeafWorkItem = type === "Task" || type === "Bug";

        if (isActiveState && isLeafWorkItem && assignedTo) {
          const uniqueName = typeof assignedTo === 'string' ? assignedTo : assignedTo.uniqueName;
          if (uniqueName) {
            counts[uniqueName] = (counts[uniqueName] || 0) + 1;
          }
        }

        if (node.children && node.children.length > 0) {
          countActiveItems(node.children);
        }
      });
    };

    countActiveItems(hierarchyData.nodes);
    return counts;
  }, [hierarchyData.nodes]);

  useEffect(() => {
    if (!selectedTeam || !selectedIteration) return;

    const interval = setInterval(() => {
      fetchHierarchy(selectedIteration.id, true);
    }, 300000); // 5 minutes

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
        if (typeof token === 'string') setAzurePat(token);
        const iden: any = await invoke("identify_me", { organization: org, token });
        setCurrentUser(iden);
      }
    } catch (e) {
      console.error("Failed to identify user:", e);
    }
  };

  const refreshTrayBadge = (itemsOverride?: any[]) => {
    const flattenNodes = (nodes: HierarchyNode[]): any[] => {
      let result: any[] = [];
      nodes.forEach(node => {
        result.push(node.item);
        if (node.children && node.children.length > 0) {
          result = [...result, ...flattenNodes(node.children)];
        }
      });
      return result;
    };

    const itemsToCount = itemsOverride || flattenNodes(hierarchyData.nodes);

    // If we don't have a current user, we can't count "my" tasks, so we clear the badge
    if (!currentUser) {
      invoke("update_tray_badge", { count: 0 }).catch(() => { });
      return;
    }

    const isOwnedByMe = (item: any): boolean => {
      if (!item || !item.fields) return false;
      const assignedTo = item.fields["System.AssignedTo"];

      const isMe = assignedTo && currentUser && (
        assignedTo.uniqueName === currentUser.uniqueName ||
        assignedTo.id === currentUser.id ||
        assignedTo.displayName === currentUser.displayName ||
        (assignedTo.uniqueName && currentUser.uniqueName && assignedTo.uniqueName.toLowerCase() === currentUser.uniqueName.toLowerCase())
      );

      if (isMe) return true;

      // Recursive check for parent ownership
      const parentId = item.fields["System.Parent"];
      if (parentId) {
        const parent = hierarchyData.items.find(i => i.id === parentId);
        if (parent) return isOwnedByMe(parent);
      }
      return false;
    };

    const myTasks = itemsToCount.filter(item => {
      const type = item.fields["System.WorkItemType"];
      const state = (item.fields["System.State"] || "").toLowerCase();

      // Only count active Tasks and Bugs
      const isWorkItem = type === "Task" || type === "Bug";
      const isVisible = statusFilters.map(s => s.toLowerCase()).includes(state);

      return isWorkItem && isVisible && isOwnedByMe(item);
    });

    invoke("update_tray_badge", { count: myTasks.length }).catch(console.error);
  };

  const availableStatuses = useMemo(() => {
    const states = new Set<string>();
    hierarchyData.items.forEach(item => {
      if (item.fields["System.State"]) {
        states.add(item.fields["System.State"]);
      }
    });
    // Ensure default active states are available as options even if not present in current items
    const defaults = ["New", "Active", "Resolved", "Closed", "To Do", "Doing", "Done", "Removed", "Approved", "Committed"];
    defaults.forEach(s => states.add(s));
    return Array.from(states).sort();
  }, [hierarchyData.items]);

  // Update tray badge whenever the current user or hierarchy changes
  useEffect(() => {
    refreshTrayBadge();
  }, [currentUser, hierarchyData.nodes, statusFilters]);

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
    let activeSyncId = 0;

    const syncTeamData = async () => {
      if (!selectedTeam) {
        setIterations([]);
        setSelectedIteration(null);
        setSelectedStoryId(null);
        setTeamSettings({ defaultAreaPath: null });
        setEpics([]);
        setHierarchyData({ nodes: [], items: [] });
        setTeamMembers([]);
        return;
      }

      const syncId = ++activeSyncId;
      setIsLoading(true);
      setError(null);
      // Clear previous team data MUST happen together with isLoading=true
      setHierarchyData({ nodes: [], items: [] });
      setTeamMembers([]);
      setEpics([]);
      setSelectedStoryId(null);
      setSelectedIteration(null);

      try {
        // 1. Fetch settings (Area Path) first as it's a critical dependency for hierarchy
        const settings = await fetchTeamSettings(selectedTeam, true);
        if (syncId !== activeSyncId) return;

        // 2. Fetch Members and Iterations in parallel if possible, but let's keep it sequential for predictability
        const members = await fetchTeamMembers(true);
        if (syncId !== activeSyncId) return;

        const itData = await fetchIterations(true);
        if (syncId !== activeSyncId) return;

        // 3. Fetch Epics
        await fetchEpicsForTeam(selectedTeam, true);
        if (syncId !== activeSyncId) return;

        // 4. Finally fetch Hierarchy with EXPLICIT overrides to avoid state race conditions
        const finalItId = itData && itData.value ? (itData.value.find((it: any) => it.attributes?.timeframe === "current")?.id || itData.value[itData.value.length - 1]?.id) : null;
        await fetchHierarchy(finalItId, true, settings?.path, members);
      } catch (err: any) {
        if (syncId === activeSyncId) {
          console.error("Atomic sync failed:", err);
          setError(err.toString());
        }
      } finally {
        if (syncId === activeSyncId) {
          setIsLoading(false);
        }
      }
    };

    syncTeamData();
  }, [selectedTeam]);

  // Handle iteration changes separately but keep it simple
  useEffect(() => {
    if (selectedTeam && selectedIteration) {
      fetchHierarchy(selectedIteration.id);
      setSelectedStoryId(null);
    }
  }, [selectedIteration]);

  const fetchTeams = async (silent = false) => {
    if (!silent) setIsLoading(true);
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
      if (!silent) setIsLoading(false);
    }
  };

  const fetchIterations = async (silent = false): Promise<any> => {
    if (!silent) setIsLoading(true);
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

      if (data.value && data.value.length > 0) {
        setIterations(data.value);
        const current = data.value.find((it: any) => it.attributes?.timeframe === "current");
        if (current) {
          setSelectedIteration(current);
        } else {
          setSelectedIteration(data.value[data.value.length - 1]);
        }
      } else {
        setIterations([]);
        setSelectedIteration(null);
      }
      return data;
    } catch (err) {
      console.error("Failed to fetch iterations:", err);
      return null;
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchHierarchy = async (iterationId?: string, silent = false, overrideAreaPath?: string, overrideMembers?: any[]) => {
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

      if (typeof token === 'string' && !azurePat) setAzurePat(token);
      if (!azureConfig.org) setAzureConfig({ org, project });

      const itId = iterationId || selectedIteration?.id;

      const membersToUse = overrideMembers || teamMembers;
      const memberNames = membersToUse.map((m: any) => m.identity?.uniqueName || m.uniqueName).filter(Boolean);

      const areaPathToUse = overrideAreaPath || teamSettings.defaultAreaPath || null;

      const hData: any = await invoke("fetch_azure_hierarchy", {
        organization: org,
        project,
        team: selectedTeam,
        token,
        iterationId: itId || null,
        areaPath: areaPathToUse,
        recursive: true,
        teamMembers: memberNames.length > 0 ? memberNames : null
      });

      if (hData.workItems && hData.relations) {
        const tree = buildTree(hData.workItems, hData.relations);
        setHierarchyData({ nodes: tree, items: hData.workItems });
        refreshTrayBadge(hData.workItems);

        const newItems = hData.workItems as any[];
        const hasPreviousState = !isInitialLoadRef.current && Object.keys(lastWorkItemsRef.current).length > 0;
        const pendingNotifications: { title: string; body: string }[] = [];

        newItems.forEach(item => {
          if (!item || !item.fields) return;
          const id = item.fields["System.Id"];
          if (!id) return;

          const currentAssignee = item.fields["System.AssignedTo"]?.displayName || item.fields["System.AssignedTo"]?.uniqueName || null;
          const prevAssignee = lastWorkItemsRef.current[id];

          if (hasPreviousState && currentAssignee && currentAssignee !== prevAssignee) {
            const createdDateStr = item.fields["System.CreatedDate"];
            const createdDate = createdDateStr ? new Date(createdDateStr) : null;

            // Only notify if:
            // 1. It's truly an assignment change to the user (or someone else)
            // 2. It's not a "new" item that was actually created before the app started
            const isExistingItem = prevAssignee !== undefined;
            const isNewButOld = !isExistingItem && createdDate && createdDate < appStartTimeRef.current;

            if (!isNewButOld && notificationsEnabled) {
              pendingNotifications.push({
                title: "Task Assigned",
                body: `"${item.fields["System.Title"] || 'Work Item'}" is now assigned to ${currentAssignee}`,
              });
            }
          }
          lastWorkItemsRef.current[id] = currentAssignee;
        });

        if (pendingNotifications.length > 0) {
          if (pendingNotifications.length > 3) {
            sendNotification({
              title: "Work Item Updates",
              body: `${pendingNotifications.length} items were updated or assigned.`,
              // @ts-ignore - Some versions of the plugin support id/tag for replacement
              id: "piik-update-batch"
            });
          } else {
            pendingNotifications.forEach((notification, idx) => {
              sendNotification({
                ...notification,
                // @ts-ignore
                id: `piik-update-${idx}`
              });
            });
          }
        }

        isInitialLoadRef.current = false;
      }
    } catch (err: any) {
      console.error("Failed to fetch hierarchy:", err);
      if (!silent) setError(err.toString());
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchTeamSettings = async (teamName?: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      const teamToFetch = teamName || selectedTeam;
      if (!org || !project || !token || !teamToFetch) return null;

      const settingsData: any = await invoke("fetch_azure_team_settings", {
        organization: org,
        project,
        team: teamToFetch,
        token
      });

      if (settingsData && (settingsData.defaultValue || settingsData.field?.referenceName === 'System.AreaPath')) {
        // If defaultValue is an object (unexpected but possible), try to get path
        const defaultValue = typeof settingsData.defaultValue === 'string'
          ? settingsData.defaultValue
          : (settingsData.defaultValue?.path || null);

        if (!teamName || teamName === selectedTeam) {
          setTeamSettings({ defaultAreaPath: defaultValue });
          console.log("App: Team default area path set to:", defaultValue);
        }

        // Find if the default area path has recursive inclusion
        const defaultPathValue = settingsData.values?.find((v: any) => v.value === defaultValue);
        return {
          path: defaultValue,
          recursive: defaultPathValue?.includeChildren ?? false
        };
      }
      return null;
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchEpicsForTeam = async (teamName: string, silent = false) => {
    if (!silent) setIsEpicsLoading(true);
    setEpics([]);
    console.log(`App: fetchEpicsForTeam triggered for: "${teamName}"`);
    if (!teamName || teamName === "Global") {
      console.log("App: Fetching epics with Global scope (no area path filter)");
      await fetchEpics(undefined, undefined, true, silent);
      return;
    }
    const settings = await fetchTeamSettings(teamName, silent);
    if (settings && settings.path) {
      console.log(`App: Team "${teamName}" mapped to area path:`, settings.path, "Recursive:", settings.recursive);
      await fetchEpics(settings.path, undefined, settings.recursive, silent);
    } else {
      console.warn(`App: No area path found for team "${teamName}", falling back to project scope`);
      await fetchEpics(undefined, undefined, true, silent);
    }
  };

  const fetchTeamMembers = async (silent = false): Promise<any[]> => {
    if (!selectedTeam) return [];
    if (!silent) setIsLoading(true);
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      if (!org || !project || !token) return [];

      const data: any = await invoke("fetch_team_members", {
        organization: org,
        project,
        team: selectedTeam,
        token
      });

      if (data.value) {
        setTeamMembers(data.value);
        return data.value;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch team members:", err);
      return [];
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchEpics = async (areaPath?: string, configOverride?: { org: string; project: string }, recursive: boolean = true, silent = false) => {
    if (!silent) setIsEpicsLoading(true);
    setEpics([]); // Clear previous results immediately
    try {
      const org = configOverride?.org || azureConfig.org || await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = configOverride?.project || azureConfig.project || await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      if (!org || !project || !token) {
        setIsEpicsLoading(false);
        return;
      }

      console.log(`App: Invoking fetch_azure_epics for area: "${areaPath}", recursive: ${recursive}`);
      const data: any = await invoke("fetch_azure_epics", {
        organization: org,
        project,
        token,
        area_path: areaPath || null,
        recursive
      });

      console.log(`App: fetch_azure_epics returned ${Array.isArray(data) ? data.length : 0} items for path: ${areaPath || "Project Root"}`);

      if (Array.isArray(data)) {
        // STRICT FRONTEND FILTER: Ensure results honor the area path even if backend query was broad
        let filteredData = data;
        if (areaPath) {
          const lowerPath = areaPath.toLowerCase();
          filteredData = data.filter((epic: any) => {
            const epicPath = (epic.fields?.["System.AreaPath"] || "").toLowerCase();
            if (recursive) {
              return epicPath === lowerPath || epicPath.startsWith(lowerPath + "\\");
            } else {
              return epicPath === lowerPath;
            }
          });
          console.log(`App: Post-filter count: ${filteredData.length} (Filter: ${areaPath}, Recursive: ${recursive})`);
        }
        setEpics(filteredData);
      }
    } catch (err) {
      console.error("Failed to fetch epics:", err);
    } finally {
      if (!silent) setIsEpicsLoading(false);
    }
  };

  const handleLinkParent = async (parentId: number) => {
    if (!linkingParentFor) return;
    try {
      const org = await getSetting("azure_org") || localStorage.getItem("azure_org");
      const project = await getSetting("azure_project") || localStorage.getItem("azure_project");
      let token = await invoke<string>("get_token", { key: "azure_pat" }).catch(() => "");
      if (!token) token = (await getSetting("azure_pat")) || "";

      if (!org || !project || !token) return;

      await invoke("update_azure_item_parent", {
        organization: org,
        project: project,
        token: token,
        id: linkingParentFor.id,
        parentId: parentId
      });

      // Refresh hierarchy to show the new relationship
      if (selectedIteration) {
        await fetchHierarchy(selectedIteration.id, true);
      }
      setLinkingParentFor(null);
    } catch (err: any) {
      console.error("Failed to link parent:", err);
      setError(err.toString());
    }
  };

  const handleCreateWorkItem = async (title: string, type: string, assigneeUniqueName: string, parentId?: number, areaPath?: string, status?: string) => {
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
        parentId: parentId || null,
        status: status || null
      });

      fetchHierarchy();
    } catch (err: any) {
      console.error("Failed to create work item:", err);
      // Only set global error if modal isn't showing (fallback)
      // setError(err.toString()); 
      throw err;
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const org = azureConfig.org || await getSetting("azure_org") || localStorage.getItem("azure_org") || "";
      const project = azureConfig.project || await getSetting("azure_project") || localStorage.getItem("azure_project") || "";
      const token = azurePat || await invoke<string>("get_token", { key: "azure_pat" }).catch(() => (getSetting("azure_pat") || ""));

      console.log(`App: Updating item ${id} to status ${newStatus}`);
      if (!org || !project || !token) {
        console.warn(`App: Missing Azure settings (org:${!!org}/proj:${!!project}/token:${!!token}), cannot update status`);
        return;
      }

      // Update state if not already set
      if (!azureConfig.org) setAzureConfig({ org, project });
      if (!azurePat && typeof token === 'string') setAzurePat(token);

      await invoke("update_azure_item_status", { organization: org, project, id, status: newStatus, token });
      console.log(`App: Item ${id} status updated successfully in Azure`);

      // Update local state immediately for responsiveness
      const updateNodeStatus = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.item.id === id) {
            return {
              ...node,
              item: {
                ...node.item,
                fields: { ...node.item.fields, "System.State": newStatus }
              }
            };
          }
          if (node.children) {
            return { ...node, children: updateNodeStatus(node.children) };
          }
          return node;
        });
      };

      setHierarchyData(prev => {
        const newNodes = updateNodeStatus(prev.nodes);
        const newItems = prev.items.map(item => {
          if (item.id === id) {
            return {
              ...item,
              fields: { ...item.fields, "System.State": newStatus }
            };
          }
          return item;
        });
        return { ...prev, nodes: newNodes, items: newItems };
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUpdateTitle = async (id: number, newTitle: string) => {
    try {
      const org = azureConfig.org || await getSetting("azure_org") || localStorage.getItem("azure_org") || "";
      const project = azureConfig.project || await getSetting("azure_project") || localStorage.getItem("azure_project") || "";
      const token = azurePat || await invoke<string>("get_token", { key: "azure_pat" }).catch(() => (getSetting("azure_pat") || ""));

      if (!org || !project || !token) return;

      await invoke("update_azure_item_title", { organization: org, project, id, title: newTitle, token });

      // Update local state immediately
      const updateNodeTitle = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.item.id === id) {
            return {
              ...node,
              item: {
                ...node.item,
                fields: { ...node.item.fields, "System.Title": newTitle }
              }
            };
          }
          if (node.children) {
            return { ...node, children: updateNodeTitle(node.children) };
          }
          return node;
        });
      };

      setHierarchyData(prev => ({ ...prev, nodes: updateNodeTitle(prev.nodes) }));
    } catch (err) {
      console.error("Failed to update title:", err);
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
      // Sort children by ID descending for visual stability
      node.children.sort((a, b) => b.item.id - a.item.id);

      if (!childIds.has(id)) {
        rootNodes.push(node);
      }
    });

    // Sort root nodes by ID descending
    rootNodes.sort((a, b) => b.item.id - a.item.id);

    return rootNodes;
  };

  const handleDisconnect = () => {
    console.log("App: handleDisconnect initiated");
    setTeams([]);
    setIterations([]);
    setHierarchyData({ nodes: [], items: [] });
    setEpics([]);
    setSelectedTeam("");
    setSelectedIteration(null);
    setSelectedStoryId(null);
    setAssigneeFilter([]);
    setCurrentUser(null);
    invoke("update_tray_badge", { count: 0 }).catch(() => { });
    setError(null);
    setShowSettings(false); // Close settings to show landing screen
    console.log("App: State reset complete, showing landing screen");
  };

  return (
    <div className="h-[524px] w-[364px] flex items-center justify-center bg-transparent" data-theme={getEffectiveTheme()}>
      <div className="h-[520px] w-[360px] flex flex-col bg-[var(--app-bg)] text-[var(--text-main)] overflow-hidden rounded-[12px] border border-[var(--border-main)] relative">
        <div className="shrink-0 bg-[var(--header-bg)] border-b border-[var(--border-subtle)] flex flex-col">
          <div className="flex items-center justify-between pr-3 py-1.5">
            {isSearchOpen ? (
              <div className="flex-1 flex items-center gap-2 pl-3 mr-2">
                <div className="relative flex-1 group">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent-blue)] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 6-12 12M6 6l12 12" /></svg>
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
              <div className="flex-1 min-w-0">
                <TeamSelector
                  teams={teams}
                  selectedTeam={selectedTeam}
                  onSelect={(name) => setSelectedTeam(name)}
                  disabled={!isConnected}
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!isSearchOpen && (
                <button
                  onClick={() => isConnected && setIsSearchOpen(true)}
                  disabled={!isConnected}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
                  title="Search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </button>
              )}
              <button
                onClick={() => isConnected && setIsFilterOpen(!isFilterOpen)}
                disabled={!isConnected}
                className={`p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isFilterOpen ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                title="Filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              </button>
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

          {selectedTeam && isFilterOpen && (
            <div className="px-3 pb-4 pt-4 flex flex-col gap-4 border-t border-[var(--border-subtle)] bg-[var(--card-bg-subtle)] animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest pl-0.5">Status</div>
                  <StatusSelector
                    availableStatuses={availableStatuses}
                    selectedStatuses={statusFilters}
                    onSelect={setStatusFilters}
                    isLoading={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest pl-0.5">Iteration</div>
                  <IterationSelector
                    iterations={iterations}
                    selectedIteration={selectedIteration}
                    onSelect={setSelectedIteration}
                    isLoading={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest pl-0.5">Assignee</div>
                  <AssigneeSelector
                    teamMembers={teamMembers}
                    selectedAssignees={assigneeFilter}
                    onSelect={setAssigneeFilter}
                    isLoading={isLoading}
                    workloads={workloads}
                  />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest pl-0.5">Epic/Feature</div>
                  <EpicFeatureSelector
                    items={epics}
                    selectedIds={epicFilter}
                    onSelect={setEpicFilter}
                    isLoading={isEpicsLoading || isLoading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Bar */}
        {selectedTeam && !isSearchOpen && (
          <div className="shrink-0 flex border-b border-[var(--border-subtle)] bg-[var(--header-bg)]">
            <button
              onClick={() => setActiveTab("board")}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === "board"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text-muted)]"
                }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === "dashboard"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text-muted)]"
                }`}
            >
              Dashboard
            </button>
          </div>
        )}

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
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-2">
                {error.includes("404") || error.includes("401") || error.includes("Unauthorized") ? "Setup Required" : "Sync Error"}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] mb-5 max-h-[120px] overflow-y-auto px-4 leading-relaxed font-medium">
                {formatErrorMessage(error)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setError(null)}
                  className="p-1 px-4 bg-[var(--card-bg-subtle)] hover:bg-[var(--card-hover)] text-[var(--text-dim)] text-[10px] font-bold rounded-lg border border-[var(--border-main)] transition-all"
                >
                  Dismiss
                </button>
                <button onClick={() => {
                  setInitialSettingsTab("azure");
                  setShowSettings(true);
                  setError(null);
                }} disabled={isLoading} className="p-1 px-4 bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] text-[10px] font-bold rounded-lg border border-[var(--accent-blue)]/20 transition-all">
                  Fix Settings
                </button>
              </div>
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

          {!isLoading && !error && selectedTeam && activeTab === "board" && (
            <HierarchyExplorer
              hierarchy={hierarchyData.nodes}
              isLoading={isLoading}
              selectedStoryId={selectedStoryId}
              onSelectStory={setSelectedStoryId}
              statusFilters={statusFilters}
              assigneeFilters={assigneeFilter}
              epicFilter={epicFilter}
              searchQuery={searchQuery}
              baseUrl={azureConfig.org && azureConfig.project ? `https://dev.azure.com/${azureConfig.org}/${azureConfig.project}/_workitems/edit/` : ""}
              onUpdateStatus={handleUpdateStatus}
              onUpdateTitle={handleUpdateTitle}
              onCreateSubItem={(id: number, title: string, areaPath: string, iterationPath: string) => {
                setCreatingSubItemFor({ id, title, areaPath, iterationPath });
                setShowCreateModal(true);
              }}
              onLinkParent={(id: number) => {
                const item = hierarchyData.items.find(i => i.id === id);
                if (item) {
                  setLinkingParentFor({ id, title: item.fields["System.Title"] });
                  // Ensure epics list is scoped to current team before opening modal
                  if (selectedTeam) {
                    fetchEpicsForTeam(selectedTeam);
                  }
                }
              }}
              allWorkItems={hierarchyData.items}
            />
          )}

          {!isLoading && !error && selectedTeam && activeTab === "dashboard" && (
            <Dashboard
              workItems={hierarchyData.items}
              teamMembers={teamMembers}
              isLoading={isLoading}
              teamName={selectedTeam}
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
            isLoading={isEpicsLoading}
            parentItem={creatingSubItemFor || undefined}
            defaultAssigneeUniqueName={currentUser?.uniqueName}
            epics={epics}
            teams={teams}
            selectedTeam={selectedTeam || undefined}
            onEpicTeamChange={fetchEpicsForTeam}
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

        {linkingParentFor && (
          <LinkParentModal
            workItem={linkingParentFor}
            epics={epics}
            isLoading={isEpicsLoading}
            onClose={() => setLinkingParentFor(null)}
            onLink={handleLinkParent}
          />
        )}
      </div>
    </div>
  );
}

export default App;
