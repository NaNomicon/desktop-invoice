import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:xpress.db');
    await db.execute('PRAGMA journal_mode=WAL');
    await db.execute('PRAGMA foreign_keys=ON');
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