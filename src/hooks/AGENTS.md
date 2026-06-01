# Hooks (`src/hooks/`)

**Generated:** 2026-06-01

Custom React hooks. All hooks must live here or in `src/services/` — never in `src/lib/` (enforced by ast-grep).

## Files

| File | Purpose |
|------|---------|
| `use-platform.ts` | Platform detection — `isMacOS`, `isWindows`, `isLinux` via `@tauri-apps/plugin-os` |
| `use-keyboard-shortcuts.ts` | Global keyboard shortcut handler (Cmd+, for settings, Cmd+1 for sidebar) |
| `use-command-context.ts` | Returns `CommandContext` singleton — actions for the command system |
| `useColumnOrder.ts` | Persists TanStack Table column order to localStorage |
| `useCloseWithBackupPrompt.ts` | Listens for `app-close-requested` event, prompts if unsaved data exists |
| `useMainWindowEventListeners.ts` | Wires up all main window Tauri event listeners |
| `useSquareCornersEffect.ts` | Applies square corners CSS class based on macOS preference |
| `use-mobile.ts` | Mobile/narrow viewport detection (rarely used — desktop app) |

## Patterns

```typescript
// Platform detection
import { usePlatform } from '@/hooks/use-platform'
const { isMacOS, isWindows, isLinux } = usePlatform()

// Command context (for command palette / keyboard shortcuts)
import { useCommandContext } from '@/hooks/use-command-context'
const context = useCommandContext()
```

## Notes

- `use-platform.ts` has a test file (`use-platform.test.ts`) — mock `@tauri-apps/plugin-os` in tests
- `useCommandContext.ts` (camelCase) is an alias for `use-command-context.ts` — use the kebab-case version
