import { useState, useCallback, useEffect, useMemo } from 'react';
import { query, execute } from '@/lib/db';
import type { WhatsAppTemplate } from '@/lib/types';
import { isAdmin } from '@/lib/rbac';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MessageSquare } from 'lucide-react';

const WA_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-orange-100 text-orange-800 border-orange-300',
    APPROVED: 'bg-green-100 text-green-800 border-green-300',
    REJECTED: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {status}
    </span>
  );
}

function WhatsAppTemplatesPage() {
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [form, setForm] = useState<{
    template_name: string;
    template_id: string;
    body: string;
    status: (typeof WA_STATUSES)[number];
  }>({
    template_name: '',
    template_id: '',
    body: '',
    status: 'PENDING',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const rows = await query<WhatsAppTemplate>(
      'SELECT * FROM tbl_wa_template ORDER BY template_name',
    );
    setTemplates(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const truncate = (text: string, max = 60) =>
    text.length > max ? text.slice(0, max) + '…' : text;

  const columns = useMemo<ColumnDef<WhatsAppTemplate>[]>(
    () => [
      {
        accessorKey: 'template_name',
        header: 'Name',
        cell: (info) => (
          <span className="font-medium">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'template_id',
        header: 'Template ID',
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'body',
        header: 'Body',
        cell: (info) => {
          const val = (info.getValue() as string) ?? '-';
          return <span className="text-muted-foreground">{truncate(val)}</span>;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(info.row.original)}
            >
              <Pencil className="size-3.5" />
            </Button>
            {admin && (
              <Button
                variant="ghost"
                size="icon"
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
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      template_name: '',
      template_id: '',
      body: '',
      status: 'PENDING',
    });
    setDialogOpen(true);
  };

  const openEdit = (t: WhatsAppTemplate) => {
    setEditingId(t.id);
    setForm({
      template_name: t.template_name,
      template_id: t.template_id,
      body: t.body ?? '',
      status: t.status as (typeof WA_STATUSES)[number],
    });
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    const name = form.template_name.trim();
    const idMeta = form.template_id.trim();

    if (!name) {
      toast.error('Template name is required');
      return;
    }
    if (!idMeta) {
      toast.error('Template ID is required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await execute(
          `UPDATE tbl_wa_template SET template_name = ?, template_id = ?, body = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
          [
            name,
            idMeta,
            form.body || null,
            form.status,
            editingId,
          ],
        );
        toast.success('Template updated');
      } else {
        const exists = await query<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM tbl_wa_template WHERE template_id = ?',
          [idMeta],
        );
        if ((exists[0]?.cnt ?? 0) > 0) {
          toast.error('A template with this Template ID already exists');
          setSaving(false);
          return;
        }
        await execute(
          `INSERT INTO tbl_wa_template (template_name, template_id, body, status) VALUES (?, ?, ?, ?)`,
          [name, idMeta, form.body || null, form.status],
        );
        toast.success('Template created');
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
      await execute('DELETE FROM tbl_wa_template WHERE id = ?', [deleteConfirm]);
      toast.success('Template deleted');
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
          <MessageSquare className="size-5" />
          <h1 className="text-2xl font-semibold">WhatsApp Templates</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Add Template
        </Button>
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
                      <td
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No templates found
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit WhatsApp Template' : 'Add WhatsApp Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label htmlFor="wa-tmpl-name">Template Name</Label>
              <Input
                id="wa-tmpl-name"
                value={form.template_name}
                onChange={(e) =>
                  setForm({ ...form, template_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="wa-tmpl-id">Template ID (from Meta)</Label>
              <Input
                id="wa-tmpl-id"
                value={form.template_id}
                onChange={(e) =>
                  setForm({ ...form, template_id: e.target.value })
                }
                disabled={!!editingId}
                placeholder="e.g. hello_world_template"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="wa-tmpl-body">Body</Label>
              <Textarea
                id="wa-tmpl-body"
                value={form.body}
                onChange={(e) =>
                  setForm({ ...form, body: e.target.value })
                }
                rows={6}
                className="resize-y font-mono text-sm"
                placeholder="Your {{1}} appointment is confirmed for {{2}}."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="wa-tmpl-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    status: v as (typeof WA_STATUSES)[number],
                  })
                }
              >
                <SelectTrigger id="wa-tmpl-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WA_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
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

      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete WhatsApp Template</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this WhatsApp template?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WhatsAppTemplatesPage;
