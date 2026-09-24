use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Reads a UTF-8 text file. Returns `Ok(None)` if it doesn't exist yet,
/// which the frontend treats as "new, empty document" rather than an error.
#[tauri::command]
pub fn read_text_file(path: String) -> Result<Option<String>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(None);
    }
    fs::read_to_string(p).map(Some).map_err(|e| e.to_string())
}

/// Writes a file atomically: contents land in a sibling temp file first,
/// then that temp file is renamed over the target. A crash or power loss
/// mid-write leaves either the old chapter or the new one on disk — never
/// a half-written, corrupted one.
#[tauri::command]
pub fn write_text_file_atomic(path: String, contents: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp_name = format!(
        ".{}.tmp",
        target.file_name().and_then(|n| n.to_str()).unwrap_or("inkbinder")
    );
    let tmp_path = target.with_file_name(tmp_name);
    {
        let mut f = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
        f.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp_path, &target).map_err(|e| e.to_string())?;
    Ok(())
}

/// Writes base64-encoded bytes to disk — used for exported binary files.
#[tauri::command]
pub fn write_binary_file(path: String, data_base64: String) -> Result<(), String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let bytes = STANDARD.decode(data_base64).map_err(|e| e.to_string())?;
    let target = PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&target, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ensure_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_file() {
        fs::remove_file(p).map_err(|e| e.to_string())
    } else if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

/// A sensible default folder to suggest the first time someone picks a
/// stories folder: their Documents directory, if the OS reports one.
#[tauri::command]
pub fn default_projects_dir() -> Option<String> {
    use tauri::api::path::document_dir;
    document_dir().map(|p| p.to_string_lossy().to_string())
}

/// Where Inkbinder's own settings file (stories folder + recent projects)
/// lives — the OS's standard per-app config directory, created if needed.
#[tauri::command]
pub fn app_config_dir(app: tauri::AppHandle) -> Option<String> {
    let dir = app.path_resolver().app_config_dir()?;
    let _ = fs::create_dir_all(&dir);
    Some(dir.to_string_lossy().to_string())
}