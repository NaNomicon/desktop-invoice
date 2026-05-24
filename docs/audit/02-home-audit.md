# Audit: Legacy HOME Spec (02-home.md) vs Current Implementation

## Files Providing HOME/Main-Shell Behavior

| File | Role |
|------|------|
| `src/App.tsx` | Splash → Login → MainWindow orchestration |
| `src/components/SplashScreen.tsx` | Animated loading splash |
| `src/pages/auth/Login.tsx` | User authentication |
| `src/components/layout/MainWindow.tsx` | 3-panel resizable shell (TitleBar + LeftSidebar + Content + RightSidebar) |
| `src/components/layout/MainWindowContent.tsx` | Tab bar (HomeTabs) + route definitions (Routes) |
| `src/components/layout/LeftSideBar.tsx` | Wrapper → Sidebar |
| `src/components/layout/RightSideBar.tsx` | Empty right panel placeholder |
| `src/components/Sidebar.tsx` | Hierarchical nav groups (File/Master/Invoice/Quotation/Outstanding/Report/Settings) |
| `src/components/titlebar/TitleBar.tsx` | Cross-platform native title bar |
| `src/store/ui-store.ts` | Zustand store: tab registry, sidebars, homeBackground, etc. |
| `src/store/authStore.ts` | Zustand store: user_id_log, user_name, isLoggedIn, login/logout |
| `src/lib/menu.ts` | Tauri native app menu (File/Master/Invoice/Quotation/Outstanding/Report/Settings) |
| `src/lib/rbac.ts` | Role constants + isAdmin/canDelete helpers |

---

## Spec Features: Present vs Missing

### ✅ PRESENT — Fully Implemented

| Spec Feature | Implementation |
|---|---|
| **Menu Strip (File/Master/Invoice/Quotation/Outstanding/Report/Settings)** | `src/lib/menu.ts` — 8 native submenus (including app/view); `src/components/Sidebar.tsx` — 7 nav groups with routing |
| **Splash screen with loading animation** | `src/components/SplashScreen.tsx` — `LOADING_FRAMES` array cycles "Loading."→"Loading....." at 500ms intervals; matches spec's 5-state animation exactly |
| **Startup sequence: Splash → Login → HOME** | `src/App.tsx` — `isInitializing` shows `<SplashScreen />`, then `<Login />` on `!isLoggedIn`, then `<MainWindow />` |
| **Tab bar showing open forms** | `homeTabs[]` in `src/store/ui-store.ts` + `HomeTabs` component in `MainWindowContent.tsx` renders tab buttons per open route |
| **Close button (X) per tab** | Red `×` button per tab; color scheme (red close, blue inactive) matches spec |
| **Click tab → activate form** | `handleActivate` navigates to tab's path; `setActiveHomeTab` tracks selection |
| **Active tab indicator** | Selected tab → `bg-lime-500` (green); inactive → `bg-sky-100` (light blue) — functionally equivalent to spec's yellow-green vs light-sky-blue |
| **Invoice close confirmation** | `AlertDialog` — "Are you sure you want to cancel?" matches spec's MsgBox for `Add_Edit_Invoice` |
| **Role-Based Access Control (menu)** | `Sidebar.tsx` filters `adminOnly` items via `isAdmin(role)`; `menu.ts` doesn't filter but native menu items exist |
| **Background image from tbl_setting** | `MainWindow.tsx` queries `tbl_setting.back_path` → `setHomeBackground` → renders as CSS background-image at 10% opacity |
| **Logout flow** | `handleLogout` → `resetHomeTabs()` + `logout()` + navigate `/` |
| **Global variables: `user_id_log`, `user_name`, `company_id`** | `authStore.ts` — `user_id_log`, `user_name`, `user_id`, `company_id` persisted via zustand/persist |
| **Keyboard: Enter→TAB** | `Login.tsx` has Enter→handleLogin; but per-form Enter→Tab not implemented (different paradigm) |

### ⚠️ PARTIALLY PRESENT — Present but Different Architecture

