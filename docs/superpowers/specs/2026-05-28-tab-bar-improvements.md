# Tab Bar Improvements — Design Spec

**Date**: 2026-05-28
**Status**: Approved
**Effort**: ~2h

## 1. Goal

Improve the existing `HomeTabs` tab bar in the main window with desktop-standard interactions and polished UI, without over-engineering for an invoicing app.

## 2. Scope

- Extract tab bar into a dedicated component file
- Horizontal scroll (no wrapping)
- Keyboard shortcuts (Ctrl+Tab, Ctrl+W)
- Middle-click to close
- Right-click context menu
- Close button on hover only
- Tooltip on hover for full path
- No new npm dependencies

Out of scope: drag-and-drop reorder, tab icons, tab grouping, tab limit.

## 3. File Changes

### New file: `src/components/tabs/TabBar.tsx`

Extracted from `MainWindowContent.tsx`. Owns all tab UI:

- `<ScrollArea>` wrapping the tab strip
- `<Tooltip>` on each tab showing full path
- Tab button with close (×) on hover
- Middle-click handler (`onMouseDown` → `button === 1`)
- Right-click context menu (Close / Close Others / Close All)
- Keyboard shortcut handler (`useEffect` with global keydown listener)

### Modified: `src/store/ui-store.ts`

Add one action:

- `reorderHomeTabs(fromIndex: number, toIndex: number)` — empty stub for future use (no-op, no reorder yet)

No other store changes.

### Modified: `src/components/layout/MainWindowContent.tsx`

- Replace inline `<HomeTabs>` function with import from `@/components/tabs/TabBar`
- Move the invoice close confirmation `<AlertDialog>` into `TabBar` (or leave in MainWindowContent — TBD during implementation)

## 4. Component Architecture

```
MainWindowContent
  └── TabBar
        ├── ScrollArea (horizontal)
        │     └── TabButton[] (one per homeTab)
        │           ├── Tooltip (shows full path)
        │           ├── tab label
        │           └── CloseButton (× on hover)
        ├── TabContextMenu (positioned, right-click)
        └── KeyboardShortcutHandler (useEffect)
```

- `TabBar` reads from Zustand directly (`useUIStore`)
- All interaction logic lives in `TabBar` — decoupled from routing
- Invoice close confirmation AlertDialog stays in `TabBar` (passed as prop or imported directly)

## 5. Visual Design

### Tab strip
- Single row, horizontal scroll (never wraps)
- Scrollbar hidden by default, visible on hover over the strip
- Each tab: compact, ~28px height, pill-shaped corners

### Tab states

| State | Background | Text | Close button |
|-------|-----------|------|--------------|
| Active | `bg-lime-500` | `text-slate-950` | Visible on hover, red on hover |
| Inactive | `bg-muted/50` | `text-muted-foreground` | Visible on hover, red on hover |
| Pinned (unclosable) | Same as inactive | `text-muted-foreground` (slightly dimmer) | Hidden entirely |

### Separator between tabs
- Thin `border-l border-border/50` line between each tab
- Not present before first tab

## 6. Interactions

### Click to switch
- Click on a tab → `setActiveHomeTab(tab.key)` + `navigate(tab.path)`

### Middle-click to close
- `onMouseDown` → `event.button === 1` → calls `handleClose(tab)`
- Prevents default to avoid auto-scroll

### Keyboard shortcuts
- `Ctrl+Tab` → cycle forward (next tab in list, wrap to first)
- `Ctrl+Shift+Tab` → cycle backward
- `Ctrl+W` / `Ctrl+F4` → close currently active tab (triggers invoice confirmation if applicable)

### Right-click context menu
Uses existing `DropdownMenu` from Radix:

- **Close** — closes this tab
- **Close Others** — closes all tabs except this one (skips pinned)
- **Close All** — closes all closable tabs
- Separator
- **Full path** — informational, disabled item, shows `tab.path`

Position: at mouse coordinates via `position: fixed` with `left`/`top` from `onContextMenu` event.

## 7. Edge Cases

| Case | Handling |
|------|----------|
| All tabs closed | Show empty tab strip, fallback to `/invoices` route |
| Close active tab | As current: navigate to last tab in list |
| Close all but pinned | Context menu "Close All" skips `closable === false` |
| Ctrl+W on invoice form | Triggers same confirmation dialog as close button |
| Report route tabs (`/reports/print/42`) | Shows tooltip with full path for disambiguation |
| Very many tabs (15+) | Scrolling works; no limit enforced |

## 8. Testing

- Tab opens/closes correctly
- Middle-click closes tab
- Ctrl+Tab cycles through tabs correctly
- Ctrl+W closes active tab
- Context menu Close Others / Close All works
- Pinned tabs cannot be closed via any method
- Invoice close confirmation still fires
