# Schema Migration System — Design (v4)

## Motivation

Third devil's advocate review revealed:
1. Version gating saves ~30ms — not worth complexity cost
2. Contradictory flow diagrams in v3 (gated vs. always-run)
3. No rollback mechanism for migration failures
4. No version bump workflow for developers
5. Fresh database function dangerously fragile

**v4 simplifies**: Always-run reconciliation (it's fast), version for diagnostics only, transactions for safety.

---

## Architecture

```
src/lib/db/
├── schema.ts         # NEW: Single source of truth for tables
├── migrations.ts     # NEW: Reconciliation runner + version tracking
├── seed.ts           # NEW: Extracted seed logic
└── db.ts             # MODIFIED: Calls migrations + seed on init
```

---

## Single Source of Truth (`schema.ts`)

Define tables once and derive both DDL and column-check lists:

```typescript
// Each table: table name → schema spec
export interface TableSpec {
  columns: ColumnDef[];        // All columns (CREATE TABLE DDL derived from this)
  indexes?: string[];          // Extra CREATE INDEX statements
  constraints?: string[];      // Extra constraints (FK, UNIQUE, etc.)
}

export interface ColumnDef {
  name: string;
  type: string;                // e.g. "INTEGER"
  primaryKey?: boolean;
  notNull?: boolean;
  default?: string;            // e.g. "datetime('now')", "1", "''"
  unique?: boolean;
}

export const TABLES: Record<string, TableSpec> = {
  tbl_company: {
    columns: [
      { name: "id", type: "INTEGER", primaryKey: true },
      { name: "identity", type: "TEXT", notNull: true },
      { name: "company_short_name", type: "TEXT", default: "''" },
      { name: "company_name", type: "TEXT", default: "''" },
      // ... all columns in order
    ],
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_company_identity ON tbl_company(identity)"
    ]
  },
  tbl_receipt: { /* ... */ },
  // ... all 17 tables
};
```

**Derived exports** — generated at module load:

```typescript
// Generated from TABLES — never manually edited
export const SCHEMA_STATEMENTS: string[];    // Full CREATE TABLE statements
export const REQUIRED_COLUMNS: Record<string, ColumnDef[]>;  // Columns by table
```

**Why not generate at build time?** Simpler to compute once at module scope. The source is TABLES, which is the single point of edit.

---

## Reconciliation Flow (Always-Run)

```typescript
const CURRENT_VERSION: SchemaVersion = { major: 1, minor: 0 };

// Called on every startup — always runs, fast (~50ms)
async function ensureDatabase(db: Database): Promise<void> {
  const tx = await db.beginTransaction();

  try {
    // 1. Create _schema_version table if missing
    await tx.execute(`CREATE TABLE IF NOT EXISTS _schema_version (...)`);

    // 2. Create all tables (CREATE TABLE IF NOT EXISTS)
    for (const stmt of SCHEMA_STATEMENTS) {
      await tx.execute(stmt);
    }

    // 3. Add missing columns (ALTER TABLE ADD COLUMN)
    for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
      const existing = await tx.execute(`PRAGMA table_info(${table})`);
      const existingNames = new Set(existing.rows.map(r => r.name));
      for (const col of cols) {
        if (!existingNames.has(col.name)) {
          const sql = `ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''}`;
          await tx.execute(sql);
        }
      }
    }

    // 4. Run pending data migrations (non-additive changes)
    const version = await getVersion(tx);
    if (version && version <= CURRENT_VERSION) {
      for (const m of MIGRATIONS) {
        if (!version || version < m.from) continue;
        if (version >= m.to) continue;
        await m.up(tx);
      }
    }

    // 5. Update version
    await updateVersion(tx, CURRENT_VERSION);

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;  // Migration failed — DB unchanged (atomic)
  }

  // 6. Seed default data (outside transaction — INSERT OR IGNORE is idempotent)
  await seed.run(db);
}
```

**Key design decisions:**
- **Always runs** — no version gate. The CREATE TABLE IF NOT EXISTS + PRAGMA path is <50ms.
- **Transaction wrap** — schema changes + migrations are atomic. Failure → rollback keeps DB as-is.
- **Version updated only on success** — if migration fails mid-way, version stays old, next startup retries.
- **Seed runs separately** — INSERT OR IGNORE can't fail, no need for transaction.

---

## Version Tracking (Diagnostic)

