import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  DatabaseZap,
  Loader2,
  Server,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_SQL_SERVER_CONFIG,
  migrateFromSqlServer,
  type MigrationProgress,
  type MigrationResult,
  type SqlServerConfig,
} from '@/services/migration'
import { cn } from '@/lib/utils'

interface MigrationFormState {
  host: string
  port: string
  instance: string
  user: string
  password: string
  database: string
}

const initialFormState: MigrationFormState = {
  ...DEFAULT_SQL_SERVER_CONFIG,
  port: String(DEFAULT_SQL_SERVER_CONFIG.port),
  instance: DEFAULT_SQL_SERVER_CONFIG.instance ?? '',
}

function buildConfig(form: MigrationFormState): SqlServerConfig {
  return {
    host: form.host.trim(),
    port: Number(form.port),
    instance: form.instance.trim() || null,
    user: form.user.trim(),
    password: form.password,
    database: form.database.trim(),
  }
}

function progressPercent(progress: MigrationProgress | null) {
  if (!progress || progress.totalRows <= 0) return 0
  return Math.min(100, Math.round((progress.rowsMigrated / progress.totalRows) * 100))
}

function MigrateDatabase() {
  const [form, setForm] = useState<MigrationFormState>(initialFormState)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const percent = progressPercent(progress)

  const updateField = (field: keyof MigrationFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const fillDockerDefaults = () => {
    setForm(initialFormState)
  }

  const fillSqlExpressDefaults = () => {
    setForm(prev => ({
      ...prev,
      host: 'localhost',
      port: '1433',
      instance: 'SQLEXPRESS',
      database: prev.database || 'XPressDB',
    }))
  }

  const handleMigrate = async () => {
    const config = buildConfig(form)
    if (!config.host || !config.user || !config.password || !config.database) {
      toast.error('Host, user, password, and database are required.')
      return
    }
    if (!Number.isInteger(config.port) || config.port <= 0 || config.port > 65535) {
      toast.error('Port must be a valid TCP port.')
      return
    }

    setMigrating(true)
    setProgress(null)
    setResult(null)
    setError(null)

    try {
      const migrationResult = await migrateFromSqlServer({
        config,
        onProgress: setProgress,
      })
      setResult(migrationResult)
      if (migrationResult.success) {
        toast.success(`Migration complete: ${migrationResult.totalRows} rows imported.`)
      } else {
        toast.error(migrationResult.error ?? 'Migration finished with errors.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast.error(`Migration failed: ${message}`)
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DatabaseZap className="size-5" />
          <h1 className="text-2xl font-semibold">Migrate from SQL Server</h1>
        </div>
        <Badge variant="outline" className="text-xs">
          SQL Server to SQLite
        </Badge>
      </div>

      <Alert>
        <Server className="size-4" />
        <AlertTitle>Before you start</AlertTitle>
        <AlertDescription>
          This imports XPress Billing data into the local SQLite database. For SQLEXPRESS,
          enable SQL Server Browser, TCP/IP, SQL authentication, and UDP 1434.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4" />
              SQL Server Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="migration-host">Host</Label>
                <Input
                  id="migration-host"
                  value={form.host}
                  disabled={migrating}
                  placeholder="127.0.0.1"
                  onChange={event => updateField('host', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="migration-port">Port</Label>
                <Input
                  id="migration-port"
                  type="number"
                  min="1"
                  max="65535"
                  value={form.port}
                  disabled={migrating}
                  placeholder="1433"
                  onChange={event => updateField('port', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="migration-instance">Instance</Label>
                <Input
                  id="migration-instance"
                  value={form.instance}
                  disabled={migrating}
                  placeholder="SQLEXPRESS or blank for Docker"
                  onChange={event => updateField('instance', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="migration-database">Database</Label>
                <Input
                  id="migration-database"
                  value={form.database}
                  disabled={migrating}
                  placeholder="XPressDB"
                  onChange={event => updateField('database', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="migration-user">User</Label>
                <Input
                  id="migration-user"
                  value={form.user}
                  disabled={migrating}
                  placeholder="sa"
                  onChange={event => updateField('user', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="migration-password">Password</Label>
                <Input
                  id="migration-password"
                  type="password"
                  value={form.password}
                  disabled={migrating}
                  placeholder="SQL Server password"
                  onChange={event => updateField('password', event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void handleMigrate()}
                disabled={migrating}
              >
                {migrating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <DatabaseZap className="mr-2 size-4" />
                    Start Migration
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={migrating}
                onClick={fillDockerDefaults}
              >
                Docker Defaults
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={migrating}
                onClick={fillSqlExpressDefaults}
              >
                SQLEXPRESS Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className={cn('size-4', migrating && 'animate-spin')} />
              Migration Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{progress?.tableName ?? 'Waiting to start'}</span>
                <span className="text-muted-foreground">{percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {progress
                  ? `${progress.rowsMigrated}/${progress.totalRows} rows - ${progress.phase}`
                  : 'Progress will appear after the migration starts.'}
              </p>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Migration failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {result ? (
              <div className="space-y-3">
                <Alert variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <AlertCircle className="size-4" />
                  )}
                  <AlertTitle>
                    {result.success ? 'Migration complete' : 'Migration completed with errors'}
                  </AlertTitle>
                  <AlertDescription>
                    Imported {result.totalRows} rows across {result.results.length} tables.
                  </AlertDescription>
                </Alert>

                <div className="max-h-72 space-y-2 overflow-auto rounded-md border p-2">
                  {result.results.map(table => (
                    <div
                      key={table.tableName}
                      className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{table.tableName}</p>
                        {table.error ? (
                          <p className="text-destructive text-xs">{table.error}</p>
                        ) : null}
                      </div>
                      <Badge variant={table.success ? 'outline' : 'destructive'}>
                        {table.success ? `${table.rowsMigrated} rows` : 'Failed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MigrateDatabase
