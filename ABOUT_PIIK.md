# About Piik

**Piik** is a lightweight, lightning-fast macOS menu bar application designed to bridge the gap between your active development environment and Azure DevOps. By keeping your workspace context-aware and accessible directly from the system tray, Piik allows engineers to view, filter, edit, and create work items without ever needing to open a web browser.

---

## The Core Challenge

Azure DevOps is a powerful platform, but its web-based user interface introduces significant friction for daily engineering tasks:
* **Context Switching**: To perform a simple operation—like creating a task to link to an active Pull Request—engineers must leave their current window (e.g., GitHub, GitLab, or IDE), open a new browser tab, load Azure DevOps, navigate to the correct project and board, create the task, copy the ID, and then return to their original page.
* **Navigation Fatigue**: Creating, updating, or deleting items on the web UI requires multiple clicks, page loads, and transitions, which disrupts the developer's "flow state."
* **Friction in Task Hygiene**: Because the web process is slow and distracting, engineers are more likely to delay or skip creating tasks, leading to out-of-date sprint boards and inaccurate tracking.

---

## The Piik Solution

Piik solves this friction by living entirely within the macOS **Menu Bar**. With a single click (or hotkey), a dropdown drawer overlay appears instantly over whatever page or application you are currently viewing. 

You can perform your work item management in seconds and dismiss the panel, returning immediately to your active work.

### How it Works

* **Menu-Bar First UI**: An unobtrusive tray icon that acts as a quick-access control panel.
* **Instant Overlays**: Popovers and dialogs load instantly without reloading page assets.
* **Native API Integration**: Natively queries the Azure DevOps REST API, skipping the web UI rendering process for immediate data retrieval and updates.

---

## Key Features

* **At-a-Glance Workload Count**: The menu bar tray badge shows you open task counts at all times.
* **Fast Creation**: Create tasks, bugs, or stories with a status dropdown directly from the quick-create panel.
* **Dynamic Reports & Analytics**:
  * View open vs. closed item distributions instantly.
  * Filter reports by date ranges (e.g., "This Month", "Last Month") and scope.
  * Group and filter by specific parent **Stories or Epics** to download related tasks as CSV files.
  * Filter by **Assignees** from a specific team (e.g., *UX Engineering*) to track workloads and contributions.
* **Closed/Resolved Date Tracking**: Exported CSVs automatically track when tasks were completed with a dedicated Closed Date column.
* **Seamless Board Hierarchy**: Fallbacks for teams using board-first workflows without active iterations.
