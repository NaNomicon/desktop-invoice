# Schema Migration System — Implementation Plan (v4)

## Overview

Implement the v4 schema migration design: single source of truth for schema definitions, transaction-wrapped reconciliation, version tracking for diagnostics only.

---

## Implementation Order

### Phase 1: Create `src/lib/db/schema.ts` — Single Source of Truth

**Goal**: Port all 17 table definitions into `TABLES` object, derive exported arrays.

**Steps**:

1.1 Define TypeScript interfaces:
```typescript
interface ColumnDef {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  default?: string;
  references?: string;
}

interface TableSpec {
  columns: ColumnDef[];
  indexes?: string[];  // CREATE INDEX statements
  constraints?: string[];  // FK, UNIQUE, etc.
}
```

1.2 Create `TABLES` object — one entry per table, matching current `SCHEMA_STATEMENTS` + `REQUIRED_COLUMNS`:
- `tbl_company` — 22 columns + 2 indexes
- `tbl_user` — 5 columns
- `tbl_setting` — 13 columns
- `tbl_numbers` — 4 columns
- `tbl_product_type` — 3 columns
- `tbl_customer` — 15 columns + index
- `tbl_product` — 7 columns + 2 indexes
- `tbl_invoice_main` — 20 columns + 5 indexes
- `tbl_invoice_sub` — 9 columns + index
- `tbl_quotation_main` — 18 columns + index
- `tbl_quotation_sub` — 9 columns
- `tbl_receipt` — 20 columns + 4 indexes
- `tbl_email` — 9 columns + 2 unique indexes
- `tbl_wa_template` — 6 columns + 2 unique indexes
- `tbl_whatsapp` — 8 columns + unique index
- `tbl_whatsapp_settings` — 6 columns
- `tbl_whatsapp_log` — 9 columns + 2 indexes

1.3 Add derived exports at module scope:
```typescript
// Derive SCHEMA_STATEMENTS from TABLES
for (const [tableName, spec] of Object.entries(TABLES)) {
  const columns = spec.columns.map(c => {
    let def = `${c.name} ${c.type}`;
    if (c.primaryKey) def += ' PRIMARY KEY';
    if (c.notNull && !c.primaryKey) def += ' NOT NULL';
    if (c.default) def += ` DEFAULT ${c.default}`;
    return def;
  });
  const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(', ')})`;
  SCHEMA_STATEMENTS.push(sql);
}

// Derive REQUIRED_COLUMNS from TABLES
for (const [tableName, spec] of Object.entries(TABLES)) {
  REQUIRED_COLUMNS[tableName] = spec.columns.map(c => ({
    name: c.name,
    type: c.default ? `${c.type} DEFAULT ${c.default}` : c.type
  }));
}
```

**Deliverable**: `src/lib/db/schema.ts` with `TABLES`, `SCHEMA_STATEMENTS`, `REQUIRED_COLUMNS` exports.

**Verification**: Output must match current `SCHEMA_STATEMENTS` and `REQUIRED_COLUMNS` exactly. Run diff.

---

### Phase 2: Create `src/lib/db/migrations.ts` — Reconciliation Runner

**Goal**: Transaction-wrapped schema reconciliation, version tracking functions.

**Steps**:

2.1 Define version types:
```typescript
interface SchemaVersion {
  major: number;
  minor: number;
  updated_at: string;
}

const CURRENT_VERSION: SchemaVersion = { major: 1, minor: 0 };
```

2.2 Create `initVersionTable()`:
```typescript
async function initVersionTable(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      major INTEGER NOT NULL DEFAULT 0,
      minor INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
```

2.3 Create `getVersion()`:
```typescript
async function getVersion(db: Database): Promise<SchemaVersion | null> {
  const result = await db.select<SchemaVersion[]>(
    'SELECT major, minor, updated_at FROM _schema_version WHERE major = ?',
    [CURRENT_VERSION.major]
  );
  return result[0] || null;
}
```

2.4 Create `updateVersion()`:
```typescript
async function updateVersion(db: Database, version: SchemaVersion): Promise<void> {
  await db.execute(
    `INSERT OR REPLACE INTO _schema_version (major, minor, updated_at) VALUES (?, ?, datetime('now'))`,
    [version.major, version.minor]
  );
}
```

2.5 Create `ensureDatabase()` with transaction wrap:
```typescript
async function ensureDatabase(db: Database): Promise<void> {
  // Note: Tauri SQL plugin may not support native transactions
  // Use BEGIN/COMMIT/ROLLBACK manually or skip if not available
  
  try {
    // 1. Init version table
    await initVersionTable(db);
    
    // 2. Run schema statements
    for (const stmt of SCHEMA_STATEMENTS) {
      await db.execute(stmt);
    }
    
    // 3. Add missing columns
    for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
      const existing = await db.select<{name: string}[]>(`PRAGMA table_info(${table})`);
      const existingNames = new Set(existing.map(c => c.name));
      
      for (const col of cols) {
        if (!existingNames.has(col.name)) {
          await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
        }
      }
    }
    
    // 4. Update version
    await updateVersion(db, CURRENT_VERSION);
    
  } catch (err) {
    // Transaction rollback if supported
    // Log error
    throw err;
  }
}
```

**Note on transactions**: Tauri SQL plugin (`@tauri-apps/plugin-sql`) uses `sql.js` under the hood for SQLite. Transaction support may be limited. Investigate:
- If transactions not supported: skip transaction wrap, rely on idempotent reconciliation
- Add backup-step before schema changes if critical

2.6 Create `checkIntegrity()` — diagnostic only:
```typescript
interface DriftReport {
  drift: boolean;
  missingTables: string[];
  missingColumns: Record<string, string[]>;
}

