# Tauri App Work Plan — XPress Billing Application

## TL;DR

> **Quick Summary**: Build a Tauri 2.x + React 19 desktop billing app that replicates all 35+ modules from the original VB.NET app. Phased implementation: Phase 1 (scaffold), Phase 2 (DB+migration), Phase 3 (auth+RBAC), Phase 4 (master CRUD), Phase 5 (invoice), Phase 6 (quotation), Phase 7 (receipt/outstanding), Phase 8 (reports/PDF), Phase 9 (multi-company), Phase 10 (WhatsApp/email).

> **Deliverables**:
> - Scaffolded Tauri 2.x + React app from dannysmith/tauri-template
> - SQLite database with schema matching docs/specs/03-database.md (INTEGER cents, TEXT dates)
> - Migration tool running against Docker SQL Server (39,226 rows)
> - Full CRUD for: Company, Customer, Product Type, Product, User, Settings, Email Templates
> - Invoice CRUD with cal() formula from docs/original_specs/10-invoice.md
> - Quotation CRUD from docs/original_specs/11-quotation.md
> - Receipt + Outstanding from docs/original_specs/12-outstanding.md
> - Reports + PDF from docs/original_specs/32-preview-invoice-report.md + 06-sales-report.md
> - Multi-company split-invoice from docs/specs/00-multi-company-support.md
> - WhatsApp integration from docs/specs/40-whatsapp-integration.md

> **Estimated Effort**: XL (multi-phase, 50+ tasks, ~60h) | **Parallel Execution**: YES | **Critical Path**: P1-T1 → P2 → P3 → P4 → P5

---

## Context

### Original Request
User wants to modernize the original VB.NET billing app (XPress) into a Tauri desktop app. All specs and source files have been read.

### Specs Referenced
| Spec File | Purpose | Source Files Referenced |
|-----------|---------|-------------------------|
| `docs/specs/01-tech-stack.md` | Tech stack decisions | — |
| `docs/specs/02-database-migration.md` | Migration tool | — |
| `docs/specs/03-database.md` | SQLite schema | — |
| `docs/specs/00-multi-company-support.md` | Multi-company feature | — |
| `docs/specs/40-whatsapp-integration.md` | WhatsApp integration | — |
| `docs/original_specs/03-database.md` | DB schema reference | `Module1.vb:127-579`, `SQL_CRUD.vb` |
| `docs/original_specs/04-login.md` | Auth flow | `Login.vb`, `Module1.vb` |
| `docs/original_specs/05-master.md` | CRUD operations | `Add_Edit_Company.vb`, `Add_Edit_Customer.vb`, `Add_Edit_Product.vb` |
| `docs/original_specs/06-sales-report.md` | Sales report | `Sales_Report.vb` |
| `docs/original_specs/10-invoice.md` | Invoice logic + cal() | `Add_Edit_Invoice.vb:38-87`, `View_Invoice.vb` |
| `docs/original_specs/11-quotation.md` | Quotation logic | `Add_Edit_Quotation.vb` |
| `docs/original_specs/11-module1-helpers.md` | Helpers + CRUD | `Module1.vb`, `SQL_CRUD.vb` |
| `docs/original_specs/12-outstanding.md` | Receipt + balance | `Add_Edit_Receipt.vb`, `ListOutStanding.vb` |
| `docs/original_specs/25-invoice-list-view.md` | Invoice list | `View_Invoice.vb` |
| `docs/original_specs/32-preview-invoice-report.md` | Report rendering | `Preview_Invoice_Report.vb` |
| `docs/original_specs/34-restore-db.md` | Backup/restore | `RestoreDB.vb` |

### VB.NET Source Files Available
```
docs/xpress/legacy-code/XPress/
├── Module1.vb (835 lines) — globals, con_sql(), fback_color(), grids1(), rights(), auto_field()
├── SQL_CRUD.vb (332 lines) — CRUD functions, GetDueAmount(), validation
├── Login.vb — auth flow
├── HOME.vb — MDI parent
├── Invoice/Add_Edit_Invoice.vb (1500+ lines) — complete invoice logic
├── Invoice/View_Invoice.vb (348 lines) — list, search, preview, delete
├── Quotation/Add_Edit_Quotation.vb — quotation logic
├── Quotation/View_Quotation.vb — quotation list
├── Receipt/Add_Edit_Receipt.vb — receipt logic
├── Receipt/View_List_of_Receipt.vb — receipt list
├── Outstanding/ListOutStanding.vb — outstanding balance
├── Company/Add_Edit_Company.vb — company profile
├── Customer/Add_Edit_Customer.vb, View_Customer.vb
├── Product/Add_Edit_Product.vb, View_Product.vb
├── ProductType/View_Product_Type.vb
├── User/View_Add_Edit_User.vb
├── Report/Preview_Invoice_Report.vb
├── Email/emails.vb, direct_email.vb, email_module.vb
├── Utility/RestoreDB.vb
└── [35+ files total]
```

### Key Decisions Made
- **SQLite**: Official tauri-plugin-sql, money as INTEGER cents, dates as TEXT ISO 8601
- **Template**: dannysmith/tauri-template (has shadcn/ui, Tailwind v4, Zustand, TanStack Query, custom titlebar, system tray)
- **Table library**: TanStack Table v8 (headless, no UI — just hooks) + TanStack Virtual for large datasets
- **Existing libs maximize reuse**: Use shadcn/ui components (Dialog, DropdownMenu, Toast), react-hook-form + Zod for forms, Zustand for state, TanStack Query for async
- **PDF**: React-PDF Web Worker approach (NOT wkhtmltopdf — cross-platform, no external deps)
- **Multi-company schema**: company_id added to Phase 1 schema (product, invoice, quotation, receipt) — not deferred to Phase 9
- **No BSP for WhatsApp**: Meta Cloud API direct
- **Plain-text passwords for v1**: Inherited from original
- **No TDD for scaffold**: Defer to Phase 2

---

## Guardrails Applied

- **Cross-platform dev/test**: App targets Windows for production, but all development and testing must work on Ubuntu. Use `process.platform === 'win32'` checks where Windows-specific behavior differs (shell paths, line endings, etc.). Verify every QA scenario on Ubuntu before claiming complete.

---

## Work Objectives

### Core Objective
Replicate all functionality from the original VB.NET app in a modern Tauri 2.x + React desktop application. Each implementation task must ground on BOTH the spec file AND the actual VB.NET source code.

### Concrete Deliverables (by Phase)

**Phase 1 — Scaffold**
- [ ] `xpress-billing/` directory with dannysmith/tauri-template cloned
- [ ] All Tauri plugins installed (sql, fs, dialog, shell, notification, window-state)
- [ ] SQLite schema with 13 tables matching docs/specs/03-database.md
- [ ] Migration tool integrated
- [ ] Core UI layout (sidebar + placeholder pages)

**Phase 2 — Database + Migration**
- [ ] Migration idempotency verified
- [ ] WAL mode enabled
- [ ] Demo data seeded
- [ ] TypeScript types for all tables

**Phase 3 — Auth + RBAC**
- [ ] Login form matching `Login.vb` flow
- [ ] RBAC: admin full access, USER restricted (no delete buttons)
- [ ] Global user state (user_id_log, user_name)

**Phase 4 — Master Data CRUD**
- [ ] Company Settings (single-row, logo/watermark base64)
- [ ] Customer CRUD (duplicate check, due_amount tracking)
- [ ] Product Type CRUD
- [ ] Product CRUD (type_id FK, default price)
- [ ] User CRUD (admin/USER roles)
- [ ] Settings form (VAT config, paths, sequences, labels)
- [ ] Email Templates CRUD (INVOICE/QUOTATION/STATEMENT/RECEIPT)

**Phase 5 — Invoice CRUD**
- [ ] Invoice cal() formula (line 38-87 of `Add_Edit_Invoice.vb`)
- [ ] CASH vs CREDIT mode with paid_amount, cr_dr, balance
- [ ] Line item soft-delete (Ctrl+D → IsDeleted → delete on save)
- [ ] Customer balance update on save/edit/delete
- [ ] Edit lock (invoice_days)
- [ ] Invoice number auto-increment
- [ ] Invoice list view with search
- [ ] Invoice → From Quotation conversion

**Phase 6 — Quotation CRUD**
- [ ] Quotation cal() (no advance/due adjustment, fixed discount when per=0)
- [ ] Quotation CRUD
- [ ] Quotation → Invoice conversion (creates NEW invoice)

**Phase 7 — Receipt + Outstanding**
- [ ] Receipt cal() (new_due = load_dua_amount - amount_received)
- [ ] cr_dr inverse accounting
- [ ] Receipt CRUD (no balance reversal on delete)
- [ ] Receipt Voucher from ListOutStanding
- [ ] Transaction history grid (invoice + receipt UNION by timestamp)
- [ ] Outstanding list with color coding

**Phase 8 — Reports + PDF**
- [ ] Invoice PDF generation (HTML + Chrome)
- [ ] Sales report (date filter, bill_amount formula)
- [ ] Statement preview
- [ ] Print preview with zoom controls

**Phase 9 — Multi-Company**
- [ ] NOTE: company_id FK already added in Phase 1 T4 schema
- [ ] Dual product lists UI (Ironing vs Wash)
- [ ] Split-invoice workflow

**Phase 10 — WhatsApp + Email**
- [ ] WhatsApp templates CRUD
- [ ] WhatsApp send via Meta Cloud API
- [ ] Email send via SMTP

### Definition of Done
- [ ] All spec features implemented
- [ ] All VB.NET source patterns replicated
- [ ] Money stored as INTEGER cents (no floating-point)
- [ ] Dates stored as TEXT ISO 8601
- [ ] RBAC enforced (admin vs USER)
- [ ] No console errors
- [ ] Git clean working directory

### Must Have
- Invoice calculation matching original exactly
- Customer balance tracking (due_amount, ad_due)
- RBAC (admin/USER roles)
- Line item soft-delete pattern
- Edit lock for old invoices

### Must NOT Have

**Money & Numbers:**
- Floating-point money (precision loss) — MUST use INTEGER cents
- Forgotten cents conversion in queries — every `SUM()`, `WHERE total > 100` must divide/multiply by 100
- Float rounding in `to_cents()` for edge-case prices — use precise arithmetic

**Invoice CRUD (Phase 5):**
- `saved1()` function — USE `saved()` only (saved1 has broken contain_id)
- `str1` (cr_dr) uninitialized before use — MUST initialize to "" before conditional blocks
- Label8 text matching fragility — use boolean `isAdvance` flag, NOT `Label8.Text === "Advance Amount"`
- Invoice number race condition — MUST wrap number read+increment in transaction with unique constraint
- Edit lock uses `<` not `<=` — verify boundary condition matches spec exactly
- Overpayment in CREDIT mode — implement explicit handling, not implicit assumption

**Receipt CRUD (Phase 7):**
- Receipt delete reversing balance — MUST NOT reverse (unlike invoice delete)
- cr_dr dual-logic mismatch — cal() and saved() must agree on cr_dr determination
- Advance customer cal() Else branch — verify `new_due = load_dua_amount - amount_received` handles negative load_dua_amount
- GetDueAmount() unused — do NOT add, tbl_customer.due_amount is authoritative

**Quotation (Phase 6):**
- `new_tot = sub_total` only — MUST NOT include advance/due adjustment
- `per=0` fixed discount vs `per>0` % discount — MUST branch correctly
- `contain_id` not cleared on load — clear to "" on form load
- Balance update — MUST NOT update customer.due_amount

