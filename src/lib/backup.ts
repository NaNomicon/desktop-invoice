import { query } from '@/lib/db'
import { commands } from '@/lib/bindings'
import type { Setting } from '@/lib/types'

export async function getBackupPath(): Promise<string | null> {
  const rows = await query<Setting>('SELECT backup_path FROM tbl_setting WHERE id = 1 LIMIT 1')
  return rows[0]?.backup_path ?? null
}

export async function runBackup(backupPath: string): Promise<void> {
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const destPath = `${backupPath.replace(/\/$/, '')}/xpress_backup_${ts}.db`
  const res = await commands.backupDatabase(destPath)
  if (res.status !== 'ok') {
    throw new Error(res.error)
  }
}
