import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { query, execute } from '@/lib/db';
import type { Company } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/ui-store';
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
import { Plus, Pencil, Trash2, ShoppingBag, Upload, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { open, save } from '@tauri-apps/plugin-dialog';

interface ProductRow {
  id: number;
  product_id: string | null;
  product_name: string;
  type_id: number | null;
  type_name?: string | null;
  company_id: number;
  price: number;
  is_deleted: number;
}

interface TypeOption {
  id: number;
  type_name: string;
}

function ProductPage() {
  const authCompanyId = useAuthStore((s) => s.company_id);
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [form, setForm] = useState({
    product_name: '',
    product_id: '',
    type_id: 'none',
    company_id: authCompanyId,
    price: '',
  });

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPreview, setImportPreview] = useState<{
    data: Record<string, unknown>[];
    headers: string[];
  } | null>(null);

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const productAutoFill = useUIStore((s) => s.productAutoFill);
  const setProductAutoFill = useUIStore((s) => s.setProductAutoFill);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [prodRows, typeRows, compRows] = await Promise.all([
      query<ProductRow>(
        'SELECT p.*, pt.type_name FROM tbl_product p LEFT JOIN tbl_product_type pt ON p.type_id = pt.id WHERE p.is_deleted = 0 ORDER BY p.product_name',
      ),
      query<TypeOption>(
        'SELECT id, type_name FROM tbl_product_type WHERE is_deleted = 0 ORDER BY type_name',
      ),
      query<Company>('SELECT id, company_name FROM tbl_company WHERE is_active = 1'),
    ]);
    setProducts(prodRows);
    setTypeOptions(typeRows);
    setCompanies(compRows);
    setLoading(false);
  }, []);

  const openNew = useCallback(
    (targetForm?: 'invoice' | 'quotation') => {
      if (targetForm) {
        setProductAutoFill({ targetForm, productId: null, productName: '', unitPrice: 0 });
      }
      setEditingId(null);
      setForm({
        product_name: '',
        product_id: '',
        type_id: 'none',
        company_id: authCompanyId,
        price: '',
      });
      setDialogOpen(true);
    },
    [authCompanyId, setProductAutoFill],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const target = searchParams.get('newFor');
    if (target === 'invoice' || target === 'quotation') {
      const priceParam = searchParams.get('price');
      const nameParam = searchParams.get('name');
      openNew(target);
      if (priceParam) {
        setForm((f) => ({ ...f, price: priceParam, product_name: nameParam || '' }));
      }
      if (!productAutoFill) {
        setProductAutoFill({ targetForm: target, productId: null, productName: '', unitPrice: 0 });
      }
    }
  }, [openNew, productAutoFill, searchParams, setProductAutoFill]);

  const filtered = useMemo(() => {
    let rows = products;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.product_name.toLowerCase().includes(s) ||
          (p.product_id ?? '').toLowerCase().includes(s) ||
          (p.type_name ?? '').toLowerCase().includes(s) ||
          (p.price && String(p.price).includes(s)) ||
          ((p.price ?? 0) > 0 && `Rs ${(p.price / 100).toFixed(2)}`.includes(s)),
      );
    }
    if (companyFilter !== 'all') {
      rows = rows.filter((p) => p.company_id === parseInt(companyFilter));
    }
    return rows;
  }, [products, search, companyFilter]);

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: 'product_name',
        header: 'Name',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'product_id',
        header: 'Product ID',
        cell: (info) => (info.getValue() as string) ?? '-',
      },
      {
        id: 'type_name',
        header: 'Type',
        cell: (info) => info.row.original.type_name ?? '-',
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: (info) => {
          const cents = info.getValue<number>();
          return `Rs ${(cents / 100).toFixed(2)}`;
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

  const openEdit = (p: ProductRow) => {
    setEditingId(p.id);
    setForm({
      product_name: p.product_name,
      product_id: p.product_id ?? '',
      type_id: p.type_id ? String(p.type_id) : 'none',
      company_id: p.company_id,
      price: ((p.price ?? 0) / 100).toFixed(2),
    });
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.product_name.trim()) {
      toast.error('Product name is required');
      return;
    }
    const priceCents = Math.round(parseFloat(form.price || '0') * 100);
    const typeId = form.type_id === 'none' ? null : parseInt(form.type_id);

    const existing = await query<{ id: number }>(
      `SELECT id FROM tbl_product 
       WHERE product_name = ? AND type_id IS ? AND company_id = ? AND is_deleted = 0`,
      [form.product_name.trim(), typeId, form.company_id],
    );
    const isDuplicate = existing.some((p) => p.id !== editingId);
    if (isDuplicate) {
      toast.error('Product with this name and type already exists');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await execute(
          `UPDATE tbl_product SET product_name = ?, product_id = ?, type_id = ?, company_id = ?, price = ? WHERE id = ?`,
          [form.product_name.trim(), form.product_id || null, typeId, form.company_id, priceCents, editingId],
        );
        toast.success('Product updated');
      } else {
        await execute(
          `INSERT INTO tbl_product (product_name, product_id, type_id, company_id, price) VALUES (?, ?, ?, ?, ?)`,
          [form.product_name.trim(), form.product_id || null, typeId, form.company_id, priceCents],
        );
        toast.success('Product created');
        if (productAutoFill) {
          const newProduct = await query<{ id: number }>(
            'SELECT id FROM tbl_product WHERE product_name = ? AND type_id IS ? AND company_id = ? ORDER BY id DESC LIMIT 1',
            [form.product_name.trim(), typeId, form.company_id],
          );
          if (newProduct[0]) {
            setProductAutoFill({
              ...productAutoFill,
              productId: newProduct[0].id,
            });
          }
        }
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, loadData, productAutoFill, setProductAutoFill]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      const [invoiceUse, quotationUse] = await Promise.all([
        query<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM tbl_invoice_sub WHERE product_id = ?',
          [deleteConfirm],
        ),
        query<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM tbl_quotation_sub WHERE product_id = ?',
          [deleteConfirm],
        ),
      ]);
      const inInvoice = invoiceUse[0]?.cnt ?? 0;
      const inQuotation = quotationUse[0]?.cnt ?? 0;
      if (inInvoice > 0 || inQuotation > 0) {
        toast.error('Cannot delete: product is used in invoices or quotations');
        setDeleteConfirm(null);
        return;
      }
      await execute('UPDATE tbl_product SET is_deleted = 1 WHERE id = ?', [deleteConfirm]);
      toast.success('Product deleted');
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
      const headers = headerRow.map((headerCell: unknown) => String(headerCell ?? '').trim());
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
    const typeMap = new Map<string, number>();

    for (const t of typeOptions) {
      if (t) {
        typeMap.set(t.type_name.toLowerCase(), t.id);
      }
    }

    for (let i = 0; i < total; i++) {
      const currentRow = importPreview.data[i];
      if (!currentRow) continue;
      const productName = String(currentRow['Product Name'] ?? currentRow['product_name'] ?? '');
      const productId = String(currentRow['Product ID'] ?? currentRow['product_id'] ?? '');
      const typeName = String(currentRow['Type Name'] ?? currentRow['type_name'] ?? '');
      const priceStr = String(currentRow['Price'] ?? currentRow['price'] ?? '0');
      const priceCents = Math.round(parseFloat(priceStr) || 0) * 100;

      let typeId: number | null = null;
      if (typeName) {
        const lowerName = typeName.toLowerCase();
        if (typeMap.has(lowerName)) {
          typeId = typeMap.get(lowerName) ?? null;
        } else {
          await execute(
            'INSERT INTO tbl_product_type (type_name) VALUES (?)',
            [typeName],
          );
          const newType = await query<{ id: number }>(
            'SELECT id FROM tbl_product_type WHERE type_name = ?',
            [typeName],
          );
          if (newType[0]) {
            typeId = newType[0].id;
            typeMap.set(lowerName, typeId);
          }
        }
      }

      if (productName) {
        const existingId = currentRow['id'] ?? currentRow['ID'] ?? currentRow['Unique ID'] ?? currentRow['unique_id'];
        if (existingId) {
          await execute(
            `UPDATE tbl_product SET product_name = ?, product_id = ?, type_id = ?, price = ? WHERE id = ?`,
            [productName, productId || null, typeId, priceCents, Number(existingId)],
          );
        } else {
          await execute(
            `INSERT INTO tbl_product (product_name, product_id, type_id, company_id, price) VALUES (?, ?, ?, ?, ?)`,
            [productName, productId || null, typeId, authCompanyId, priceCents],
          );
        }
      }

      setImportProgress(Math.round(((i + 1) / total) * 100));
    }

    toast.success('Import completed');
    setImportPreview(null);
    setImporting(false);
    setImportProgress(0);
    await loadData();
  }, [importPreview, typeOptions, authCompanyId, loadData]);

  const handleExportClick = useCallback(async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: 'products.xlsx',
      });
      if (!filePath) return;

      const exportData = products.map((p) => ({
        'Product ID': p.product_id ?? '',
        'Product Name': p.product_name,
        'Type Name': p.type_name ?? '',
        'Price': (p.price ?? 0) / 100,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, filePath);
      toast.success('Export completed');
    } catch (err) {
      toast.error(`Export failed: ${String(err)}`);
    }
  }, [products]);

  const handleQuickAddType = useCallback(async () => {
    if (!newTypeName.trim()) {
      toast.error('Type name is required');
      return;
    }
    try {
      await execute('INSERT INTO tbl_product_type (type_name) VALUES (?)', [
        newTypeName.trim(),
      ]);
      const newTypes = await query<TypeOption>(
        'SELECT id, type_name FROM tbl_product_type WHERE is_deleted = 0 ORDER BY type_name',
      );
      setTypeOptions(newTypes);
      setNewTypeName('');
      setTypeDialogOpen(false);
      toast.success('Product type created');
    } catch (err) {
      toast.error(`Failed to add type: ${String(err)}`);
    }
  }, [newTypeName]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5" />
          <h1 className="text-2xl font-semibold">Products</h1>
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
          <Button onClick={() => openNew()}>
            <Plus className="size-4" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search products..."
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
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-muted/30">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="prod-name">Product Name *</Label>
              <Input
                id="prod-name"
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-id">Product ID</Label>
              <Input
                id="prod-id"
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-price">Price (Rs)</Label>
              <Input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-type">Product Type</Label>
              <div className="flex gap-2">
                <Select
                  value={form.type_id}
                  onValueChange={(v) => setForm({ ...form, type_id: v })}
                >
                  <SelectTrigger id="prod-type" className="flex-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {typeOptions.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTypeDialogOpen(true)}
                  title="Add new product type"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-comp">Company</Label>
              <Select
                value={String(form.company_id)}
                onValueChange={(v) => setForm({ ...form, company_id: parseInt(v) })}
              >
                <SelectTrigger id="prod-comp">
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

      <Dialog open={deleteConfirm !== null} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this product?</p>
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

      <Dialog open={importPreview !== null} onOpenChange={(o) => !o && setImportPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {importPreview?.data.length ?? 0} products found. Confirm to import.
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

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="type-name">Type Name *</Label>
            <Input
              id="type-name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleQuickAddType()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleQuickAddType()}>
              Add Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductPage;
