# XPress Original Specs Rollout — Specification

## Overview

| Property | Value |
|----------|-------|
| Scope | Work through `docs/original_specs/` in order |
| Primary source | `docs/original_specs/` |
| New-spec awareness | `docs/specs/README.md` + files in `docs/specs/` |
| Completion workflow | audit -> implementation -> verification -> separate commit |
| Task status | In progress |
| Current focus | Spec 04 - Login audit (next in queue) |

## Ordered Original Spec Queue

| Order | Spec | Status | Notes |
|------:|------|--------|-------|
| 01 | `docs/original_specs/01-splash-progress.md` | Completed - committed | Implemented and verified in `7c70175`; splash now starts at `Loading.` and remains visible for one full 2.5s cycle |
| 02 | `docs/original_specs/02-home.md` | Audited - sufficiently present | Modern main shell is good enough to unblock spec 01; remaining gaps are deferred/non-blocking |
| 03 | `docs/original_specs/03-database.md` | Completed - implemented | tbl_numbers fixed to 1/1/1; WhatsApp tables added (`tbl_whatsapp`, `tbl_whatsapp_settings`, `tbl_whatsapp_log`) |
| 04 | `docs/original_specs/04-login.md` | Pending audit | |
| 05 | `docs/original_specs/05-master.md` | Pending audit | |
| 06 | `docs/original_specs/06-sales-report.md` | Pending audit | |
| 07 | `docs/original_specs/07-demo-invoice.md` | Pending audit | |
| 08 | `docs/original_specs/08-outstanding-balance.md` | Pending audit | |
| 09 | `docs/original_specs/09-printer-export.md` | Pending audit | |
| 10 | `docs/original_specs/10-invoice.md` | Pending audit | May overlap with already landed invoice parity work |
| 10a | `docs/original_specs/10a-email-full.md` | Pending audit | Related to email subsystem |
| 11 | `docs/original_specs/11-quotation.md` | Pending audit | |
| 11b | `docs/original_specs/11-module1-helpers.md` | Pending audit | Helper/shared utility reference |
| 12 | `docs/original_specs/12-outstanding.md` | Pending audit | |
| 13 | `docs/original_specs/13-reports.md` | Pending audit | |
| 14 | `docs/original_specs/14-settings-email-utility.md` | Pending audit | |
| 15 | `docs/original_specs/15-statement.md` | Pending audit | |
| 16 | `docs/original_specs/16-view-list-receipt.md` | Pending audit | |
| 17 | `docs/original_specs/17-product-type-crud.md` | Pending audit | |
| 18 | `docs/original_specs/18-product-type-list.md` | Pending audit | |
| 19 | `docs/original_specs/19-quotation-list-report.md` | Pending audit | |
| 20 | `docs/original_specs/20-product-crud.md` | Pending audit | |
| 21 | `docs/original_specs/21-user-management.md` | Pending audit | |
| 22 | `docs/original_specs/22-quotation-add-edit.md` | Pending audit | |
| 23 | `docs/original_specs/23-quotation-reports.md` | Pending audit | |
| 24 | `docs/original_specs/24-statement-preview-report.md` | Pending audit | |
| 25 | `docs/original_specs/25-invoice-list-view.md` | Pending audit | |
| 26 | `docs/original_specs/26-company-settings.md` | Pending audit | Cross-check with newer multi-company spec |
| 27 | `docs/original_specs/27-add-edit-customer.md` | Pending audit | |
| 28 | `docs/original_specs/28-view-customer.md` | Pending audit | |
| 29 | `docs/original_specs/29-list-outstanding.md` | Pending audit | |
| 30 | `docs/original_specs/30-add-edit-receipt.md` | Pending audit | |
| 31 | `docs/original_specs/31-view-quotation.md` | Pending audit | |
| 32 | `docs/original_specs/32-preview-invoice-report.md` | Pending audit | |
| 33 | `docs/original_specs/33-settings.md` | Pending audit | |
| 34 | `docs/original_specs/34-restore-db.md` | Likely implemented | Recent commit `ea6f11a` suggests parity work already landed; verify when queue reaches it |
| 35 | `docs/original_specs/35-direct-email.md` | Audited - not implemented | Email sending exists, but not the standalone direct-email workflow |

## Newer Specs Awareness

These are additive/newer specs that must remain visible while working the original queue:

