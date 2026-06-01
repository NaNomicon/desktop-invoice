# Stores (`src/store/`)

**Generated:** 2026-06-01

Zustand stores for global UI state. Use `src/store/` — `src/stores/` is an empty legacy directory.

## Stores

| File | State | Middleware |
|------|-------|-----------|
| `ui-store.ts` | Sidebar visibility, command palette, preferences dialog, home tabs, product autofill, last quick-pane entry, home background | `devtools` |
| `authStore.ts` | `user_id_log`, `user_name`, `user_id`, `company_id`, `isLoggedIn`, `login()`, `logout()` | `persist` (partialize excludes `isLoggedIn`) |
| `outstanding-store.ts` | `search`, `companyFilter`, `selectedCustomerId` | none |

## Rules (enforced by ast-grep)

```typescript
// CORRECT — selector syntax
const isVisible = useUIStore(s => s.leftSidebarVisible)
const { toggleLeftSidebar } = useUIStore.getState()  // in callbacks

// WRONG — destructure causes re-render on every store change
const { leftSidebarVisible } = useUIStore()

// In src/lib/ files — getState() only, never hook subscriptions
useUIStore.getState().someValue
```

## Adding a Store

1. Create `src/store/<name>-store.ts`
2. Export `use<Name>Store = create<State>()(...)` 
3. Use `devtools` middleware for debuggability; `persist` only if state must survive restarts
4. Keep stores small — one concern per store

## Notes

- `authStore` uses `persist` with `partialize` — `isLoggedIn` is NOT persisted (derived on load from `user_id_log`)
- `ui-store.ts` has `ProductAutoFill` interface — used to pass product data from quick-pane to invoice/quotation forms
- `HomeTabItem` interface in `ui-store.ts` — tab key is the route path string
