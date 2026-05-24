import { useState, useEffect } from 'react'
import { query } from '@/lib/db'
import { commands } from '@/lib/bindings'
import type { Setting } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Database, Loader2, HardDrive } from 'lucide-react'

function BackupDatabase() {
  const [backupPath, setBackupPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [backingUp, setBackingUp] = useState(false)

  useEffect(() => {
    query<Setting>('SELECT backup_path FROM tbl_setting WHERE id = 1 LIMIT 1')
      .then((rows) => {
        setBackupPath(rows[0]?.backup_path ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleBackup = async () => {
    if (!backupPath) {
      toast.error('Backup path not configured. Set it in Settings first.')
      return
    }

    setBackingUp(true)
    try {
      const now = new Date()
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const destPath = `${backupPath.replace(/\/$/, '')}/xpress_backup_${ts}.db`

      const res = await commands.backupDatabase(destPath)
      if (res.status === 'ok') {
        toast.success(`Backup created: xpress_backup_${ts}.db`)
      } else {
        toast.error(`Backup failed: ${res.error}`)
      }
    } catch (err) {
      toast.error(`Backup failed: ${String(err)}`)
    } finally {
      setBackingUp(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center gap-2">
        <HardDrive className="size-5" />
        <h1 className="text-2xl font-semibold">Backup Database</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4" />
            Create Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Backup Path</p>
            <p className="text-muted-foreground rounded-md border px-3 py-2 text-sm">
              {backupPath || (
                <span className="italic">
                  Not configured — set backup_path in{' '}
                  <a href="/settings" className="underline underline-offset-2">
                    Settings
                  </a>
                </span>
              )}
            </p>
          </div>

          <Button onClick={() => void handleBackup()} disabled={backingUp || !backupPath}>
            {backingUp ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Backing up...
              </>
            ) : (
              <>
                <Database className="mr-2 size-4" />
                Create Backup Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default BackupDatabase
