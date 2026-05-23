# XPress Billing — Root

## Project Overview

XPress Billing is a Tauri v2 desktop application for billing/invoicing management. Built with React 19, TypeScript, Tailwind CSS v4, shadcn/ui, and Rust backend.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Radix primitives)
- **Backend**: Rust (Tauri v2), tauri-specta for type-safe IPC
- **State**: Zustand (global UI), TanStack Query (server/async data), React state (local)
- **Testing**: Vitest (frontend), Cargo test (Rust)
- **i18n**: react-i18next
- **Package Manager**: npm

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/` | React frontend |
| `src-tauri/` | Rust/Tauri backend |
| `src/components/` | Reusable UI components |
| `src/pages/` | Page-level route components |
| `src/stores/` | Zustand state stores |
| `src/utils/` | Utility/helper functions |
| `docs/` | Developer documentation |

## Core Rules

- Use npm only (not pnpm/yarn)
- Tauri v2 APIs and docs only
- Follow the state management onion: useState → Zustand → TanStack Query
- No manual useMemo/useCallback (React Compiler handles memoization)
