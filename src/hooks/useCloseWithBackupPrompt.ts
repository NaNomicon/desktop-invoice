import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { ask } from '@tauri-apps/plugin-dialog'
import { exit } from '@tauri-apps/plugin-process'
import { getBackupPath, runBackup } from '@/lib/backup'
import { logger } from '@/lib/logger'

export function useCloseWithBackupPrompt() {
  useEffect(() => {
    let unlisten: (() => void) | null = null

    listen('app-close-requested', async () => {
      const backupPath = await getBackupPath().catch(() => null)

      if (backupPath) {
        const shouldBackup = await ask('Do you want to create a backup before closing?', {
          title: 'Backup',
          kind: 'info',
          okLabel: 'Backup & Close',
          cancelLabel: 'Close Without Backup',
        })

        if (shouldBackup) {
          try {
            await runBackup(backupPath)
          } catch (err) {
            logger.warn('Auto-backup on close failed', { error: err })
            const proceed = await ask('Backup failed. Close anyway?', {
              title: 'Backup Failed',
              kind: 'warning',
              okLabel: 'Close Anyway',
              cancelLabel: 'Cancel',
            })
            if (!proceed) return
          }
        }
      }

      await exit(0)
    }).then(fn => {
      unlisten = fn
    }).catch(err => {
      logger.error('Failed to setup close backup prompt', { error: err })
    })

    return () => {
      unlisten?.()
    }
  }, [])
}
