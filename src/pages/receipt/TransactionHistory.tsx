import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import { buildReportPdfPath, escapeHtml, openPrintableReport } from '@/lib/report-output';
import { deleteReceipt } from '@/lib/receipt/delete';
import { sendEmail } from '@/lib/email/send';
import type { Company, Setting, Receipt as ReceiptRecord } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/rbac';
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
import { toast } from 'sonner';
import {
  Eye,
  FilePenLine,
  FileText,
  Mail,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ReceiptListRow extends ReceiptRecord {
  customer_name: string;
  customer_email: string | null;
  customer_contact: string | null;
  title_name: string | null;
  customer_due_amount: number;
  customer_ad_due: string | null;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function formatDisplayDate(date: string): string {
  if (!date) {
    return '';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-GB');
}

function formatChequeNo(chequeNo: string | null): string {
  if (!chequeNo) {
    return '—';
  }

  const trimmed = chequeNo.trim();
  if (trimmed === '' || trimmed === '0' || trimmed === '0.00') {
    return '—';
  }

  return trimmed;
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
  const { configuredPath, receiptNo, customerName, receiptDate, receiptFolder = false } = options;
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

function createReceiptPdfHtml(receipt: ReceiptListRow): string {
  const customerLabel = `${receipt.title_name ?? ''} ${receipt.customer_name}`.trim() || receipt.customer_name;
  const generatedAt = new Date().toLocaleString('en-GB');
  const duePrefix = receipt.customer_ad_due === 'Advance' ? '-' : '';
  const chequeNo = formatChequeNo(receipt.cheque_no);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(receipt.receipt_no)}</title>
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
        <div><strong>Receipt No:</strong> ${escapeHtml(receipt.receipt_no)}</div>
        <div><strong>Date:</strong> ${escapeHtml(formatDisplayDate(receipt.receipt_date))}</div>
        <div><strong>Customer:</strong> ${escapeHtml(customerLabel)}</div>
      </div>
    </div>

    <div class="summary">
      <div class="card"><div class="label">Received</div><div class="value">$${dollars(receipt.amount_received)}</div></div>
      <div class="card"><div class="label">Due Amount</div><div class="value">${escapeHtml(duePrefix)}$${dollars(receipt.customer_due_amount)}</div></div>
      <div class="card"><div class="label">Cheque No</div><div class="value">${escapeHtml(chequeNo)}</div></div>
      <div class="card"><div class="label">Payment Mode</div><div class="value">${escapeHtml(receipt.payment_mode ?? '—')}</div></div>
    </div>

    <table>
      <tbody>
        <tr><th>Customer Email</th><td>${escapeHtml(receipt.customer_email ?? '—')}</td></tr>
        <tr><th>Contact Person</th><td>${escapeHtml(receipt.customer_contact ?? '—')}</td></tr>
        <tr><th>Balance Before Receipt</th><td class="amount">$${dollars(receipt.balance ?? 0)}</td></tr>
        <tr><th>Stored Receipt Due</th><td class="amount">$${dollars(receipt.due_amount ?? 0)}</td></tr>
      </tbody>
    </table>

    <div class="notes">
      <div class="label">Notes</div>
      <div>${escapeHtml(receipt.notes?.trim() || '—')}</div>
    </div>
  </main>
</body>
</html>`;
}

function ReceiptList() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);

  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [emailingId, setEmailingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['receipt-list'],
    queryFn: async () => {
      const [receiptRows, companyRows, settingRows] = await Promise.all([
        query<ReceiptListRow>(
          `SELECT
             r.*,
             c.customer_name,
             c.email AS customer_email,
             c.contact AS customer_contact,
             c.title_name,
             c.due_amount AS customer_due_amount,
             c.ad_due AS customer_ad_due
           FROM tbl_receipt r
           INNER JOIN tbl_customer c ON r.customer_id = c.id
           ORDER BY CAST(r.receipt_no AS INTEGER) DESC, r.receipt_date DESC, r.id DESC`,
        ),
        query<Company>('SELECT id, company_name FROM tbl_company WHERE is_active = 1'),
        query<Setting>('SELECT * FROM tbl_setting WHERE id = 1 LIMIT 1'),
      ]);

      return {
        receipts: receiptRows,
        companies: companyRows,
        settings: settingRows[0] ?? null,
      };
    },
    staleTime: 30_000,
  });

  const companies = data?.companies ?? [];
  const settings = data?.settings ?? null;

  const filtered = useMemo(() => {
    const rows = data?.receipts ?? [];
    if (search.trim()) {
      const value = search.trim().toLowerCase();
      return rows.filter(
        (receipt) =>
          receipt.customer_name.toLowerCase().includes(value) ||
          receipt.receipt_no.toLowerCase().startsWith(value),
      ).filter((receipt) => companyFilter === 'all' || receipt.company_id === parseInt(companyFilter, 10));
    }
    if (companyFilter !== 'all') {
      return rows.filter((receipt) => receipt.company_id === parseInt(companyFilter, 10));
    }
    return rows;
  }, [companyFilter, data?.receipts, search]);

  const handleEdit = useCallback(
    (receiptId: number) => {
      navigate('/receipts/new', { state: { receiptId } });
    },
    [navigate],
  );

  const handlePreview = useCallback(
    (receiptId: number) => {
      navigate('/reports/receipts', { state: { receiptId } });
    },
    [navigate],
  );

  const handleEmail = useCallback(
    async (receipt: ReceiptListRow) => {
      if (!receipt.customer_email?.trim()) {
        toast.error('Customer email is not configured');
        return;
      }

      const reportPath = settings?.report_path?.trim() ?? '';
      const pdfPath = reportPath
        ? buildReceiptPdfPath({
            configuredPath: reportPath,
            receiptNo: receipt.receipt_no,
            customerName: receipt.customer_name,
            receiptDate: receipt.receipt_date,
          })
        : undefined;

      setEmailingId(receipt.id);
      try {
        const result = await sendEmail({
          to: receipt.customer_email,
          template_type: 'RECEIPT',
          pdf_path: pdfPath,
          variables: {
            date: formatDisplayDate(receipt.receipt_date),
            contact_person: receipt.customer_contact ?? '',
            name: `${receipt.title_name ?? ''} ${receipt.customer_name}`.trim() || receipt.customer_name,
          },
        });

        if (!result.success) {
          toast.error(result.error ?? 'Failed to send receipt email');
          return;
        }

        toast.success(`Receipt ${receipt.receipt_no} emailed to ${receipt.customer_name}`);
      } finally {
        setEmailingId(null);
      }
    },
    [settings?.report_path],
  );

  const handleSavePdf = useCallback(
    async (receipt: ReceiptListRow) => {
      if (!settings?.report_path?.trim()) {
        toast.error('Please Set Report Path from Setting');
        return;
      }

      const pdfPath = buildReceiptPdfPath({
        configuredPath: settings.report_path,
        receiptNo: receipt.receipt_no,
        customerName: receipt.customer_name,
        receiptDate: receipt.receipt_date,
        receiptFolder: true,
      });
      const previewPath = buildReportPdfPath({
        configuredPath: settings.report_path,
        filenamePrefix: 'receipt',
        label: receipt.receipt_no,
      });

      try {
        await openPrintableReport({
          html: createReceiptPdfHtml(receipt),
          mode: 'pdf',
          requirePath: true,
          configuredPath: settings.report_path,
          outputPath: pdfPath,
        });
        toast.success('Receipt PDF generated', {
          description: `Saved to ${pdfPath} | helper path ${previewPath}`,
        });
      } catch (error) {
        toast.error(`Unable to save receipt PDF: ${String(error)}`);
      }
    },
    [settings?.report_path],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) {
      return;
    }

    setDeleting(true);
    try {
      await deleteReceipt(deleteConfirm);
      toast.success('Receipt deleted');
      setDeleteConfirm(null);
      await refetch();
    } catch (error) {
      toast.error(`Delete failed: ${String(error)}`);
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, refetch]);

  const columns = useMemo<ColumnDef<ReceiptListRow>[]>(
    () => [
      {
        accessorKey: 'receipt_no',
        header: 'Receipt No',
        cell: (info) => <span className="font-medium">{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'receipt_date',
        header: 'Receipt Date',
        cell: (info) => formatDisplayDate(info.getValue<string>()),
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer Name',
      },
      {
        accessorKey: 'amount_received',
        header: 'Amount Received',
        cell: (info) => <span className="tabular-nums">${dollars(info.getValue<number>())}</span>,
      },
      {
        id: 'due_amount_after',
        header: 'Due Amount',
        cell: (info) => {
          const row = info.row.original;
          const prefix = row.customer_ad_due === 'Advance' ? '-' : '';
          return <span className="tabular-nums">{prefix}${dollars(row.customer_due_amount)}</span>;
        },
      },
      {
        accessorKey: 'cheque_no',
        header: 'Cheque No',
        cell: (info) => formatChequeNo(info.getValue<string | null>()),
      },
      {
        id: 'edit',
        header: '',
        cell: (info) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleEdit(info.row.original.id)}
            aria-label={`Edit receipt ${info.row.original.receipt_no}`}
          >
            <FilePenLine className="size-3.5" />
          </Button>
        ),
      },
      {
        id: 'preview',
        header: '',
        cell: (info) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handlePreview(info.row.original.id)}
            aria-label={`Preview receipt ${info.row.original.receipt_no}`}
          >
            <Eye className="size-3.5" />
          </Button>
        ),
      },
      {
        id: 'email',
        header: '',
        cell: (info) => {
          const row = info.row.original;
          const busy = emailingId === row.id;
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleEmail(row)}
              disabled={busy}
              aria-label={`Email receipt ${row.receipt_no}`}
            >
              <Mail className="size-3.5" />
            </Button>
          );
        },
      },
      {
        id: 'pdf',
        header: '',
        cell: (info) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void handleSavePdf(info.row.original)}
            aria-label={`Save PDF for receipt ${info.row.original.receipt_no}`}
          >
            <FileText className="size-3.5" />
          </Button>
        ),
      },
      {
        id: 'delete',
        header: '',
        cell: (info) =>
          admin ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(info.row.original.id)}
              aria-label={`Delete receipt ${info.row.original.receipt_no}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null,
      },
    ],
    [admin, emailingId, handleEdit, handleEmail, handlePreview, handleSavePdf],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <div className="flex h-full flex-col gap-4 overflow-auto p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="size-5" />
            <h1 className="text-2xl font-semibold">View Receipt</h1>
          </div>
          <Button onClick={() => navigate('/receipts/new')}>
            <Receipt className="mr-2 size-4" />
            Add Receipt
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">Total : {filtered.length}</div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer or receipt no..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.company_name ?? `Company ${company.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    {table.getHeaderGroups().map((group) => (
                      <tr key={group.id} className="bg-muted/50">
                        {group.headers.map((header) => (
                          <th
                            key={header.id}
                            className="cursor-pointer select-none px-4 py-2 text-left font-medium text-muted-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                          No receipts found
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
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the receipt and restore the customer balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Receipt'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ReceiptList;
