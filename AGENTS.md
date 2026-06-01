# XPress Billing — Root

**Generated:** 2026-06-01
**Stack:** Tauri v2 + React 19 + TypeScript + Rust + SQLite

## Overview

Desktop billing/invoicing app. Dual-window: main app (HashRouter, 30+ routes) + floating quick-pane (standalone React tree). Frontend queries SQLite directly via `@tauri-apps/plugin-sql`; Rust backend handles file ops, email, PDF, migration.

## Structure

```
src/                    React frontend
src-tauri/              Rust backend
locales/                i18n JSON (en, ar, fr)
docs/developer/         24 developer guides
docs/specs/             Feature specs
updater/                Cloudflare Worker for auto-update server
scripts/                Release scripts
tools/                  migrate.py (SQL Server migration helper)
index.html              Main entry → src/main.tsx
quick-pane.html         Quick-pane entry → src/quick-pane-main.tsx
```

## Where to Look

| Task | Location |
|------|----------|
| Add/edit routes | `src/components/layout/MainWindowContent.tsx` |
| Add Tauri command | `src-tauri/src/commands/<domain>.rs` → register in `bindings.rs` |
| Regenerate TS bindings | `npm run rust:bindings` |
| Add Zustand store | `src/store/` |
| Add TanStack Query hook | `src/services/` |
| Add React hook | `src/hooks/` |
| Add UI component | `src/components/ui/` (shadcn pattern) |
| Add page | `src/pages/<domain>/` + route in `MainWindowContent.tsx` |
| DB schema changes | `src/lib/db/schema.ts` + `src/lib/db/migrations.ts` |
| i18n strings | `locales/en.json` (+ ar.json, fr.json) |
| Tauri IPC types | `src/lib/tauri-bindings.ts` (re-exports `src/lib/bindings.ts`) |
| RBAC | `src/lib/rbac.ts` (ADMIN / USER roles) |

## State Management Onion

```
useState → Zustand (src/store/) → TanStack Query (src/services/)
```

- `useState`: component-local only
- Zustand: global UI state (sidebar, tabs, auth, filters)
- TanStack Query: persistent/server data (DB queries, Tauri commands)

## Tauri IPC Pattern

```typescript
import { commands, unwrapResult } from '@/lib/tauri-bindings'

// TanStack Query — let errors propagate
const prefs = unwrapResult(await commands.loadPreferences())

// Event handler — explicit error handling
const result = await commands.savePreferences(prefs)
if (result.status === 'error') toast.error(result.error)
```

`src/lib/bindings.ts` is **auto-generated** — DO NOT EDIT. Edit Rust, run `npm run rust:bindings`.

## Core Rules

- npm only (not pnpm/yarn)
- Tauri v2 APIs only
- No manual `useMemo`/`useCallback`/`React.memo` — React Compiler handles memoization
- No `as any`, `@ts-ignore`, `@ts-expect-error`
- Zustand: selector syntax only — `useStore(s => s.x)` not `const { x } = useStore()`
- Zustand in `lib/`: `getState()` only, no subscriptions
- Hooks belong in `src/hooks/` or `src/services/`, never `src/lib/`
- CSS: semantic tokens only (`bg-background` not `bg-white`), logical properties for RTL (`ps-4` not `pl-4`)
- Money stored as **integer cents** in SQLite (e.g., 125000 = $1,250.00)
- Dates as **ISO 8601 TEXT** in SQLite (YYYY-MM-DD)

## Commands

```bash
npm run dev              # Vite dev server only (no Tauri)
npm run tauri:dev        # Full Tauri dev (frontend + Rust)
npm run tauri:build      # Production build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint (0 warnings allowed)
npm run test:run         # Vitest
npm run rust:test        # cargo test
npm run check:all        # Full quality gate (must pass before commit)
npm run rust:bindings    # Regenerate src/lib/bindings.ts from Rust
npm run fix:all          # Auto-fix lint + format + clippy
```

## Non-Standard Patterns

- `src/store/` has real stores; `src/stores/` has only AGENTS.md — use `src/store/`
- `src/utils/` is empty; utilities live in `src/lib/utils.ts`
- Routes are inline in `MainWindowContent.tsx`, not a separate router file
- DB migrations run from TypeScript (`src/lib/db/migrations.ts`), not Rust
- Two parallel command systems: Rust IPC commands (`src-tauri/src/commands/`) and frontend UI commands (`src/lib/commands/`)

## Gotchas

- Quick-pane window is NSPanel on macOS — crashes if `is_maximized()` called (denylisted in window-state plugin)
- Tauri log plugin excluded from Webview target on Linux (deadlock risk)
- `src/lib/bindings.ts` auto-exports in debug builds; run `npm run rust:bindings` after changing Rust command signatures
- specta versions are pinned exactly (`=2.0.0-rc.22`) — do not bump without testing