**Multi-Company (Phase 9):**
- type_id vs company_id confusion — use company_id for bucket filtering, NOT type_id
- Split-invoice orphaned invoice — BOTH invoices must be shown/printed
- company_id DEFAULT 1 — verify migration sets all existing records correctly
- tbl_invoice_sub.company_id — must be saved per line item

**Reports + PDF (Phase 8):**
- JOIN query row drop — use LEFT JOIN explicitly, not INNER JOIN
- bill_amount double-counting — invoice_sub.items vs invoice.header must not both sum
- /38 row height hardcoded — document this is empirical, needs visual QA
- Zoom compound drift — reset to 100% on each recalculation

**Auth (Phase 3):**
- Plain-text passwords in tbl_user — plan for BCrypt migration in Phase 3
- No rate limiting on login — add attempt tracking
- RBAC string match fragility — use enum or constant, not hardcoded "admin"/"USER"

**Email + WhatsApp (Phase 10):**
- WhatsApp local path attachment — MUST upload to public URL or base64 embed
- Gmail 2FA / App Password — document dependency on app password
- Placeholder case sensitivity — use case-insensitive replace
- Email duplicate attachment bug — clear attachments array before each send

**Migration (Phase 2):**
- SQL Server connection failure — handle gracefully, don't auto-retry forever
- Partial migration on row failure — use INSERT OR REPLACE + idempotency check
- Missing company_id on source data — verify all records have company_id = 1 before migration

**Scaffold (Phase 1):**
- tauri-plugin-sql v2 API mismatch — pin exact npm + Rust versions
- sql:allow-execute permissions — add read AND write capabilities
- WAL orphaned on crash — handle gracefully, don't corrupt DB
- React Compiler + TanStack Table — disable `"use no memo"` on table components

---

## Critical Risks (Devil's Advocate — 6-Phase Review)

### Phase 1: Scaffold
| Risk | Likelihood | Severity | Status |
|------|-----------|----------|--------|
| degit/clone fails (network) | Low | Critical | ✅ FIXED |
| tauri-plugin-sql v2 API mismatch | Medium | Critical | ✅ FIXED |
| Forgotten cents conversion | Very High | Critical | ✅ FIXED (schema) |
| SQL Server connection fails | Medium | High | ✅ FIXED |
| sql:allow-execute insufficient | High | High | ✅ FIXED |
| Plugin npm/Rust version mismatch | High | High | ✅ FIXED |
| TanStack Table + React Compiler | Confirmed | Critical | ✅ FIXED (use no memo) |

### Phase 5: Invoice CRUD
| Risk | Likelihood | Severity |
|------|-----------|----------|
| cr_dr str1 uninitialized | High | Critical |
| Invoice number race (duplicate) | High | Critical |
| saved() vs saved1() confusion | High | Critical |
| Balance update formula wrong | High | Critical |
| cal() new_tot formula misunderstood | Medium | High |
| Overpayment edge case | Low | Medium |

### Phase 7: Receipt
| Risk | Likelihood | Severity |
|------|-----------|----------|
| Receipt delete balance reversal | Medium | Critical |
| cr_dr cal() vs saved() mismatch | High | High |
| cal() Else branch (Advance) | Medium | High |
| cr_dr null on delete | Medium | High |

### Phase 6: Quotation
| Risk | Likelihood | Severity |
|------|-----------|----------|
| cal() copy-paste from invoice | High | Critical |
| contain_id stale data | High | Critical |
| Accidental balance update added | High | Critical |

### Phase 9: Multi-Company
| Risk | Likelihood | Severity |
|------|-----------|----------|
| type_id vs company_id filter | High | Critical |
| Split-invoice orphaned invoice | High | Critical |
| tbl_invoice_sub.company_id missing | Medium | High |

### Phase 10: WhatsApp + Email
| Risk | Likelihood | Severity |
|------|-----------|----------|
| WhatsApp public URL required | High | High |
| Gmail App Password dependency | High | High |
| Template variable mismatch | High | High |
| Duplicate attachment bug | Confirmed | Medium |

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (scaffold phase) → YES (Phase 2+)
- **Automated tests**: NO (Phase 1) → YES (Phase 2: Vitest + RTL)
- **Framework**: N/A → Vitest (Phase 2)
- **QA Policy**: Agent-executed verification via Bash commands (all phases)

### Table/Data Grid Strategy
- **Headless table library**: TanStack Table v8 (MIT, no UI — just hooks)
- **Large dataset support**: TanStack Virtual for virtualization (handles 10K+ rows)
- **Why not AG Grid**: Free MIT > ~$2000/yr. Covers 95% of needs for billing app.
- **Shadcn/ui components**: Use Dialog, DropdownMenu, Toast from shadcn/ui — don't reinvent
- **Forms**: react-hook-form + Zod (2026 standard) — not Formik
- **State**: Zustand v5 for UI state, TanStack Query v5 for server state (caching, invalidation)

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/`.

---

## Execution Strategy

### Phase Structure

```
Phase 1 (Scaffold — ~2h):
├── T1: Clone template + npm install
├── T2: Add Tauri plugins (Rust)
├── T3: Configure plugins (tauri.conf.json + capabilities)
├── T4: Initialize SQLite with schema
├── T5: Integrate migration tool
└── T6: Scaffold core UI layout

Phase 2 (Database + Migration — ~3h):
├── T7: Verify migration idempotency
├── T8: Enable WAL mode
├── T9: Seed demo data
└── T10: Write TypeScript types

## Phase 2 TODOs

- [x] T7. **Verify migration idempotency**

  **What to do**:
  - Add `checksum TEXT` column to key tables before migration (tbl_customer, tbl_invoice_main, tbl_invoice_sub, tbl_receipt):
    ```sql
    ALTER TABLE tbl_customer ADD COLUMN checksum TEXT;
    ALTER TABLE tbl_invoice_main ADD COLUMN checksum TEXT;
    ALTER TABLE tbl_invoice_sub ADD COLUMN checksum TEXT;
    ALTER TABLE tbl_receipt ADD COLUMN checksum TEXT;
    ```
  - Compute checksum = MD5 of source row hash before INSERT
  - **Migration strategy**: Use `INSERT OR REPLACE` (overwrites on PK conflict) with CHECKSUM column. On re-migration:
    1. Compute new checksum from current source row
    2. If `stored_checksum == new_checksum` → skip (no action)
    3. If `stored_checksum != new_checksum` → `INSERT OR REPLACE` updates the row
  - Run `tools/migrate.py` once → record row counts per table
  - Run `tools/migrate.py` again → verify same row counts (no duplicates)
  - Verify FK integrity after re-run (customer deleted → invoices orphaned or cascade)

  **Must NOT do**:
  - Auto-run migration on every app start (performance hazard)
  - Use bare `INSERT OR REPLACE` without checksum tracking — this overwrites unchanged records on re-run
  - Trust SQL Server row counts blindly (NULL handling differences)

  **References**:

  **VB.NET Source** (SQL_Insert idempotency pattern):
  - `docs/xpress/legacy-code/XPress/SQL_CRUD.vb:61-109` — INSERT pattern
  - `docs/xpress/legacy-code/XPress/SQL_CRUD.vb:133-171` — UPDATE pattern

  **Guardrails** (from DA review):
  - INSERT OR REPLACE handles PK duplicates but may corrupt aggregate totals on re-run
  - Must verify: running twice → same row count + same due_amount sums

  **Acceptance Criteria**:
  - [ ] Migration run twice → identical row counts per table
  - [ ] No duplicate records (unique constraints respected)
  - [ ] CHECKSUM or timestamp column detects changed source records

  **QA Scenarios**:

  ```
  Scenario: Migration idempotency check
    Tool: Bash
    Preconditions: tools/migrate.py runs successfully first time
    Steps:
      1. Run: python tools/migrate.py > /tmp/migrate1.txt
      2. sqlite3 xpress.db "SELECT COUNT(*) FROM tbl_customer"
      3. Run: python tools/migrate.py > /tmp/migrate2.txt
      4. sqlite3 xpress.db "SELECT COUNT(*) FROM tbl_customer"
    Expected Result: Same row count in steps 2 and 4
    Evidence: .sisyphus/evidence/phase2/task-7-idempotent.txt
  ```

  **Commit**: YES
  - Message: `test: verify migration idempotency`

---

