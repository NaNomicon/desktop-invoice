# Rust Backend (`src-tauri/`)

Tauri v2 Rust backend for XPress Billing.

## Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Rust source code |
| `src/lib.rs` | Tauri app setup, plugin registration |
| `src/main.rs` | Entry point |
| `icons/` | App icons (all platforms) |
| `capabilities/` | Tauri capability/permission configs |

## Key Files

- `tauri.conf.json` — App config (windows, CSP, bundle settings)
- `Cargo.toml` — Rust dependencies
- `rust-toolchain.toml` — Pinned Rust toolchain

## Commands & Events

- **Rust → React**: `app.emit("event-name", data)` → `listen("event-name", handler)`
- **React → Rust**: Typed commands via tauri-specta bindings
- All commands follow centralized command pattern

## Conventions

- Use modern Rust formatting: `format!("{variable}")`
- Run `cargo fmt` and `cargo clippy` before commits
