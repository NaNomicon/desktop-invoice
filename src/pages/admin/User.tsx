import { useState, useCallback, useEffect, useMemo } from 'react';
import { query, execute } from '@/lib/db';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { DataTablePagination } from '@/components/DataTablePagination';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserRound } from 'lucide-react';

interface UserRow {
  id: number;
  user_id: string;
  password: string;
  des: string | null;
  company_id: number;
  is_deleted: number;
}

function UserPage() {
  const currentUserId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(currentUserId);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [form, setForm] = useState({
    user_id: '',
    password: '',
    confirm_password: '',
    des: 'USER',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const userRows = await query<UserRow>('SELECT * FROM tbl_user WHERE is_deleted = 0 ORDER BY user_id');
    setUsers(userRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: 'user_id',
        header: 'User ID',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'des',
        header: 'Role',
        cell: (info) => (info.getValue() as string) ?? '-',
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
    data: users,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  
  const { getDragHandlers } = useColumnOrder(table);
  const openNew = () => {
    setEditingId(null);
    setForm({ user_id: '', password: '', confirm_password: '', des: 'USER' });
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingId(u.id);
    setForm({
      user_id: u.user_id,
      password: u.password,
      confirm_password: '',
      des: u.des ?? 'USER',
    });
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.user_id.trim()) {
      toast.error('User ID is required');
      return;
    }
    if (!form.password.trim()) {
      toast.error('Password is required');
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error('Password and confirm password do not match');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await execute(
          'UPDATE tbl_user SET user_id = ?, password = ?, des = ? WHERE id = ?',
          [form.user_id, form.password, form.des || null, editingId],
        );
        toast.success('User updated');
      } else {
        const exists = await query<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM tbl_user WHERE user_id = ?',
          [form.user_id],
        );
        if ((exists[0]?.cnt ?? 0) > 0) {
          toast.error('A user with this ID already exists');
          setSaving(false);
          return;
        }
        await execute(
          'INSERT INTO tbl_user (user_id, password, des) VALUES (?, ?, ?)',
          [form.user_id, form.password, form.des || null],
        );
        toast.success('User created');
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
      await execute('UPDATE tbl_user SET is_deleted = 1 WHERE id = ?', [deleteConfirm]);
      toast.success('User deleted');
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
          <UserRound className="size-5" />
          <h1 className="text-2xl font-semibold">Users</h1>
        </div>
        {admin && (
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Add User
          </Button>
        )}
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
                        className="px-4 py-2 text-left font-medium text-muted-foreground" {...getDragHandlers(h.column.id)}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getPrePaginationRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t hover:bg-muted/30"
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
              <DataTablePagination table={table} pagination={pagination} totalLabel="users" />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label htmlFor="user-id">User ID *</Label>
              <Input
                id="user-id"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                placeholder="ADMIN"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-pw">Password *</Label>
              <Input
                id="user-pw"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-confirm">Confirm Password *</Label>
              <Input
                id="user-confirm"
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="Confirm password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-des">Role</Label>
              <Select
                value={form.des}
                onValueChange={(value) => setForm({ ...form, des: value })}
              >
                <SelectTrigger id="user-des">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
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
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this user?</p>
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

export default UserPage;