| Order | Spec | Relationship to original queue |
|------:|------|-------------------------------|
| 00 | `docs/specs/00-multi-company-support.md` | Cross-cutting architecture constraint across invoice, quotation, receipt, customer, product, company flows |
| 01 | `docs/specs/01-tech-stack.md` | Defines Tauri/React/TypeScript/SQLite platform expectations |
| 02 | `docs/specs/02-database-migration.md` | Migration/reference spec for schema/data movement |
| 03 | `docs/specs/03-database.md` | Newer canonical SQLite schema reference |
| 26 | `docs/specs/26-company-settings.md` | Extends original company settings behavior |
| 40 | `docs/specs/40-whatsapp-integration.md` | New channel alongside email/document flows |

## Current Audit Notes

### Spec 01 - `docs/original_specs/01-splash-progress.md`

Current implementation files:
- `src/components/SplashScreen.tsx`
- `src/App.tsx`
- `src/lib/db.ts`

Audit result:
- Visual splash exists and matches the legacy layout, animation cadence, label styling, and startup timing.
- Current splash is rendered inside the main React window during `isInitializing`.
- Active company branding is still preferred when `tbl_company.logo` is available so newer multi-company behavior remains intact.
- When no company logo is configured, the splash now falls back to a bundled startup-style image instead of the generic placeholder content.
- Remaining intentional differences are architectural rather than missing parity work:
  - no standalone borderless splash window in the current Tauri shell
  - flow remains splash -> login/main window rather than splash -> HOME by design of the modern app

### Spec 02 - `docs/original_specs/02-home.md`

Audit result:
- HOME/main-shell parity is sufficiently present in the modern React/Tauri shell.
- Current implementation coverage centers on `src/components/layout/MainWindow.tsx`, `src/components/layout/MainWindowContent.tsx`, `src/components/Sidebar.tsx`, `src/lib/menu.ts`, and `src/store/ui-store.ts`.
- Remaining gaps are non-blocking shell differences and placeholder content routes, so spec 01 proceeds now.

### Spec 03 - `docs/original_specs/03-database.md`

Current implementation files:
- `src/lib/db.ts`
- `src-tauri/migrations/001_initial.sql`
- `docs/specs/03-database.md`

Audit result:
- Core original tables exist in the current SQLite bootstrap and Tauri migration: company, customer, product, product type, user, invoice main/sub, quotation main/sub, receipt, numbers, setting, and email.
- The app already follows the legacy `auto_field()` spirit by creating missing tables, backfilling missing columns via `PRAGMA table_info`, and seeding singleton/default rows on startup in `src/lib/db.ts`.
- Intentional newer-spec drift is present and should remain visible during follow-on slices: `company_id`, `is_deleted`, bank/contact metadata, WhatsApp settings, and `tbl_wa_template` support multi-company + newer channel requirements from `docs/specs/00-multi-company-support.md` and `docs/specs/40-whatsapp-integration.md`.

Implementation changes:
- `tbl_numbers` seed fixed from `0/0/0` → `1/1/1` to match the spec default-data reference. Includes migration for existing DBs with wrong seed values.
- Missing WhatsApp tables added to both `db.ts` and `001_initial.sql`: `tbl_whatsapp` (templates), `tbl_whatsapp_settings` (Meta API credentials), `tbl_whatsapp_log` (delivery logs) — matching `docs/specs/03-database.md`.

Remaining known drift (intentional, documented):
- `tbl_user.des` forced to `'ADMIN'` while original spec expects `NULL` — kept for functional compatibility with current auth flow.
- `tbl_quotation_main` includes invoice-style fields (`case_debit`, `paid_amount`, `balance`, `no`, `cr_dr`, `identify`) that the original spec says quotations should not have — retained for shared processing code.
- These drift items may be revisited if future implementation slices surface conflicts.

### Spec 35 - `docs/original_specs/35-direct-email.md`

Audit result:
- Email capability exists, but as template-driven send actions embedded in invoice/quotation flows.
- Missing standalone direct-email compose workflow with runtime sender/recipient/password editing and arbitrary attachment picking.

## Verification Plan

### Objective
Keep a persistent, ordered rollout tracker for the original XPress specs while staying aware of newer additive specs.

### Success Criteria
1. `docs/tasks-todo/` contains one ordered tracker task document.
2. The document names the authoritative original spec source and lists the remaining queue in order.
3. The document records newer specs that can affect implementation decisions.
4. The document records the current audited status for spec 01 and spec 35.

### How to Verify
- Confirm the task file exists in `docs/tasks-todo/`.
- Read the file and verify ordered entries for `01` through `35` plus the newer-spec awareness section.

## Next Slice

1. Narrow the spec 03 database parity changes to a safe implementation set.
2. Implement and verify that spec 03 slice without regressing newer multi-company behavior.
3. Create a separate commit for the spec 03 work once complete.