- [x] T8. **Enable WAL mode + crash recovery**

  **What to do**:
  - Add WAL pragma in `db.ts` after connection (already in T4)
  - Verify WAL mode active: `PRAGMA journal_mode;` returns "wal"
  - Add checkpoint on app close: `PRAGMA wal_checkpoint(TRUNCATE);`
  - Handle orphaned WAL on startup (detect stale WAL):
    ```typescript
    // Check if WAL is orphaned (crash scenario)
    // If .db-wal AND .db-shm exist but app didn't shut down cleanly
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    // If stale WAL detected, truncate to recover:
    await db.execute('PRAGMA wal_checkpoint(TRUNCATE)');
    ```
  - Add periodic checkpoint via TanStack Query invalidation or Zustand middleware:
    - Every 1000 writes → trigger checkpoint
    - On app idle (setTimeout 30s without writes) → checkpoint
    - On `visibilitychange` (tab hidden) → checkpoint

  **Must NOT do**:
  - Leave WAL in full mode (grows unbounded — set checkpoint threshold)
  - Ignore WAL corruption signals

  **References**:

  **Spec References**:
  - `docs/specs/03-database.md:431` — WAL mode spec

  **Guardrails** (from DA review):
  - WAL orphaned on crash: implement graceful recovery (don't corrupt DB)
  - WAL size growth: checkpoint threshold prevents unbounded .db-wal file

  **Acceptance Criteria**:
  - [ ] `PRAGMA journal_mode;` returns "wal"
  - [ ] `PRAGMA wal_checkpoint(TRUNCATE);` succeeds on app close
  - [ ] Crash recovery: truncate WAL file if stale, DB opens correctly

  **QA Scenarios**:

  ```
  Scenario: WAL mode verified
    Tool: Bash
    Preconditions: App starts with db.ts loaded
    Steps:
      1. sqlite3 xpress.db "PRAGMA journal_mode;"
    Expected Result: "wal" (not "delete" or "truncate")
    Evidence: .sisyphus/evidence/phase2/task-8-wal-mode.txt
  ```

  **Commit**: YES
  - Message: `feat: enable WAL mode with checkpointing`

---

- [x] T9. **Seed demo data**

  **What to do**:
  - Create `tools/seed_demo.sql` with minimal demo data matching Module1.vb defaults:
    ```sql
    -- Company (1 row)
    INSERT OR IGNORE INTO tbl_company (id, company_name) VALUES (1, 'Demo Company');

    -- Settings (1 row)
    INSERT OR IGNORE INTO tbl_setting (id, vat_per, isvat, invoice_days)
    VALUES (1, 5, 1, 7);

    -- User (admin)
    -- NOTE: user_id='ADMIN' (uppercase) per Module1.vb:524 — Login.vb case-sensitive match
    INSERT OR IGNORE INTO tbl_user (id, user_id, password, des)
    VALUES (1, 'ADMIN', 'admin', 'admin');

    -- Product Types
    INSERT OR IGNORE INTO tbl_product_type (id, type_name) VALUES (1, 'Ironing');

    -- Demo customer
    INSERT OR IGNORE INTO tbl_customer (id, customer_name, ad_due, due_amount)
    VALUES (1, 'Mr Demo Customer', 'Advance', 0);

    -- Demo product
    INSERT OR IGNORE INTO tbl_product (id, product_name, price, type_id, company_id)
    VALUES (1, 'Ironing Service', 10000, 1, 1);  -- 100.00 MUR

    -- Number sequences
    INSERT OR IGNORE INTO tbl_numbers (id, invoice_no, quo_no, receipt_no)
    VALUES (1, 1, 1, 1);
    ```
  - Run seed after migration: `sqlite3 xpress.db < tools/seed_demo.sql`
  - Verify demo user can log in: user_id=admin, password=admin

  **Must NOT do**:
  - Use production data in demo (privacy risk)
  - Create 100+ demo records (defeats demo purpose)

  **References**:

  **VB.NET Source** (default values from Module1.vb):
  - `docs/xpress/legacy-code/XPress/Module1.vb:284-296` — tbl_numbers defaults (invoice_no=1, quo_no=1, receipt_no=1)
  - `docs/xpress/legacy-code/XPress/Module1.vb:193` — ad_due default 'Advance'
  - `docs/xpress/legacy-code/XPress/Module1.vb:466-479` — tbl_user schema
  - `docs/xpress/legacy-code/XPress/Login.vb:70-71` — admin/admin credentials

  **Acceptance Criteria**:
  - [ ] seed_demo.sql exists with INSERT OR IGNORE for all tables
  - [ ] Demo user (admin/admin) can log in
  - [ ] Demo customer exists with ad_due='Advance', due_amount=0
  - [ ] Demo product exists with price=10000 (100.00 MUR)

  **QA Scenarios**:

  ```
  Scenario: Demo user login
    Tool: Bash
    Preconditions: seed_demo.sql run, app running
    Steps:
      1. sqlite3 xpress.db "SELECT * FROM tbl_user WHERE user_id='admin'"
    Expected Result: admin/admin, des='admin'
    Evidence: .sisyphus/evidence/phase2/task-9-demo-user.txt
  ```

  **Commit**: YES
  - Message: `data: seed demo data for development`

---

- [ ] T10. **Write TypeScript types for all tables**

  **What to do**:
  - Create `src/lib/types.ts` with interfaces for all 13 tables
  - **CRITICAL**: All money fields as `number` (INTEGER cents), dates as `string`
  - Include all columns matching `docs/specs/03-database.md`
  - Add Zod schemas for validation (money: `z.number().int()`, date: `z.string()`)
  - Example:
    ```typescript
    export interface Customer {
      id: number;
      customer_name: string;
      contact: string | null;
      telephone: string | null;
      email: string | null;
      address: string | null;
      due_amount: number;       // INTEGER cents, e.g. 50000 = 500.00 MUR
      ad_due: string;           // 'Advance' | 'Due' | ''
      reg_date: string;          // ISO 8601: 'YYYY-MM-DD'
      company_id: number;
      is_deleted: number;       // 0 or 1
    }

    export const CustomerSchema = z.object({
      id: z.number().int(),
      customer_name: z.string(),
      contact: z.string().nullable(),
      telephone: z.string().nullable(),
      email: z.string().nullable(),
      address: z.string().nullable(),
      due_amount: z.number().int(),  // CRITICAL: no .min(0) — can be negative for Advance
      ad_due: z.enum(['Advance', 'Due']).or(z.literal('')),
      reg_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      company_id: z.number().int(),
      is_deleted: z.number().int(),
    });
    ```

  **Must NOT do**:
  - Use `number` for money fields without documenting cents convention
  - Use `Date` type for dates (SQLite TEXT — ISO 8601 string)
  - Omit any nullable columns

  **References**:

  **VB.NET Source** (table column types):
  - `docs/xpress/legacy-code/XPress/Module1.vb:127-579` — all 13 tables with exact column names

  **Type conventions**:
  - Money: `number` (INTEGER cents), never `number` (REAL/float)
  - Dates: `string` (ISO 8601: YYYY-MM-DD), never `Date`
  - Booleans: `number` (0/1) — SQLite has no BOOLEAN
  - Nullable: `T | null`

  **Acceptance Criteria**:
  - [ ] All 13 table interfaces defined
  - [ ] All 13 Zod schemas defined
  - [ ] Money fields are `z.number().int()`, not `z.number()`
  - [ ] Date fields are `z.string()` with ISO 8601 regex
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:

  ```
  Scenario: TypeScript types compile
    Tool: Bash
    Preconditions: src/lib/types.ts created
    Steps:
      1. cd xpress-billing && npx tsc --noEmit 2>&1
    Expected Result: No errors
    Evidence: .sisyphus/evidence/phase2/task-10-types.txt
  ```

  **Commit**: YES
  - Message: `types: add TypeScript interfaces for all 13 tables`

---

Phase 3 (Auth + RBAC — ~2h):
├── T11: Login form
├── T12: RBAC guards
└── T13: Global user state

Phase 4 (Master CRUD — ~8h):
├── T14: Company Settings CRUD
├── T15: Customer CRUD + duplicate check
├── T16: Product Type CRUD
├── T17: Product CRUD
├── T18: User CRUD
├── T19: Settings form
└── T20: Email Templates CRUD

Phase 5 (Invoice CRUD — ~12h):
├── T21: Invoice cal() engine + tests
├── T22: Invoice create/edit
├── T23: Invoice delete with balance reversal
├── T24: Invoice list view
├── T25: Invoice PDF generation
├── T26: Edit lock logic
└── T27: Quotation → Invoice conversion

Phase 6 (Quotation CRUD — ~6h):
├── T28: Quotation cal() engine
├── T29: Quotation CRUD
└── T30: Quotation list view

Phase 7 (Receipt + Outstanding — ~6h):
├── T31: Receipt cal() engine
├── T32: Receipt CRUD
├── T33: Receipt delete (no balance reversal)
├── T34: ListOutStanding
└── T35: Transaction history grid

Phase 8 (Reports + PDF — ~10h):
├── T36: Invoice PDF path logic
├── T37: Sales report
├── T38: Statement preview
└── T39: Print preview with zoom

Phase 9 (Multi-Company — ~6h):
├── T40: Add company_id to schema
├── T41: Dual product lists
└── T42: Split-invoice workflow

Phase 10 (WhatsApp + Email — ~5h):
├── T43: WhatsApp templates
├── T44: WhatsApp send
└── T45: Email send

Wave FINAL:
└── F1-F4: Comprehensive verification
```

### Dependency Matrix (Phase 1)
- **T1**: — — T2, T3, T4, T5, T6, F1-F4
- **T2**: T1 — T3, F1-F4
- **T3**: T2 — T4, F1-F4
- **T4**: T3 — T5, F1-F4
- **T5**: T4 — T6, F1-F4
- **T6**: T5 — F1-F4

---

---

## TODOs

- [x] T1. **Clone template + npm install + verify blank app runs**

**What to do**:
  - Run `npx degit dannysmith/tauri-template .` to clone template into current directory (NOT a subdirectory). The project root IS the Tauri app.
  - Run `npm init -y` if package.json doesn't exist yet
  - Update `package.json` project name to `xpress-billing`, version to `0.1.0`
  - Update `src-tauri/tauri.conf.json` app name/identifier to `com.ramma.xpress`
  - **CRITICAL**: Add DB path config for tauri-plugin-sql preload:
    - Original: `Application.StartupPath & "\XPressDB.mdf"` (Module1.vb:36-37)
    - Tauri equivalent: Use `app_data_dir()` from tauri-plugin-fs for SQLite path
    - Add to `tauri.conf.json` under `plugins.sql.preload`: `["sqlite:xpress.db"]`
  - After degit, keep directory structure flat — `src/` for frontend, `src-tauri/` for Rust
  - Run `npm run tauri dev` — verify app starts without errors within 90s
     - Verify app_data_dir() resolves to `%APPDATA%/com.ramma.xpress/` on Windows

  ### 1.6. Create multi-level AGENTS.md files

  For agent navigation, every directory gets an AGENTS.md:

  **Root AGENTS.md** (project overview):
  ```markdown
  # AGENTS.md — Project Root

  ## Structure
  - src/ — React frontend
  - src-tauri/ — Rust backend
  - docs/ — Specs and legacy code

  ## Quick Start
  1. Run `npm run tauri dev` to start dev server
  2. Read `src/AGENTS.md` for frontend patterns
  3. Read `src-tauri/AGENTS.md` for Rust patterns

  ## Tech Stack
  - Tauri 2.x + React 19 + TypeScript
  - SQLite (tauri-plugin-sql)
  - Tailwind CSS v4 + shadcn/ui
  ```

  **src/AGENTS.md** (frontend):
  ```markdown
  # AGENTS.md — Frontend

  ## Pattern Library
  - `utils/cal.ts` — Invoice calculation (see `utils/AGENTS.md`)
  - `stores/` — Zustand state management (see `stores/AGENTS.md`)
  - `components/` — UI components (see `components/AGENTS.md`)

  ## Key Rules
  - Use TanStack Table v8 for all data grids
  - Use "use no memo" directive on table components
  - Money stored as INTEGER cents (never float)
  - Dates as ISO 8601 TEXT
  ```

  **src-tauri/AGENTS.md** (Rust):
  ```markdown
  # AGENTS.md — Rust Backend

  ## Plugins
  - tauri-plugin-sql for SQLite
  - tauri-plugin-fs for file system
  - tauri-plugin-shell for Chrome PDF

  ## Commands
  All Tauri commands in `src-tauri/src/commands/`

  ## Cross-platform
  - Use `app_data_dir()` from tauri api
  - Test on Ubuntu; Windows target
  ```

  **src/components/AGENTS.md**:
  ```markdown
  # AGENTS.md — Components

  ## UI Patterns
  - shadcn/ui components (Dialog, DropdownMenu, Toast)
  - react-hook-form + Zod for all forms
  - TanStack Table for data grids (use "use no memo" directive)

  ## Key Rules
  - Never use float for money — INTEGER cents only
  - Dates as ISO 8601 TEXT strings
  ```

  **src/stores/AGENTS.md**:
  ```markdown
  # AGENTS.md — State Management

  ## Stores
  - `authStore.ts` — user_id_log, user_name, user_id, company_id
  - `invoiceStore.ts` — invoice form state, cal() results

  ## Key Rules
  - RBAC: user_id_log === "USER" → no delete buttons
  - Persist auth state in localStorage
  ```

  **src/utils/AGENTS.md**:
  ```markdown
  # AGENTS.md — Utilities

  ## Calculation
  - `cal.ts` — Invoice/Quotation calculation engine
  - Money as INTEGER cents (multiply by 100)
  - Dates as ISO 8601 TEXT

  ## Key Rules
  - VAT on sub_total (not new_tot)
  - Discount = (sub+VAT)*per/100
  - Advance/Due adjustment affects new_tot only
  ```

  Directories that get AGENTS.md: `root`, `src/`, `src-tauri/`, `src/components/`, `src/pages/`, `src/stores/`, `src/utils/`

  ### 1.5. Find and install relevant skills

  Run skill discovery for this project's tech stack:
   ```bash
   # Find relevant skills
   npx skills find tauri react
   npx skills find typescript tailwind
   npx skills find testing vitest playwright
   npx skills find sqlite database

   # Install the most relevant ones globally
   npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y
   npx skills add anthropics/skills@react-best-practices -g -y  # if available
   npx skills add playwright/test -g -y  # if available
   npx skills add tailwind-labs/skills -g -y  # if available
   ```

   Key skills to look for:
   - Tauri/Rust skills for plugin integration
   - React/TypeScript skills for UI patterns
   - Testing skills (Vitest, Playwright) for QA
   - SQLite/database skills for schema work
   - Vercel React best practices (already available)

   Store installed skills list in `.skills-installed.md` for team reference.

   **Must NOT do**:
  - Hardcode DB path — MUST use app_data_dir() for cross-platform
  - Modify any template files beyond name/identifier updates
  - Add custom code yet
  - MUST NOT: Assume Windows-only. Test template `npm run tauri build` and `npm run tauri dev` on Ubuntu before proceeding.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Template clone + npm install is standard, low complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: All subsequent tasks
  - **Blocked By**: None (can start immediately)

  **References**:

  **Template References** (existing code to follow):
  - `dannysmith/tauri-template` — official Tauri template with React 19, shadcn/ui, Tailwind v4

  **Spec References** (contracts to implement against):
  - `docs/specs/01-tech-stack.md:363-373` — template URL and setup instructions

  **WHY Each Reference Matters**:
  - Template has pre-configured shadcn/ui, Tailwind v4, Zustand, TanStack Query, custom titlebar, system tray
  - Spec defines exact project name and identifier

  **Acceptance Criteria**:
  - [ ] Template cloned into current directory (NOT a subdirectory)
  - [ ] `npm install` completes without errors
  - [ ] `npm run tauri dev` starts without errors
  - [ ] Browser window opens with app visible
  - [ ] AGENTS.md created in: root, src/, src-tauri/, src/components/, src/pages/, src/stores/, src/utils/

  **QA Scenarios**:

  ```
  Scenario: Template clone succeeds
    Tool: Bash
    Preconditions: Network available, node/npm installed
    Steps:
      1. cd /mnt/PARA/1-projects/work/freelance/ramma-g
      2. npx degit dannysmith/tauri-template xpress-billing
      3. cd xpress-billing && ls -la
    Expected Result: Directory contains package.json, src/, src-tauri/, README.md
    Evidence: .sisyphus/evidence/phase1/task-1-clone-success.txt

  Scenario: npm install completes
    Tool: Bash
    Preconditions: Template cloned, node v24.15, npm 11.12
    Steps:
      1. cd xpress-billing && npm install 2>&1 | tail -20
      2. echo "EXIT: $?"
    Expected Result: Exit code 0, node_modules/ exists
    Failure Indicators: npm ERR, exit code != 0
    Evidence: .sisyphus/evidence/phase1/task-1-npm-install.txt

  Scenario: tauri dev starts without errors
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. cd xpress-billing && timeout 90 npm run tauri dev 2>&1 | head -50
      2. Check for "error" in output
    Expected Result: No error, dev server starts
    Failure Indicators: Build errors, Rust compilation failures
    Evidence: .sisyphus/evidence/phase1/task-1-tauri-dev.txt
  ```

  **Evidence to Capture**:
  - [ ] Clone output log
  - [ ] npm install output (last 20 lines)
  - [ ] tauri dev startup log (first 50 lines)

  **Commit**: YES
  - Message: `chore: scaffold from dannysmith/tauri-template`
  - Files: `xpress-billing/` (entire directory)
  - Pre-commit: `npm run tauri build --debug`

---

- [x] T2. **Add Tauri plugins (Rust side)**

  **What to do**:
  - Edit `xpress-billing/src-tauri/Cargo.toml` to add plugins:
    ```toml
    tauri-plugin-sql = { version = "2", features = ["sqlite"] }
    tauri-plugin-fs = "2"
    tauri-plugin-dialog = "2"
    tauri-plugin-shell = "2"
    tauri-plugin-notification = "2"
    tauri-plugin-window-state = "2"
    ```
  - Edit `xpress-billing/src-tauri/src/lib.rs` to register plugins:
    ```rust
    use tauri_plugin_sql::{Migration, MigrationKind};

    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new()
            .add_migrations("sqlite:xpress.db", migrations)
            .build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
    ```

  **Must NOT do**:
  - Modify app logic (commands, handlers)
  - Change existing template code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard plugin installation, copy-paste config
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after T1)
  - **Blocks**: T3 (capabilities config)
  - **Blocked By**: T1 (template must exist)

  **References**:

  **VB.NET Source** (patterns to replicate):
  - `docs/xpress/legacy-code/XPress/SQL_CRUD.vb:9` — "Public ds As New DataSet" global state pattern
  - `docs/xpress/legacy-code/XPress/SQL_CRUD.vb:19-29` — SQL_Select execution model:
    ```vb
    Public Function SQL_Select(ByVal table As String, Optional ByVal field As String = "*", 
                                Optional ByVal condition As String = "", 
                                Optional ByVal extra As String = "") As DataSet
        Call con_sql()
        Dim q As String = "SELECT " & field & " From " & table & 
                          " WHERE " & condition & " " & extra
        da = New SqlDataAdapter(q, con)
        ds = New DataSet()
        da.Fill(ds)
        Return ds
    End Function
    ```
  - `docs/xpress/legacy-code/XPress/SQL_CRUD.vb:61-109` — SQL_Insert with Dictionary pattern:
    ```vb
    Public Function SQL_Insert(ByVal table As String, 
                                ByVal variable As Dictionary(Of String, String)) As Integer
        ' Builds: INSERT INTO table (key1,key2) VALUES ('val1','val2')
        ' Values wrapped in single quotes: "'0'" not "0"
    ```
  - `docs/xpress/legacy-code/XPress/SQL_CRUD.vb:133-171` — SQL_Update key=value pattern

  **Spec References** (contracts to implement against):
  - `docs/specs/01-tech-stack.md:44-66` — exact plugin list and Cargo.toml snippet

  **WHY Each Reference Matters**:
  - SQL_CRUD.vb:9 global `ds` DataSet must be replicated in Zustand store
  - SQL_CRUD.vb:19-29 SQL_Select model → Tauri plugin must expose select/execute
  - SQL_CRUD.vb:61-109 Dictionary keys are column names, values MUST be single-quoted
  - SQL_CRUD.vb:133-171 UPDATE uses `key=value,key=value` format

  **Guardrails** (from Metis):
  - MUST add `plugins.sql.preload: ["sqlite:xpress.db"]` to tauri.conf.json for migrations to run (Issue #1555)

  **Acceptance Criteria**:
  - [ ] `cargo check` passes in src-tauri/
  - [ ] All 6 plugins listed in Cargo.toml
  - [ ] All 6 plugins registered in lib.rs

  **QA Scenarios**:

  ```
  Scenario: Cargo check passes
    Tool: Bash
    Preconditions: T1 completed, Cargo.toml updated
    Steps:
      1. cd xpress-billing/src-tauri && cargo check 2>&1 | tail -30
      2. echo "EXIT: $?"
    Expected Result: "Checking" output, exit code 0
    Failure Indicators: Plugin version conflicts, missing features
    Evidence: .sisyphus/evidence/phase1/task-2-cargo-check.txt

  Scenario: Plugin imports compile
    Tool: Bash
    Preconditions: lib.rs updated with plugin imports
    Steps:
      1. cd xpress-billing/src-tauri && cargo check 2>&1 | grep -i "plugin"
    Expected Result: All plugins found, no import errors
    Evidence: .sisyphus/evidence/phase1/task-2-plugin-compile.txt
  ```

  **Evidence to Capture**:
  - [ ] cargo check output (last 30 lines)
  - [ ] Plugin compilation confirmation

  **Commit**: YES
  - Message: `feat: add tauri plugins (sql, fs, dialog, shell, notification, window-state)`
  - Files: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`
  - Pre-commit: `cargo check`

---

- [x] T3. **Configure plugins (tauri.conf.json + capabilities)**

  **What to do**:
  - Configure shell scope for cross-platform: Use forward-slash paths for cross-platform commands (`/usr/bin/chromium` as fallback). Document Windows-specific paths separately.
  - Edit `xpress-billing/src-tauri/tauri.conf.json`:
    ```json
    {
      "plugins": {
        "sql": {
          "preload": ["sqlite:xpress.db"]
        },
        "shell": {
          "scope": [
            { "name": "chromium", "cmd": "chrome", "args": true },
            { "name": "chromium-path", "cmd": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "args": true }
          ]
        }
      }
    }
    ```
  - Add `build/devtools` to tauri.conf.json for debugging
  - Create `xpress-billing/src-tauri/capabilities/default.json` with permissions for all plugins:
    ```json
    {
      "permissions": [
        "core:default",
        "sql:default",
        "sql:allow-execute",
        "sql:allow-select",
        "sql:allow-load",
        "fs:default",
        "dialog:default",
        "shell:default",
        "notification:default",
        "window-state:default"
      ]
    }
    ```
  - Install frontend npm packages for plugins:
    ```bash
    npm install @tauri-apps/plugin-sql
    npm install @tauri-apps/plugin-fs
    npm install @tauri-apps/plugin-dialog
    npm install @tauri-apps/plugin-shell
    npm install @tauri-apps/plugin-notification
    npm install @tauri-apps/plugin-window-state
    ```

  **Must NOT do**:
  - Grant overly broad permissions (security risk)
  - Modify template window config

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Config file updates, standard npm install
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after T2)
  - **Blocks**: T4, T5, T6
  - **Blocked By**: T2 (plugins must exist in Cargo.toml)

  **References**:

  **VB.NET Source** (schema defaults to replicate):
  - `docs/xpress/legacy-code/XPress/Module1.vb:193` — `ad_due` default 'Advance':
    ```vb
    q = "IF COL_LENGTH('tbl_customer', 'ad_due') IS NULL BEGIN ALTER TABLE tbl_customer ADD [ad_due] varchar(100) default('Advance') END"
    ```
    - CRITICAL: New customers default to 'Advance'. cal() switches to 'Due' on first invoice. Schema MUST include DEFAULT 'Advance'.

  **Spec References** (contracts to implement against):
  - `docs/specs/01-tech-stack.md:54-66` — exact plugin config

  **Guardrails** (from Metis):
  - MUST add `sql:allow-execute` (not just `sql:default`) — default is read-only
  - MUST add `plugins.sql.preload` for migrations to run

  **Acceptance Criteria**:
  - [ ] tauri.conf.json has all plugins configured + devtools + sql preload
  - [ ] capabilities/default.json has all permissions including sql:allow-execute
  - [ ] All 6 npm packages installed
  - [ ] `npm run tauri dev` still starts without errors

  **QA Scenarios**:

  ```
  Scenario: tauri.conf.json plugin config valid
    Tool: Bash
    Preconditions: tauri.conf.json updated
    Steps:
      1. cd xpress-billing && cat src-tauri/tauri.conf.json | jq '.plugins'
      2. Check sql.preload present, shell.scope present
    Expected Result: Valid JSON, all plugins listed, sql.preload present
    Evidence: .sisyphus/evidence/phase1/task-3-config-valid.json

  Scenario: npm packages installed
    Tool: Bash
    Preconditions: npm install run
    Steps:
      1. cd xpress-billing && npm ls @tauri-apps/plugin-sql @tauri-apps/plugin-fs 2>&1 | head -5
    Expected Result: Packages listed without errors
    Evidence: .sisyphus/evidence/phase1/task-3-npm-packages.txt

  Scenario: capabilities has write permissions
    Tool: Bash
    Preconditions: capabilities/default.json updated
    Steps:
      1. cd xpress-billing && cat src-tauri/capabilities/default.json | jq '.permissions'
      2. Check for sql:allow-execute
    Expected Result: sql:allow-execute present in permissions array
    Evidence: .sisyphus/evidence/phase1/task-3-capabilities.json
  ```

  **Evidence to Capture**:
  - [ ] tauri.conf.json plugins section
  - [ ] capabilities/default.json permissions
  - [ ] npm ls output for all 6 packages

  **Commit**: YES
  - Message: `feat: configure tauri plugins and capabilities`
  - Files: `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `package.json`
  - Pre-commit: `npm run tauri build --debug`

---

- [x] T4. **Initialize SQLite with schema**

  **What to do**:
  - Create `xpress-billing/src-tauri/migrations/001_initial.sql` with schema from `docs/specs/03-database.md` — ALL 13 tables + 8 indexes
  - **CRITICAL**: All money fields as INTEGER (cents), all dates as TEXT ISO 8601
  - Create `xpress-billing/src/lib/db.ts` as TypeScript wrapper:
    ```typescript
    import Database from '@tauri-apps/plugin-sql';

    let db: Database | null = null;

    export async function getDb(): Promise<Database> {
      if (!db) {
        db = await Database.load('sqlite:xpress.db');
      }
      return db;
    }

    export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const database = await getDb();
      return database.select(sql, params);
    }

    export async function execute(sql: string, params: unknown[] = []): Promise<void> {
      const database = await getDb();
      await database.execute(sql, params);
    }
    ```
  - Create `xpress-billing/src/lib/types.ts` with TypeScript interfaces for all 13 tables
  - **CRITICAL**: Add `WAL` mode pragma after connection:
    ```typescript
    export async function getDb(): Promise<Database> {
      if (!db) {
        db = await Database.load('sqlite:xpress.db');
        await db.execute('PRAGMA journal_mode=WAL');
        await db.execute('PRAGMA foreign_keys=ON');
      }
      return db;
    }
    ```

  **Must NOT do**:
  - Implement actual CRUD functions (defer to Phase 4)
  - Add business logic
  - Use REAL/FLOAT for money fields (MUST be INTEGER)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema file creation, simple TypeScript wrapper
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after T3)
  - **Blocks**: T5 (migration integration)
  - **Blocked By**: T3 (plugins must be configured)

  **References**:

  **VB.NET Source** (schema order from auto_field()):
  - `docs/xpress/legacy-code/XPress/Module1.vb:127-579` — ALL 13 tables in exact creation order:
    1. tbl_company (logo/watermark as image → BLOB)
    2. tbl_customer (due_amount numeric(18,2) → INTEGER cents ×100)
    3. tbl_invoice_main (print_due, cr_dr, is_deleted columns)
    4. tbl_invoice_sub
    5. tbl_quotation_main
    6. tbl_quotation_sub
    7. tbl_numbers (invoice_no, quo_no, receipt_no defaults = 1)
    8. tbl_product
    9. tbl_product_type
    10. tbl_receipt (cash/cheque/other payment defaults)
    11. tbl_setting (isvat, vat_per, cash/cheque/other modes)
    12. tbl_user
    13. tbl_email

  **Critical conversions** (Module1.vb → SQLite):
  - `numeric(18,2)` → `INTEGER` (cents), multiply by 100
  - `image` (BMP) → `BLOB` (logo/watermark storage)
  - `date` → `TEXT` (ISO 8601: YYYY-MM-DD)
  - `varchar(max)` → `TEXT`
  - `default('Advance')` → `DEFAULT 'Advance'` (tbl_customer.ad_due)

  **Spec References** (contracts to implement against):
  - `docs/specs/03-database.md` — complete schema (all tables, indexes, INTEGER cents, TEXT dates)
  - `docs/specs/01-tech-stack.md:376-399` — tauri-plugin-sql usage example
  - `docs/original_specs/03-database.md:1-460` — complete SQL Server schema for reference

  **Guardrails** (from Metis):
  - MONEY AS INTEGER CENTS: All monetary fields (price, total, sub_total, vat, discount, due_amount, paid_amount, balance, amount_received, row_total, unit_price) MUST be INTEGER
  - DATES AS TEXT ISO 8601: All date fields (invoice_date, quo_date, receipt_date, reg_date) MUST be TEXT YYYY-MM-DD
  - WAL mode enabled for concurrent access

  **Acceptance Criteria**:
  - [ ] Migration SQL file has all 13 CREATE TABLE statements
  - [ ] Migration SQL has all 8 CREATE INDEX statements
  - [ ] ALL money fields are INTEGER, ALL date fields are TEXT
  - [ ] `src/lib/db.ts` exports getDb, query, execute functions
  - [ ] `src/lib/types.ts` has all 13 table interfaces
  - [ ] WAL pragma executed after connection
  - [ ] App starts and creates xpress.db file
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:

  ```
  Scenario: Migration SQL has correct types
    Tool: Bash
    Preconditions: 001_initial.sql created
    Steps:
      1. cd xpress-billing && grep -E "INTEGER|text ISO 8601" src-tauri/migrations/001_initial.sql | wc -l
      2. grep "REAL\|FLOAT\|DOUBLE" src-tauri/migrations/001_initial.sql || echo "GOOD: No float types"
    Expected Result: All money fields INTEGER, all date fields TEXT, no floating-point types
    Failure Indicators: REAL, FLOAT, or DOUBLE found in schema
    Evidence: .sisyphus/evidence/phase1/task-4-schema-types.txt

  Scenario: db.ts exports functions
    Tool: Bash
    Preconditions: src/lib/db.ts created
    Steps:
      1. cd xpress-billing && grep "export async function" src/lib/db.ts
    Expected Result: getDb, query, execute exported
    Evidence: .sisyphus/evidence/phase1/task-4-db-exports.txt

  Scenario: TypeScript compiles
    Tool: Bash
    Preconditions: types.ts created
    Steps:
      1. cd xpress-billing && npx tsc --noEmit 2>&1 | head -20
    Expected Result: No TypeScript errors
    Evidence: .sisyphus/evidence/phase1/task-4-tsc.txt

  Scenario: WAL mode enabled
    Tool: Bash
    Preconditions: App runs after all setup
    Steps:
      1. cd xpress-billing && npm run tauri dev &
      2. sleep 10
      3. find ~/.config/com.ramma.xpress -name "*.db-wal" 2>/dev/null && echo "WAL exists" || echo "WAL not found"
    Expected Result: xpress.db-wal file exists (WAL mode active)
    Evidence: .sisyphus/evidence/phase1/task-4-wal-mode.txt
  ```

  **Evidence to Capture**:
  - [ ] Schema validation output (types check)
  - [ ] db.ts export check
  - [ ] TypeScript compilation check
  - [ ] WAL mode confirmation

  **Commit**: YES
  - Message: `types: add TypeScript interfaces for all 13 tables`
  - Files: `src/lib/types.ts`
  - Pre-commit: `tsc --noEmit`

---

- [x] T11. **Login form**
- [x] T12. **RBAC guards**
- [x] T13. **Global user state**

  **What to do**:
  - Create Zustand store (`src/stores/userStore.ts`) with:
    ```typescript
    interface UserState {
      user_id_log: string;      // Logged-in user ID (e.g., "ADMIN", "USER")
      user_name: string;        // User's display name
      user_id: number;          // User's numeric DB ID
      company_id: number;       // Current company ID (from tbl_user)
      isLoggedIn: boolean;
      login: (userId: string, password: string) => Promise<boolean>;
      logout: () => void;
    }
    ```
  - Persist session in localStorage (survive page refresh)
  - Initialize from persisted state on app load
  - Read from `Module1.vb:8-12` for global variable names:
    ```vb
    Public user_id_log, user_name As String
    Public company_id, user_id As Integer
    ```

  **Must NOT do**:
  - Store password in global state
  - Expose sensitive data in localStorage

  **References**:
  - `docs/xpress/legacy-code/XPress/Module1.vb:8-12` — Global variables: `Public user_id_log`, `user_name`, `company_id`, `user_id`

  **Guardrails**:
  - No passwords in state
  - Session persists only user IDs, not credentials

  **Acceptance Criteria**:
  - [ ] Zustand store has user_id_log, user_name, user_id, company_id
  - [ ] Session persists after page refresh
  - [ ] Login updates all state fields
  - [ ] Logout clears all state fields

  **Commit**: YES
  - Message: `feat: global user state with Zustand`
  - Files: `src/stores/userStore.ts`

---

## Phase 4 TODOs

- [x] T14. **Company Settings CRUD**
- [x] T15. **Customer CRUD + duplicate check**
- [x] T16. **Product Type CRUD**
- [x] T17. **Product CRUD**
- [x] T18. **User CRUD**
- [x] T19. **Settings form**
- [x] T20. **Email Templates CRUD**

  **What to do**:
  - Create Settings form (`src/pages/admin/Settings.tsx`)
  - Single-row table: always id=1
  - Fields from tbl_setting: isvat (0/1), vat_per (INTEGER cents), invoice_days (INTEGER), cash (default payment mode), cheque, other, and path/label fields
  - **isvat toggle**: Show/hide VAT fields based on isvat=1
  - **invoice_days**: Used for edit-lock in Phase 5
  - Read `isvat`, `vat_per` from tbl_setting for invoice calculations
  - Create if not exists on first load

  **Must NOT do**:
  - Hardcode default values without checking DB

  **References**:
  - `docs/xpress/legacy-code/XPress/Invoice/Add_Edit_Invoice.vb:88-98` — Reads isvat, vat_per from tbl_setting
  - `docs/xpress/legacy-code/XPress/Module1.vb:323-360` — tbl_setting schema (12 columns)

  **Guardrails**:
  - invoice_days used for edit-lock (Phase 5)

  **Acceptance Criteria**:
  - [ ] Settings form renders with all fields
  - [ ] VAT toggle shows/hides VAT fields
  - [ ] invoice_days stored correctly
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat: settings form`
  - Files: `src/pages/admin/Settings.tsx`

