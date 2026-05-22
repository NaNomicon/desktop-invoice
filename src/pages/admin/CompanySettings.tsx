import { useState, useEffect, useCallback, useRef } from 'react';
import { query, execute } from '@/lib/db';
import type { Company } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Upload, X, Save } from 'lucide-react';

function CompanySettings() {
  const [company, setCompany] = useState<Partial<Company>>({ id: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const watermarkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const rows = await query<Company>('SELECT * FROM tbl_company WHERE id = 1');
      const c = rows[0];
      if (c) {
        setCompany(c);
        setLogoPreview(c.logo ?? null);
        setWatermarkPreview(c.watermark ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await readFileAsBase64(file);
      setLogoPreview(b64);
      setCompany((prev) => ({ ...prev, logo: b64 }));
    } catch {
      toast.error('Failed to read logo file');
    }
  }, []);

  const handleWatermarkUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await readFileAsBase64(file);
      setWatermarkPreview(b64);
      setCompany((prev) => ({ ...prev, watermark: b64 }));
    } catch {
      toast.error('Failed to read watermark file');
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const exists = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM tbl_company WHERE id = 1',
      );

      const cntRow = exists[0];
      if (cntRow && cntRow.cnt > 0) {
        await execute(
          `UPDATE tbl_company SET
            company_name = ?, contact_person = ?, address = ?, telephone = ?,
            email = ?, brn = ?, vat = ?, bank_name = ?, bank_account = ?,
            bank_branch = ?, logo = ?, watermark = ?
           WHERE id = 1`,
          [
            company.company_name ?? null,
            company.contact_person ?? null,
            company.address ?? null,
            company.telephone ?? null,
            company.email ?? null,
            company.brn ?? null,
            company.vat ?? null,
            company.bank_name ?? null,
            company.bank_account ?? null,
            company.bank_branch ?? null,
            company.logo ?? null,
            company.watermark ?? null,
          ],
        );
      } else {
        await execute(
          `INSERT INTO tbl_company (id, company_name, contact_person, address, telephone, email, brn, vat, bank_name, bank_account, bank_branch, logo, watermark)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            company.company_name ?? null,
            company.contact_person ?? null,
            company.address ?? null,
            company.telephone ?? null,
            company.email ?? null,
            company.brn ?? null,
            company.vat ?? null,
            company.bank_name ?? null,
            company.bank_account ?? null,
            company.bank_branch ?? null,
            company.logo ?? null,
            company.watermark ?? null,
          ],
        );
      }

      toast.success('Company settings saved');
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [company]);

  const updateField = (field: keyof Company, value: string) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="size-5" />
          <h1 className="text-2xl font-semibold">Company Settings</h1>
        </div>
        <Button onClick={() => void handleSave()} disabled={saving}>
          <Save className="size-4" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={company.company_name ?? ''}
              onChange={(e) => updateField('company_name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              value={company.contact_person ?? ''}
              onChange={(e) => updateField('contact_person', e.target.value)}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={company.address ?? ''}
              onChange={(e) => updateField('address', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telephone">Telephone</Label>
            <Input
              id="telephone"
              value={company.telephone ?? ''}
              onChange={(e) => updateField('telephone', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={company.email ?? ''}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="brn">BRN</Label>
            <Input
              id="brn"
              value={company.brn ?? ''}
              onChange={(e) => updateField('brn', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vat">VAT Number</Label>
            <Input
              id="vat"
              value={company.vat ?? ''}
              onChange={(e) => updateField('vat', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input
              id="bank_name"
              value={company.bank_name ?? ''}
              onChange={(e) => updateField('bank_name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank_account">Bank Account</Label>
            <Input
              id="bank_account"
              value={company.bank_account ?? ''}
              onChange={(e) => updateField('bank_account', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank_branch">Bank Branch</Label>
            <Input
              id="bank_branch"
              value={company.bank_branch ?? ''}
              onChange={(e) => updateField('bank_branch', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

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
                    setLogoPreview(null);
                    setCompany((prev) => ({ ...prev, logo: null }));
                    if (logoRef.current) logoRef.current.value = '';
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex h-32 w-64 items-center justify-center rounded border border-dashed text-muted-foreground text-sm">
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
              <p className="mt-1 text-muted-foreground text-xs">
                tmp_logo.jpg
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    setWatermarkPreview(null);
                    setCompany((prev) => ({ ...prev, watermark: null }));
                    if (watermarkRef.current) watermarkRef.current.value = '';
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex h-32 w-64 items-center justify-center rounded border border-dashed text-muted-foreground text-sm">
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
              <p className="mt-1 text-muted-foreground text-xs">
                tmp_watermark.jpg
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CompanySettings;
