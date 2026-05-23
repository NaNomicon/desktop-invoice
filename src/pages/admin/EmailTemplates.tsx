import { useState, useCallback, useEffect, useMemo } from 'react';
import { query, execute } from '@/lib/db';
import type { EmailTemplate } from '@/lib/types';
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
import { Plus, Pencil, Trash2, Mail } from 'lucide-react';

const TEMPLATE_TYPES = ['INVOICE', 'QUOTATION', 'STATEMENT', 'RECEIPT'] as const;

interface PlaceholderBadgeProps {
  label: string;
  onClick: () => void;
}

function PlaceholderBadge({ label, onClick }: PlaceholderBadgeProps) {
  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center rounded-full border bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted/80"
      onClick={onClick}
    >
      {`<${label}>`}
    </button>
  );
}

function EmailTemplatesPage() {
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [subjectRef, setSubjectRef] = useState<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [bodyRef, setBodyRef] = useState<HTMLTextAreaElement | null>(null);

  const [form, setForm] = useState<{
    template_type: typeof TEMPLATE_TYPES[number];
    subject: string;
    body: string;
    sender_email: string;
    sender_pass: string;
    sub_subject: string;
  }>({
    template_type: TEMPLATE_TYPES[0],
    subject: '',
    body: '',
    sender_email: '',
    sender_pass: '',
    sub_subject: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
      const rows = await query<EmailTemplate>(
        'SELECT *, COALESCE(template_type, identify) AS template_type FROM tbl_email ORDER BY COALESCE(template_type, identify)',
      );

    setTemplates(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const insertPlaceholder = (
    placeholder: string,
    target: 'subject' | 'body',
  ) => {
    const el = target === 'subject' ? subjectRef : bodyRef;
    if (!el) {
      setForm((prev) => ({
        ...prev,
        [target]: prev[target] + `<${placeholder}>`,
      }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newVal =
      el.value.slice(0, start) + `<${placeholder}>` + el.value.slice(end);
    setForm((prev) => ({ ...prev, [target]: newVal }));
    el.focus();
    const pos = start + placeholder.length + 2;
    requestAnimationFrame(() => el.setSelectionRange(pos, pos));
  };

  const replacePlaceholders = (text: string): string => {
    return text;
  };

  const columns = useMemo<ColumnDef<EmailTemplate>[]>(
    () => [
      {
        accessorKey: 'template_type',
        header: 'Type',
        cell: (info) => (
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: (info) => (info.getValue() as string) ?? '-',
      },
      {
        accessorKey: 'sender_email',
        header: 'Sender',
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
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      template_type: TEMPLATE_TYPES[0],
      subject: '',
      body: '',
      sender_email: '',
      sender_pass: '',
      sub_subject: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditingId(t.id);
    setForm({
      template_type: (t.template_type ?? t.identify ?? TEMPLATE_TYPES[0]) as typeof TEMPLATE_TYPES[number],
      subject: t.subject ?? '',
      body: t.body ?? '',
      sender_email: t.sender_email ?? '',
      sender_pass: t.sender_pass ?? '',
      sub_subject: t.sub_subject ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.template_type.trim()) {
      toast.error('Template type is required');
      return;
    }

    const normalizedSubject = replacePlaceholders(form.subject);
    const normalizedBody = replacePlaceholders(form.body);

    setSaving(true);
    try {
      if (editingId) {
        await execute(
          `UPDATE tbl_email SET template_type = ?, identify = ?, subject = ?, body = ?, sender_email = ?, sender_pass = ?, sub_subject = ? WHERE id = ?`,
          [
            form.template_type,
            form.template_type,
            normalizedSubject || null,
            normalizedBody || null,
            form.sender_email || null,
            form.sender_pass || null,
            form.sub_subject || null,
            editingId,
          ],
        );
        toast.success('Template updated');
      } else {
        const exists = await query<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM tbl_email WHERE COALESCE(template_type, identify) = ?',
          [form.template_type],
        );
        if ((exists[0]?.cnt ?? 0) > 0) {
          toast.error('A template with this type already exists');
          setSaving(false);
          return;
        }
        await execute(
          `INSERT INTO tbl_email (template_type, identify, subject, body, sender_email, sender_pass, sub_subject) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            form.template_type,
            form.template_type,
            normalizedSubject || null,
            normalizedBody || null,
            form.sender_email || null,
            form.sender_pass || null,
            form.sub_subject || null,
          ],
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
      await execute('DELETE FROM tbl_email WHERE id = ?', [deleteConfirm]);
      toast.success('Template deleted');
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      toast.error(`Delete failed: ${String(err)}`);
    }
  }, [deleteConfirm, loadData]);

  const placeholders = ['date', 'contact person', 'name'];

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="size-5" />
          <h1 className="text-2xl font-semibold">Email Templates</h1>
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
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
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
            <DialogTitle>{editingId ? 'Edit Template' : 'Add Template'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label htmlFor="tmpl-type">Template Type</Label>
              <Select
                value={form.template_type}
                onValueChange={(v) => setForm({ ...form, template_type: v as typeof TEMPLATE_TYPES[number] })}
                disabled={!!editingId}
              >
                <SelectTrigger id="tmpl-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="tmpl-subject">Subject</Label>
                <div className="flex gap-1">
                  {placeholders.map((p) => (
                    <PlaceholderBadge
                      key={`subj-${p}`}
                      label={p}
                      onClick={() => insertPlaceholder(p, 'subject')}
                    />
                  ))}
                </div>
              </div>
              <Input
                id="tmpl-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                ref={(el) => setSubjectRef(el)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="tmpl-body">Body</Label>
                <div className="flex gap-1">
                  {placeholders.map((p) => (
                    <PlaceholderBadge
                      key={`body-${p}`}
                      label={p}
                      onClick={() => insertPlaceholder(p, 'body')}
                    />
                  ))}
                </div>
              </div>
              <Textarea
                id="tmpl-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                ref={(el) => setBodyRef(el)}
                rows={8}
                className="resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="tmpl-email">Sender Email</Label>
                <Input
                  id="tmpl-email"
                  type="email"
                  value={form.sender_email}
                  onChange={(e) => setForm({ ...form, sender_email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tmpl-pass">Sender Password</Label>
                <Input
                  id="tmpl-pass"
                  type="password"
                  value={form.sender_pass}
                  onChange={(e) => setForm({ ...form, sender_pass: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tmpl-display-name">Sender Display Name</Label>
              <Input
                id="tmpl-display-name"
                value={form.sub_subject}
                onChange={(e) => setForm({ ...form, sub_subject: e.target.value })}
                placeholder="Optional from-name shown to recipients"
              />
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
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this email template?</p>
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

export default EmailTemplatesPage;