---

- [ ] T20. **Email Templates CRUD**

  **What to do**:
  - Create Email Templates CRUD (`src/pages/admin/EmailTemplates.tsx`)
  - Single-row table per template_type: INVOICE, QUOTATION, STATEMENT, RECEIPT
  - Fields: template_type (PK), subject, body (TEXT), sender_email, sender_pass (plain text — Gmail app password)
  - **Placeholders**: Replace `<date>`, `<contact person>`, and `<name>` in body at send time
  - **Placeholder replacement** (case-insensitive):
    ```typescript
    body.replace(/<date>/gi, invoiceDate)
        .replace(/<contact person>/gi, contactPerson)
        .replace(/<name>/gi, customerName)  // VB.NET Statement.vb:476
    ```
  - sender_pass stored as plain text (Gmail App Password)

  **Must NOT do**:
  - Case-sensitive placeholder replacement (use case-insensitive regex)
  - Store sender_pass encrypted without proper key management

  **References**:
  - `docs/xpress/legacy-code/XPress/Email/Add_Edit_Invoice.vb:1962-1969` — Placeholder replacement:
    ```vb
    If InStr(body, "<date>") Then body = Replace(body, "<date>", Format(dt, "dd/MM/yyyy"))
    If InStr(body, "<contact person>") Then body = Replace(body, "<contact person>", contact_person.Text)
    ```
  - `docs/xpress/legacy-code/XPress/Email/Add_Edit_Invoice.vb:1957` — sender_pass fetched as plain string
  - `docs/xpress/legacy-code/XPress/Module1.vb:480-505` — tbl_email schema (6 columns)

  **Guardrails**:
  - Placeholder case-insensitive replacement
  - sender_pass plain (Phase 1)

  **Acceptance Criteria**:
  - [ ] Templates for INVOICE, QUOTATION, STATEMENT, RECEIPT
  - [ ] Placeholders replaced correctly (case-insensitive)
  - [ ] sender_pass stored
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat: email templates CRUD`
  - Files: `src/pages/admin/EmailTemplates.tsx`

---

## Phase 5 TODOs

- [x] T21. **Invoice cal() engine + TDD tests**

  **What to do**:
  - Implement `cal()` function in `src/lib/invoice/cal.ts` — **MUST match original EXACTLY**
  - **CRITICAL FORMULA** (from Add_Edit_Invoice.vb:470-525):
    ```typescript
    // 1. Advance/Due adjustment for sub_total
    let new_tot = sub_total;
    if (ad_due === "Advance") {
      new_tot = sub_total - amount_due;    // amount_due = advance payment received
    } else if (ad_due === "Due") {
      new_tot = sub_total + amount_due;    // amount_due = additional due
    }

    // 2. VAT calculation (on sub_total, NOT new_tot — VB.NET calculates VAT on sub_total)
    let vat = 0;
    if (isvat === 1) {
      vat = Math.round(Math.abs(sub_total) * vat_per) / 100;
    }

    // 3. Discount calculation (on new_tot + vat)
    let discount = 0;
    if (per > 0) {
      discount = Math.round(Math.abs(new_tot + vat) * per) / 100;
    }

    // 4. Total = new_tot + vat - discount
    const total = new_tot + vat - discount;

    return { new_tot, vat, discount, total };
    ```
  - **Test cases from spec**:
    - Case 1: No advance/due → total = sub_total + VAT
    - Case 2: Advance adjustment → new_tot = sub_total - advance, then VAT on new_tot
    - Case 3: Discount % → discount = (sub_total + VAT) * per / 100
  - Write TDD tests BEFORE implementing invoice CRUD

  **Must NOT do**:
  - Discount on sub_total only (must include VAT in base: `(sub+VAT)*per`)
  - Use floating-point arithmetic for money (use integer math)
  - VAT before advance/due adjustment (VAT on new_tot, not sub_total)

  **References**:
  - `docs/original_specs/10-invoice.md:38-87` — cal() formula with exact line-by-line VB.NET code
  - `docs/xpress/legacy-code/XPress/Invoice/Add_Edit_Invoice.vb:470-525` — Exact VB.NET cal() implementation
  - `docs/specs/03-database.md` — INTEGER cents convention

  **Guardrails** (from DA review):
  - cal() lines 470-525 match spec exactly
  - VAT on new_tot, not sub_total
  - Discount = (sub+VAT)*per/100
  - Integer math only (no floating-point)

  **Acceptance Criteria**:
  - [ ] cal() matches VB.NET output for all 3 test cases
  - [ ] All tests pass
  - [ ] Integer arithmetic (no floating-point)

  **QA Scenarios**:
  ```
  Scenario: cal() matches original VB.NET output
    Tool: Bash
    Steps:
      1. cd xpress-billing && npx vitest run src/lib/invoice/cal.test.ts
    Expected Result: All 3 test cases pass
    Evidence: .sisyphus/evidence/phase5/task-21-cal-tests.txt
  ```

  **Commit**: YES
  - Message: `test: invoice cal() engine with TDD`
  - Files: `src/lib/invoice/cal.ts`, `src/lib/invoice/cal.test.ts`

---

- [x] T22. **Invoice create/edit**
- [x] T23. **Invoice delete with balance reversal**
- [x] T24. **Invoice list view**

  **What to do**:
  - Create Invoice List (`src/pages/invoice/InvoiceList.tsx`) using TanStack Table v8
  - **Columns**: invoice_no, date, customer_name, total, paid_amount, due_amount, status
  - **CRITICAL: Company filter dropdown at top**: ALL / Company 1 / Company 2
  - **Search**: Filter by customer_name, invoice_no, checklist_no
  - **CRITICAL**: Original `View_Invoice.vb` has **NO `is_deleted` column** and **NO `company_id`**. Both `is_deleted=0` filter and `company_id` filter are **NEW FEATURES** added in Phase 1 schema — not derived from original VB.NET. The original uses hard DELETE and has no company filter.
  - **Soft-delete**: New app uses `is_deleted` column — filter lists: `WHERE is_deleted = 0`
  - **TanStack Table features**: Sorting, pagination, column visibility, row selection
  - **TanStack Virtual**: For large datasets (7,199 invoices)
  - **Lazy loading**: TanStack Query `useInfiniteQuery` for scroll

  **Must NOT do**:
  - Use RDLC/ReportViewer (original tech — not applicable)
  - Show deleted invoices in list (WHERE is_deleted = 0)

  **References**:
  - `docs/xpress/legacy-code/XPress/Invoice/View_Invoice.vb:load_grid_sql()` — Search by customer_name, invoice_no, checklist_no
  - `docs/xpress/legacy-code/XPress/Invoice/View_Invoice.vb:SQL_Delete` — Hard DELETE (not soft-delete in original)
  - `docs/original_specs/25-invoice-list-view.md` — List view spec

  **Guardrails**:
  - Hard delete in original → soft-delete in new app (is_deleted=0 filter)
  - TanStack Table + React Compiler = broken (use "use no memo" directive)

  **Acceptance Criteria**:
  - [ ] Invoice list renders with all columns
  - [ ] Search filters by customer_name, invoice_no
  - [ ] Deleted invoices hidden
  - [ ] "use no memo" directive present in table component

  **Commit**: YES
  - Message: `feat: invoice list with TanStack Table`
  - Files: `src/pages/invoice/InvoiceList.tsx`

---

- [x] T25. **Invoice PDF generation**
- [x] T26. **Edit lock logic**
- [x] T27. **Quotation → Invoice conversion**

  **What to do**:
  - Implement "Create Invoice from Quotation" button
  - **Detection**: When `Quotation_To_Invoice_ID > 0`, set `identify = "Quotation"`
  - **On conversion**:
    1. Read quotation line items
    2. Create NEW invoice (INSERT, not UPDATE)
    3. Copy line items to new invoice
    4. Optionally update quotation status to "Converted"
  - **Key**: Creates brand new invoice_id (not linked to quotation_id)

  **Must NOT do**:
  - Convert quotation to invoice by modifying quotation (always creates new)
  - Skip invoice number increment

  **References**:
  - `docs/xpress/legacy-code/XPress/Invoice/Add_Edit_Invoice.vb:237-239` — `identify = "Quotation"` when `Quotation_To_Invoice_ID > 0`
  - `docs/xpress/legacy-code/XPress/Invoice/Add_Edit_Invoice.vb:1472-1473` — New invoice INSERT on quotation conversion
  - `docs/original_specs/11-quotation.md` — Quotation → Invoice spec

  **Guardrails**:
  - Always creates new invoice (INSERT, not UPDATE)
  - Sets identify="Quotation" flag

  **Acceptance Criteria**:
  - [ ] Quotation converted to new invoice
  - [ ] Line items copied correctly
  - [ ] identify="Quotation" flag set

  **Commit**: YES
  - Message: `feat: quotation to invoice conversion`
  - Files: `src/lib/invoice/convertQuotation.ts`

---

## Phase 6 TODOs

- [x] T28. **Quotation cal() engine**
- [x] T29. **Quotation CRUD**
- [x] T30. **Quotation list view**

  **What to do**:
  - Create Quotation List (`src/pages/quotation/QuotationList.tsx`) using TanStack Table
  - **Columns**: quo_no, date, customer_name, total, status (Draft/Converted)
  - **Company filter dropdown**: ALL / Company 1 / Company 2
  - **Filter**: by customer_name, quo_no
  - Status: Track if quotation has been converted to invoice

  **Acceptance Criteria**:
  - [ ] Quotation list renders with all columns
  - [ ] Search filters work
  - [ ] Converted status shown

  **Commit**: YES
  - Message: `feat: quotation list`
  - Files: `src/pages/quotation/QuotationList.tsx`

---

## Phase 7 TODOs

- [ ] T31. **Receipt cal() engine**

  **What to do**:
  - Implement `cal()` for receipts — DIFFERENT from invoice:
    - **CRITICAL FORMULA**: `new_due = load_dua_amount - amount_received`
      ```typescript
      const load_dua_amount = customer.due_amount;  // Current balance from tbl_customer
      const new_due = load_dua_amount - amount_received;
      ```
    - **cr_dr determination**: 
      - If customer has positive due_amount (owes money) → "Dr." (debit = more debt)
      - If customer has negative due_amount (advance/credit) → "Cr." (credit = less debt)
    - **Invoice reference**: Link receipt to specific invoice(s)

  **Must NOT do**:
  - Receipt delete reverses balance (confirmed broken pattern — DO NOT implement)
  - Use cal() from invoice (different formula)
  - GetDueAmount() for calculation (dead code)

  **References**:

  **VB.NET Source** (Receipt cal() from Add_Edit_Receipt.vb):
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Outstanding/Add_Edit_Receipt.vb:378-405` — cal() with new_due = load_dua_amount - amount_received
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Outstanding/Add_Edit_Receipt.vb:390-396` — cr_dr determination (Dr. = due_amount > 0, Cr. = due_amount < 0)
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Module1.vb:419-465` — tbl_receipt schema (13 columns)

  **Spec References**:
  - `desktop-invoice/docs/original_specs/12-outstanding.md` — Receipt cal() formula

  **Guardrails**:
  - new_due = load_dua_amount - amount_received
  - cr_dr inverse accounting (Dr. = more debt, Cr. = less debt)
  - Receipt delete does NOT reverse balance

  **Acceptance Criteria**:
  - [ ] Receipt cal() calculates new_due correctly
  - [ ] cr_dr set based on balance state
  - [ ] TDD tests pass

  **Commit**: YES
  - Message: `test: receipt cal() engine`
  - Files: `src/lib/receipt/cal.ts`, `src/lib/receipt/cal.test.ts`

