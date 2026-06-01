# Components (`src/components/`)

**Generated:** 2026-06-01

Reusable UI components. Three categories: shadcn/ui primitives (`ui/`), app-specific feature components, and window/layout shell components.

## Structure

| Directory | Contents |
|-----------|----------|
| `ui/` | 38 shadcn/ui components — Radix primitives + Tailwind styling |
| `layout/` | Window shell: `MainWindow`, `MainWindowContent` (routes), `LeftSideBar` |
| `titlebar/` | Platform title bars: `TitleBar` (router), `LinuxTitleBar`, `MacOSWindowControls`, `WindowsWindowControls` |
| `command-palette/` | `CommandPalette` — Cmd+K search over registered commands |
| `preferences/` | `PreferencesDialog` + panes (General, Appearance, Advanced) + `ShortcutPicker` |
| `tabs/` | `TabBar` — home tab navigation tied to router |
| `product/` | `CompanyProductSelector` — product dropdown with company filter |
| `quick-pane/` | `QuickPaneApp` — standalone root for floating window |
| `whatsapp/` | `WhatsAppSendDialog` — WhatsApp message composer |

## Key Files

- `MainWindowContent.tsx` — **All routes defined here** (30+). Add new routes here.
- `MainWindow.tsx` — Resizable panel layout (sidebar + content), loads home background from DB
- `TitleBar.tsx` — Detects platform via `usePlatform()`, renders correct controls
- `ErrorBoundary.tsx` — Wraps entire app; catches render errors
- `SplashScreen.tsx` — Shown during app initialization (min 2.5s)
- `DataTablePagination.tsx` — Shared pagination for TanStack Table instances
- `ThemeProvider.tsx` — Light/dark theme context

## shadcn/ui (`ui/`)

- Import: `import { Button } from '@/components/ui/button'`
- All use `cn()` for className merging, `cva()` for variants
- Accept `className` prop — always merged via `cn()`
- `data-slot` attributes on root elements for CSS targeting
- Do not hand-edit — add new components via `npx shadcn@latest add <component>`

## Patterns

```typescript
// cn() for conditional classes
import { cn } from '@/lib/utils'
<div className={cn('base-class', condition && 'conditional-class', className)} />

// Platform-aware rendering
import { usePlatform } from '@/hooks/use-platform'
const { isMacOS } = usePlatform()
```

## Notes

- No responsive breakpoints — desktop-only app
- `sidebar.tsx` is 724 lines — the full shadcn sidebar primitive, not a custom component
- `ThemeProvider` reads from `useTheme()` hook, not directly from Zustand
