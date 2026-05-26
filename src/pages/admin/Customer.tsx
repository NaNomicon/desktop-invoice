import { useState, useCallback, useEffect, useMemo } from 'react';
import { query, execute } from '@/lib/db';
import type { Customer, Company } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/rbac';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Upload, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { open, save } from '@tauri-apps/plugin-dialog';

interface CustomerRow {
  id: number;
  customer_name: string;
  title_name: string | null;
  customer_type: string | null;
  contact: string | null;
  telephone: string | null;
  address: string | null;
  email: string | null;
  due_amount: number;
  ad_due: string;
  brn: string | null;
  vat: string | null;
  reg_date: string | null;
  company_id: number;
  is_deleted: number;
}

type CustomerFormData = Omit<CustomerRow, 'id' | 'is_deleted' | 'due_amount' | 'reg_date'>;

const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Dr'] as const;
const CUSTOMER_TYPE_OPTIONS = ['Individual', 'Corporate'] as const;

const emptyForm: CustomerFormData = {
  customer_name: '',
  title_name: 'Mr',
  customer_type: 'Individual',
  contact: '',
  telephone: '',
  address: '',
  email: '',
  ad_due: 'Advance',
  brn: '',
  vat: '',
  company_id: 1,
};

function Customer() {
  const authCompanyId = useAuthStore((s) => s.company_id);
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPreview, setImportPreview] = useState<{
    data: Record<string, unknown>[];
    headers: string[];
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [custRows, compRows] = await Promise.all([
      query<CustomerRow>(
        'SELECT * FROM tbl_customer WHERE is_deleted = 0 ORDER BY customer_name',
      ),
      query<Company>('SELECT id, company_name FROM tbl_company WHERE is_active = 1'),
    ]);
    setCustomers(custRows);
    setCompanies(compRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let rows = customers;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(s) ||
          (c.contact?.toLowerCase().includes(s)) ||
          (c.telephone?.toLowerCase().includes(s)) ||
          (c.address?.toLowerCase().includes(s)) ||
          (c.email?.toLowerCase().includes(s)),
      );
    }
    if (companyFilter !== 'all') {
      rows = rows.filter((c) => c.company_id === parseInt(companyFilter));
    }
    return rows;
  }, [customers, search, companyFilter]);

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        id: 'display_name',
        header: 'Customer Name',
        cell: (info) => {
          const { title_name, customer_name } = info.row.original;
          return [title_name, customer_name].filter(Boolean).join(' ');
        },
      },
      {
        accessorKey: 'customer_type',
        header: 'Customer Type',
        cell: (info) => (info.getValue() as string) ?? '-',
      },
      {
        accessorKey: 'contact',
        header: 'Contact Person',
        cell: (info) => (info.getValue() as string) ?? '-',
      },
      {
        accessorKey: 'telephone',
        header: 'Telephone',
        cell: (info) => (info.getValue() as string) ?? '-',
      },
      {
        accessorKey: 'address',
        header: 'Address',
        cell: (info) => (info.getValue() as string) ?? '-',
      },
      {
        accessorKey: 'email',
        header: 'E-Mail',
        cell: (info) => (info.getValue() as string) ?? '-',
      },
      {
        accessorKey: 'due_amount',
        header: 'Due',
        cell: (info) => {
          const cents = info.getValue<number>();
          return `$${(cents / 100).toFixed(2)}`;
        },
      },
      {
        accessorKey: 'ad_due',
        header: 'Adv/Due',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'reg_date',
        header: 'Register Date',
        cell: (info) => {
          const date = info.getValue<string>();
          if (!date) return '-';
          const d = new Date(date);
          if (isNaN(d.getTime())) return date;
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}-${mm}-${yyyy}`;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openEdit(info.row.original)}
            >
              <Pencil className="size-3.5" />
            </Button>
            {admin && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirm(info.row.original.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [admin],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, company_id: authCompanyId });
    setDialogOpen(true);
  };

  const openEdit = (c: CustomerRow) => {
    setEditingId(c.id);
    setForm({
      customer_name: c.customer_name,
      title_name: c.title_name ?? 'Mr',
      customer_type: c.customer_type ?? 'Individual',
      contact: c.contact ?? '',
      telephone: c.telephone ?? '',
      address: c.address ?? '',
      email: c.email ?? '',
      ad_due: c.ad_due,
      brn: c.brn ?? '',
      vat: c.vat ?? '',
      company_id: c.company_id,
    });
    setDialogOpen(true);
  };

  const checkDuplicate = async (name: string, excludeId?: number): Promise<boolean> => {
    const rows = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM tbl_customer WHERE LOWER(customer_name) = LOWER(?) AND is_deleted = 0 ${excludeId ? 'AND id != ?' : ''}`,
      excludeId ? [name, excludeId] : [name],
    );
    return (rows[0]?.cnt ?? 0) > 0;
  };

  const isValidEmail = (value: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSave = useCallback(async () => {
    if (!form.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    if (!form.customer_type) {
      toast.error('Customer type is required');
      return;
    }

    const trimmedEmail = form.email?.trim() ?? '';

    if (form.customer_type === 'Corporate' && trimmedEmail && !isValidEmail(trimmedEmail)) {
      toast.error('Please enter a valid email address for corporate customers');
      return;
    }

    setSaving(true);
    try {
      const isDup = await checkDuplicate(form.customer_name.trim(), editingId ?? undefined);
      if (isDup) {
        toast.error('A customer with this name already exists');
        setSaving(false);
        return;
      }

      if (editingId) {
        await execute(
          `UPDATE tbl_customer SET
            customer_name = ?, title_name = ?, customer_type = ?, contact = ?, telephone = ?, address = ?, email = ?,
            ad_due = ?, brn = ?, vat = ?, company_id = ?
           WHERE id = ?`,
          [
            form.customer_name.trim(),
            form.title_name || null,
            form.customer_type || null,
            form.contact || null,
            form.telephone || null,
            form.address || null,
            form.email || null,
            form.ad_due,
            form.brn || null,
            form.vat || null,
            form.company_id,
            editingId,
          ],
        );
        toast.success('Customer updated');
      } else {
        await execute(
          `INSERT INTO tbl_customer (customer_name, title_name, customer_type, contact, telephone, address, email, due_amount, reg_date, ad_due, brn, vat, company_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, date('now'), ?, ?, ?, ?)`,
          [
            form.customer_name.trim(),
            form.title_name || null,
            form.customer_type || null,
            form.contact || null,
            form.telephone || null,
            form.address || null,
            form.email || null,
            form.ad_due,
            form.brn || null,
            form.vat || null,
            form.company_id,
          ],
        );
        toast.success('Customer created');
      }

      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, loadData]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      const [invoiceUse, quotationUse] = await Promise.all([
        query<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM tbl_invoice_main WHERE customer_id = ? AND is_deleted = 0',
          [deleteConfirm],
        ),
        query<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM tbl_quotation_main WHERE customer_id = ? AND is_deleted = 0',
          [deleteConfirm],
        ),
      ]);
      const inInvoice = invoiceUse[0]?.cnt ?? 0;
      const inQuotation = quotationUse[0]?.cnt ?? 0;
      if (inInvoice > 0 || inQuotation > 0) {
        toast.error('This Customer In Use You Can Not Delete');
        setDeleteConfirm(null);
        return;
      }
      await execute('UPDATE tbl_customer SET is_deleted = 1 WHERE id = ?', [deleteConfirm]);
      toast.success('Customer deleted');
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      toast.error(`Delete failed: ${String(err)}`);
    }
  }, [deleteConfirm, loadData]);

  const handleImportClick = useCallback(async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'csv'] }],
        multiple: false,
      });
      if (!filePath) return;

      setImporting(true);
      const response = await fetch(`file://${filePath}`);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        toast.error('No sheets found in Excel file');
        setImporting(false);
        return;
      }
      const firstSheet = workbook.Sheets[sheetName];
      if (!firstSheet) {
        toast.error('Sheet is empty');
        setImporting(false);
        return;
      }
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[];

      if (jsonData.length < 2 || !jsonData[0]) {
        toast.error('File is empty or has no data rows');
        setImporting(false);
        return;
      }

      const headerRow = Array.isArray(jsonData[0]) ? jsonData[0] : [];
      if (headerRow.length === 0) {
        toast.error('File is empty or has no data rows');
        setImporting(false);
        return;
      }
      const headers = headerRow.map((h: unknown) => String(h ?? '').trim());
      const data = jsonData.slice(1).map((row: unknown) => {
        const cells = Array.isArray(row) ? row : [];
        const obj: Record<string, unknown> = {};
        headers.forEach((header: string, idx: number) => {
          obj[header] = cells[idx];
        });
        return obj;
      });

      setImportPreview({ data, headers });
      setImporting(false);
    } catch (err) {
      toast.error(`Import failed: ${String(err)}`);
      setImporting(false);
    }
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!importPreview) return;

    setImporting(true);
    setImportProgress(0);
    const total = importPreview.data.length;

    for (let i = 0; i < total; i++) {
      const currentRow = importPreview.data[i];
      if (!currentRow) continue;

      const titleName = String(currentRow['TITLE'] ?? currentRow['title_name'] ?? '');
      const customerName = String(currentRow['CUSTOMER NAME'] ?? currentRow['customer_name'] ?? '');
      const contact = String(currentRow['CONTACT PERSON'] ?? currentRow['contact'] ?? '');
      const address = String(currentRow['ADDRESS'] ?? currentRow['address'] ?? '');
      const telephone = String(currentRow['TELEPHONE'] ?? currentRow['telephone'] ?? '');
      const email = String(currentRow['EMAIL ADDRESS'] ?? currentRow['email'] ?? '');
      const customerType = String(currentRow['CUSTOMER TYPE'] ?? currentRow['customer_type'] ?? 'Individual');
      const brn = String(currentRow['BRN'] ?? currentRow['brn'] ?? '');
      const vat = String(currentRow['VAT'] ?? currentRow['vat'] ?? '');

      if (!customerName.trim()) continue;

      const exists = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM tbl_customer WHERE LOWER(customer_name) = LOWER(?) AND is_deleted = 0',
        [customerName.trim()],
      );
      if ((exists[0]?.cnt ?? 0) > 0) continue;

      await execute(
        `INSERT INTO tbl_customer (customer_name, title_name, customer_type, contact, telephone, address, email, due_amount, reg_date, ad_due, brn, vat, company_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, date('now'), 'Advance', ?, ?, ?)`,
        [
          customerName.trim(),
          titleName || null,
          customerType || 'Individual',
          contact || null,
          telephone || null,
          address || null,
          email || null,
          brn || null,
          vat || null,
          1,
        ],
      );

      setImportProgress(Math.round(((i + 1) / total) * 100));
    }

    toast.success('Import completed');
    setImportPreview(null);
    setImporting(false);
    setImportProgress(0);
    await loadData();
  }, [importPreview, loadData]);

  const handleExportClick = useCallback(async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: 'customers.xlsx',
      });
      if (!filePath) return;

      const exportData = filtered.map((c) => ({
        'TITLE': c.title_name ?? '',
        'CUSTOMER NAME': c.customer_name,
        'CONTACT PERSON': c.contact ?? '',
        'ADDRESS': c.address ?? '',
        'TELEPHONE': c.telephone ?? '',
        'EMAIL ADDRESS': c.email ?? '',
        'CUSTOMER TYPE': c.customer_type ?? '',
        'BRN': c.brn ?? '',
        'VAT': c.vat ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      XLSX.writeFile(wb, filePath);
      toast.success('Export completed');
    } catch (err) {
      toast.error(`Export failed: ${String(err)}`);
    }
  }, [filtered]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5" />
          <h1 className="text-2xl font-semibold">Customers</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void handleImportClick()} disabled={importing}>
            <Upload className="size-4" />
            Import
          </Button>
          <Button variant="outline" onClick={() => void handleExportClick()}>
            <Download className="size-4" />
            Export
          </Button>
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.company_name ?? `Company ${c.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="bg-muted/50">
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          className="px-4 py-2 text-left font-medium text-muted-foreground cursor-pointer select-none"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onDoubleClick={() => openEdit(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-right text-lg font-semibold tracking-tight text-muted-foreground">
            Total : {filtered.length}
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cust-title">Title</Label>
              <Select
                value={form.title_name ?? 'Mr'}
                onValueChange={(value) => setForm({ ...form, title_name: value })}
              >
                <SelectTrigger id="cust-title">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TITLE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-type">Customer Type *</Label>
              <Select
                value={form.customer_type ?? 'Individual'}
                onValueChange={(value) => setForm({ ...form, customer_type: value })}
              >
                <SelectTrigger id="cust-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="cust-name">Customer Name *</Label>
              <Input
                id="cust-name"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-contact">Contact Person</Label>
              <Input
                id="cust-contact"
                value={form.contact ?? ''}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-phone">Telephone</Label>
              <Input
                id="cust-phone"
                value={form.telephone ?? ''}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="cust-addr">Address</Label>
              <Input
                id="cust-addr"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-addue">Advance / Due</Label>
              <Select
                value={form.ad_due}
                onValueChange={(v) => setForm({ ...form, ad_due: v })}
              >
                <SelectTrigger id="cust-addue">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Advance">Advance</SelectItem>
                  <SelectItem value="Due">Due</SelectItem>
                  <SelectItem value="">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-brn">BRN</Label>
              <Input
                id="cust-brn"
                value={form.brn ?? ''}
                onChange={(e) => setForm({ ...form, brn: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-vat">VAT</Label>
              <Input
                id="cust-vat"
                value={form.vat ?? ''}
                onChange={(e) => setForm({ ...form, vat: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-comp">Company</Label>
              <Select
                value={String(form.company_id)}
                onValueChange={(v) => setForm({ ...form, company_id: parseInt(v) })}
              >
                <SelectTrigger id="cust-comp">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name ?? `Company ${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this customer? This is a soft-delete and can be reversed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview */}
      <Dialog open={importPreview !== null} onOpenChange={(o) => !o && setImportPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {importPreview?.data.length ?? 0} customers found. Confirm to import.
          </p>
          <div className="max-h-64 overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {importPreview?.headers.map((h) => (
                    <th key={h} className="px-2 py-1 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importPreview?.data.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-t">
                    {importPreview?.headers.map((h) => (
                      <td key={h} className="px-2 py-1">
                        {String(row[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(importPreview?.data.length ?? 0) > 10 && (
              <p className="p-2 text-center text-sm text-muted-foreground">
                ...and {(importPreview?.data.length ?? 0) - 10} more rows
              </p>
            )}
          </div>
          {importing && (
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Importing... {importProgress}%
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={() => void handleImportConfirm()} disabled={importing}>
              {importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Customer;
