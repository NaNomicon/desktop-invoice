# Pages (`src/pages/`)

**Generated:** 2026-06-01

Route-level page components. Each page maps to one or more routes defined in `MainWindowContent.tsx`. Pages compose UI components and connect to stores/services.

## Domains

| Directory | Pages | Notes |
|-----------|-------|-------|
| `auth/` | `Login.tsx` | Auth gate — shown before `MainWindow` mounts |
| `invoice/` | `InvoiceList.tsx`, `InvoiceForm.tsx` | InvoiceForm is 1482 lines — largest file |
| `quotation/` | `QuotationList.tsx`, `QuotationForm.tsx` | QuotationForm is 1243 lines |
| `receipt/` | `ReceiptForm.tsx`, `TransactionHistory.tsx` | |
| `outstanding/` | `ListOutStanding.tsx`, `outstanding-report-helpers.ts` | Uses `useOutstandingStore` for filters |
| `reports/` | 10 files — previews + list reports | Preview pages render HTML for Chromium PDF |
| `admin/` | 15 files — settings, customers, products, users, email, WhatsApp, backup/restore/migrate | |

## Patterns

- Pages fetch data via `query()` (direct SQLite) or TanStack Query hooks from `src/services/`
- Heavy pages (InvoiceForm, QuotationForm) manage local form state with `useState`
- Report preview pages (`*Preview.tsx`) render printable HTML — used by `save_report_pdf` command
- Admin pages use `toast` (sonner) for success/error feedback
- RBAC: check `useAuthStore(s => s.user_id)` + `isAdmin(role)` from `@/lib/rbac`

## Adding a Page

1. Create `src/pages/<domain>/<PageName>.tsx`
2. Add route in `src/components/layout/MainWindowContent.tsx`
3. Add sidebar link in `src/components/Sidebar.tsx` if needed
4. Add i18n keys to `locales/en.json` (+ ar.json, fr.json)

## Notes

- No lazy loading currently — all routes eagerly imported in `MainWindowContent.tsx`
- `outstanding-report-helpers.ts` is a non-component file in pages/ — contains pure calculation logic
- Test files co-located: `ChangePassword.test.tsx`, `RestoreDatabase.test.tsx`, `OutstandingReport.test.tsx`
