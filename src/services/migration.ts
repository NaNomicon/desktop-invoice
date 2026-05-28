import { listen } from '@tauri-apps/api/event'
import { commands } from '@/lib/tauri-bindings'

export interface SqlServerConfig {
  host: string
  port: number
  instance: string | null
  user: string
  password: string
  database: string
}

export interface MigrationProgress {
  tableName: string
  rowsMigrated: number
  totalRows: number
  phase: 'reading' | 'writing' | 'done' | 'error'
  error?: string | null
}

export interface TableMigrationResult {
  tableName: string
  rowsMigrated: number
  success: boolean
  error?: string | null
}

export interface MigrationResult {
  results: TableMigrationResult[]
  totalRows: number
  success: boolean
  error?: string | null
}

export interface MigrationOptions {
  config?: SqlServerConfig
  onProgress?: (progress: MigrationProgress) => void
}

export const DEFAULT_SQL_SERVER_CONFIG: SqlServerConfig = {
  host: '127.0.0.1',
  port: 1433,
  instance: null,
  user: 'sa',
  password: 'XpressBackup123!',
  database: 'XPressDB',
}

/**
 * Migrate all data from SQL Server to the local SQLite database.
 * Connects to the Docker SQL Server, reads all tables, converts types,
 * and inserts into the app's SQLite database.
 *
 * @example
 * ```typescript
 * // Simple call
 * const result = await migrateFromSqlServer()
 * console.log(`Migrated ${result.totalRows} rows`)
 *
 * // With progress tracking
 * const result = await migrateFromSqlServer({
 *   onProgress: (p) => {
 *     console.log(`${p.tableName}: ${p.rowsMigrated}/${p.totalRows}`)
 *   },
 * })
 *
 * // With custom connection config
 * const result = await migrateFromSqlServer({
 *   config: { host: '192.168.1.100', port: 1433, user: 'sa', password: '...', database: 'XPressDB' },
 * })
 * // With SQL Server Express named instance
 * const result = await migrateFromSqlServer({
 *   config: { host: 'localhost', port: 1433, instance: 'SQLEXPRESS', user: 'sa', password: '...', database: 'XPressDB' },
 * })
 * ```
 */
export async function migrateFromSqlServer(
  options?: MigrationOptions,
): Promise<MigrationResult> {
  const { config, onProgress } = options ?? {}

  let unlisten: (() => void) | undefined

  try {
    if (onProgress) {
      const unlistenFn = await listen<MigrationProgress>(
        'migration-progress',
        (event) => {
          onProgress(event.payload)
        },
      )
      unlisten = unlistenFn
    }

    const result = await commands.migrateFromSqlserver(
      config ?? null,
    )

    if (result.status === 'error') {
      throw new Error(result.error)
    }

    return result.data as MigrationResult
  } finally {
    unlisten?.()
  }
}
