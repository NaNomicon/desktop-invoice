# Services (`src/services/`)

**Generated:** 2026-06-01

TanStack Query hooks for persistent/async data. Three files — the pattern to follow for new service hooks.

## Files

| File | Purpose |
|------|---------|
| `preferences.ts` | `usePreferences()` + `useSavePreferences()` — load/save app preferences via Tauri commands |
| `outstanding.ts` | `useOutstandingData()` — fetch outstanding receivables from SQLite |
| `migration.ts` | `useMigration()` — SQL Server → SQLite migration with progress tracking |

## Pattern

```typescript
// Query key factory
const preferencesQueryKeys = {
  all: ['preferences'] as const,
  preferences: () => [...preferencesQueryKeys.all] as const,
}

// Query hook
export function usePreferences() {
  return useQuery({
    queryKey: preferencesQueryKeys.preferences(),
    queryFn: async () => unwrapResult(await commands.loadPreferences()),
  })
}

// Mutation hook with cache update
export function useSavePreferences() {
  return useMutation({
    mutationFn: async (prefs: AppPreferences) => {
      const result = await commands.savePreferences(prefs)
      if (result.status === 'error') throw result.error
    },
    onSuccess: (_, prefs) => {
      queryClient.setQueryData(preferencesQueryKeys.preferences(), prefs)
      toast.success(i18n.t('toast.success.saved'))
    },
  })
}
```

## Notes

- Import `commands` from `@/lib/tauri-bindings`, not directly from `@/lib/bindings`
- Import `queryClient` from `@/lib/query-client` for cache updates in `onSuccess`
- Direct SQLite queries use `query()` from `@/lib/db` — no Tauri command needed
- Most page-level data fetching is done inline with `query()` in `useEffect` — migrate to services when reuse is needed
