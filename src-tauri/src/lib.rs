// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod db;
mod just_tasks;
mod projects;
mod tasks;
mod ui_config;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            projects::get_project_tree,
            projects::create_project,
            projects::create_board,
            projects::delete_board,
            projects::delete_project,
            projects::move_just_task_board_to_project,
            just_tasks::get_just_task_boards,
            just_tasks::create_just_task_board,
            just_tasks::delete_just_task_board,
            just_tasks::move_board_to_just_tasks,
            tasks::get_tasks,
            tasks::get_just_tasks,
            tasks::get_today_tasks,
            tasks::get_upcoming_tasks,
            tasks::get_trash_tasks,
            tasks::create_task,
            tasks::set_task_location,
            tasks::move_to_trash,
            tasks::restore_from_trash,
            tasks::delete_from_trash,
            tasks::empty_trash,
            tasks::update_position,
            tasks::update_task_status,
            tasks::set_due_date,
            tasks::set_priority,
            tasks::set_description,
            tasks::update_task_name,
            tasks::sort_tasks,
            tasks::create_note,
            tasks::update_note,
            tasks::delete_note,
            ui_config::get_ui_config,
            ui_config::save_ui_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
