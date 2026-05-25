import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
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
  BarChart3,
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

interface InvoiceListRow {
  sales_id: number;
  customer_name: string;
  customer_type: string | null;
  invoice_no: string;
  invoice_date: string;
  vat_per: number;
  discount: number;
  sub_total: number;
  checklist_no: string | null;
  telephone: string | null;
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

  return format(parsed, 'dd-MM-yyyy');
}

function createInvoiceListReportHtml(options: {
  rows: InvoiceListRow[];
  rangeLabel: string;
  companyLabel: string;
  searchTerm: string;
}): string {
  const { rows, rangeLabel, companyLabel, searchTerm } = options;
  const generatedAt = format(new Date(), 'dd-MM-yyyy HH:mm:ss');
  const totalSubTotal = rows.reduce((sum, row) => sum + row.sub_total, 0);
  const totalDiscount = rows.reduce((sum, row) => sum + row.discount, 0);

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${row.sales_id}</td>
          <td>${escapeHtml(row.customer_name)}</td>
          <td>${escapeHtml(row.customer_type ?? '')}</td>
          <td>${escapeHtml(row.invoice_no)}</td>
          <td>${escapeHtml(formatDisplayDate(row.invoice_date))}</td>
          <td class="num">${row.vat_per}%</td>
          <td class="num">${dollars(row.discount)}</td>
          <td class="num">${dollars(row.sub_total)}</td>
          <td>${escapeHtml(row.checklist_no ?? '')}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice List Report</title>
  <style>
    @page { margin: 14mm; size: A4 landscape; }
    :root { color-scheme: light; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    main { padding: 24px; }
    .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 20px; }
    .title { margin: 0; font-size: 24px; }
    .meta { color: #4b5563; font-size: 12px; line-height: 1.5; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
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
        <h1 class="title">Invoice List Report</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Date range:</strong> ${escapeHtml(rangeLabel)}</div>
        <div><strong>Company:</strong> ${escapeHtml(companyLabel)}</div>
        <div><strong>Search:</strong> ${escapeHtml(searchTerm || 'All records')}</div>
      </div>
    </div>
    <div class="summary">
      <div class="card"><div class="label">Invoices</div><div class="value">${rows.length}</div></div>
      <div class="card"><div class="label">Sub Total</div><div class="value">$${dollars(totalSubTotal)}</div></div>
      <div class="card"><div class="label">Discount</div><div class="value">$${dollars(totalDiscount)}</div></div>
      <div class="card"><div class="label">Company</div><div class="value">${escapeHtml(companyLabel)}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Sales ID</th>
          <th>Customer</th>
          <th>Customer Type</th>
          <th>Invoice NO</th>
          <th>Date</th>
          <th>Tax%</th>
          <th>Discount</th>
          <th>Sub Total</th>
          <th>Checklist NO</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="6">Total</td>
          <td class="num">$${dollars(totalDiscount)}</td>
          <td class="num">$${dollars(totalSubTotal)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </main>
</body>
</html>`;
}

function InvoiceListReport() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const closeHomeTab = useUIStore(state => state.closeHomeTab);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeHomeTab('/reports/invoices');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeHomeTab]);

  const handleClose = () => closeHomeTab('/reports/invoices');

  const handleRowDoubleClick = (salesId: number) => {
    navigate('/invoices/new', { state: { invoiceId: salesId } });
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
    queryKey: ['invoiceListReportSettings'],
    queryFn: () => query<Setting>('SELECT report_path FROM tbl_setting LIMIT 1'),
    staleTime: 5 * 60_000,
  });

  const { data: invoiceData = [], isLoading } = useQuery({
    queryKey: [
      'invoiceListReport',
      dateRange?.from?.toISOString() ?? '',
      dateRange?.to?.toISOString() ?? '',
      companyFilter,
      searchTerm,
    ],
    queryFn: () => {
      const fromDate = dateRange?.from
        ? format(dateRange.from, 'yyyy-MM-dd')
        : '1970-01-01';
      const toDate = dateRange?.to
        ? format(dateRange.to, 'yyyy-MM-dd')
        : '2099-12-31';
      const likeTerm = `%${searchTerm.trim()}%`;

      return query<InvoiceListRow>(
        `SELECT
          tbl_invoice_main.id AS sales_id,
          LTRIM(tbl_customer.customer_name) AS customer_name,
          tbl_customer.customer_type,
          tbl_invoice_main.invoice_no,
          tbl_invoice_main.invoice_date,
          tbl_invoice_main.per AS vat_per,
          tbl_invoice_main.discount,
          tbl_invoice_main.sub_total,
          tbl_invoice_main.checklist_no,
          tbl_customer.telephone
        FROM tbl_invoice_main
        INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
        WHERE tbl_invoice_main.invoice_date BETWEEN ? AND ?
          AND (tbl_invoice_main.company_id = ? OR ? = 'ALL')
          AND (
            ? = '%%'
            OR tbl_customer.customer_name LIKE ?
            OR COALESCE(tbl_customer.customer_type, '') LIKE ?
            OR COALESCE(tbl_customer.telephone, '') LIKE ?
            OR tbl_invoice_main.invoice_no LIKE ?
            OR COALESCE(tbl_invoice_main.checklist_no, '') LIKE ?
          )
          AND tbl_invoice_main.is_deleted = 0
        ORDER BY tbl_invoice_main.invoice_date DESC, tbl_invoice_main.id DESC`,
        [
          fromDate,
          toDate,
          companyFilter,
          companyFilter,
          likeTerm,
          likeTerm,
          likeTerm,
          likeTerm,
          likeTerm,
          likeTerm,
        ],
      );
    },
    staleTime: 30_000,
  });

  const companyLabel = useMemo(() => {
    if (companyFilter === 'ALL') {
      return 'All Companies';
    }

    const company = companies.find((entry) => String(entry.id) === companyFilter);
    return company?.company_name ?? `Company ${companyFilter}`;
  }, [companies, companyFilter]);

  const rangeLabel = dateRange?.from
    ? `${format(dateRange.from, 'MMM d, yyyy')}${dateRange.to ? ` – ${format(dateRange.to, 'MMM d, yyyy')}` : ''}`
    : 'All dates';

  const handleOpenPrintableReport = useCallback(
    (mode: 'print' | 'pdf') => {
      if (invoiceData.length === 0) {
        toast.error('No Data Selected');
        return;
      }

      if (mode === 'pdf' && !settings[0]?.report_path?.trim()) {
        toast.error('Please Set Report Path from Setting');
        return;
      }

      const html = createInvoiceListReportHtml({
        rows: invoiceData,
        rangeLabel,
        companyLabel,
        searchTerm: searchTerm.trim(),
      });

      openPrintableReport({
        html,
        mode,
        requirePath: mode === 'pdf',
        configuredPath: settings[0]?.report_path ?? null,
        outputPath:
          mode === 'pdf' && settings[0]?.report_path
            ? buildReportPdfPath({
                configuredPath: settings[0].report_path,
                filenamePrefix: 'invoice-list-report',
                label: companyLabel,
              })
            : null,
      });
    },
    [companyLabel, rangeLabel, invoiceData, searchTerm, settings],
  );

  const handleExportExcel = useCallback(() => {
    if (invoiceData.length === 0) {
      toast.error('No Data Selected');
      return;
    }

    downloadExcelXml({
      filenamePrefix: 'invoice-list-report',
      worksheetName: 'Invoice List Report',
      headers: [
        'SALES ID',
        'CUSTOMER',
        'CUSTOMER TYPE',
        'INVOICE NO',
        'DATE',
        'TAX%',
        'DISCOUNT',
        'SUB TOTAL',
        'CHECKLIST NO',
      ],
      rows: invoiceData.map((row) => [
        String(row.sales_id),
        row.customer_name,
        row.customer_type ?? '',
        row.invoice_no,
        formatDisplayDate(row.invoice_date),
        `${row.vat_per}%`,
        dollars(row.discount),
        dollars(row.sub_total),
        row.checklist_no ?? '',
      ]),
    });
  }, [invoiceData]);

  const columns = useMemo<ColumnDef<InvoiceListRow>[]>(
    () => [
      {
        accessorKey: 'sales_id',
        header: 'Sales ID',
        cell: (info) => <span className="font-medium">{info.getValue<number>()}</span>,
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'customer_type',
        header: 'Customer Type',
        cell: (info) => info.getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'invoice_no',
        header: 'Invoice NO',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'invoice_date',
        header: 'Date',
        cell: (info) => formatDisplayDate(info.getValue<string>()),
      },
      {
        accessorKey: 'vat_per',
        header: 'Tax%',
        cell: (info) => <span className="tabular-nums">{info.getValue<number>()}%</span>,
      },
      {
        accessorKey: 'discount',
        header: 'Discount',
        cell: (info) => (
          <span className="tabular-nums">${dollars(info.getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'sub_total',
        header: 'Sub Total',
        cell: (info) => (
          <span className="tabular-nums">${dollars(info.getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'checklist_no',
        header: 'Checklist NO',
        cell: (info) => info.getValue<string | null>() ?? '—',
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally returns non-memoizable helpers
  const table = useReactTable({
    data: invoiceData,
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
          <BarChart3 className="size-5" />
          <h1 className="text-2xl font-semibold">Invoice List Report</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenPrintableReport('print')}
            disabled={invoiceData.length === 0}
          >
            <Printer className="mr-2 size-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenPrintableReport('pdf')}
            disabled={invoiceData.length === 0}
          >
            <FileText className="mr-2 size-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={invoiceData.length === 0}
          >
            <Download className="mr-2 size-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
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
                placeholder="Search customer, type, telephone, invoice no, checklist"
                className="pl-9"
              />
            </div>

            {invoiceData.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {invoiceData.length} invoice{invoiceData.length !== 1 ? 's' : ''}
                {dateRange?.from &&
                  ` from ${format(dateRange.from, 'MMM d, yyyy')}`}
                {dateRange?.to &&
                  ` to ${format(dateRange.to, 'MMM d, yyyy')}`}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">
              Loading...
            </p>
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
                          {{ asc: ' ↑', desc: ' ↓' }[
                            h.column.getIsSorted() as string
                          ] ?? ''}
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
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onDoubleClick={() =>
                          handleRowDoubleClick(row.original.sales_id)
                        }
                        title="Double-click to view invoice"
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

export default InvoiceListReport;