use tauri_plugin_positioner::{Position, WindowExt};
use keyring::Entry;
use tauri::Manager;

#[tauri::command]
fn get_token(key: String) -> Result<String, String> {
    let entry = Entry::new("piik", &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(p) => Ok(p),
        Err(keyring::Error::NoEntry) => Ok("".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_token(key: String, token: String) -> Result<(), String> {
    let trimmed_token = token.trim();
    if trimmed_token.is_empty() {
        return Ok(());
    }
    let entry = Entry::new("piik", &key).map_err(|e| e.to_string())?;
    entry.set_password(trimmed_token).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_token(key: String) -> Result<(), String> {
    let entry = Entry::new("piik", &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err::<(), String>(e.to_string()),
    }
}

#[tauri::command]
fn get_base_url(org: &str) -> String {
    if org.contains(".visualstudio.com") {
        format!("https://{}", org)
    } else {
        format!("https://dev.azure.com/{}", org)
    }
}

#[tauri::command]
async fn fetch_azure_teams(organization: String, project: String, token: String) -> Result<serde_json::Value, String> {
    let org = organization.trim().trim_end_matches("/");
    let proj = project.trim().trim_end_matches("/");
    let proj_encoded = proj.replace(" ", "%20");
    let base_url = get_base_url(org);
    // Revert to project-level teams API which worked
    let url = format!("{}/_apis/projects/{}/teams?api-version=7.1", base_url, proj_encoded);
    println!("Backend: Fetching project teams from: {}", url);

    let client = reqwest::Client::new();
    let res = client.get(&url)
        .basic_auth("", Some(token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;

    if status.is_success() {
        match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(data) => Ok(data),
            Err(e) => {
                println!("DIAGNOSTIC: Failed to decode JSON from success response in fetch_azure_teams.");
                println!("DIAGNOSTIC: Status: {}", status);
                println!("DIAGNOSTIC: Body: {}", text);
                Err(format!("Error decoding response body: {}", e))
            }
        }
    } else {
        println!("DIAGNOSTIC: Request failed in fetch_azure_teams. Status: {}", status);
        println!("DIAGNOSTIC: Body: {}", text);
        Err(format!("Failed to fetch teams: {} - {}", status, text))
    }
}

#[tauri::command]
async fn fetch_azure_iterations(organization: String, project: String, team: String, token: String) -> Result<serde_json::Value, String> {
    let org = organization.trim().trim_end_matches("/");
    let proj = project.trim().trim_end_matches("/");
    let team_encoded = team.trim().replace(" ", "%20");
    let base_url = get_base_url(org);
    let url = format!("{}/{}/{}/_apis/work/teamsettings/iterations?api-version=7.1", 
        base_url, proj.replace(" ", "%20"), team_encoded);

    let client = reqwest::Client::new();
    let res = client.get(&url)
        .basic_auth("", Some(token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;

    if status.is_success() {
        match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(data) => Ok(data),
            Err(e) => {
                println!("DIAGNOSTIC: Failed to decode JSON from success response in fetch_azure_iterations.");
                println!("DIAGNOSTIC: Status: {}", status);
                println!("DIAGNOSTIC: Body: {}", text);
                Err(format!("Error decoding response body: {}", e))
            }
        }
    } else {
        println!("DIAGNOSTIC: Request failed in fetch_azure_iterations. Status: {}", status);
        println!("DIAGNOSTIC: Body: {}", text);
        Err(format!("Failed to fetch iterations: {} - {}", status, text))
    }
}

#[tauri::command]
async fn fetch_azure_team_settings(organization: String, project: String, team: String, token: String) -> Result<serde_json::Value, String> {
    let org = organization.trim().trim_end_matches("/");
    let proj = project.trim().trim_end_matches("/");
    let team_encoded = team.trim().replace(" ", "%20");
    let base_url = get_base_url(org);
    
    // Team Field Settings API provides the default area path
    let url = format!("{}/{}/{}/_apis/work/teamsettings/teamfieldvalues?api-version=7.1", 
        base_url, proj.replace(" ", "%20"), team_encoded);

    let client = reqwest::Client::new();
    let res = client.get(&url)
        .basic_auth("", Some(token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        Ok(data)
    } else {
        Err(format!("Failed to fetch team settings: {}", res.status()))
    }
}

#[tauri::command]
async fn fetch_azure_hierarchy(organization: String, project: String, team: String, token: String, iteration_id: Option<String>) -> Result<serde_json::Value, String> {
    let org = organization.trim().trim_end_matches("/");
    let proj = project.trim().trim_end_matches("/");
    let team_name = team.trim();
    let proj_encoded = proj.replace(" ", "%20");
    let team_encoded = team_name.replace(" ", "%20");
    let base_url = get_base_url(org);
    let client = reqwest::Client::new();
    
    // 1. Get Iteration ID (use provided or fetch current)
    let final_iteration_id = if let Some(id) = iteration_id {
        id
    } else {
        let iteration_url = format!("{}/{}/{}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.0", 
            base_url, proj_encoded, team_encoded);
        
        let iter_res = client.get(&iteration_url)
            .basic_auth("", Some(token.clone()))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let iter_status = iter_res.status();
        let iter_text = iter_res.text().await.map_err(|e| e.to_string())?;
        
        if !iter_status.is_success() {
            println!("DIAGNOSTIC: Failed to fetch iterations in fetch_azure_hierarchy. Status: {}", iter_status);
            println!("DIAGNOSTIC: Body: {}", iter_text);
            return Err(format!("Failed to fetch iterations: {} - {}", iter_status, iter_text));
        }

        let iter_data: serde_json::Value = serde_json::from_str(&iter_text).map_err(|e| {
            println!("DIAGNOSTIC: Failed to decode JSON from success response in fetch_azure_hierarchy (iteration).");
            println!("DIAGNOSTIC: Body: {}", iter_text);
            e.to_string()
        })?;

        iter_data["value"][0]["id"].as_str()
            .ok_or_else(|| "No current sprint found for this team.")?.to_string()
    };

    // 2. Get Work Items in that Iteration
    let items_url = format!("{}/{}/{}/_apis/work/teamsettings/iterations/{}/workitems?api-version=7.0",
        base_url, proj_encoded, team_encoded, final_iteration_id);
    
    println!("Backend: Fetching iteration workitems from: {}", items_url);

    let items_res = client.get(&items_url)
        .basic_auth("", Some(token.clone()))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let items_status = items_res.status();
    let items_text = items_res.text().await.map_err(|e| e.to_string())?;

    if !items_status.is_success() {
        println!("DIAGNOSTIC: Failed to fetch items in fetch_azure_hierarchy. Status: {}", items_status);
        println!("DIAGNOSTIC: Body: {}", items_text);
        return Err(format!("Failed to fetch items: {} - {}", items_status, items_text));
    }

    let items_data: serde_json::Value = serde_json::from_str(&items_text).map_err(|e| {
        println!("DIAGNOSTIC: Failed to decode JSON from items response in fetch_azure_hierarchy.");
        println!("DIAGNOSTIC: Body: {}", items_text);
        e.to_string()
    })?;
    println!("Backend: Iteration data received. Keys: {:?}", items_data.as_object().map(|obj| obj.keys().collect::<Vec<_>>()));
    let mut all_ids = std::collections::HashSet::new();
    
    // 1. Collect from flat workItems list
    if let Some(items) = items_data["workItems"].as_array() {
        for item in items {
            if let Some(id) = item["id"].as_i64() { all_ids.insert(id); }
        }
    }

    // 2. Collect from workItemRelations (the hierarchy)
    if let Some(links) = items_data["workItemRelations"].as_array() {
        for rel in links {
            if let Some(target) = rel["target"]["id"].as_i64() { all_ids.insert(target); }
            if let Some(src) = rel["source"]["id"].as_i64() { all_ids.insert(src); }
        }
    }

    println!("Backend: Found {} work items and {} relations in sprint", 
        all_ids.len(), 
        items_data["workItemRelations"].as_array().map(|a| a.len()).unwrap_or(0));

    if all_ids.is_empty() {
        return Ok(serde_json::json!({ "relations": [], "workItems": [] }));
    }

    // 3. Fetch details for all IDs (ADO limits batch to 200 items)
    let id_list: Vec<i64> = all_ids.into_iter().collect();
    let mut all_work_items = Vec::new();
    
    for (i, chunk) in id_list.chunks(200).enumerate() {
        let details_url = format!("{}/{}/_apis/wit/workitemsbatch?api-version=7.1", base_url, proj_encoded);
        let details_query = serde_json::json!({
            "ids": chunk,
            "fields": ["System.Id", "System.Title", "System.State", "System.WorkItemType", "System.AssignedTo", "System.CreatedDate", "System.AreaPath", "System.IterationPath"]
        });

        println!("Backend: Fetching batch chunk {} ({} items)...", i + 1, chunk.len());

        let details_res = client.post(&details_url)
            .basic_auth("", Some(token.clone()))
            .json(&details_query)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !details_res.status().is_success() {
            println!("Backend: Batch fetch chunk {} failed with status: {}", i + 1, details_res.status());
            return Err(format!("Failed to fetch work item details (chunk {}): {}", i + 1, details_res.status()));
        }

        let details_data: serde_json::Value = details_res.json().await.map_err(|e| e.to_string())?;
        if let Some(items) = details_data["value"].as_array() {
            all_work_items.extend(items.clone());
        }
    }

    println!("Backend: Total work items enriched: {}", all_work_items.len());

    Ok(serde_json::json!({
        "relations": items_data["workItemRelations"],
        "workItems": all_work_items
    }))
}

#[tauri::command]
async fn fetch_azure_tasks(organization: String, project: String, token: String) -> Result<serde_json::Value, String> {
    let org = organization.trim().trim_end_matches("/");
    let proj = project.trim().trim_end_matches("/");
    let base_url = get_base_url(org);
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Piik/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let wiql_url = format!("{}/{}/_apis/wit/wiql?api-version=7.1", base_url, proj);
    
    // 1. Get IDs using WIQL
    let query = serde_json::json!({
        "query": "Select [System.Id] From WorkItems Where [System.AssignedTo] = @Me AND [System.State] <> 'Closed'"
    });

    let wiql_res = client.post(&wiql_url)
        .basic_auth("", Some(token.clone()))
        .header("Accept", "application/json")
        .json(&query)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = wiql_res.status();
    if !status.is_success() {
        return match status.as_u16() {
            401 => Err("Unauthorized: Please check your Personal Access Token (PAT).".to_string()),
            403 => Err("Forbidden: Your PAT might lack the 'Work Items: Read' scope.".to_string()),
            404 => Err("Not Found: Check if your Organization and Project names are correct.".to_string()),
            _ => Err(format!("Azure DevOps API error: {}", status)),
        };
    }

    let wiql_data: serde_json::Value = wiql_res.json().await.map_err(|e| e.to_string())?;
    let ids: Vec<i64> = wiql_data["workItems"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|wi| wi["id"].as_i64())
        .collect();

    if ids.is_empty() {
        return Ok(serde_json::json!({ "workItems": [] }));
    }

    // 2. Fetch details for these IDs
    let details_url = format!("{}/{}/_apis/wit/workitemsbatch?api-version=7.1", base_url, proj);
    let details_query = serde_json::json!({
        "ids": ids,
        "fields": ["System.Id", "System.Title", "System.State", "System.WorkItemType", "System.CreatedDate"]
    });

    let details_res = client.post(&details_url)
        .basic_auth("", Some(token))
        .header("Accept", "application/json")
        .json(&details_query)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if details_res.status().is_success() {
        let details_data: serde_json::Value = details_res.json().await.map_err(|e| e.to_string())?;
        Ok(serde_json::json!({ "workItems": details_data["value"] }))
    } else {
        Err(format!("Failed to fetch task details: {}", details_res.status()))
    }
}

#[tauri::command]
async fn fetch_team_members(organization: String, project: String, team: String, token: String) -> Result<serde_json::Value, String> {
    let org = organization.trim().trim_end_matches("/");
    let proj = project.trim().trim_end_matches("/");
    let team_encoded = team.trim().replace(" ", "%20");
    let base_url = get_base_url(org);
    let url = format!("{}/_apis/projects/{}/teams/{}/members?api-version=7.1", 
        base_url, proj.replace(" ", "%20"), team_encoded);

    let client = reqwest::Client::new();
    let res = client.get(&url)
        .basic_auth("", Some(token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        Ok(data)
    } else {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        Err(format!("Failed to fetch team members ({}): {}", status, err_body))
    }
}

#[tauri::command]
async fn create_azure_work_item(
    organization: String,
    project: String,
    token: String,
    item_type: String,
    title: String,
    assignee: Option<String>,
    iteration_path: Option<String>,
    area_path: Option<String>,
    parent_id: Option<i32>, // Added parent_id
) -> Result<serde_json::Value, String> {
    let org = organization.trim().trim_end_matches("/");
    let proj = project.trim().trim_end_matches("/");
    let base_url = get_base_url(org);
    
    // Support User Story (URL encoded space), Task, and Bug
    let sanitized_type = match item_type.to_lowercase().as_str() {
        "bug" => "Bug",
        "user story" | "userstory" => "User%20Story",
        "story" => "Story",
        _ => "Task",
    };
    
    let url = format!("{}/{}/_apis/wit/workitems/${}?api-version=7.1",
        base_url, proj.replace(" ", "%20"), sanitized_type);

    let client = reqwest::Client::new();
    let mut patch = vec![
        serde_json::json!({
            "op": "add",
            "path": "/fields/System.Title",
            "value": title
        })
    ];

    if let Some(user) = assignee {
        if !user.trim().is_empty() {
            patch.push(serde_json::json!({
                "op": "add",
                "path": "/fields/System.AssignedTo",
                "value": user
            }));
        }
    }

    if let Some(path) = iteration_path {
        if !path.trim().is_empty() {
            patch.push(serde_json::json!({
                "op": "add",
                "path": "/fields/System.IterationPath",
                "value": path
            }));
        }
    }

    if let Some(path) = area_path {
        if !path.trim().is_empty() {
            patch.push(serde_json::json!({
                "op": "add",
                "path": "/fields/System.AreaPath",
                "value": path
            }));
        }
    }

    if let Some(pid) = parent_id {
        let parent_url = format!("{}/{}/_apis/wit/workitems/{}?api-version=7.1", 
            base_url, proj.replace(" ", "%20"), pid);
        patch.push(serde_json::json!({
            "op": "add",
            "path": "/relations/-",
            "value": {
                "rel": "System.LinkTypes.Hierarchy-Reverse",
                "url": parent_url
            }
        }));
    }

    let res = client.post(&url)
        .basic_auth("", Some(token))
        .header("Content-Type", "application/json-patch+json")
        .json(&patch)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        Ok(data)
    } else {
        let err_body = res.text().await.unwrap_or_default();
        Err(format!("Failed to create work item: {}", err_body))
    }
}

#[tauri::command]
async fn update_azure_item_status(organization: String, project: String, token: String, id: i64, status: String) -> Result<(), String> {
    let org = organization.trim().trim_end_matches("/");
    let proj = project.trim().trim_end_matches("/");
    let base_url = get_base_url(org);
    let url = format!("{}/{}/_apis/wit/workitems/{}?api-version=7.1", base_url, proj.replace(" ", "%20"), id);

    let client = reqwest::Client::new();
    let patch = serde_json::json!([
        {
            "op": "replace",
            "path": "/fields/System.State",
            "value": status
        }
    ]);

    println!("Backend: Updating item {} to status: {}", id, status);

    let res = client.patch(&url)
        .basic_auth("", Some(token))
        .header("Content-Type", "application/json-patch+json")
        .json(&patch)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        println!("Backend: Item {} updated successfully", id);
        Ok(())
    } else {
        let err_body = res.text().await.unwrap_or_default();
        println!("Backend: Status update failed: {}", err_body);
        Err(format!("Failed to update status: {}", err_body))
    }
}

#[tauri::command]
async fn identify_me(organization: String, token: String) -> Result<serde_json::Value, String> {
    let org = organization.trim().trim_end_matches("/");
    let base_url = get_base_url(org);
    let url = format!("{}/_apis/wit/wiql?api-version=7.1", base_url);

    let client = reqwest::Client::new();
    let query = serde_json::json!({
        "query": "Select [System.Id] From WorkItems Where [System.AssignedTo] = @Me"
    });

    let res = client.post(&url)
        .basic_auth("", Some(token.clone()))
        .json(&query)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;

    if status.is_success() {
        let data: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
            println!("DIAGNOSTIC: Failed to decode JSON from success response in identify_me.");
            println!("DIAGNOSTIC: Body: {}", text);
            e.to_string()
        })?;

        if let Some(items) = data["workItems"].as_array() {
            if !items.is_empty() {
                let id = items[0]["id"].as_i64().unwrap_or(0);
                if id > 0 {
                    let item_url = format!("{}/_apis/wit/workitems/{}?api-version=7.1", base_url, id);
                    let item_res = client.get(&item_url)
                        .basic_auth("", Some(token))
                        .send()
                        .await
                        .map_err(|e| e.to_string())?;
                    
                    let item_status = item_res.status();
                    let item_text = item_res.text().await.map_err(|e| e.to_string())?;

                    if !item_status.is_success() {
                        println!("DIAGNOSTIC: Failed to fetch work item detail in identify_me. Status: {}", item_status);
                        println!("DIAGNOSTIC: Body: {}", item_text);
                        return Err(format!("Failed to fetch work item detail: {} - {}", item_status, item_text));
                    }

                    let item_data: serde_json::Value = serde_json::from_str(&item_text).map_err(|e| {
                        println!("DIAGNOSTIC: Failed to decode JSON from work item response in identify_me.");
                        println!("DIAGNOSTIC: Body: {}", item_text);
                        e.to_string()
                    })?;

                    if let Some(fields) = item_data["fields"].as_object() {
                        if let Some(assigned_to) = fields.get("System.AssignedTo") {
                            return Ok(assigned_to.clone());
                        }
                    }
                }
            }
        }
        Err("No items found assigned to you to identify your identity.".into())
    } else {
        println!("DIAGNOSTIC: identify_me request failed. Status: {}", status);
        println!("DIAGNOSTIC: Body: {}", text);
        Err(format!("Failed to identify user: {} - {}", status, text))
    }
}

#[tauri::command]
fn update_tray_badge(app_handle: tauri::AppHandle, count: i32) {
    println!("Backend: Updating tray badge to: {}", count);
    if let Some(tray) = app_handle.tray_by_id("tray") {
        let title = Some(count.to_string());
        if let Err(e) = tray.set_title(title) {
            println!("Backend: Failed to set tray title: {}", e);
        }
    } else {
        println!("Backend: Tray with ID 'tray' not found!");
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            println!("Backend: Piik is starting up... (Check your Menu Bar for the lightning bolt icon)");
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?;
            let _tray = TrayIconBuilder::with_id("tray")
                .icon(tray_icon)
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.move_window(Position::TrayCenter);
                            
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    if event.id == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            // Hide window when it loses focus
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = window_clone.hide();
                    }
                });
            }
            
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, get_token, set_token, delete_token, fetch_azure_tasks, fetch_azure_teams, fetch_azure_hierarchy, fetch_azure_iterations, fetch_azure_team_settings, update_azure_item_status, fetch_team_members, create_azure_work_item, update_tray_badge, identify_me])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
