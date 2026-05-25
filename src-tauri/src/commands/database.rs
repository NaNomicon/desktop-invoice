//! Database backup and restore commands.
//!
//! Provides commands for:
//! - Getting the absolute path to the SQLite database file
//! - Restoring the database from a backup file
//!
//! Backup is handled on the frontend via SQLite's VACUUM INTO command.
//! Restore requires Rust-level file copy because the DB connection is active.

use tauri::Manager;

/// Returns the absolute path to the xpress.db file in the app config directory.
#[tauri::command]
#[specta::specta]
pub fn get_db_path(app: tauri::AppHandle) -> Result<String, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {e}"))?;

    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create app config dir: {e}"))?;

    let db_path = config_dir.join("xpress.db");
    Ok(db_path.to_string_lossy().to_string())
}

/// Creates a backup of the active xpress.db to the specified destination path.
/// Creates parent directories if they don't exist.
#[tauri::command]
#[specta::specta]
pub fn backup_database(app: tauri::AppHandle, dest_path: String) -> Result<(), String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {e}"))?;

    let db_path = config_dir.join("xpress.db");

    if !db_path.exists() {
        return Err("Database file not found. Has the app been initialized?".to_string());
    }

    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(&dest_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create backup directory: {e}"))?;
    }

    std::fs::copy(&db_path, &dest_path).map_err(|e| format!("Failed to create backup: {e}"))?;

    log::info!(
        "Database backed up from '{}' to '{dest_path}'",
        db_path.display()
    );

    Ok(())
}

/// Restores the database by copying a backup file over the active xpress.db.
/// The caller should call `exit(0)` from `@tauri-apps/plugin-process` after
/// this command succeeds so the app re-initializes with the restored database.
#[tauri::command]
#[specta::specta]
pub fn restore_database(app: tauri::AppHandle, from_path: String) -> Result<(), String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {e}"))?;

    let db_path = config_dir.join("xpress.db");

    if !std::path::Path::new(&from_path).exists() {
        return Err(format!("Backup file not found: {from_path}"));
    }

    std::fs::copy(&from_path, &db_path).map_err(|e| format!("Failed to restore database: {e}"))?;

    log::info!(
        "Database restored from '{}' to '{}'",
        from_path,
        db_path.display()
    );

    Ok(())
}
