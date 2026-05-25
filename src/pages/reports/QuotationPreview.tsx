import { useMemo, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import {
  buildReportPdfPath,
  downloadExcelXml,
  escapeHtml,
  openPrintableReport,
} from '@/lib/report-output';
import type { Company, Customer, QuotationMain, QuotationSub, Setting } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Mail, MessageCircle, PencilLine } from 'lucide-react';
import { sendEmail } from '@/lib/email/send';
import { toast } from 'sonner';
import { WhatsAppSendDialog } from '@/components/whatsapp/WhatsAppSendDialog';

interface QuotationPreviewState {
  quotationId?: number;
  quotationNo?: string;
  autoPrint?: boolean;
}

interface QuotationLineRow extends QuotationSub {
  product_name: string | null;
  product_code: string | null;
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function createQuotationHtml(options: {
  quotation: QuotationMain;
  customerName: string;
  companyLabel: string;
  lines: QuotationLineRow[];
}): string {
  const { quotation, customerName, companyLabel, lines } = options;
  const generatedAt = new Date().toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');

  const lineRows = lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(String(line.s_no))}</td>
          <td>${escapeHtml(line.product_code ?? '-')}</td>
          <td>${escapeHtml(line.product_name ?? 'Unknown Product')}</td>
          <td class="amount">${escapeHtml(String(line.qty))}</td>
          <td class="amount">$${escapeHtml(dollars(line.unit_price))}</td>
          <td class="amount">$${escapeHtml(dollars(line.row_total))}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Quotation ${escapeHtml(quotation.quo_no)}</title>
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
  </style>
</head>
<body>
  <main>
    <div class="header">
      <div>
        <h1 class="title">Quotation</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Quotation #:</strong> ${escapeHtml(quotation.quo_no)}</div>
        <div><strong>Date:</strong> ${escapeHtml(quotation.quo_date)}</div>
        <div><strong>Customer:</strong> ${escapeHtml(customerName)}</div>
        <div><strong>Company:</strong> ${escapeHtml(companyLabel)}</div>
      </div>
    </div>
    <div class="summary">
      <div class="card"><div class="label">Checklist</div><div class="value">${escapeHtml(quotation.checklist_no ?? '-')}</div></div>
      <div class="card"><div class="label">Sub Total</div><div class="value">$${escapeHtml(dollars(quotation.sub_total))}</div></div>
      <div class="card"><div class="label">VAT</div><div class="value">$${escapeHtml(dollars(quotation.vat))}</div></div>
      <div class="card"><div class="label">Total</div><div class="value">$${escapeHtml(dollars(quotation.total))}</div></div>
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
  </main>
</body>
</html>`;
}

function QuotationPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as QuotationPreviewState | null) ?? null;
  const quotationId = state?.quotationId ?? 0;
  const autoPrintMode = state?.autoPrint ?? false;

  const [waOpen, setWaOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['quotationPreview', quotationId],
    queryFn: async () => {
      const [quotationRows, customerRows, companyRows, settingRows, lineRows] = await Promise.all([
        query<QuotationMain>('SELECT * FROM tbl_quotation_main WHERE id = ? LIMIT 1', [quotationId]),
        query<Customer>('SELECT * FROM tbl_customer WHERE id = (SELECT customer_id FROM tbl_quotation_main WHERE id = ? LIMIT 1)', [quotationId]),
        query<Company>('SELECT * FROM tbl_company WHERE id = (SELECT company_id FROM tbl_quotation_main WHERE id = ? LIMIT 1)', [quotationId]),
        query<Setting>('SELECT * FROM tbl_setting WHERE id = 1 LIMIT 1'),
        query<QuotationLineRow>(
          `SELECT qs.*, p.product_name, p.product_id AS product_code
           FROM tbl_quotation_sub qs
           LEFT JOIN tbl_product p ON qs.product_id = p.id
           WHERE qs.main_id = ? AND qs.is_deleted = 0
           ORDER BY qs.s_no`,
          [quotationId],
        ),
      ]);

      return {
        quotation: quotationRows[0] ?? null,
        customer: customerRows[0] ?? null,
        company: companyRows[0] ?? null,
        settings: settingRows[0] ?? null,
        lines: lineRows,
      };
    },
    enabled: quotationId > 0,
    staleTime: 30_000,
  });

  const reportHtml = useMemo(() => {
    if (!data?.quotation || !data.customer) {
      return '';
    }
    return createQuotationHtml({
      quotation: data.quotation,
      customerName: data.customer.customer_name,
      companyLabel: data.company?.company_name ?? `Company ${data.quotation.company_id}`,
      lines: data.lines,
    });
  }, [data]);

  useEffect(() => {
    if (autoPrintMode && reportHtml && !isLoading) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrintMode, reportHtml, isLoading]);

  const handlePrintable = (mode: 'print' | 'pdf') => {
    if (!reportHtml) {
      toast.error('No Data Selected');
      return;
    }
    openPrintableReport({
      html: reportHtml,
      mode,
      requirePath: mode === 'pdf',
      configuredPath: data?.settings?.quo_path ?? null,
      outputPath:
        mode === 'pdf' && data?.settings?.quo_path
          ? buildReportPdfPath({
              configuredPath: data.settings.quo_path,
              filenamePrefix: 'quotation',
              label: data.quotation?.quo_no ?? null,
            })
          : null,
    });
  };

  const handleExportExcel = () => {
    if (!data?.quotation) {
      toast.error('No Data Selected');
      return;
    }
    downloadExcelXml({
      filenamePrefix: `quotation-${data.quotation.quo_no}`,
      worksheetName: 'Quotation',
      headers: ['SR', 'CODE', 'PRODUCT', 'QTY', 'PRICE', 'TOTAL'],
      rows: data.lines.map((line) => [
        String(line.s_no),
        line.product_code ?? '',
        line.product_name ?? '',
        String(line.qty),
        dollars(line.unit_price),
        dollars(line.row_total),
      ]),
    });
  };

  const handleSend = async () => {
    if (!data?.quotation || !data.customer?.email) {
      toast.error('Customer email is not configured');
      return;
    }

    const result = await sendEmail({
      to: data.customer.email,
      template_type: 'QUOTATION',
      variables: {
        date: data.quotation.quo_date,
        contact_person: data.customer.title_name ?? '',
        name: data.customer.customer_name,
      },
    });

    if (!result.success) {
      toast.error(result.error ?? 'Failed to send quotation email');
      return;
    }

    toast.success(`Quotation ${data.quotation.quo_no} emailed to ${data.customer.customer_name}`);
  };

  const waVariables: Record<number, string> = {
    1: data?.quotation?.quo_no ?? '',
    2: data?.customer?.customer_name ?? '',
    3: (Number(data?.quotation?.total ?? 0) / 100).toFixed(2),
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-6"><p className="text-muted-foreground">Loading quotation...</p></div>;
  }

  if (!data?.quotation) {
    return <div className="flex h-full items-center justify-center p-6"><p className="text-muted-foreground">Quotation not found</p></div>;
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">Quotation Preview: {data.quotation.quo_no}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/quotations/new', { state: { quotationId } })}>
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
            <FileText className="mr-2 size-4" />
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
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Customer</div>
              <div className="font-medium">{data.customer?.customer_name ?? `Customer ${data.quotation.customer_id}`}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Date</div>
              <div className="font-medium">{data.quotation.quo_date}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Checklist</div>
              <div className="font-medium">{data.quotation.checklist_no ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Company</div>
              <div className="font-medium">{data.company?.company_name ?? `Company ${data.quotation.company_id}`}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="px-4 py-2">{line.s_no}</td>
                    <td className="px-4 py-2">{line.product_code ?? '-'}</td>
                    <td className="px-4 py-2">{line.product_name ?? 'Unknown Product'}</td>
                    <td className="px-4 py-2 text-right">{line.qty}</td>
                    <td className="px-4 py-2 text-right">${dollars(line.unit_price)}</td>
                    <td className="px-4 py-2 text-right">${dollars(line.row_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Sub Total</div>
              <div className="font-medium">${dollars(data.quotation.sub_total)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">VAT</div>
              <div className="font-medium">${dollars(data.quotation.vat)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Discount</div>
              <div className="font-medium">${dollars(data.quotation.discount)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="font-semibold">${dollars(data.quotation.total)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <WhatsAppSendDialog
        open={waOpen}
        onOpenChange={setWaOpen}
        phone={data.customer?.telephone ?? null}
        customerName={data.customer?.customer_name ?? ''}
        documentNo={data.quotation?.quo_no ?? ''}
        documentType="QUOTATION"
        variables={waVariables}
      />
    </div>
  );
}

export default QuotationPreview;