---

- [ ] T32. **Receipt CRUD**

  **What to do**:
  - Create Receipt form (`src/pages/receipt/ReceiptForm.tsx`)
  - **Fields**: receipt_no, date, customer_id, amount_received, payment_mode (cash/cheque/other), invoice_reference, cr_dr, notes
  - **Customer balance update**: On save, UPDATE tbl_customer.due_amount = new_due
  - **Payment modes**: cash, cheque, other (stored in tbl_setting)
  - **cr_dr tracking**: Record whether receipt is Dr. or Cr.

  **Must NOT do**:
  - Receipt delete reverses balance (DO NOT implement)

  **References**:
  - `docs/xpress/legacy-code/XPress/Receipt/Add_Edit_Receipt.vb` — Receipt CRUD
  - `docs/xpress/legacy-code/XPress/Module1.vb:419-465` — tbl_receipt schema (13 columns)

  **Acceptance Criteria**:
  - [ ] Receipt created and customer balance updated
  - [ ] Payment mode stored
  - [ ] cr_dr tracked

  **Commit**: YES
  - Message: `feat: receipt CRUD`
  - Files: `src/pages/receipt/ReceiptForm.tsx`

---

- [ ] T33. **Receipt delete (no balance reversal)**

  **What to do**:
  - Implement receipt delete — **CRITICAL: Must NOT reverse balance**
  - Delete receipt row from tbl_receipt
  - **DO NOT update tbl_customer.due_amount** (unlike invoice delete)
  - This is confirmed broken behavior in original — document but don't fix

  **Must NOT do**:
  - Reverse customer balance on receipt delete (confirmed broken pattern)

  **References**:

  **VB.NET Source** (Receipt delete — no balance reversal):
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Outstanding/View_List_of_Receipt.vb:257` — `SQL_Delete("tbl_receipt", " id='" & receipt_id & "'")` — no balance update
  - `desktop-invoice/docs/original_specs/12-outstanding.md` — "Mình không đảo ngược balance khi xóa receipt"

  **Guardrails**:
  - Receipt delete does NOT reverse balance (confirmed broken, don't fix)

  **Acceptance Criteria**:
  - [ ] Receipt deleted without balance reversal
  - [ ] tbl_customer.due_amount unchanged

  **Commit**: YES
  - Message: `feat: receipt delete (no balance reversal)`
  - Files: `src/lib/receipt/delete.ts`

---

- [ ] T34. **ListOutStanding**

  **What to do**:
  - Create Outstanding list (`src/pages/outstanding/ListOutStanding.tsx`)
  - **Company filter dropdown**: ALL / Company 1 / Company 2
  - **Color coding**:
    - Due (positive due_amount, owes money) → Red/Orange
    - Advance (negative due_amount, credit) → Green/Blue
  - **Receipt Voucher button**: Create receipt from outstanding list
  - **Filter**: By customer, by status (Due/Advance/All), by company
  - **Columns**: customer_name, due_amount, ad_due status

  **References**:
  - `docs/xpress/legacy-code/XPress/Outstanding/ListOutStanding.vb` — Outstanding list
  - `docs/original_specs/12-outstanding.md` — Color coding: advance=different from due

  **Guardrails**:
  - Color coding by ad_due status
  - Receipt Voucher links to ReceiptForm.tsx

  **Acceptance Criteria**:
  - [ ] Due customers shown with correct color
  - [ ] Advance customers shown with correct color
  - [ ] Receipt Voucher button creates receipt

  **Commit**: YES
  - Message: `feat: outstanding balance list`
  - Files: `src/pages/outstanding/ListOutStanding.tsx`

---

- [ ] T35. **Transaction history grid**

  **What to do**:
  - Create transaction history (`src/pages/outstanding/TransactionHistory.tsx`)
  - **Company filter dropdown**: ALL / Company 1 / Company 2
  - **UNION query**: Combine invoices + receipts by timestamp
    ```sql
    SELECT 
      'Invoice' as type, 
      id, invoice_no, date, total as amount, customer_name, 
      company_id, checklist_no, paid_amount, no  -- no = timestamp for ordering
    FROM tbl_invoice_main 
    WHERE customer_id = ? AND is_deleted = 0
      AND (company_id = ? OR ? = 'ALL')
    UNION ALL
    SELECT 
      'Receipt' as type, 
      id, receipt_no, date, amount_received as amount, 
      '', company_id, '' as checklist_no, 0 as paid_amount, no
    FROM tbl_receipt 
    WHERE customer_id = ? AND is_deleted = 0
      AND (company_id = ? OR ? = 'ALL')
    ORDER BY no DESC
    ```
    **BUG FIX**: Original used string `'ALL'` for company filter — broken. Fixed: use `? = 'ALL'` with string parameter, not `? = 'ALL'` with integer company_id. Client passes `companyFilter = 'ALL'` → `?` becomes `'ALL'` → comparison works.
  - TanStack Table for display
  - Filter by customer, date range, company
  - **NOTE**: `no` column used for timestamp ordering (from `time_count()` function in original). If no column exists, use `date` as fallback ordering.

  **References**:
  - `docs/original_specs/12-outstanding.md` — Transaction history by timestamp

  **Guardrails**:
  - LEFT JOIN not INNER JOIN (avoid row drop)

  **Acceptance Criteria**:
  - [ ] Transaction history shows invoices + receipts
  - [ ] Ordered by date
  - [ ] Filter by customer works

  **Commit**: YES
  - Message: `feat: transaction history grid`
  - Files: `src/pages/outstanding/TransactionHistory.tsx`

---

## Phase 8 TODOs

- [ ] T36. **Invoice PDF path logic**

  **What to do**:
  - Implement PDF save path logic
  - **Path structure**: `{company_path}/invoice_{invoice_no}_{date}.pdf`
  - **company_path**: From tbl_setting.path or tbl_company
  - **Create folder if not exists**: `mkdir` via Rust command
  - **Filename sanitization**: Remove special characters from invoice_no

  **References**:
  - `docs/xpress/legacy-code/XPress/Report/Preview_Invoice_Report.vb` — PDF save path

  **Guardrails**:
  - Create folder before Chrome print
  - Sanitize filename

  **Acceptance Criteria**:
  - [ ] PDF saved to correct path
  - [ ] Folder created if missing

  **Commit**: YES
  - Message: `feat: invoice PDF path logic`
  - Files: `src/lib/pdf/path.ts`

---

- [ ] T37. **Sales report**

  **What to do**:
  - Create Sales Report (`src/pages/reports/SalesReport.tsx`)
  - **Date filter**: From/to date range picker
  - **Company filter dropdown**: ALL / Company 1 / Company 2
  - **bill_amount formula** (matches original VB.NET from Sales_Report.vb):
    ```sql
    SELECT 
      tbl_invoice_main.invoice_no,
      tbl_invoice_main.customer_id,
      tbl_customer.customer_name,
      tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount as bill_amount
    FROM tbl_invoice_main
    LEFT JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
    WHERE tbl_invoice_main.date BETWEEN ? AND ?
      AND (tbl_invoice_main.company_id = ? OR ? = 'ALL')
      AND tbl_invoice_main.is_deleted = 0
    ```
    **NOTE**: Original VB.NET returns one row per invoice (NO GROUP BY). Each invoice's bill_amount is a single header total. Do NOT aggregate — this is a per-row report, not a grouped summary. bill_amount = sub_total + vat - discount from HEADER fields (not line item sums).
  - **Group by**: Date, customer, product, company
  - **Export**: CSV/Excel download (original uses COM interop — new app uses csv-stringify)

  **References**:

  **VB.NET Source** (bill_amount from header, not line items):
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Sales_Report.vb:46-54` — `SELECT ... sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount ... FROM tbl_invoice_main INNER JOIN tbl_customer`
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Sales_Report.vb:66-72` — Same formula with company filter
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Sales_Report.vb:264-266` — Excel export copies sub_total column to "SUB TOTAL" header

  **Spec References**:
  - `desktop-invoice/docs/original_specs/06-sales-report.md` — Sales report spec
  - `docs/specs/00-multi-company-support.md` — Multi-company bill_amount by company

  **Guardrails**:
  - bill_amount from header (sub_total + vat - discount), NOT from line items
  - INNER JOIN (original pattern) for bill_amount grouping
  - LEFT JOIN for customer-invoice joins (avoid row drop if customer is null)

  **Acceptance Criteria**:
  - [ ] Sales report with date filter
  - [ ] bill_amount matches original formula (header totals, not line items)
  - [ ] CSV export works
  - [ ] Company filter shows correct totals per company

  **Commit**: YES
  - Message: `feat: sales report`
  - Files: `src/pages/reports/SalesReport.tsx`

