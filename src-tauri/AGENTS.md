# Rust Backend (`src-tauri/`)

**Generated:** 2026-06-01

Tauri v2 Rust backend. Handles file I/O, email, PDF generation, SQL Server migration, quick-pane window management, and type-safe IPC bridge to the frontend.

## Structure

```
src/
├── main.rs              # Binary entry — calls lib::run()
├── lib.rs               # App builder: 14 plugins, event lifecycle, quick-pane init
├── bindings.rs          # tauri-specta command registry + TS type export
├── types.rs             # AppPreferences, RecoveryError, validation helpers
├── commands/
│   ├── mod.rs           # pub mod (8 submodules)
│   ├── preferences.rs   # greet, load_preferences, save_preferences
│   ├── database.rs      # get_db_path, backup_database, restore_database
│   ├── recovery.rs      # save_emergency_data, load_emergency_data, cleanup_old_recovery_files
│   ├── quick_pane.rs    # show/dismiss/toggle_quick_pane, shortcut management
│   ├── notifications.rs # send_native_notification
│   ├── email.rs         # send_email (SMTP via lettre)
│   ├── reports.rs       # save_report_pdf (Typst PDF renderer)
│   └── migration.rs     # migrate_from_sqlserver (SQL Server → SQLite, 16 tables)
└── utils/
    ├── mod.rs
    └── platform.rs      # Path normalization, platform detection
```

## Adding a Command

1. Add `#[tauri::command] #[specta::specta]` fn to appropriate `commands/*.rs`
2. Register in `bindings.rs` `collect_commands![..., your_command]`
3. Run `npm run rust:bindings` to regenerate `src/lib/bindings.ts`
4. Import from `@/lib/tauri-bindings` in frontend

## All 18 Registered Commands

| Command | File | Purpose |
|---------|------|---------|
| `greet` | preferences.rs | Demo greeting |
| `load_preferences` / `save_preferences` | preferences.rs | `preferences.json` in appData |
| `send_native_notification` | notifications.rs | OS notification |
| `save_emergency_data` / `load_emergency_data` / `cleanup_old_recovery_files` | recovery.rs | Crash recovery JSON (10MB cap, 7-day TTL) |
| `show_quick_pane` / `dismiss_quick_pane` / `toggle_quick_pane` | quick_pane.rs | Floating panel (NSPanel on macOS) |
| `get_default_quick_pane_shortcut` / `update_quick_pane_shortcut` | quick_pane.rs | Global shortcut management |
| `send_email` | email.rs | SMTP with HTML body + attachments |
| `get_db_path` / `backup_database` / `restore_database` | database.rs | SQLite file operations |
| `save_report_pdf` | reports.rs | Typst PDF generation |
| `migrate_from_sqlserver` | migration.rs | SQL Server → SQLite (emits `migration-progress` events) |

## Database

- **Frontend queries**: `tauri-plugin-sql` (JS → SQLite directly)
- **Rust-side**: `rusqlite` (bundled) — used only in `migration.rs`
- **File**: `{appConfigDir}/xpress.db`
- **Schema**: `migrations/001_initial.sql` (16 tables, 18 indexes)
- Money as **cents (i64)**, dates as **ISO 8601 TEXT**

## Type Export

`bindings.rs` uses `tauri-specta` to auto-generate `src/lib/bindings.ts`:
- All command params/returns derive `specta::Type`
- Exports run automatically in debug builds
- Manual: `cargo test export_bindings -- --ignored`
- **Pin versions exactly** — `specta = "=2.0.0-rc.22"`, do not bump

## Conventions

- Modern Rust string formatting: `format!("{variable}")` not `format!("{}", variable)`
- Run `cargo fmt` + `cargo clippy -- -D warnings` before commits
- Platform-conditional code: `#[cfg(target_os = "macos")]`, `#[cfg(desktop)]`

## Gotchas

- Quick-pane is NSPanel on macOS — `is_maximized()` crashes; denylisted in window-state plugin
- Tauri log plugin excludes Webview target on Linux (WebKitGTK deadlock on `app.emit()`)
- macOS close button hides window (not quit) — app emits `app-close-requested` event to frontend
- `RunEvent::Exit` used for cleanup (not `ExitRequested` — doesn't fire for Cmd+Q on macOS)
