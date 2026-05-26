import Database from '@tauri-apps/plugin-sql';
import { SCHEMA_STATEMENTS, REQUIRED_COLUMNS, CURRENT_VERSION } from './schema';

export interface SchemaVersion {
  major: number;
  minor: number;
  updated_at?: string;
}

export interface DriftReport {
  drift: boolean;
  missingTables: string[];
  missingColumns: Record<string, string[]>;
}

async function initVersionTable(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      major INTEGER NOT NULL DEFAULT 0,
      minor INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

export async function getVersion(db: Database): Promise<SchemaVersion | null> {
  const result = await db.select<SchemaVersion[]>(
    'SELECT major, minor, updated_at FROM _schema_version WHERE major = ?',
    [CURRENT_VERSION.major]
  );
  return result[0] || null;
}

export async function updateVersion(db: Database, version: SchemaVersion): Promise<void> {
  await db.execute(
    `INSERT OR REPLACE INTO _schema_version (major, minor, updated_at) VALUES (?, ?, datetime('now'))`,
    [version.major, version.minor]
  );
}

async function addMissingColumns(
  db: Database,
  table: string,
  columns: Array<{ name: string; type: string }>
): Promise<void> {
  const existing = await db.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
  const existingNames = new Set(existing.map((c) => c.name));

  for (const col of columns) {
    if (!existingNames.has(col.name)) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
    }
  }
}

export async function ensureDatabase(db: Database): Promise<void> {
  await initVersionTable(db);

  for (const stmt of SCHEMA_STATEMENTS) {
    await db.execute(stmt);
  }

  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    await addMissingColumns(db, table, cols);
  }

  await updateVersion(db, CURRENT_VERSION);
}

export async function checkIntegrity(db: Database): Promise<DriftReport> {
  const report: DriftReport = {
    drift: false,
    missingTables: [],
    missingColumns: {},
  };

  for (const table of Object.keys(REQUIRED_COLUMNS)) {
    const existing = await db.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
    if (existing.length === 0) {
      report.drift = true;
      report.missingTables.push(table);
      continue;
    }

    const existingNames = new Set(existing.map((c) => c.name));
    const requiredNames = new Set(REQUIRED_COLUMNS[table]?.map((c) => c.name) ?? []);
    const missing = [...requiredNames].filter((n) => !existingNames.has(n));

    if (missing.length > 0) {
      report.drift = true;
      report.missingColumns[table] = missing;
    }
  }

  return report;
}

export async function getDbPath(): Promise<string> {
  const appDataDir = await import('@tauri-apps/api/path').then((p) =>
    p.appDataDir()
  );
  return `${appDataDir}xpress.db`;
}

export async function freshDatabase(): Promise<void> {
  const path = await getDbPath();
  const fs = await import('@tauri-apps/plugin-fs');
  
  try {
    await fs.remove(path);
  } catch {
    // ignore
  }
}