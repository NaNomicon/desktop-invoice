# Frontend (`src/`)

**Generated:** 2026-06-01

React 19 + TypeScript frontend for XPress Billing. Two entry points: `main.tsx` (full app, HashRouter) and `quick-pane-main.tsx` (floating panel, no router).

## Structure

| Directory | Purpose |
|-----------|---------|
| `components/` | UI components — shadcn/ui primitives + custom app components |
| `components/layout/` | Window shell, sidebar, router outlet (`MainWindowContent.tsx`) |
| `components/ui/` | shadcn/ui components — DO NOT hand-edit, regenerate via CLI |
| `components/titlebar/` | Platform-specific title bars (macOS/Windows/Linux) |
| `pages/` | Route-level page components |
| `store/` | Zustand stores (use this, NOT `stores/`) |
| `services/` | TanStack Query hooks for persistent/async data |
| `hooks/` | Custom React hooks |
| `lib/` | Core utilities, Tauri bindings, DB, domain logic |
| `i18n/` | i18next config + type declarations |
| `test/` | Test utilities and setup |

## Key Files

| File | Role |
|------|------|
| `App.tsx` | Boot sequence: splash → auth gate → main UI. Initializes language, menus, updater. |
| `main.tsx` | React root with `HashRouter` + `QueryClientProvider` |
| `quick-pane-main.tsx` | Standalone React root for floating quick-pane window |
| `lib/tauri-bindings.ts` | Import Tauri commands from here — re-exports `bindings.ts` + `unwrapResult` |
| `lib/bindings.ts` | **AUTO-GENERATED** — DO NOT EDIT. Run `npm run rust:bindings` to regenerate. |
| `lib/db.ts` | SQLite singleton (`getDb()`, `query()`, `execute()`) |
| `lib/db/schema.ts` | Table definitions + `CURRENT_VERSION` |
| `lib/db/migrations.ts` | Schema migration runner |
| `lib/types.ts` | All DB entity TypeScript interfaces |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) and other pure utilities |
| `lib/rbac.ts` | `ROLES`, `isAdmin()`, `canDelete()` |

## Patterns

### Tauri IPC
```typescript
import { commands, unwrapResult } from '@/lib/tauri-bindings'
// In TanStack Query (throw on error):
const data = unwrapResult(await commands.loadPreferences())
// In event handlers (handle error explicitly):
const result = await commands.savePreferences(prefs)
if (result.status === 'error') toast.error(result.error)
```

### Zustand
```typescript
// CORRECT — selector syntax
const value = useUIStore(s => s.value)
// WRONG — causes render cascade on every store change
const { value } = useUIStore()
// In lib/ files — getState() only, no hooks
const { value } = useUIStore.getState()
```

### TanStack Query
- Query hooks live in `src/services/`, not in pages
- Use query key factories: `const keys = { all: ['domain'] as const }`
- `staleTime: 5min`, `gcTime: 10min`, `refetchOnWindowFocus: false` (desktop defaults)

### i18n
```typescript
const { t } = useTranslation()
t('feature.section.key')
// Non-React (menus, lib/):
import i18n from '@/i18n/config'
i18n.t('key')
```

### CSS
- Tailwind v4 — no `tailwind.config.js`, theme in `index.css` / `theme-variables.css`
- Semantic tokens only: `bg-background` not `bg-white`
- Logical properties for RTL: `ps-4` not `pl-4`, `text-start` not `text-left`
- No responsive breakpoints — desktop-only app

## Anti-Patterns (enforced by ast-grep)

- `const { x } = useStore()` — destructure from Zustand → render cascade
- `useXxx()` hooks exported from `src/lib/` — hooks belong in `hooks/` or `services/`
- Zustand subscriptions in `src/lib/` — use `getState()` only
- Manual `useMemo`/`useCallback`/`React.memo` — React Compiler handles this
- `as any`, `@ts-ignore`, `@ts-expect-error` — forbidden
