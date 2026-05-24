import { useState } from 'react'
import { commands } from '@/lib/bindings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Upload, RotateCcw, Loader2, FileText } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'

function RestoreDatabase() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSelectFile = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [
          {
            name: 'Database Backups',
            extensions: ['db', 'sqlite', 'sqlite3'],
          },
        ],
      })
      if (file) {
        setSelectedFile(file as string)
      }
    } catch (err) {
      toast.error(`File selection failed: ${String(err)}`)
    }
  }

  const handleRestore = async () => {
    if (!selectedFile) return
    setShowConfirm(false)
    setRestoring(true)
    try {
      const res = await commands.restoreDatabase(selectedFile)
      if (res.status === 'ok') {
        toast.success('Database restored. Relaunching app...')
        await relaunch()
      } else {
        toast.error(`Restore failed: ${res.error}`)
        setRestoring(false)
      }
    } catch (err) {
      toast.error(`Restore failed: ${String(err)}`)
      setRestoring(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center gap-2">
        <RotateCcw className="size-5" />
        <h1 className="text-2xl font-semibold">Restore Database</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Select Backup File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Choose a previously created backup file ( <code>.db</code> ) to restore. The
            current database will be replaced entirely.
          </p>

          <div className="space-y-1">
            <p className="text-sm font-medium">Selected File</p>
            <p className="text-muted-foreground rounded-md border px-3 py-2 text-sm">
              {selectedFile ?? (
                <span className="italic">No file selected</span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => void handleSelectFile()}>
              <Upload className="mr-2 size-4" />
              Select Backup File
            </Button>

            <Button
              variant="destructive"
              disabled={!selectedFile || restoring}
              onClick={() => setShowConfirm(true)}
            >
              {restoring ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 size-4" />
                  Restore
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current data with the contents of the selected
              backup file. This action cannot be undone. After restoration, the app
              will restart automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleRestore()}
            >
              Yes, Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default RestoreDatabase
