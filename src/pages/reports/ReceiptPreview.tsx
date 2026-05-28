import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import { commands, unwrapResult } from '@/lib/tauri-bindings';
import {
  buildReportPdfPath,
  downloadExcelXml,
  escapeHtml,
  openPrintableReport,
} from '@/lib/report-output';
import { useUIStore } from '@/store/ui-store';
import type { Company, Setting } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { format, startOfMonth } from 'date-fns';
import 'react-day-picker/style.css';
import {
  Download,
  Receipt,
  Calendar,
  FileText,
  Printer,
  Search,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ReceiptPreviewState {
  receiptId?: number;
}

interface ReceiptRow {
  id: number;
  receipt_no: string;
  receipt_date: string;
  customer_id: number;
  due_amount: number;
  amount_received: number;
  cheque_no: string | null;
  no: string | null;
  balance: number;
  cr_dr: string | null;
  invoice_no: string | null;
  customer_name: string;
  contact: string | null;
  customer_type: string | null;
  telephone: string | null;
  address: string | null;
  email: string | null;
  customer_due_amount: number;
  title_name: string | null;
  reg_date: string | null;
  ad_due: string | null;
  brn: string | null;
  vat: string | null;
  pre_load: string | null;
  cash: string | null;
  cheque: string | null;
  other: string | null;
  payment_mode: string | null;
  bank_name: string | null;
  invoice_reference: string | null;
  notes: string | null;
  company_id: number;
}

function dollars(c: number): string {
  return (c / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDisplayDate(date: string): string {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return format(parsed, 'dd-MM-yyyy');
}

function sanitizeFolderPart(value: string): string {
  return value.replaceAll(/[\\/:*?"<>|]/g, '_').trim() || 'Unknown';
}

function joinPath(basePath: string, part: string): string {
  const normalizedBase = basePath.replace(/[\\/]+$/, '');
  const separator = /\\/.test(normalizedBase) ? '\\' : '/';
  return `${normalizedBase}${separator}${part}`;
}

function buildReceiptPdfPath(options: {
  configuredPath: string;
  receiptNo: string;
  customerName: string;
  receiptDate: string;
  receiptFolder?: boolean;
}): string {
  const {
    configuredPath,
    receiptNo,
    customerName,
    receiptDate,
    receiptFolder = false,
  } = options;
  const parsedDate = new Date(receiptDate);
  const monthName = Number.isNaN(parsedDate.getTime())
    ? 'Unknown'
    : parsedDate.toLocaleString('en-US', { month: 'long' });
  const safeCustomerName = sanitizeFolderPart(customerName);
  const fileName = `PAY${receiptNo}-${safeCustomerName}.pdf`;
  let folder = configuredPath;

  if (receiptFolder) {
    folder = joinPath(folder, 'Receipt');
  }

  folder = joinPath(folder, monthName);
  folder = joinPath(folder, safeCustomerName);

  return joinPath(folder, fileName);
}

/** If cheque_no is "0" or "0.00", return empty; otherwise return the cheque number. */
function formatChequeNo(chequeNo: string | null): string {
  if (!chequeNo) return '';
  const trimmed = chequeNo.trim();
  if (trimmed === '0' || trimmed === '0.00') return '';
  return trimmed;
}

function createReceiptReportHtml(options: {
  rows: ReceiptRow[];
  rangeLabel: string;
  companyLabel: string;
  searchTerm: string;
  paymentModeLabels: { cash: string; cheque: string; other: string } | null;
}): string {
  const { rows, rangeLabel, companyLabel, searchTerm, paymentModeLabels } =
    options;
  const generatedAt = format(new Date(), 'dd-MM-yyyy HH:mm:ss');
  const totalReceived = rows.reduce((sum, row) => sum + row.amount_received, 0);
  const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0);

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(formatDisplayDate(row.receipt_date))}</td>
          <td>${escapeHtml(row.receipt_no)}</td>
          <td>${escapeHtml(row.customer_name)}</td>
          <td>${escapeHtml(row.customer_type ?? '')}</td>
          <td>${escapeHtml(row.invoice_no ?? '')}</td>
          <td class="num">Rs ${dollars(row.due_amount)}</td>
          <td class="num">Rs ${dollars(row.amount_received)}</td>
          <td>${escapeHtml(formatChequeNo(row.cheque_no))}</td>
          <td>${escapeHtml(row.payment_mode ?? '')}</td>
          <td class="num">Rs ${dollars(row.balance)}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt Report</title>
  <style>
    @page { margin: 14mm; size: A4 landscape; }
    :root { color-scheme: light; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    main { padding: 24px; }
    .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 20px; }
    .title { margin: 0; font-size: 24px; }
    .meta { color: #4b5563; font-size: 12px; line-height: 1.5; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
    .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
    .value { font-size: 16px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; text-align: left; }
    th { background: #e0f2fe; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tfoot td { font-weight: 700; background: #f8fafc; }
  </style>
</head>
<body>
  <main>
    <div class="header">
      <div>
        <h1 class="title">Receipt Report</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Date range:</strong> ${escapeHtml(rangeLabel)}</div>
        <div><strong>Company:</strong> ${escapeHtml(companyLabel)}</div>
        <div><strong>Search:</strong> ${escapeHtml(searchTerm || 'All records')}</div>
        ${
          paymentModeLabels
            ? `<div><strong>Payment Modes:</strong> ${escapeHtml(paymentModeLabels.cash)} / ${escapeHtml(paymentModeLabels.cheque)} / ${escapeHtml(paymentModeLabels.other)}</div>`
            : ''
        }
      </div>
    </div>
    <div class="summary">
      <div class="card"><div class="label">Receipts</div><div class="value">${rows.length}</div></div>
      <div class="card"><div class="label">Total Received</div><div class="value">Rs ${dollars(totalReceived)}</div></div>
      <div class="card"><div class="label">Total Balance</div><div class="value">Rs ${dollars(totalBalance)}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Receipt NO</th>
          <th>Customer</th>
          <th>Type</th>
          <th>Invoice NO</th>
          <th>Due Amount</th>
          <th>Received</th>
          <th>Cheque NO</th>
          <th>Payment Mode</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="6">Total</td>
          <td class="num">Rs ${dollars(totalReceived)}</td>
          <td colspan="2"></td>
          <td class="num">Rs ${dollars(totalBalance)}</td>
        </tr>
      </tfoot>
    </table>
  </main>
</body>
</html>`;
}

function createSingleReceiptHtml(row: ReceiptRow): string {
  const generatedAt = format(new Date(), 'dd-MM-yyyy HH:mm:ss');
  const customerLabel = `${row.title_name ?? ''} ${row.customer_name}`.trim() || row.customer_name;
  const duePrefix = row.ad_due === 'Advance' ? '-' : '';
  const chequeNo = formatChequeNo(row.cheque_no) || '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(row.receipt_no)}</title>
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
    th, td { border: 1px solid #d1d5db; padding: 10px; font-size: 12px; text-align: left; }
    th { width: 28%; background: #e0f2fe; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .notes { margin-top: 16px; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
  </style>
</head>
<body>
  <main>
    <div class="header">
      <div>
        <h1 class="title">Receipt Voucher</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Receipt No:</strong> ${escapeHtml(row.receipt_no)}</div>
        <div><strong>Date:</strong> ${escapeHtml(formatDisplayDate(row.receipt_date))}</div>
        <div><strong>Customer:</strong> ${escapeHtml(customerLabel)}</div>
      </div>
    </div>

    <div class="summary">
      <div class="card"><div class="label">Received</div><div class="value">Rs ${dollars(row.amount_received)}</div></div>
      <div class="card"><div class="label">Due Amount</div><div class="value">${escapeHtml(duePrefix)}Rs ${dollars(row.customer_due_amount)}</div></div>
      <div class="card"><div class="label">Cheque No</div><div class="value">${escapeHtml(chequeNo)}</div></div>
      <div class="card"><div class="label">Payment Mode</div><div class="value">${escapeHtml(row.payment_mode ?? '—')}</div></div>
    </div>

    <table>
      <tbody>
        <tr><th>Customer Type</th><td>${escapeHtml(row.customer_type ?? '—')}</td></tr>
        <tr><th>Invoice No</th><td>${escapeHtml(row.invoice_no ?? '—')}</td></tr>
        <tr><th>Balance Before Receipt</th><td class="amount">Rs ${dollars(row.balance)}</td></tr>
        <tr><th>Stored Receipt Due</th><td class="amount">Rs ${dollars(row.due_amount)}</td></tr>
        <tr><th>Telephone</th><td>${escapeHtml(row.telephone ?? '—')}</td></tr>
        <tr><th>Address</th><td>${escapeHtml(row.address ?? '—')}</td></tr>
      </tbody>
    </table>

    <div class="notes">
      <div class="label">Notes</div>
      <div>${escapeHtml(row.notes?.trim() || '—')}</div>
    </div>
  </main>
</body>
</html>`;
}

async function saveReceiptPreviewPdf(options: {
  html: string;
  configuredPath: string;
  receiptNo: string;
  customerName: string;
  receiptDate: string;
}): Promise<string> {
  const outputPath = buildReceiptPdfPath({
    configuredPath: options.configuredPath,
    receiptNo: options.receiptNo,
    customerName: options.customerName,
    receiptDate: options.receiptDate,
  });

  return unwrapResult(
    await commands.saveReportPdf({
      html: options.html,
      output_path: outputPath,
    }),
  );
}

function ReceiptPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as ReceiptPreviewState | null) ?? null;
  const receiptId = state?.receiptId ?? 0;
  const isSinglePreview = receiptId > 0;
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const closeHomeTab = useUIStore((state) => state.closeHomeTab);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeHomeTab('/reports/receipts');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeHomeTab]);

  const handleClose = () => {
    if (singleReceipt) {
      navigate('/history');
      return;
    }
    closeHomeTab('/reports/receipts');
  };

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () =>
      query<Company>(
        'SELECT id, company_name FROM tbl_company WHERE is_active = 1',
      ),
    staleTime: 5 * 60_000,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['receiptReportSettings'],
    queryFn: () =>
      query<Setting>('SELECT report_path, cash, cheque, other FROM tbl_setting LIMIT 1'),
    staleTime: 5 * 60_000,
  });

  const { data: receiptData = [], isLoading } = useQuery({
    queryKey: [
      'receiptReport',
      receiptId,
      dateRange?.from?.toISOString() ?? '',
      dateRange?.to?.toISOString() ?? '',
      companyFilter,
      searchTerm,
    ],
    queryFn: () => {
      const likeTerm = `%${searchTerm.trim()}%`;

      if (isSinglePreview) {
        return query<ReceiptRow>(
          `SELECT
            tbl_receipt.id,
            tbl_receipt.receipt_no,
            tbl_receipt.receipt_date,
            tbl_receipt.customer_id,
            tbl_receipt.due_amount,
            tbl_receipt.amount_received,
            tbl_receipt.cheque_no,
            tbl_receipt.no,
            tbl_receipt.balance,
            tbl_receipt.cr_dr,
            tbl_receipt.invoice_no,
            LTRIM(tbl_customer.customer_name) AS customer_name,
            tbl_customer.contact,
            tbl_customer.customer_type,
            tbl_customer.telephone,
            tbl_customer.address,
            tbl_customer.email,
            tbl_customer.due_amount AS customer_due_amount,
            tbl_customer.title_name,
            tbl_customer.reg_date,
            tbl_customer.ad_due,
            tbl_customer.brn,
            tbl_customer.vat,
            tbl_receipt.pre_load,
            tbl_receipt.cash,
            tbl_receipt.cheque,
            tbl_receipt.other,
            tbl_receipt.payment_mode,
            tbl_receipt.bank_name,
            tbl_receipt.invoice_reference,
            tbl_receipt.notes,
            tbl_receipt.company_id
          FROM tbl_receipt
          INNER JOIN tbl_customer ON tbl_receipt.customer_id = tbl_customer.id
          WHERE tbl_receipt.id = ?
          LIMIT 1`,
          [receiptId],
        );
      }

      const fromDate = dateRange?.from
        ? format(dateRange.from, 'yyyy-MM-dd')
        : '1970-01-01';
      const toDate = dateRange?.to
        ? format(dateRange.to, 'yyyy-MM-dd')
        : '2099-12-31';

      return query<ReceiptRow>(
        `SELECT
          tbl_receipt.id,
          tbl_receipt.receipt_no,
          tbl_receipt.receipt_date,
          tbl_receipt.customer_id,
          tbl_receipt.due_amount,
          tbl_receipt.amount_received,
          tbl_receipt.cheque_no,
          tbl_receipt.no,
          tbl_receipt.balance,
          tbl_receipt.cr_dr,
          tbl_receipt.invoice_no,
          LTRIM(tbl_customer.customer_name) AS customer_name,
          tbl_customer.contact,
          tbl_customer.customer_type,
          tbl_customer.telephone,
          tbl_customer.address,
          tbl_customer.email,
          tbl_customer.due_amount AS customer_due_amount,
          tbl_customer.title_name,
          tbl_customer.reg_date,
          tbl_customer.ad_due,
          tbl_customer.brn,
          tbl_customer.vat,
          tbl_receipt.pre_load,
          tbl_receipt.cash,
          tbl_receipt.cheque,
          tbl_receipt.other,
          tbl_receipt.payment_mode,
          tbl_receipt.bank_name,
          tbl_receipt.invoice_reference,
          tbl_receipt.notes,
          tbl_receipt.company_id
        FROM tbl_receipt
        INNER JOIN tbl_customer ON tbl_receipt.customer_id = tbl_customer.id
        WHERE tbl_receipt.receipt_date BETWEEN ? AND ?
          AND (tbl_receipt.company_id = ? OR ? = 'ALL')
          AND (
            ? = '%%'
            OR LTRIM(tbl_customer.customer_name) LIKE ?
            OR COALESCE(tbl_customer.customer_type, '') LIKE ?
            OR tbl_receipt.receipt_no LIKE ?
            OR COALESCE(tbl_receipt.invoice_no, '') LIKE ?
          )
        ORDER BY tbl_receipt.receipt_date DESC, tbl_receipt.id DESC`,
        [fromDate, toDate, companyFilter, companyFilter, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm],
      );
    },
    enabled: isSinglePreview || Boolean(dateRange),
    staleTime: 30_000,
  });

  const companyLabel = useMemo(() => {
    if (isSinglePreview) {
      const company = companies.find((entry) => entry.id === receiptData[0]?.company_id);
      return company?.company_name ?? `Company ${receiptData[0]?.company_id ?? ''}`;
    }
    if (companyFilter === 'ALL') return 'All Companies';
    const company = companies.find((entry) => String(entry.id) === companyFilter);
    return company?.company_name ?? `Company ${companyFilter}`;
  }, [companies, companyFilter, isSinglePreview, receiptData]);

  const paymentModeLabels = useMemo(() => {
    const s = settings[0];
    if (!s) return null;
    return {
      cash: s.cash ?? 'Cash',
      cheque: s.cheque ?? 'Cheque',
      other: s.other ?? 'Other',
    };
  }, [settings]);

  const rangeLabel = isSinglePreview
    ? formatDisplayDate(receiptData[0]?.receipt_date ?? '')
    : dateRange?.from
      ? `${format(dateRange.from, 'MMM d, yyyy')}${dateRange.to ? ` – ${format(dateRange.to, 'MMM d, yyyy')}` : ''}`
      : 'All dates';

  const singleReceipt = isSinglePreview ? (receiptData[0] ?? null) : null;

  const handleOpenPrintableReport = useCallback(
    async (mode: 'print' | 'pdf') => {
      if (receiptData.length === 0) {
        toast.error('No Data Selected');
        return;
      }

      if ((mode === 'pdf' || singleReceipt) && !settings[0]?.report_path?.trim()) {
        toast.error('Please Set Report Path from Setting');
        return;
      }

      const html = singleReceipt
        ? createSingleReceiptHtml(singleReceipt)
        : createReceiptReportHtml({
            rows: receiptData,
            rangeLabel,
            companyLabel,
            searchTerm: searchTerm.trim(),
            paymentModeLabels,
          });

      if (singleReceipt && settings[0]?.report_path) {
        try {
          await saveReceiptPreviewPdf({
            html,
            configuredPath: settings[0].report_path,
            receiptNo: singleReceipt.receipt_no,
            customerName: singleReceipt.customer_name,
            receiptDate: singleReceipt.receipt_date,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toast.error(`Failed to auto-save receipt PDF: ${message}`);
          return;
        }
      }

      await openPrintableReport({
        html,
        mode,
        requirePath: mode === 'pdf',
        configuredPath: settings[0]?.report_path ?? null,
        outputPath:
          mode === 'pdf' && settings[0]?.report_path
            ? singleReceipt
              ? buildReceiptPdfPath({
                  configuredPath: settings[0].report_path,
                  receiptNo: singleReceipt.receipt_no,
                  customerName: singleReceipt.customer_name,
                  receiptDate: singleReceipt.receipt_date,
                })
              : buildReportPdfPath({
                  configuredPath: settings[0].report_path,
                  filenamePrefix: 'receipt-report',
                  label: companyLabel,
                })
            : null,
      });
    },
    [companyLabel, rangeLabel, receiptData, searchTerm, settings, paymentModeLabels, singleReceipt],
  );

  const handleExportExcel = useCallback(() => {
    if (receiptData.length === 0) {
      toast.error('No Data Selected');
      return;
    }

    downloadExcelXml({
      filenamePrefix: 'receipt-report',
      worksheetName: 'Receipt Report',
      headers: [
        'DATE',
        'RECEIPT NO',
        'CUSTOMER NAME',
        'CUSTOMER TYPE',
        'INVOICE NO',
        'DUE AMOUNT',
        'AMOUNT RECEIVED',
        'CHEQUE NO',
        'PAYMENT MODE',
        'BALANCE',
      ],
      rows: receiptData.map((row) => [
        formatDisplayDate(row.receipt_date),
        row.receipt_no,
        row.customer_name,
        row.customer_type ?? '',
        row.invoice_no ?? '',
        dollars(row.due_amount),
        dollars(row.amount_received),
        formatChequeNo(row.cheque_no),
        row.payment_mode ?? '',
        dollars(row.balance),
      ]),
    });
  }, [receiptData]);

  const columns = useMemo<ColumnDef<ReceiptRow>[]>(
    () => [
      {
        accessorKey: 'receipt_date',
        header: 'Date',
        cell: (info) => formatDisplayDate(info.getValue<string>()),
      },
      {
        accessorKey: 'receipt_no',
        header: 'Receipt NO',
        cell: (info) => (
          <span className="font-medium">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'customer_type',
        header: 'Type',
        cell: (info) => info.getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'invoice_no',
        header: 'Invoice NO',
        cell: (info) => info.getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'due_amount',
        header: 'Due Amount',
        cell: (info) => (
          <span className="tabular-nums">Rs {dollars(info.getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'amount_received',
        header: 'Received',
        cell: (info) => (
          <span className="tabular-nums">Rs {dollars(info.getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'cheque_no',
        header: 'Cheque NO',
        cell: (info) => {
          const val = info.getValue<string | null>();
          return formatChequeNo(val) || '—';
        },
      },
      {
        accessorKey: 'payment_mode',
        header: 'Payment Mode',
        cell: (info) => info.getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: (info) => (
          <span className="tabular-nums">Rs {dollars(info.getValue<number>())}</span>
        ),
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally returns non-memoizable helpers
  const table = useReactTable({
    data: receiptData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
      <div className="flex h-full flex-col gap-4 overflow-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="size-5" />
            <h1 className="text-2xl font-semibold">
              {singleReceipt ? `Receipt Preview: ${singleReceipt.receipt_no}` : 'Receipt Report'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {singleReceipt && (
              <Button variant="outline" onClick={() => navigate('/receipts/new', { state: { receiptId } })}>
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleOpenPrintableReport('print')}
              disabled={receiptData.length === 0}
            >
              <Printer className="mr-2 size-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleOpenPrintableReport('pdf')}
              disabled={receiptData.length === 0}
            >
              <FileText className="mr-2 size-4" />
              View PDF
            </Button>
            {!singleReceipt && (
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={receiptData.length === 0}
              >
                <Download className="mr-2 size-4" />
                Export Excel
              </Button>
            )}
          </div>
        </div>


      <Card>
        {!singleReceipt && (
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start gap-2 text-left font-normal"
                  >
                    <Calendar className="size-4" />
                    <span>{rangeLabel}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.from && range?.to) {
                        setPickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name ?? `Company ${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative min-w-64 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search customer, type, receipt no, invoice no"
                  className="pl-9"
                />
              </div>

              {receiptData.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {receiptData.length} receipt{receiptData.length !== 1 ? 's' : ''}
                  {dateRange?.from &&
                    ` from ${format(dateRange.from, 'MMM d, yyyy')}`}
                  {dateRange?.to &&
                    ` to ${format(dateRange.to, 'MMM d, yyyy')}`}
                </span>
              )}
            </div>
          </CardHeader>
        )}
        <CardContent className={singleReceipt ? 'pt-6' : undefined}>
          {isLoading ? (
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
                          className="cursor-pointer select-none px-4 py-2 text-left font-medium text-muted-foreground"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[h.column.getIsSorted() as string] ?? ''}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No receipts found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t hover:bg-muted/30"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-2">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
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
    </div>
  );
}

export default ReceiptPreview;