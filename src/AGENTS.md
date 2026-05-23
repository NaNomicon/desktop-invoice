# Frontend (`src/`)

React 19 frontend for XPress Billing Tauri desktop app.

## Structure

| Directory | Purpose |
|-----------|---------|
| `components/` | Reusable UI components (shadcn/ui + custom) |
| `pages/` | Page-level route components |
| `stores/` | Zustand state stores for global UI state |
| `utils/` | Pure utility/helper functions |
| `hooks/` | Custom React hooks |
| `i18n/` | Internationalization config |
| `lib/` | Library wrappers, Tauri bindings |
| `services/` | Service layer (API calls, Tauri commands) |
| `assets/` | Static assets (images, fonts) |
| `test/` | Test utilities and setup |

## Key Patterns

- Composition API patterns with React 19
- Type-safe Tauri commands via tauri-specta bindings (`@/lib/tauri-bindings`)
- Translation strings in `/locales/*.json`
- CSS: Tailwind v4 with CSS logical properties for RTL support
- React Compiler handles memoization — no manual useMemo/useCallback
