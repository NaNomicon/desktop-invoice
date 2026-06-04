# Library (`src/lib/`)

**Generated:** 2026-06-01

Core utilities, Tauri bindings, database layer, and domain logic. No React hooks here — those belong in `src/hooks/` or `src/services/`.

## Files

| File/Dir | Purpose |
|----------|---------|
| `tauri-bindings.ts` | **Import Tauri commands from here.** Re-exports `bindings.ts` + `unwrapResult` helper |
| `bindings.ts` | **AUTO-GENERATED** by tauri-specta. DO NOT EDIT. Run `npm run rust:bindings`. |
| `db.ts` | SQLite singleton: `getDb()`, `query<T>()`, `execute()`, `closeDb()` |
| `db/schema.ts` | Table definitions (`TABLES`), `CURRENT_VERSION`, `ColumnDef`/`TableSpec` interfaces |
| `db/migrations.ts` | `ensureDatabase()` — creates missing tables/columns on startup |
| `db/seed.ts` | Seeds default data (company, settings, number sequences) on first run |
| `types.ts` | All DB entity interfaces: `Company`, `User`, `Customer`, `Product`, `InvoiceMain`, `InvoiceSub`, `QuotationMain`, `QuotationSub`, `Receipt`, `EmailTemplate`, `WhatsAppTemplate`, `Setting`, etc. |
| `utils.ts` | `cn()` (clsx + tailwind-merge) — the only utility file |
| `rbac.ts` | `ROLES` (`ADMIN`/`USER`), `isAdmin(role)`, `canDelete(role)` |
| `logger.ts` | Structured `Logger` class — `logger.info/warn/error/debug/trace(msg, context?)` |
| `query-client.ts` | TanStack `QueryClient` singleton with desktop defaults |
| `recovery.ts` | `cleanupOldFiles()` — removes stale recovery JSON on startup |
| `backup.ts` | Database backup helpers |
| `menu.ts` | `buildAppMenu()`, `setupMenuLanguageListener()` — native menu from JS |
| `context-menu.ts` | Context menu utilities |
| `notifications.ts` | Toast wrapper (sonner) |
| `platform-strings.ts` | Platform-specific UI strings ("Reveal in Finder" vs "Show in Explorer") |
| `theme-context.ts` | `useTheme()` hook context — reads/writes theme preference |
| `report-output.ts` | `saveReportPdf()` — orchestrates Typst PDF generation |
| `email/` | Email sending helpers |
| `invoice/` | `cal.ts` (calculations), `delete.ts`, `editLock.ts`, `saved.ts`, `splitInvoice.ts` |
| `quotation/` | `cal.ts`, `delete.ts`, `saved.ts`, `splitQuotation.ts` |
| `receipt/` | `cal.ts`, `delete.ts`, `saved.ts` |
| `pdf/` | `path.ts` — PDF output path utilities |
| `whatsapp/` | WhatsApp API integration helpers |
| `commands/` | Frontend command system (registry, navigation, window, notification commands) |
| `i18n/` | i18next init — use `src/i18n/` instead for config |

## Database Usage

```typescript
import { query, execute } from '@/lib/db'

// SELECT — returns typed array
const rows = await query<Customer>('SELECT * FROM tbl_customer WHERE is_deleted = 0', [])

// INSERT/UPDATE/DELETE
await execute('UPDATE tbl_setting SET isvat = ? WHERE id = 1', [1])
```

- DB file: `{appConfigDir}/xpress.db` (get path via `commands.getDbPath()`)
- WAL mode + foreign keys enabled on init
- Money: **integer cents** (125000 = $1,250.00)
- Dates: **ISO 8601 TEXT** (YYYY-MM-DD)

## Domain Logic Subdirs

Each domain subdir (`invoice/`, `quotation/`, `receipt/`) follows the same pattern:
- `cal.ts` — pure calculation functions (totals, VAT, discounts)
- `delete.ts` — soft-delete logic (`is_deleted = 1`)
- `saved.ts` — save/update to DB
- `split*.ts` — split document logic

## Rules

- No React hooks in `lib/` — ast-grep enforces this
- Zustand: `getState()` only, no `useXxxStore()` subscriptions
- `bindings.ts` is auto-generated — never edit manually
