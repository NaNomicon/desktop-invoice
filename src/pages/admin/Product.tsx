import { useState, useCallback, useEffect, useMemo } from 'react';
import { query, execute } from '@/lib/db';
import type { Company } from '@/lib/types';
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
import { Plus, Pencil, Trash2, ShoppingBag } from 'lucide-react';

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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let rows = products;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((p) => p.product_name.toLowerCase().includes(s));
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
          return `$${(cents / 100).toFixed(2)}`;
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
    setForm({
      product_name: '',
      product_id: '',
      type_id: 'none',
      company_id: authCompanyId,
      price: '',
    });
    setDialogOpen(true);
  };

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
      await execute('UPDATE tbl_product SET is_deleted = 1 WHERE id = ?', [deleteConfirm]);
      toast.success('Product deleted');
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      toast.error(`Delete failed: ${String(err)}`);
    }
  }, [deleteConfirm, loadData]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5" />
          <h1 className="text-2xl font-semibold">Products</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Add Product
        </Button>
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
              <Label htmlFor="prod-price">Price ($)</Label>
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
              <Select
                value={form.type_id}
                onValueChange={(v) => setForm({ ...form, type_id: v })}
              >
                <SelectTrigger id="prod-type">
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
    </div>
  );
}

export default ProductPage;
