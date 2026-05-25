import { useState, useCallback, useEffect, useMemo } from 'react';
import { query, execute } from '@/lib/db';
import type { ProductType } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/rbac';
import { Card, CardContent } from '@/components/ui/card';
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
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';

function ProductTypePage() {
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);

  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [typeName, setTypeName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const searchPattern = search.trim() ? `%${search.trim()}%` : '%';
    const rows = await query<ProductType>(
      'SELECT * FROM tbl_product_type WHERE is_deleted = 0 AND type_name LIKE ? ORDER BY type_name',
      [searchPattern],
    );
    setTypes(rows);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const openEdit = useCallback((row: ProductType) => {
    setEditingId(row.id);
    setTypeName(row.type_name);
    setDialogOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<ProductType>[]>(
    () => [
      {
        accessorKey: 'type_name',
        header: 'Product Type',
        cell: (info) => info.getValue<string>(),
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditingId(info.row.original.id);
                setTypeName(info.row.original.type_name);
                setDialogOpen(true);
              }}
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
    data: types,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const openNew = () => {
    setEditingId(null);
    setTypeName('');
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!typeName.trim()) {
      toast.error('Type name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await execute('UPDATE tbl_product_type SET type_name = ? WHERE id = ?', [
          typeName.trim(),
          editingId,
        ]);
        toast.success('Product type updated');
      } else {
        await execute('INSERT INTO tbl_product_type (type_name) VALUES (?)', [
          typeName.trim(),
        ]);
        toast.success('Product type created');
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [typeName, editingId, loadData]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const products = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM tbl_product WHERE type_id = ? AND is_deleted = 0',
        [deleteConfirm],
      );
      if ((products[0]?.cnt ?? 0) > 0) {
        toast.error('Cannot delete: products exist for this type');
        setDeleteConfirm(null);
        setSaving(false);
        return;
      }
      await execute('UPDATE tbl_product_type SET is_deleted = 1 WHERE id = ?', [
        deleteConfirm,
      ]);
      toast.success('Product type deleted');
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      toast.error(`Delete failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [deleteConfirm, loadData]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-5" />
          <h1 className="text-2xl font-semibold">Product Type</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search product type..."
              value={search}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Add Type
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    {table.getHeaderGroups()[0]?.headers.map((h) => (
                      <th
                        key={h.id}
                        className="px-4 py-2 text-left font-medium text-muted-foreground"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-muted-foreground">
                        No product types found
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
            Total : {types.length}
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product Type' : 'Add Product Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="type-name">Type Name *</Label>
            <Input
              id="type-name"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
            />
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
            <DialogTitle>Delete Product Type</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this product type?</p>
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

export default ProductTypePage;
