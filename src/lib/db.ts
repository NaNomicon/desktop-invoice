import Database from '@tauri-apps/plugin-sql';
import { ensureDatabase, getVersion } from './db/migrations';
import { run as seed } from './db/seed';
import { CURRENT_VERSION } from './db/schema';

let db: Database | null = null;
let initPromise: Promise<void> | null = null;

async function initialize(database: Database): Promise<void> {
  await database.execute('PRAGMA journal_mode=WAL');
  await database.execute('PRAGMA foreign_keys=ON');

  await ensureDatabase(database);

  const version = await getVersion(database);
  console.info(
    `DB schema at v${version?.major ?? 0}.${version?.minor ?? 0}, app expects v${CURRENT_VERSION.major}.${CURRENT_VERSION.minor}`
  );

  await seed(database);
}

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:xpress.db');
  }

  if (!initPromise) {
    initPromise = initialize(db).catch((error) => {
      initPromise = null;
      db = null;
      throw error;
    });
  }

  await initPromise;
  return db;
}

/** Closes the active database connection. Call before restore to release file locks. */
export async function closeDb(): Promise<void> {
  if (db) {
    try {
      await db.close();
    } catch {
      // ignore close errors
    }
    db = null;
    initPromise = null;
  }
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const database = await getDb();
  return database.select(sql, params);
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const database = await getDb();
  await database.execute(sql, params);
}
