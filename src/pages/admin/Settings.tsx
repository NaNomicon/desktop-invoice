import { useState, useEffect, useCallback } from 'react';
import { query, execute } from '@/lib/db';
import type { Setting } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings2, Save } from 'lucide-react';

function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Setting>>({ id: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const rows = await query<Setting>('SELECT * FROM tbl_setting WHERE id = 1');
      const row = rows[0];
      if (row) {
        setSettings(row);
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
            isvat = ?, vat_per = ?, invoice_days = ?,
            cash = ?, cheque = ?, other = ?
           WHERE id = 1`,
          [
            settings.isvat ?? 0,
            settings.vat_per ?? 0,
            settings.invoice_days ?? null,
            settings.cash ?? null,
            settings.cheque ?? null,
            settings.other ?? null,
          ],
        );
      } else {
        await execute(
          `INSERT INTO tbl_setting (id, isvat, vat_per, invoice_days, cash, cheque, other)
           VALUES (1, ?, ?, ?, ?, ?, ?)`,
          [
            settings.isvat ?? 0,
            settings.vat_per ?? 0,
            settings.invoice_days ?? null,
            settings.cash ?? null,
            settings.cheque ?? null,
            settings.other ?? null,
          ],
        );
      }

      toast.success('Settings saved');
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [settings]);

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
            <div>
              <Label htmlFor="isvat" className="text-base">
                Enable VAT
              </Label>
              <p className="text-muted-foreground text-sm">
                Apply VAT percentage to invoices
              </p>
            </div>
            <Switch
              id="isvat"
              checked={isVatEnabled}
              onCheckedChange={(checked) => updateField('isvat', checked ? 1 : 0)}
            />
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
          <CardTitle>Payment Mode Defaults</CardTitle>
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
