import { useState, useEffect, useCallback, useRef } from 'react';
import { query, execute } from '@/lib/db';
import type { Setting, NumberSequence } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';
import { Settings2, Save, FolderOpen, Upload, X, Check, XCircle } from 'lucide-react';

function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Setting>>({ id: 1 });
  const [numbers, setNumbers] = useState<Partial<NumberSequence>>({ id: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [settingRows, numberRows] = await Promise.all([
        query<Setting>('SELECT * FROM tbl_setting WHERE id = 1'),
        query<NumberSequence>('SELECT * FROM tbl_numbers WHERE id = 1'),
      ]);
      const setting = settingRows[0];
      if (setting) {
        setSettings(setting);
        if (setting.back_path) {
          setBgPreview(setting.back_path);
        }
      }
      const numberSeq = numberRows[0];
      if (numberSeq) {
        setNumbers(numberSeq);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const exists = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM tbl_setting WHERE id = 1',
      );

      const existsCnt = exists[0];
        if (existsCnt && existsCnt.cnt > 0) {
          await execute(
            `UPDATE tbl_setting SET
              isvat = ?, vat_per = ?, invoice_path = ?, quo_path = ?, report_path = ?, invoice_days = ?,
              back_path = ?, backup_path = ?, cash = ?, cheque = ?, other = ?
             WHERE id = 1`,
            [
              settings.isvat ?? 0,
              settings.vat_per ?? 0,
              settings.invoice_path ?? null,
              settings.quo_path ?? null,
              settings.report_path ?? null,
              settings.invoice_days ?? null,
              settings.back_path ?? null,
              settings.backup_path ?? null,
              settings.cash ?? null,
              settings.cheque ?? null,
              settings.other ?? null,
            ],
          );
        } else {
          await execute(
            `INSERT INTO tbl_setting (id, isvat, vat_per, invoice_path, quo_path, report_path, invoice_days, back_path, backup_path, cash, cheque, other)
             VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              settings.isvat ?? 0,
              settings.vat_per ?? 0,
              settings.invoice_path ?? null,
              settings.quo_path ?? null,
              settings.report_path ?? null,
              settings.invoice_days ?? null,
              settings.back_path ?? null,
              settings.backup_path ?? null,
              settings.cash ?? null,
              settings.cheque ?? null,
              settings.other ?? null,
            ],
          );
        }

      // Save number sequences
      const numExists = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM tbl_numbers WHERE id = 1',
      );
      const numExistsResult = numExists[0];
      if (numExistsResult && numExistsResult.cnt > 0) {
        await execute(
          `UPDATE tbl_numbers SET invoice_no = ?, quo_no = ? WHERE id = 1`,
          [numbers.invoice_no ?? 1, numbers.quo_no ?? 1],
        );
      } else {
        await execute(
          `INSERT INTO tbl_numbers (id, invoice_no, quo_no, receipt_no) VALUES (1, ?, ?, 1)`,
          [numbers.invoice_no ?? 1, numbers.quo_no ?? 1],
        );
      }

      toast.success('Settings saved');
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [settings, numbers]);

  const handleBrowsePath = useCallback(async (field: keyof Setting) => {
    const result = await open({ directory: true, title: 'Select folder' });
    if (result && typeof result === 'string') {
      updateField(field, result);
    }
  }, []);

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleBgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await readFileAsBase64(file);
      setBgPreview(b64);
      updateField('back_path', b64);
    } catch {
      toast.error('Failed to read image file');
    }
  }, []);

  const updateField = (field: keyof Setting, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isVatEnabled = settings.isvat === 1;

  const handleBgRemove = useCallback(() => {
    setBgPreview(null);
    updateField('back_path', '');
    if (bgInputRef.current) bgInputRef.current.value = '';
  }, []);

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="size-5" />
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        <Button onClick={() => void handleSave()} disabled={saving}>
          <Save className="size-4" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax & Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-3">
              <div>
                <Label htmlFor="isvat" className="text-base">
                  Enable VAT
                </Label>
                <p className="text-muted-foreground text-sm">
                  Apply VAT percentage to invoices
                </p>
              </div>
              {isVatEnabled ? (
                <Check className="size-5 text-green-600" />
              ) : (
                <XCircle className="size-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  isVatEnabled ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {isVatEnabled ? 'Active' : 'Deactive'}
              </span>
              <Switch
                id="isvat"
                checked={isVatEnabled}
                onCheckedChange={(checked) => updateField('isvat', checked ? 1 : 0)}
              />
            </div>
          </div>

          {isVatEnabled && (
            <div className="space-y-1">
              <Label htmlFor="vat-per">VAT Percentage</Label>
              <Input
                id="vat-per"
                type="number"
                min="0"
                max="100"
                value={typeof settings.vat_per === 'number' ? settings.vat_per : ''}
                onChange={(e) =>
                  updateField('vat_per', parseInt(e.target.value) || 0)
                }
              />
              <p className="text-muted-foreground text-xs">
                Stored as integer (e.g., 5 = 5%)
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="invoice-days">Invoice Edit Lock (days)</Label>
            <Input
              id="invoice-days"
              value={settings.invoice_days ?? ''}
              onChange={(e) => updateField('invoice_days', e.target.value)}
              placeholder="e.g., 7"
            />
            <p className="text-muted-foreground text-xs">
              Number of days after which invoices cannot be edited
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Number Sequences</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="invoice-no">Next Invoice No</Label>
            <Input
              id="invoice-no"
              type="number"
              min="1"
              value={numbers.invoice_no ?? 1}
              onChange={(e) =>
                setNumbers((prev) => ({ ...prev, invoice_no: parseInt(e.target.value) || 1 }))
              }
            />
            <p className="text-muted-foreground text-xs">
              Next invoice number to assign
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="quo-no">Next Quotation No</Label>
            <Input
              id="quo-no"
              type="number"
              min="1"
              value={numbers.quo_no ?? 1}
              onChange={(e) =>
                setNumbers((prev) => ({ ...prev, quo_no: parseInt(e.target.value) || 1 }))
              }
            />
            <p className="text-muted-foreground text-xs">
              Next quotation number to assign
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document & Backup Paths</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="invoice-path">Invoice Path</Label>
            <div className="flex gap-2">
              <Input
                id="invoice-path"
                value={settings.invoice_path ?? ''}
                onChange={(e) => updateField('invoice_path', e.target.value)}
                placeholder="/path/to/invoices"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => void handleBrowsePath('invoice_path')}
                title="Browse folder"
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="quotation-path">Quotation Path</Label>
            <div className="flex gap-2">
              <Input
                id="quotation-path"
                value={settings.quo_path ?? ''}
                onChange={(e) => updateField('quo_path', e.target.value)}
                placeholder="/path/to/quotations"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => void handleBrowsePath('quo_path')}
                title="Browse folder"
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-path">Report Path</Label>
            <div className="flex gap-2">
              <Input
                id="report-path"
                value={settings.report_path ?? ''}
                onChange={(e) => updateField('report_path', e.target.value)}
                placeholder="/path/to/reports"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => void handleBrowsePath('report_path')}
                title="Browse folder"
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="backup-path">Backup Path</Label>
            <div className="flex gap-2">
              <Input
                id="backup-path"
                value={settings.backup_path ?? ''}
                onChange={(e) => updateField('backup_path', e.target.value)}
                placeholder="/path/to/backups"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => void handleBrowsePath('backup_path')}
                title="Browse folder"
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>HOME Background Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Upload an image to display as the HOME page background.
          </p>
          <div className="flex items-start gap-4">
            {bgPreview ? (
              <div className="relative">
                <img
                  src={bgPreview}
                  alt="Background preview"
                  className="max-h-32 max-w-64 rounded border object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-white hover:bg-destructive/80"
                  onClick={handleBgRemove}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex h-32 w-64 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
                No image
              </div>
            )}
            <div>
              <input
                ref={bgInputRef}
                id="bg-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleBgUpload(e)}
              />
              <Button variant="outline" onClick={() => bgInputRef.current?.click()}>
                <Upload className="size-4" />
                {bgPreview ? 'Change Image' : 'Upload Image'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Labels</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="cash-label">Cash Label</Label>
            <Input
              id="cash-label"
              value={settings.cash ?? ''}
              onChange={(e) => updateField('cash', e.target.value)}
              placeholder="Cash"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cheque-label">Cheque Label</Label>
            <Input
              id="cheque-label"
              value={settings.cheque ?? ''}
              onChange={(e) => updateField('cheque', e.target.value)}
              placeholder="Cheque"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="other-label">Other Label</Label>
            <Input
              id="other-label"
              value={settings.other ?? ''}
              onChange={(e) => updateField('other', e.target.value)}
              placeholder="Other"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;