---

- [ ] T38. **Statement preview**

  **What to do**:
  - Create Statement Preview (`src/pages/reports/StatementPreview.tsx`)
  - **Company filter dropdown**: ALL / Company 1 / Company 2
  - Customer statement: All invoices + receipts for a customer (filtered by company)
  - Opening balance + transactions + closing balance
  - PDF export

  **References**:

  **VB.NET Source** (Statement pattern):
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Reports/Statement.vb:476` — Statement generation
  - `desktop-invoice/docs/xpress/legacy-code/XPress/Reports/Preview_Statement_Report.vb` — Preview/report rendering

  **Spec References**:
  - `desktop-invoice/docs/original_specs/06-sales-report.md` — Statement report spec
  - `docs/specs/03-database.md` — Schema for statement queries

  **Guardrails**:
  - Statement includes both invoice AND receipt transactions (not just invoices)
  - Opening balance = customer's current due_amount (before period)
  - Closing balance = due_amount after applying all transactions in period

  **Acceptance Criteria**:
  - [ ] Statement shows all transactions for customer within date range
  - [ ] Opening balance = due_amount at period start
  - [ ] Closing balance = due_amount at period end
  - [ ] PDF export works
  - [ ] Company filter shows transactions for selected company only

  **Commit**: YES
  - Message: `feat: statement preview`
  - Files: `src/pages/reports/StatementPreview.tsx`

---

- [ ] T39. **Print preview with zoom**

  **What to do**:
  - Create Print Preview (`src/pages/reports/PrintPreview.tsx`)
  - PDF viewer with zoom controls (50%, 75%, 100%, 125%, 150%)
  - **Zoom compound drift**: Reset to 100% on each recalculation
  - Print button → system print dialog
  - RDLC-style page layout (portrait A4)

  **References**:
  - `docs/original_specs/32-preview-invoice-report.md` — Preview layout
  - `docs/xpress/legacy-code/XPress/Report/Preview_Invoice_Report.vb` — RDLC print preview

  **Guardrails**:
  - Zoom reset to 100% on recalculation

  **Acceptance Criteria**:
  - [ ] PDF renders in preview
  - [ ] Zoom controls work
  - [ ] Print button triggers system dialog

  **Commit**: YES
  - Message: `feat: print preview with zoom`
  - Files: `src/pages/reports/PrintPreview.tsx`

---

## Phase 9 TODOs

- [ ] T40. **Add company_id to tbl_invoice_sub** ⚠️ FIXED

  **What to do**:
  - **CRITICAL FIX**: tbl_invoice_sub did NOT have company_id in Phase 1 schema. This task adds it.
  - **Executor MUST first verify** `docs/specs/03-database.md` tbl_invoice_sub schema — baseline does NOT include company_id column. Run ALTER TABLE to add it, then backfill existing rows.
  - Add `company_id INTEGER NOT NULL DEFAULT 1` to tbl_invoice_sub:
    ```sql
    ALTER TABLE tbl_invoice_sub ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1;
    ```
  - Migration script must update all existing tbl_invoice_sub rows: derive company_id from parent tbl_invoice_main via main_id FK
  - On invoice save: copy company_id from tbl_invoice_main to each tbl_invoice_sub line item
  - On quotation save: copy company_id from tbl_quotation_main to each tbl_quotation_sub line item
  - Verify split-invoice: each invoice gets correct company_id from its parent

  **Must NOT do**:
  - Inherit company_id from first line item only (use parent invoice/quotation header)
  - Allow null company_id on line items

  **References**:

  **Spec References**:
  - `docs/specs/03-database.md` — tbl_invoice_sub original schema (no company_id)
  - `docs/specs/00-multi-company-support.md` — tbl_invoice_sub.company_id requirement

  **VB.NET Source** (no multi-company in original — new feature):
  - Original: tbl_invoice_sub has no company_id (single-company app)
  - New: company_id required for split-invoice to work correctly

  **Guardrails**:
  - company_id from parent header, not from first line item
  - Split-invoice needs company_id per line item for correct product bucket filtering

  **Acceptance Criteria**:
  - [ ] Migration adds company_id to tbl_invoice_sub
  - [ ] All existing rows get company_id from parent invoice
  - [ ] New invoices save company_id to each line item
  - [ ] Split-invoice creates two invoices with correct company_id per line item
  - [ ] `sqlite3 xpress.db "PRAGMA table_info(tbl_invoice_sub)" | grep company_id` returns company_id column

  **Commit**: YES
  - Message: `feat: verify company_id in schema`
  - Files: `migrations/`

---

- [ ] T41. **Dual product lists** ⚠️ EXPANDED

  **Prerequisite**: T40 must be completed first — tbl_invoice_sub.company_id column must exist before this task.

  **What to do**:
  - Implement dual product list UI for multi-company support
  - **Company A (Ironing)**: Products with `company_id = 1`
  - **Company B (Wash)**: Products with `company_id = 2`
  - **Implementation**:
    - Create `src/components/product/CompanyProductSelector.tsx` with two product dropdowns
    - Each dropdown shows only products for its company: `WHERE company_id = ? AND is_deleted = 0`
    - Product selection in invoice form: user selects products from A list and/or B list
    - Line items stored with company_id per row (from T40)
    - Company filter dropdown at top: ALL / Company A / Company B
  - **Filter by company_id, NOT type_id**: See `docs/specs/00-multi-company-support.md:132-144` for product filter logic using company_id bucket approach.
  - **UI Pattern**:
    ```
    +------------------------------------------+
    | Company: [ALL ▼]                         |
    +------------------------------------------+
    | Ironing Products    | Wash Products      |
    | +------------------+ | +----------------+|
    | | Service A    $100| | | Wash X     $50 |||
    | | Service B    $150| | | Wash Y     $75 |||
    | +------------------+ | +----------------+|
    +------------------------------------------+
    ```

  **Must NOT do**:
  - Filter by type_id instead of company_id (confirmed mix-up in original)
  - Mix products from different companies in single dropdown

  **References**:
  - `docs/specs/00-multi-company-support.md` — Dual product lists spec
  - `docs/xpress/legacy-code/XPress/Module1.vb` — type_id vs company_id confusion

  **Guardrails**:
  - company_id for bucket filtering, NOT type_id
  - company_id from parent header (invoice), not from first line item

  **Acceptance Criteria**:
  - [ ] Two separate product lists (Company A / Company B)
  - [ ] Products filtered by company_id (not type_id)
  - [ ] Company selector works (ALL/A/B)
  - [ ] Line items saved with correct company_id per row
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Company A products shown
    Tool: Bash
    Preconditions: CompanyProductSelector.tsx created
    Steps:
      1. cd xpress-billing && grep -E "company_id.*1|company_id.*=.*1" src/components/product/CompanyProductSelector.tsx | wc -l
    Expected Result: Products filtered by company_id = 1
    Evidence: .sisyphus/evidence/phase9/task-41-company-a.txt

  Scenario: Company B products shown
    Tool: Bash
    Preconditions: CompanyProductSelector.tsx created
    Steps:
      1. cd xpress-billing && grep -E "company_id.*2|company_id.*=.*2" src/components/product/CompanyProductSelector.tsx | wc -l
    Expected Result: Products filtered by company_id = 2
    Evidence: .sisyphus/evidence/phase9/task-41-company-b.txt

  Scenario: Products from both companies selectable
    Tool: Bash
    Preconditions: CompanyProductSelector.tsx has two dropdowns
    Steps:
      1. cd xpress-billing && grep -c "CompanyA\|CompanyB\|Ironing\|Wash" src/components/product/CompanyProductSelector.tsx
    Expected Result: Both company filters present
    Evidence: .sisyphus/evidence/phase9/task-41-dual-lists.txt
  ```

  **Commit**: YES
  - Message: `feat: dual product lists for multi-company`
  - Files: `src/components/product/CompanyProductSelector.tsx`

