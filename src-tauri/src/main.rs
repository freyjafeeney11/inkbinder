#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::read_text_file,
            commands::write_text_file_atomic,
            commands::write_binary_file,
            commands::ensure_dir,
            commands::path_exists,
            commands::delete_path,
            commands::default_projects_dir,
            commands::app_config_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Inkbinder");
}