import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { query, execute } from '@/lib/db'
import type { Company } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Building2, Plus, Upload, X, Save } from 'lucide-react'

interface TableColumnInfo {
  name: string
}

const DEFAULT_COMPANY: Partial<Company> = {
  company_name: '',
  company_short_name: '',
  company_code: '',
  address: '',
  city: '',
  telephone: '',
  email: '',
  facebook_url: '',
  brn: '',
  vat: '',
  note1: '',
  note2: '',
  note3: '',
  thanks1: '',
  thanks2: '',
  currency: '',
  logo: null,
  watermark: null,
  is_active: 1,
  contact_person: '',
  bank_name: '',
  bank_account: '',
  bank_branch: '',
}

const TEXT_FIELDS: (keyof Company)[] = [
  'company_name',
  'company_short_name',
  'company_code',
  'address',
  'city',
  'telephone',
  'email',
  'facebook_url',
  'brn',
  'vat',
  'note1',
  'note2',
  'note3',
  'thanks1',
  'thanks2',
  'currency',
  'contact_person',
  'bank_name',
  'bank_account',
  'bank_branch',
]

function CompanySettings() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [company, setCompany] = useState<Partial<Company>>({ ...DEFAULT_COMPANY })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [availableColumns, setAvailableColumns] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const watermarkRef = useRef<HTMLInputElement>(null)

  const hasColumn = useCallback(
    (column: string) => availableColumns.has(column),
    [availableColumns],
  )

  const visibleInfoFields = useMemo(
    () => [
      { key: 'company_name' as const, label: 'Company Name', required: true },
      { key: 'company_short_name' as const, label: 'Short Name' },
      { key: 'company_code' as const, label: 'Company Code', required: true },
      { key: 'contact_person' as const, label: 'Contact Person' },
      { key: 'telephone' as const, label: 'Telephone' },
      { key: 'email' as const, label: 'Email', type: 'email' as const },
      { key: 'city' as const, label: 'City' },
      { key: 'facebook_url' as const, label: 'Facebook URL' },
      { key: 'brn' as const, label: 'BRN' },
      { key: 'vat' as const, label: 'VAT Number' },
      { key: 'currency' as const, label: 'Currency' },
      { key: 'bank_name' as const, label: 'Bank Name' },
      { key: 'bank_account' as const, label: 'Bank Account' },
      { key: 'bank_branch' as const, label: 'Bank Branch' },
    ].filter((field) => hasColumn(field.key)),
    [hasColumn],
  )

  const resetForm = useCallback(() => {
    setSelectedId(null)
    setCompany({ ...DEFAULT_COMPANY })
    setLogoPreview(null)
    setWatermarkPreview(null)
    if (logoRef.current) logoRef.current.value = ''
    if (watermarkRef.current) watermarkRef.current.value = ''
  }, [])

  const hydrateCompany = useCallback((input?: Partial<Company>) => {
    const next = { ...DEFAULT_COMPANY, ...input }
    setCompany(next)
    setSelectedId(next.id ?? null)
    setLogoPreview(next.logo ?? null)
    setWatermarkPreview(next.watermark ?? null)
    if (logoRef.current) logoRef.current.value = ''
    if (watermarkRef.current) watermarkRef.current.value = ''
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [columnRows, companyRows] = await Promise.all([
        query<TableColumnInfo>("PRAGMA table_info('tbl_company')"),
        query<Company>('SELECT * FROM tbl_company ORDER BY COALESCE(company_code, company_name, id)'),
      ])

      const columns = new Set(columnRows.map((row) => row.name))
      setAvailableColumns(columns)
      setCompanies(companyRows)

      if (selectedId) {
        const current = companyRows.find((row) => row.id === selectedId)
        if (current) {
          hydrateCompany(current)
        } else if (companyRows[0]) {
          hydrateCompany(companyRows[0])
        } else {
          resetForm()
        }
      } else if (companyRows[0]) {
        hydrateCompany(companyRows[0])
      } else {
        resetForm()
      }
    } catch (err) {
      toast.error(`Failed to load company settings: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [hydrateCompany, resetForm, selectedId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const b64 = await readFileAsBase64(file)
        setLogoPreview(b64)
        setCompany((prev) => ({ ...prev, logo: b64 }))
      } catch {
        toast.error('Failed to read logo file')
      }
    },
    [],
  )

  const handleWatermarkUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const b64 = await readFileAsBase64(file)
        setWatermarkPreview(b64)
        setCompany((prev) => ({ ...prev, watermark: b64 }))
      } catch {
        toast.error('Failed to read watermark file')
      }
    },
    [],
  )

  const updateField = (field: keyof Company, value: string | number | null) => {
    setCompany((prev) => ({ ...prev, [field]: value }))
  }

  const buildPayload = useCallback(() => {
    const payload: Record<string, string | number | null> = {}

    for (const field of TEXT_FIELDS) {
      if (hasColumn(field)) {
        payload[field] = company[field] ?? null
      }
    }

    if (hasColumn('is_active')) {
      payload.is_active = company.is_active === 0 ? 0 : 1
    }
    if (hasColumn('logo')) {
      payload.logo = company.logo ?? null
    }
    if (hasColumn('watermark')) {
      payload.watermark = company.watermark ?? null
    }

    return payload
  }, [company, hasColumn])

  const handleSave = useCallback(async () => {
    const companyName = company.company_name?.trim() ?? ''
    const companyCode = company.company_code?.trim() ?? ''

    if (!companyName) {
      toast.error('Company name is required')
      return
    }

    if (hasColumn('company_code') && !companyCode) {
      toast.error('Company code is required')
      return
    }

    if (hasColumn('company_code')) {
      const duplicateRows = await query<{ id: number }>(
        'SELECT id FROM tbl_company WHERE company_code = ? AND id != COALESCE(?, -1) LIMIT 1',
        [companyCode, company.id ?? null],
      )
      if (duplicateRows[0]) {
        toast.error('Company code already exists')
        return
      }
    }

    const payload = buildPayload()
    const columns = Object.keys(payload)
    const values = columns.map((column) => payload[column])

    setSaving(true)
    try {
      if (company.id) {
        const assignments = columns.map((column) => `${column} = ?`).join(', ')
        await execute(
          `UPDATE tbl_company SET ${assignments} WHERE id = ?`,
          [...values, company.id],
        )
        toast.success('Company settings updated')
      } else {
        const placeholders = columns.map(() => '?').join(', ')
        await execute(
          `INSERT INTO tbl_company (${columns.join(', ')}) VALUES (${placeholders})`,
          values,
        )
        toast.success('Company created')
      }

      await loadData()
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }, [buildPayload, company, hasColumn, loadData])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-5" />
          <h1 className="text-2xl font-semibold">Company Settings</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm}>
            <Plus className="size-4" />
            New Company
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Save className="size-4" />
            {saving ? 'Saving...' : company.id ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No companies found yet. Create the first company profile below.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Company</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Short Name</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((item) => (
                    <tr
                      key={item.id}
                      className={`cursor-pointer border-t hover:bg-muted/30 ${selectedId === item.id ? 'bg-muted/40' : ''}`}
                      onClick={() => hydrateCompany(item)}
                    >
                      <td className="px-4 py-2">{item.company_code ?? '-'}</td>
                      <td className="px-4 py-2 font-medium">{item.company_name ?? `Company ${item.id}`}</td>
                      <td className="px-4 py-2">{item.company_short_name ?? '-'}</td>
                      <td className="px-4 py-2">{item.is_active === 0 ? 'Inactive' : 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleInfoFields.map((field) => (
            <div
              key={field.key}
              className={field.key === 'company_name' ? 'space-y-1 md:col-span-2' : 'space-y-1'}
            >
              <Label htmlFor={field.key}>{field.label}{field.required ? ' *' : ''}</Label>
              <Input
                id={field.key}
                type={field.type ?? 'text'}
                value={String(company[field.key] ?? '')}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            </div>
          ))}

          {hasColumn('address') && (
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={String(company.address ?? '')}
                onChange={(e) => updateField('address', e.target.value)}
                rows={3}
              />
            </div>
          )}

          {hasColumn('is_active') && (
            <div className="flex items-center gap-3 rounded-md border p-3 md:col-span-2">
              <Checkbox
                id="is_active"
                checked={company.is_active !== 0}
                onCheckedChange={(checked) => updateField('is_active', checked ? 1 : 0)}
              />
              <div>
                <Label htmlFor="is_active">Active company</Label>
                <p className="text-sm text-muted-foreground">Inactive companies stay in the database but are hidden from active selectors.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(hasColumn('note1') || hasColumn('note2') || hasColumn('note3') || hasColumn('thanks1') || hasColumn('thanks2')) && (
        <Card>
          <CardHeader>
            <CardTitle>Footer & Thanks Text</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {hasColumn('note1') && (
              <div className="space-y-1">
                <Label htmlFor="note1">Note 1</Label>
                <Textarea id="note1" value={String(company.note1 ?? '')} onChange={(e) => updateField('note1', e.target.value)} rows={2} />
              </div>
            )}
            {hasColumn('note2') && (
              <div className="space-y-1">
                <Label htmlFor="note2">Note 2</Label>
                <Textarea id="note2" value={String(company.note2 ?? '')} onChange={(e) => updateField('note2', e.target.value)} rows={2} />
              </div>
            )}
            {hasColumn('note3') && (
              <div className="space-y-1">
                <Label htmlFor="note3">Note 3</Label>
                <Textarea id="note3" value={String(company.note3 ?? '')} onChange={(e) => updateField('note3', e.target.value)} rows={2} />
              </div>
            )}
            {hasColumn('thanks1') && (
              <div className="space-y-1">
                <Label htmlFor="thanks1">Thanks 1</Label>
                <Textarea id="thanks1" value={String(company.thanks1 ?? '')} onChange={(e) => updateField('thanks1', e.target.value)} rows={2} />
              </div>
            )}
            {hasColumn('thanks2') && (
              <div className="space-y-1">
                <Label htmlFor="thanks2">Thanks 2</Label>
                <Textarea id="thanks2" value={String(company.thanks2 ?? '')} onChange={(e) => updateField('thanks2', e.target.value)} rows={2} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasColumn('logo') && (
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Company logo"
                    className="max-h-32 max-w-64 rounded border object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-white hover:bg-destructive/80"
                    onClick={() => {
                      setLogoPreview(null)
                      setCompany((prev) => ({ ...prev, logo: null }))
                      if (logoRef.current) logoRef.current.value = ''
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex h-32 w-64 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
                  No logo
                </div>
              )}
              <div>
                <input
                  ref={logoRef}
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleLogoUpload(e)}
                />
                <Button variant="outline" onClick={() => logoRef.current?.click()}>
                  <Upload className="size-4" />
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasColumn('watermark') && (
        <Card>
          <CardHeader>
            <CardTitle>Watermark</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {watermarkPreview ? (
                <div className="relative">
                  <img
                    src={watermarkPreview}
                    alt="Watermark"
                    className="max-h-32 max-w-64 rounded border object-contain opacity-40"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-white hover:bg-destructive/80"
                    onClick={() => {
                      setWatermarkPreview(null)
                      setCompany((prev) => ({ ...prev, watermark: null }))
                      if (watermarkRef.current) watermarkRef.current.value = ''
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex h-32 w-64 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
                  No watermark
                </div>
              )}
              <div>
                <input
                  ref={watermarkRef}
                  id="watermark-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleWatermarkUpload(e)}
                />
                <Button variant="outline" onClick={() => watermarkRef.current?.click()}>
                  <Upload className="size-4" />
                  {watermarkPreview ? 'Change Watermark' : 'Upload Watermark'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CompanySettings