```sql
CREATE TABLE IF NOT EXISTS _schema_version (
  major INTEGER NOT NULL DEFAULT 0,
  minor INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

Version stored but **not used for gating**. Purpose:
- Log "DB at v1.0, app expects v1.0" on startup
- `getVersion()` for debugging (support can ask "what schema version?")
- Fresh database detection (no row → new DB)

---

## Data Migrations (`Migration[]`)

For non-additive changes that ALTER TABLE ADD COLUMN can't handle:

```typescript
interface Migration {
  from: SchemaVersion;   // Version this migration starts from
  to: SchemaVersion;     // Version this migration upgrades to
  up: (tx: Transaction) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  // Example: rename column
  {
    from: { major: 1, minor: 0 },
    to: { major: 1, minor: 1 },
    up: async (tx) => {
      // Add new column, copy data, drop old
      await tx.execute("ALTER TABLE tbl_company ADD COLUMN new_name TEXT");
      await tx.execute("UPDATE tbl_company SET new_name = old_name");
      await tx.execute("ALTER TABLE tbl_company DROP COLUMN old_name");
    }
  }
];
```

**Design note:** In practice, the additive ALTER TABLE ADD COLUMN handles most changes. `Migration[]` is for the rare case (column rename, type change, data transform). Many schema updates won't need a migration entry — just add the column to `TABLES` in `schema.ts`.

**Backup before data migration:** For a desktop app, recommend copying `xpress.db` to `xpress.db.bak` before running data migrations — simple, zero infrastructure.

---

## Fresh Database (Safe)

```typescript
async function freshDatabase(): Promise<void> {
  // Hard-delete the DB file — app recreates on next startup
  const dbPath = await getDbPath();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);       // Atomic delete (SQLite file)
  }
  // On next getDb() call, ensureDatabase() creates fresh
}
```

**Why delete file vs. DROP TABLE?** Cleaner, handles all state (WAL, SHM files), no FK ordering issues. On an installed desktop app, the file path is known at runtime.

---

## Seed Logic (`seed.ts`)

Extracted from current `seedDefaults()`:

```typescript
// Idempotent — INSERT OR IGNORE for defaults, explicit UPDATE for data fixes
async function run(db: Database): Promise<void> {
  await db.execute("INSERT OR IGNORE INTO tbl_company (id, identity) VALUES (1, 'default')");
  await db.execute("UPDATE tbl_numbers SET invoice_no = 1 WHERE invoice_no IS NULL");
  // ...
}
```

Runs unconditionally on every startup — safe, idempotent, <5ms.

---

## Integrity Check (Diagnostic)

```typescript
async function checkIntegrity(db: Database): Promise<DriftReport> {
  // Compare actual DB (PRAGMA table_info) with expected (schema.ts)
  // Log warnings, don't block startup
}
```

Purpose: Support team asks "why is column X missing?" → logs tell the story.

---

## Version Bump Workflow

### For developers adding/modifying schema:

1. Edit `TABLES` in `schema.ts` (add/change columns)
2. If **additive** (ALTER TABLE can handle): done. No migration, no version bump needed.
3. If **non-additive** (rename, type change, data transform): write an `up()` in `MIGRATIONS`, bump version.

### CLI helper (add to package.json):

```bash
# Bump minor version (e.g., 1.0 → 1.1)
npm run schema:bump -- minor
# Updates src/lib/db/version.ts and tags
```

This is a quality-of-life tool — not required, but reduces "forgot to bump" risk.

### Validation:

A test that fails if `REQUIRED_COLUMNS` vs `SCHEMA_STATEMENTS` have drift:

```typescript
// tests/db/schema.test.ts
describe('schema', () => {
  it('TABLES definitions match generated DDL', () => {
    const tables = defineTables(TABLE_SPECS);
    for (const sql of SCHEMA_STATEMENTS) {
      expect(tables.map(t => t.sql)).toContain(sql);
    }
  });
});
```

---

## What We Skip

- ❌ **Rollback** — No undo for data migrations. Backup file is escape hatch.
- ❌ **CLI** — No manual migration commands. Runs on startup.
- ❌ **Migration files** — No numbered SQL files. Migrations live in `migrations.ts`.
- ❌ **Version gating** — Reconciliation always runs (<50ms overhead).
- ❌ **Table dropping on schema change** — SQLite limitations. Use migration for complex changes.
- ❌ **Seeding in migration** — Seed is separate, runs unconditionally, idempotent.

---

## Things That Could Go Wrong

| Problem | Mitigation |
|---------|-----------|
| Migration fails mid-way | Transaction wrap → rollback. Version not updated → retries on next startup. |
| User force-quits during reconciliation | Transactions auto-rollback on disconnect. |
| DB file locked (another instance) | Retry with backoff. App exit with error message. |
| Dev forgets to bump version for data migration | No mitigation (rare — most changes are additive). Backup is safety net. |
| Schema drift from manual DB edits | `checkIntegrity()` logs warning. |

---

## Implementation Order

1. Create `schema.ts` — port all 17 tables into `TABLES` object, derive exported arrays
2. Create `migrations.ts` — `ensureDatabase()`, `getVersion()`, transaction wrapper
3. Create `seed.ts` — extract from current `seedDefaults()`
4. Modify `db.ts` — call migrations then seed
5. Add integrity check
6. Add test for schema consistency
7. Add `npm run schema:bump` helper
8. Delete old schema definitions from `db.ts`
9. Test on real existing DB (ensure no regression)