async function checkIntegrity(db: Database): Promise<DriftReport> {
  // Compare PRAGMA table_info against TABLES definitions
  // Log warnings, return report
}
```

2.7 Create `getDbPath()` and `freshDatabase()`:
```typescript
async function freshDatabase(): Promise<void> {
  // Delete the DB file - on next getDb() it recreates
  const dbPath = await getDbPath();
  // Use Tauri fs API to delete
}
```

**Deliverable**: `src/lib/db/migrations.ts` with all functions.

**Verification**: Test on existing DB — should not alter existing data.

---

### Phase 3: Create `src/lib/db/seed.ts` — Extracted Seed Logic

**Goal**: Move `seedDefaults()` from `db.ts` to standalone module.

**Steps**:

3.1 Create file with current seed logic:
```typescript
import type Database from '@tauri-apps/plugin-sql';

export async function run(db: Database): Promise<void> {
  // Copy all seed logic from db.ts seedDefaults()
}
```

3.2 Verify idempotency — all statements must use `INSERT OR IGNORE` or conditional `UPDATE`.

**Deliverable**: `src/lib/db/seed.ts`

---

### Phase 4: Modify `src/lib/db.ts` — Use New Modules

**Goal**: Refactor to use `schema.ts`, `migrations.ts`, `seed.ts`.

**Steps**:

4.1 Replace imports:
```typescript
import { SCHEMA_STATEMENTS, REQUIRED_COLUMNS } from './db/schema';
import { ensureDatabase, getVersion, checkIntegrity } from './db/migrations';
import { run as seed } from './db/seed';
```

4.2 Refactor `initialize()`:
```typescript
async function initialize(database: Database): Promise<void> {
  await database.execute('PRAGMA journal_mode=WAL');
  await database.execute('PRAGMA foreign_keys=ON');
  
  // Use new migration system
  await ensureDatabase(database);
  
  // Seed runs unconditionally
  await seed(database);
}
```

4.3 Keep backward-compatible exports from `db.ts`:
- `getDb()`, `closeDb()`, `query()`, `execute()` — same as before

**Deliverable**: Modified `src/lib/db.ts` using new modules.

**Verification**: App starts, existing data preserved, schema version recorded.

---

### Phase 5: Tests and Validation

**Steps**:

5.1 Add schema consistency test:
```typescript
// tests/db/schema.test.ts
describe('TABLES', () => {
  it('matches current SCHEMA_STATEMENTS', () => {
    // Re-derive and compare
  });
  
  it('matches current REQUIRED_COLUMNS', () => {
    // Re-derive and compare
  });
});
```

5.2 Test migration on fresh DB:
- Delete existing xpress.db
- Start app
- Verify all tables created with correct schema

5.3 Test migration on existing DB:
- Start app with existing DB
- Verify no data loss
- Verify version recorded

5.4 Test column reconciliation:
- Manually remove a column from DB
- Start app
- Verify column restored

**Deliverable**: Tests passing.

---

### Phase 6: Cleanup

**Steps**:

6.1 Remove duplicate definitions from `db.ts`:
- Delete `SCHEMA_STATEMENTS` array
- Delete `REQUIRED_COLUMNS` object
- Delete `ensureSchema()` function
- Delete `seedDefaults()` function (moved to seed.ts)

6.2 Verify build passes:
```bash
npm run build
```

6.3 Verify app runs:
```bash
npm run tauri dev
```

---

## Dependency Checklist

| Dependency | Purpose | Status |
|------------|---------|--------|
| `@tauri-apps/plugin-sql` | SQLite access | Already in use |
| `@tauri-apps/api` | Path, fs for freshDatabase | Need fs plugin |

**If `freshDatabase()` needs Tauri fs**:
```bash
npm run tauri add fs
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/db/schema.ts` | Create |
| `src/lib/db/migrations.ts` | Create |
| `src/lib/db/seed.ts` | Create |
| `src/lib/db.ts` | Modify — use new modules |
| `src/lib/db/version.ts` | (optional) version constant |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Transaction not supported in Tauri SQL | Skip transaction wrap, rely on idempotent reconciliation |
| Schema drift test fails due to column order | Sort columns before compare |
| freshDatabase() needs fs plugin | Add plugin or skip feature (dev-only) |

---

## Success Criteria

- [ ] Schema definitions in one place (`schema.ts`)
- [ ] Schema changes require editing only `TABLES` in `schema.ts`
- [ ] Reconciliation runs atomically (or idempotently)
- [ ] Version recorded for diagnostics
- [ ] Existing data preserved on migration
- [ ] All tests pass
- [ ] No "no such column" errors on fresh startup