---

- [ ] T42. **Split-invoice workflow**

  **What to do**:
  - Implement split-invoice: one customer → two companies → two invoices
  - **Workflow**:
    1. User selects customer
    2. User selects products from both companies
    3. On save: create two invoices (one per company)
    4. Both invoices shown in print preview
  - **Both invoices printable**: Both must be shown in preview — use separate tabs or side-by-side in same viewer. Combined PDF also acceptable. Original spec (line 205) requires both printable. Do not orphan either invoice.

  **Must NOT do**:
  - Create only one invoice (orphaned second half)
  - Split mid-entry (product selection is atomic)

  **References**:
  - `docs/specs/00-multi-company-support.md` — Split-invoice spec

  **Guardrails**:
  - Both invoices printable (no orphan)
  - tbl_invoice_sub.company_id saved per line item

  **Acceptance Criteria**:
  - [ ] Split invoice creates two invoices
  - [ ] Both invoices shown in preview
  - [ ] tbl_invoice_sub.company_id saved per line item

  **Commit**: YES
  - Message: `feat: split-invoice workflow`
  - Files: `src/lib/invoice/splitInvoice.ts`

---

## Phase 10 TODOs

- [ ] T43. **WhatsApp templates CRUD**

  **What to do**:
  - Create WhatsApp Templates CRUD (`src/pages/admin/WhatsAppTemplates.tsx`)
  - Fields: template_name, template_id (from Meta), body (with variables), status
  - **Template variables**: `{1}`, `{2}` style (Meta WhatsApp format)
  - **Status tracking**: PENDING, APPROVED, REJECTED (from Meta)
  - **Meta Cloud API**: Use direct API (no BSP like Twilio)

  **References**:
  - `docs/specs/40-whatsapp-integration.md` — WhatsApp spec
  - Meta Business Manager: Template approval workflow

  **Guardrails**:
  - Meta Cloud API direct (no Twilio BSP)
  - Template approval required before proactive sends

  **Acceptance Criteria**:
  - [ ] Template CRUD with all fields
  - [ ] Status tracked from Meta
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat: WhatsApp templates CRUD`
  - Files: `src/pages/admin/WhatsAppTemplates.tsx`

---

- [ ] T44. **WhatsApp send**

  **What to do**:
  - Implement WhatsApp send via Meta Cloud API
  - **Prerequisites**:
    1. Client has Meta Business Account
    2. Client adds developer as admin/developer
    3. App registered in Meta Business Manager
    4. Phone number ID verified
  - **API call**: POST to Meta Graph API with template name, phone number, variables
  - **Webhook receiver**: Endpoint to receive delivery receipts
  - **Public URL**: Webhook needs public URL (Cloudflare tunnel or similar)

  **Must NOT do**:
  - Attach local file path (must upload to public URL or use base64)
  - Send without approved template

  **References**:
  - `docs/specs/40-whatsapp-integration.md` — WhatsApp API flow
  - Meta Graph API docs

  **Guardrails**:
  - Public URL required for webhooks
  - Template must be approved before send

  **Acceptance Criteria**:
  - [ ] WhatsApp message sent via Meta API
  - [ ] Delivery receipt received via webhook
  - [ ] Status updated in DB

  **Commit**: YES
  - Message: `feat: WhatsApp send via Meta Cloud API`
  - Files: `src/lib/whatsapp/send.ts`, `src-tauri/src/commands.rs` (webhook)

---

- [ ] T45. **Email send**

  **What to do**:
  - Implement email send via SMTP (Gmail)
  - **Flow**:
    1. Generate PDF from invoice
    2. Load template from tbl_email
    3. Replace placeholders (case-insensitive): `<date>`, `<contact person>`, `<name>`
    4. Send via SMTP (nodemailer or similar)
  - **CRITICAL**: Add `<name>` placeholder replacement for customer name. VB.NET uses `<name>` in Statement.vb:476 for customer name placeholder.
  - **Attachments**: PDF attached to email
  - **CRITICAL**: Add `<name>` placeholder replacement:
    ```typescript
    body.replace(/<date>/gi, invoiceDate)
        .replace(/<contact person>/gi, contactPerson)
        .replace(/<name>/gi, customerName)  // VB.NET uses <name> in Statement.vb:476
    ```
  - **Duplicate attachment bug fix**: Clear attachments array before each send

  **Must NOT do**:
  - Case-sensitive placeholder replacement (use case-insensitive regex)
  - Accumulate attachments across sends (clear array each time)

  **References**:
  - `docs/xpress/legacy-code/XPress/Email/email_module.vb` — SMTP send flow
  - `docs/xpress/legacy-code/XPress/Email/Add_Edit_Invoice.vb:1962-1969` — Placeholder replacement

  **Guardrails**:
  - Gmail requires App Password (2FA)
  - Clear attachments array before each send
  - Case-insensitive placeholder replacement

  **Acceptance Criteria**:
  - [ ] Email sent with PDF attachment
  - [ ] Placeholders replaced correctly (`<date>`, `<contact person>`, `<name>`)
  - [ ] `<name>` placeholder replaced with customer name (VB.NET Statement.vb:476)
  - [ ] No duplicate attachments

  **Commit**: YES
  - Message: `feat: email send with SMTP`
  - Files: `src/lib/email/send.ts`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Build Verification** — `unspecified-high`
  Run `npm run tauri build` (release mode). Verify compilation succeeds. Check bundle size.
  Output: `Build [PASS/FAIL] | Bundle [N MB] | VERDICT`

- [ ] F3. **Runtime Verification** — `unspecified-high`
  Start app from clean state. Verify: App launches without errors, custom titlebar functional (minimize, maximize, close), database initialized, sidebar navigation works.
  Output: `Launch [OK/FAIL] | Titlebar [OK/FAIL] | DB [OK/FAIL] | Nav [OK/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

## Commit Strategy

- **P1-C1**: `chore: scaffold from dannysmith/tauri-template` — template clone, npm install
- **P1-C2**: `feat: add tauri plugins` — sql, fs, dialog, shell, notification, window-state
- **P1-C3**: `feat: configure tauri capabilities` — tauri.conf.json + capabilities
- **P1-C4**: `feat: init SQLite with schema` — db.ts, types.ts, migrations
- **P1-C5**: `feat: integrate migration tool` — migrate-wrapper.ts
- **P1-C6**: `feat: scaffold core UI layout` — pages, components, routing

## Success Criteria

### Verification Commands
```bash
npm run tauri dev  # Starts without errors
curl localhost:3000  # React app serves
ls "$APPDATA/com.ramma.xpress/xpress.db"  # SQLite created
tsc --noEmit  # TypeScript passes
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] tauri dev starts without errors
- [ ] No console errors
- [ ] Money stored as INTEGER cents (verified in schema)
- [ ] Dates stored as TEXT ISO 8601 (verified in schema)
- [ ] Git clean working directory

---

## Guardrails (Enforced Across All Phases)

### Critical
- **MONEY AS INTEGER CENTS**: All monetary values stored as INTEGER, never REAL/FLOAT
- **DATES AS TEXT ISO 8601**: All dates stored as YYYY-MM-DD, never Date type
- **SQLite bind params**: Use `$1`, `$2`, NOT `?`
- **tauri-plugin-sql preload**: Must add DB path to `tauri.conf.json` `plugins.sql.preload`
- **TanStack Table + React Compiler**: Add `"use no memo"` directive to table components
- **Capabilities permissions**: Add `sql:allow-execute` for writes, not just `sql:default`

### Business Logic
- **Invoice cal()**: Must match `docs/original_specs/10-invoice.md:38-87` exactly
- **Receipt delete**: Must NOT reverse balance (unlike invoice delete)
- **cr_dr reversal**: Invoice delete uses Cr.→add-back, Dr.→subtract
- **ad_due transitions**: Due→Due when settling, ""→"Due" on first invoice
- **Soft-delete pattern**: Ctrl+D → hidden row → IsDeleted flag → delete on save
- **Company filter on ALL data lists**: Every list view (Customer, Product, Invoice, Quotation, Receipt, Outstanding, Transaction History, Sales Report, Statement Preview) MUST have company filter dropdown (ALL / Company 1 / Company 2)

### Scope Boundaries
- **NO TDD for Phase 1**: Scaffold only, no tests
- **NO PDF generation for Phase 1**: Placeholder only
- **NO auth for Phase 1**: Placeholder only
- **NO WhatsApp for Phase 1-4**: Placeholder pages only
- **NO multi-company for Phase 1-4**: Single company only

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read plan end-to-end. Verify each "Must Have" implemented, each "Must NOT Have" absent.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Build Verification** — `unspecified-high`
  Run `npm run tauri build`. Verify compilation succeeds. Check bundle size.
  Output: `Build [PASS/FAIL] | Bundle [N MB] | VERDICT`

- [ ] F3. **Runtime Verification** — `unspecified-high`
  Start app from clean state. Verify all features functional.
  Output: `Launch [OK/FAIL] | Auth [OK/FAIL] | CRUD [OK/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 match.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Success Criteria

### Verification Commands
```bash
npm run tauri dev  # Starts without errors
ls "$APPDATA/com.ramma.xpress/xpress.db"  # SQLite created
tsc --noEmit  # TypeScript passes
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Invoice cal() matches original
- [ ] Money stored as INTEGER cents
- [ ] RBAC enforced
- [ ] Git clean working directory