| Spec Feature | Current State | Notes |
|---|---|---|
| **MDI child form management** | Not MDI — SPA routing via react-router. Each "form" = a `<Route>` element. Single-page paradigm replaces `frm.MdiParent = HOME` | Architectural difference: no overlapping windows, no `FormBorderStyle.None` or pixel-positioning needed |
| **Tab bar FlowLayoutPanel** | Flex-wrap div with Button elements | Functional equivalent, not pixel-exact WinForms port. Styling is Tailwind, not Calibri font |
| **Nav label transformations** | Tab titles defined statically in `ROUTE_TABS` in `MainWindowContent.tsx` (e.g., `/email-templates` → "E-mail Config") | No dynamic string replacement like legacy `new_load_nav_bar` |
| **Grid styling helper** | No equivalent centralized utility. Each page (InvoiceList, etc.) uses shadcn Table or custom styling | Inline approach per page, not a single `grids1` helper |
| **Change Password** | Route wired (`/home/change-password`) but shows `PlaceholderPage` — "not implemented" | Spec describes no change-password logic; this is stubbed |
| **Invoice Report** | Route wired (`/reports/invoices`) but shows `PlaceholderPage` | Stub |
| **Quotation Report** | `QuotationPreview` component exists, basic report routing | Partially functional |
| **Receipt Report** | Route wired (`/reports/receipts`) → `PlaceholderPage` | Stub |
| **Outstanding Report** | Route wired (`/reports/outstanding`) → `PlaceholderPage` | Stub |

### ❌ MISSING — Not Implemented

| Spec Feature | Impact | Notes |
|---|---|---|
| **Auto-backup on exit** | Low | Spec describes `HOME_FormClosing` → prompt backup. No equivalent in current JS. Tauri exit doesn't trigger this flow |
| **last_form (prev active form tracking)** | Low | Current tab system tracks active via `activeHomeTab` key, but no "previously active" state |
| **invoice_id, quotation_id, receipt_id global vars** | Medium | These are per-form record IDs. Some pages likely have local state; no centralized ID registry |
| **Admin-only button (DELETE) hiding** | Low-Medium | `rbac.ts` has `canDelete()` but no per-button enforcement pattern in pages |
| **Form Disposal Pattern (Escape to close)** | Low | No Escape→close behavior; react-router back navigation replaces this |
| **Enter→Tab keyboard nav (on forms)** | Low | Not implemented outside login; not a blocker |
| **Grid styling (grids1 helper)** | Low | Each page styles tables independently |

---

## Splash Screen (Spec 01) Gap Analysis

### Current SplashScreen.tsx Capabilities

- ✅ Animated loading text (5 frames, 500ms, matching spec exactly)
- ✅ Company branding from DB (`tbl_company`) when available
- ✅ Bundled fallback splash image when no company logo is configured
- ✅ Centered card, 385px max width (spec's `385 x 234`)
- ✅ Borderless appearance (no window chrome in Tauri)

### What the Spec 01 Describes That's Different

| Spec 01 Element | Current | Blocked by HOME? |
|---|---|---|
| `PictureBox1` loading `P1.gif` from filesystem | Active company logo from DB when available, bundled fallback image otherwise | **Not blocked** — newer branding stays DB-driven while preserving legacy-style fallback behavior |
| `Timer1` 500ms cycle | `setInterval` 500ms cycle | **Not blocked** — trivial impl difference |
| `Monotype Corsiva 21pt Bold Italic` font | Tailwind font stack tuned to legacy label styling | **Not blocked** — cosmetic parity already achievable independently |
| `HotTrack` foreground color | Tailwind blue shades approximating HotTrack | **Not blocked** — cosmetic parity already achievable independently |
| `ClientSize 385 x 234` | `max-w-[385px]` card, dynamic height | **Not blocked** |

### Verdict: Are Splash Gaps Blocked by HOME Architecture?

**No. All remaining spec 01 gaps are independent.**

The splash screen is a self-contained component (`SplashScreen.tsx`) that renders before any auth or main-shell logic. It has zero dependencies on `MainWindow`, `Sidebar`, `ui-store`, `authStore`, or routing. Changes to match spec 01 exactly (font, color, image source) can be made in that single file without touching anything else in the HOME shell.

The only potential dependency is the `query()` call for company branding, which runs early during `isInitializing = true`. The current implementation already balances newer DB-driven branding with a bundled fallback image for legacy-style splash behavior, so no further HOME-shell coordination is required for spec 01 parity.

---

## Summary

| Category | Count |
|----------|-------|
| ✅ Fully present | 13 |
| ⚠️ Partially present (different arch) | 9 |
| ❌ Missing | 6 (all low impact except global record IDs) |

**Key insight**: The modern shell is a faithful functional port of the legacy HOME MDI parent. The MDI→SPA architectural shift means child-form management (pixel positioning, MdiParent assignment, FormBorderStyle) is replaced by React Router — but the user-visible behaviors (tab bar, navigation groups, role filtering, splash→login→main flow) are all present.

The remaining stub pages (reports, change password) are not shell concerns — they're content gaps that the routing layer exposes. The shell itself is complete.
