import { useState, useEffect, useCallback } from 'react';
import { query } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp/send';
import type { WhatsAppTemplate } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function substituteTemplate(body: string, variables: Record<number, string>): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, key) => variables[Number(key)] ?? `{{${key}}}`);
}

interface WhatsAppSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string | null;
  customerName: string;
  documentNo: string;
  documentType: 'INVOICE' | 'QUOTATION';
  variables: Record<number, string>;
}

export function WhatsAppSendDialog({
  open,
  onOpenChange,
  phone: initialPhone,
  variables,
}: WhatsAppSendDialogProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [phoneInput, setPhoneInput] = useState(initialPhone ?? '');
  const [isSending, setIsSending] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (open) {
      setPhoneInput(initialPhone ?? '');
      setSelectedTemplate(null);
    }
  }, [open, initialPhone]);

  useEffect(() => {
    if (!open) return;

    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const rows = await query<WhatsAppTemplate>(
          "SELECT * FROM tbl_wa_template WHERE status = 'APPROVED' ORDER BY template_name",
        );
        setTemplates(rows);
      } catch (err) {
        toast.error(`Failed to load templates: ${String(err)}`);
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    void loadTemplates();
  }, [open]);

  const handleSend = useCallback(async () => {
    const phone = phoneInput.trim();

    if (!phone) {
      toast.error('Phone number is required');
      return;
    }
    if (phone.length < 8) {
      toast.error('Phone number must be at least 8 characters');
      return;
    }
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendWhatsApp({
        phone,
        template_name: selectedTemplate.template_name,
        template_id: String(selectedTemplate.id),
        variables,
      });

      if (result.success) {
        toast.success(`WhatsApp sent to ${phone}`);
        onOpenChange(false);
      } else {
        toast.error(result.error ?? 'Failed to send WhatsApp');
      }
    } catch (err) {
      toast.error(`Error: ${String(err)}`);
    } finally {
      setIsSending(false);
    }
  }, [phoneInput, selectedTemplate, variables, onOpenChange]);

  const preview = selectedTemplate?.body
    ? substituteTemplate(selectedTemplate.body, variables)
    : null;

  const hasNoPhone = !initialPhone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasNoPhone && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              No phone on file for this customer. Please enter a phone number.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="wa-template">Template</Label>
            {loadingTemplates ? (
              <Input disabled placeholder="Loading templates..." />
            ) : templates.length === 0 ? (
              <Input disabled placeholder="No approved WhatsApp templates available" />
            ) : (
              <Select
                value={selectedTemplate?.template_name ?? ''}
                onValueChange={(name) => {
                  const tmpl = templates.find((t) => t.template_name === name);
                  setSelectedTemplate(tmpl ?? null);
                }}
              >
                <SelectTrigger id="wa-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tmpl) => (
                    <SelectItem key={tmpl.id} value={tmpl.template_name}>
                      {tmpl.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-phone">Phone Number</Label>
            <Input
              id="wa-phone"
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+1234567890"
              disabled={isSending}
            />
          </div>

          {preview && (
            <div className="space-y-1.5">
              <Label>Preview</Label>
              <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                {preview}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button onClick={() => void handleSend()} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}