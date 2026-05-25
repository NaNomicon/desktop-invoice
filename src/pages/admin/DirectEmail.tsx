import { useCallback, useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { query } from '@/lib/db';
import { commands } from '@/lib/tauri-bindings';
import type { EmailTemplate } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Mail, Paperclip, SendHorizontal, Trash2 } from 'lucide-react';

const TEMPLATE_TYPES = ['INVOICE', 'QUOTATION', 'STATEMENT', 'RECEIPT'] as const;

type TemplateType = (typeof TEMPLATE_TYPES)[number];

interface AttachmentEntry {
  path: string;
  selected: boolean;
}

const EMPTY_FORM = {
  receiver: '',
  senderEmail: '',
  senderPass: '',
  senderName: '',
  subject: '',
  body: '',
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function filenameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function DirectEmailPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType | 'none'>('none');

  const selectedCount = useMemo(
    () => attachments.filter((attachment) => attachment.selected).length,
    [attachments],
  );
  const canSend =
    !sending &&
    form.receiver.trim().length > 0 &&
    form.senderEmail.trim().length > 0 &&
    form.senderPass.trim().length > 0 &&
    form.subject.trim().length > 0;

  const updateForm = useCallback((field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePickAttachments = useCallback(async () => {
    try {
      const result = await open({
        multiple: true,
        title: 'Select multiple files',
      });

      if (!result) {
        return;
      }

      const picked = Array.isArray(result) ? result : [result];
      setAttachments((prev) => {
        const seen = new Set(prev.map((entry) => entry.path));
        const next = [...prev];
        for (const path of picked) {
          if (typeof path !== 'string' || seen.has(path)) {
            continue;
          }
          seen.add(path);
          next.push({ path, selected: true });
        }
        return next;
      });
    } catch (err) {
      toast.error(`Attachment selection failed: ${String(err)}`);
    }
  }, []);

  const handleToggleAttachment = useCallback((path: string, selected: boolean) => {
    setAttachments((prev) =>
      prev.map((entry) => (entry.path === path ? { ...entry, selected } : entry)),
    );
  }, []);

  const handleRemoveAttachment = useCallback((path: string) => {
    setAttachments((prev) => prev.filter((entry) => entry.path !== path));
  }, []);

  const applyTemplate = useCallback(async (templateType: TemplateType) => {
    setLoadingTemplate(true);
    try {
      const rows = await query<EmailTemplate>(
        `SELECT *, COALESCE(template_type, identify) AS template_type
         FROM tbl_email
         WHERE COALESCE(template_type, identify) = ?
         LIMIT 1`,
        [templateType],
      );
      const template = rows[0];
      if (!template) {
        toast.error(`No email template found for type: ${templateType}`);
        return;
      }

      setForm((prev) => ({
        ...prev,
        senderEmail: template.sender_email ?? template.sender ?? prev.senderEmail,
        senderPass: template.sender_pass ?? prev.senderPass,
        senderName: template.sub_subject ?? prev.senderName,
        receiver: template.client_email ?? prev.receiver,
        subject: template.subject ?? prev.subject,
        body: template.body ?? prev.body,
      }));
      toast.success(`${templateType} template loaded`);
    } catch (err) {
      toast.error(`Failed to load template: ${String(err)}`);
    } finally {
      setLoadingTemplate(false);
    }
  }, []);

  const handleTemplateChange = useCallback(
    async (value: TemplateType | 'none') => {
      setSelectedTemplateType(value);
      if (value !== 'none') {
        await applyTemplate(value);
      }
    },
    [applyTemplate],
  );

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setAttachments([]);
    setSelectedTemplateType('none');
  }, []);

  const handleSend = useCallback(async () => {
    if (!form.receiver.trim()) {
      toast.error('Please enter receiver ID');
      return;
    }
    if (!isValidEmail(form.receiver.trim())) {
      toast.error('Please enter a valid receiver email');
      return;
    }
    if (!form.senderEmail.trim()) {
      toast.error('Please enter sender ID');
      return;
    }
    if (!isValidEmail(form.senderEmail.trim())) {
      toast.error('Please enter a valid sender email');
      return;
    }
    if (!form.senderPass.trim()) {
      toast.error('Please enter sender password');
      return;
    }
    if (!form.subject.trim()) {
      toast.error('Please enter subject');
      return;
    }

    setSending(true);
    try {
      const result = await commands.sendEmail({
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_starttls: true,
        sender_email: form.senderEmail.trim(),
        sender_pass: form.senderPass,
        sender_name: form.senderName.trim() || null,
        to: form.receiver.trim(),
        subject: form.subject.trim(),
        html: form.body,
        attachments: attachments
          .filter((attachment) => attachment.selected)
          .map((attachment) => ({
            path: attachment.path,
            filename: filenameFromPath(attachment.path),
            mime_type: null,
          })),
      });

      if (result.status === 'error') {
        toast.error(result.error);
        return;
      }

      toast.success(`Sent message to ${result.data.sent_to}`, {
        description:
          result.data.attachment_count > 0
            ? `${result.data.attachment_count} attachment(s) sent`
            : 'Message sent without attachments',
      });
      resetForm();
    } catch (err) {
      toast.error(`Failed to send email: ${String(err)}`);
    } finally {
      setSending(false);
    }
  }, [attachments, form, resetForm]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Mail className="size-5" />
          <h1 className="text-2xl font-semibold">Direct Email</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Select value={selectedTemplateType} onValueChange={(value) => void handleTemplateChange(value as TemplateType | 'none')}>
            <SelectTrigger className="w-full sm:w-[220px]" disabled={loadingTemplate || sending}>
              <SelectValue placeholder="Load template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No template</SelectItem>
              {TEMPLATE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  Load {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={resetForm} disabled={sending}>
            Clear
          </Button>
          <Button onClick={() => void handleSend()} disabled={!canSend}>
            {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <SendHorizontal className="mr-2 size-4" />}
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={form.subject}
                onChange={(e) => updateForm('subject', e.target.value)}
                disabled={sending}
                placeholder="Invoice follow-up"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-receiver">Receiver</Label>
              <Input
                id="email-receiver"
                type="email"
                value={form.receiver}
                onChange={(e) => updateForm('receiver', e.target.value)}
                disabled={sending}
                placeholder="customer@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-sender">Sender ID</Label>
              <Input
                id="email-sender"
                type="email"
                value={form.senderEmail}
                onChange={(e) => updateForm('senderEmail', e.target.value)}
                disabled={sending}
                placeholder="billing@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-pass">Password</Label>
              <Input
                id="email-pass"
                type="password"
                value={form.senderPass}
                onChange={(e) => updateForm('senderPass', e.target.value)}
                disabled={sending}
                placeholder="App password"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-sender-name">Sender Display Name</Label>
            <Input
              id="email-sender-name"
              value={form.senderName}
              onChange={(e) => updateForm('senderName', e.target.value)}
              disabled={sending}
              placeholder="Shown in the recipient inbox"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              value={form.body}
              onChange={(e) => updateForm('body', e.target.value)}
              disabled={sending}
              rows={10}
              className="resize-y"
              placeholder="Write your message here..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Paperclip className="size-4" />
                Attachments
              </div>
              <p className="text-sm text-muted-foreground">
                Selected files default to checked and will be attached when sent.
              </p>
            </div>
            <Button variant="outline" onClick={() => void handlePickAttachments()} disabled={sending}>
              <Paperclip className="mr-2 size-4" />
              Browse Files
            </Button>
          </div>

          {attachments.length === 0 ? (
            <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
              No files selected.
            </div>
          ) : (
            <div className="rounded-md border">
              {attachments.map((attachment, index) => (
                <div
                  key={attachment.path}
                  className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t' : ''}`}
                >
                  <Checkbox
                    checked={attachment.selected}
                    onCheckedChange={(checked) =>
                      handleToggleAttachment(attachment.path, checked === true)
                    }
                    disabled={sending}
                    aria-label={`Attach ${filenameFromPath(attachment.path)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{filenameFromPath(attachment.path)}</div>
                    <div className="truncate text-xs text-muted-foreground">{attachment.path}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemoveAttachment(attachment.path)}
                    disabled={sending}
                    aria-label={`Remove ${filenameFromPath(attachment.path)}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {selectedCount} of {attachments.length} attachment(s) selected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default DirectEmailPage;
