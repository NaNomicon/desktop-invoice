import { useMemo, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import {
  buildReportPdfPath,
  downloadExcelXml,
  escapeHtml,
  openPrintableReport,
} from '@/lib/report-output';
import type {
  Company,
  Customer,
  InvoiceMain,
  InvoiceSub,
  Setting,
} from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  Mail,
  MessageCircle,
  PencilLine,
  Printer,
} from 'lucide-react';
import { sendEmail } from '@/lib/email/send';
import { toast } from 'sonner';
import { WhatsAppSendDialog } from '@/components/whatsapp/WhatsAppSendDialog';

interface InvoicePreviewState {
  invoiceId?: number;
  invoiceNo?: string;
  autoPrint?: boolean;
  autoExportPdf?: boolean;
}

interface InvoiceLineRow extends InvoiceSub {
  product_name: string | null;
  product_code: string | null;
  type_name: string | null;
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function createInvoiceHtml(options: {
  invoice: InvoiceMain;
  customer: Customer;
  companyLabel: string;
  lines: InvoiceLineRow[];
  showDueAmt: boolean;
}): string {
  const { invoice, customer, companyLabel, lines, showDueAmt } = options;
  const generatedAt = new Date().toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');

  const isAdvance = invoice.print_due === 'Advance';

  const lineRows = lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(String(line.s_no))}</td>
          <td>${escapeHtml(line.product_code ?? '-')}</td>
          <td>${escapeHtml(line.product_name ?? 'Unknown Product')}</td>
          <td class="amount">${escapeHtml(String(line.qty))}</td>
          <td class="amount">Rs ${escapeHtml(dollars(line.unit_price))}</td>
          <td class="amount">Rs ${escapeHtml(dollars(line.row_total))}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.invoice_no)}</title>
  <style>
    @page { margin: 14mm; size: A4 portrait; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    main { padding: 24px; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
    .title { margin: 0; font-size: 24px; }
    .meta { color: #4b5563; font-size: 12px; line-height: 1.6; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
    .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
    .value { font-size: 16px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; text-align: left; }
    th { background: #e0f2fe; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; }
    .totals-table { width: 50%; margin-left: auto; }
    .totals-table th, .totals-table td { padding: 6px 10px; }
    .balance-due { font-weight: 700; ${invoice.balance > 0 ? 'color: #dc2626;' : ''} }
    .advance-row { background: #f0fdf4; }
    .due-row { background: #fef3c7; }
  </style>
</head>
<body>
  <main>
    <div class="header">
      <div>
        <h1 class="title">Tax Invoice</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Invoice #:</strong> ${escapeHtml(invoice.invoice_no)}</div>
        <div><strong>Date:</strong> ${escapeHtml(invoice.invoice_date)}</div>
        <div><strong>Customer:</strong> ${escapeHtml(customer.customer_name)}</div>
        <div><strong>Company:</strong> ${escapeHtml(companyLabel)}</div>
        ${invoice.checklist_no ? `<div><strong>Checklist:</strong> ${escapeHtml(invoice.checklist_no)}</div>` : ''}
      </div>
    </div>
    <div class="summary">
      <div class="card"><div class="label">Sub Total</div><div class="value">Rs ${escapeHtml(dollars(invoice.sub_total))}</div></div>
      <div class="card"><div class="label">Discount</div><div class="value">Rs ${escapeHtml(dollars(invoice.discount))}</div></div>
      <div class="card"><div class="label">VAT (${invoice.per}%)</div><div class="value">Rs ${escapeHtml(dollars(invoice.vat))}</div></div>
      <div class="card"><div class="label">Total</div><div class="value">Rs ${escapeHtml(dollars(invoice.total))}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Code</th>
          <th>Product</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>
    <table class="totals-table">
      <tbody>
        <tr>
          <td>Sub Total</td>
          <td class="amount">Rs ${escapeHtml(dollars(invoice.sub_total))}</td>
        </tr>
        ${invoice.discount > 0 ? `<tr>
          <td>Discount</td>
          <td class="amount">-Rs ${escapeHtml(dollars(invoice.discount))}</td>
        </tr>` : ''}
        ${invoice.vat > 0 ? `<tr>
          <td>VAT (${invoice.per}%)</td>
          <td class="amount">Rs ${escapeHtml(dollars(invoice.vat))}</td>
        </tr>` : ''}
        <tr style="font-weight: 700; background: #f1f5f9;">
          <td>Total</td>
          <td class="amount">Rs ${escapeHtml(dollars(invoice.total))}</td>
        </tr>
        <tr>
          <td>Paid Amount</td>
          <td class="amount">Rs ${escapeHtml(dollars(invoice.paid_amount))}</td>
        </tr>
        ${showDueAmt && invoice.print_due ? `<tr class="${isAdvance ? 'advance-row' : 'due-row'}">
          <td>${isAdvance ? 'Advance' : 'Due Amount'}</td>
          <td class="amount">Rs ${escapeHtml(dollars(invoice.amount_due))}</td>
        </tr>` : ''}
        <tr class="balance-due">
          <td>Balance Due</td>
          <td class="amount">Rs ${escapeHtml(dollars(invoice.balance))}</td>
        </tr>
      </tbody>
    </table>
  </main>
</body>
</html>`;
}

function InvoicePreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const state = (location.state as InvoicePreviewState | null) ?? null;
  const invoiceId = state?.invoiceId ?? (Number(params.invoiceId) || 0);
  const autoPrintMode = state?.autoPrint ?? false;
  const autoExportPdf = state?.autoExportPdf ?? false;

  const [waOpen, setWaOpen] = useState(false);
  const [autoPdfTriggered, setAutoPdfTriggered] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invoicePreview', invoiceId],
    queryFn: async () => {
      const [invoiceRows, customerRows, companyRows, settingRows, lineRows] =
        await Promise.all([
          query<InvoiceMain>(
            'SELECT * FROM tbl_invoice_main WHERE id = ? LIMIT 1',
            [invoiceId],
          ),
          query<Customer>(
            'SELECT * FROM tbl_customer WHERE id = (SELECT customer_id FROM tbl_invoice_main WHERE id = ? LIMIT 1)',
            [invoiceId],
          ),
          query<Company>(
            'SELECT * FROM tbl_company WHERE id = (SELECT company_id FROM tbl_invoice_main WHERE id = ? LIMIT 1)',
            [invoiceId],
          ),
          query<Setting>('SELECT * FROM tbl_setting LIMIT 1'),
          query<InvoiceLineRow>(
            `SELECT isub.*, p.product_name, p.product_id AS product_code, pt.type_name
             FROM tbl_invoice_sub isub
             LEFT JOIN tbl_product p ON isub.product_id = p.id
             LEFT JOIN tbl_product_type pt ON p.type_id = pt.id
             WHERE isub.main_id = ? AND isub.is_deleted = 0
             ORDER BY isub.s_no`,
            [invoiceId],
          ),
        ]);

      return {
        invoice: invoiceRows[0] ?? null,
        customer: customerRows[0] ?? null,
        company: companyRows[0] ?? null,
        settings: settingRows[0] ?? null,
        lines: lineRows,
      };
    },
    enabled: invoiceId > 0,
    staleTime: 30_000,
  });

  const showDueAmt = useMemo(() => {
    if (!data?.invoice?.print_due) return false;
    return data.invoice.print_due === 'Advance' || data.invoice.print_due === 'Due';
  }, [data?.invoice?.print_due]);

  const reportHtml = useMemo(() => {
    if (!data?.invoice || !data.customer) {
      return '';
    }
    return createInvoiceHtml({
      invoice: data.invoice,
      customer: data.customer,
      companyLabel: data.company?.company_name ?? `Company ${data.invoice.company_id}`,
      lines: data.lines,
      showDueAmt,
    });
  }, [data, showDueAmt]);

  const handlePrintable = useCallback((mode: 'print' | 'pdf') => {
    if (!reportHtml) {
      toast.error('No Data Selected');
      return;
    }
    openPrintableReport({
      html: reportHtml,
      mode,
      requirePath: mode === 'pdf',
      configuredPath: data?.settings?.invoice_path ?? null,
      outputPath:
        mode === 'pdf' && data?.settings?.invoice_path
          ? buildReportPdfPath({
              configuredPath: data.settings.invoice_path,
              filenamePrefix: 'invoice',
              label: data.invoice?.invoice_no ?? null,
            })
          : null,
    });
  }, [data, reportHtml]);

  useEffect(() => {
    if (!autoPrintMode || !reportHtml || isLoading) {
      return;
    }
    const timer = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(timer);
  }, [autoPrintMode, reportHtml, isLoading]);

  useEffect(() => {
    if (!autoExportPdf || autoPdfTriggered || isLoading || !reportHtml) {
      return;
    }
    const timer = setTimeout(() => {
      setAutoPdfTriggered(true);
      void handlePrintable('pdf');
    }, 0);
    return () => clearTimeout(timer);
  }, [autoExportPdf, autoPdfTriggered, isLoading, reportHtml, handlePrintable]);

  const handleExportExcel = () => {
    if (!data?.invoice) {
      toast.error('No Data Selected');
      return;
    }
    downloadExcelXml({
      filenamePrefix: `invoice-${data.invoice.invoice_no}`,
      worksheetName: 'Invoice',
      headers: ['SR', 'CODE', 'PRODUCT', 'TYPE', 'QTY', 'PRICE', 'TOTAL'],
      rows: data.lines.map((line) => [
        String(line.s_no),
        line.product_code ?? '',
        line.product_name ?? '',
        line.type_name ?? '',
        String(line.qty),
        dollars(line.unit_price),
        dollars(line.row_total),
      ]),
    });
  };

  const handleSend = async () => {
    if (!data?.invoice || !data.customer?.email) {
      toast.error('Customer email is not configured');
      return;
    }

    const result = await sendEmail({
      to: data.customer.email,
      template_type: 'INVOICE',
      variables: {
        date: data.invoice.invoice_date,
        contact_person: data.customer.title_name ?? '',
        name: data.customer.customer_name,
      },
    });

    if (!result.success) {
      toast.error(result.error ?? 'Failed to send invoice email');
      return;
    }

    toast.success(`Invoice ${data.invoice.invoice_no} emailed to ${data.customer.customer_name}`);
  };

  const waVariables: Record<number, string> = {
    1: data?.invoice?.invoice_no ?? '',
    2: data?.customer?.customer_name ?? '',
    3: (Number(data?.invoice?.balance ?? 0) / 100).toFixed(2),
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (!data?.invoice) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">
            Invoice Preview: {data.invoice.invoice_no}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/invoices/new', { state: { invoiceId } })}
          >
            <PencilLine className="mr-2 size-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => setWaOpen(true)}>
            <MessageCircle className="mr-2 size-4" />
            WhatsApp
          </Button>
          <Button variant="outline" onClick={handleSend}>
            <Mail className="mr-2 size-4" />
            Send
          </Button>
          <Button variant="outline" onClick={() => handlePrintable('print')}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>
          <Button variant="outline" onClick={() => handlePrintable('pdf')}>
            <Download className="mr-2 size-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 size-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Customer
              </div>
              <div className="font-medium">
                {data.customer?.customer_name ?? `Customer ${data.invoice.customer_id}`}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Date
              </div>
              <div className="font-medium">{data.invoice.invoice_date}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Checklist
              </div>
              <div className="font-medium">{data.invoice.checklist_no ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Company
              </div>
              <div className="font-medium">
                {data.company?.company_name ?? `Company ${data.invoice.company_id}`}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Code
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="px-4 py-2">{line.s_no}</td>
                    <td className="px-4 py-2">{line.product_code ?? '-'}</td>
                    <td className="px-4 py-2">
                      {line.product_name ?? 'Unknown Product'}
                    </td>
                    <td className="px-4 py-2">{line.type_name ?? '-'}</td>
                    <td className="px-4 py-2 text-right">{line.qty}</td>
                    <td className="px-4 py-2 text-right">Rs {dollars(line.unit_price)}</td>
                    <td className="px-4 py-2 text-right">Rs {dollars(line.row_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Sub Total
              </div>
              <div className="font-medium">Rs {dollars(data.invoice.sub_total)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Discount
              </div>
              <div className="font-medium">Rs {dollars(data.invoice.discount)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                VAT ({data.invoice.per}%)
              </div>
              <div className="font-medium">Rs {dollars(data.invoice.vat)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total
              </div>
              <div className="font-semibold">Rs {dollars(data.invoice.total)}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Paid
              </div>
              <div className="font-medium text-green-600">
                Rs {dollars(data.invoice.paid_amount)}
              </div>
            </div>
            {showDueAmt && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {data.invoice.print_due === 'Advance' ? 'Advance' : 'Due Amount'}
                </div>
                <div className="font-medium">
                  Rs {dollars(data.invoice.amount_due)}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Balance Due
              </div>
              <div
                className={`font-semibold ${
                  data.invoice.balance > 0 ? 'text-destructive' : ''
                }`}
              >
                Rs {dollars(data.invoice.balance)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <WhatsAppSendDialog
        open={waOpen}
        onOpenChange={setWaOpen}
        phone={data.customer?.telephone ?? null}
        customerName={data.customer?.customer_name ?? ''}
        documentNo={data.invoice?.invoice_no ?? ''}
        documentType="INVOICE"
        variables={waVariables}
      />
    </div>
  );
}

export default InvoicePreview;