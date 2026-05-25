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

interface QuotationListRow {
  quo_id: number;
  customer_name: string;
  customer_type: string | null;
  quo_no: string;
  quo_date: string;
  vat: number;
  discount: number;
  total: number;
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

function createQuotationListReportHtml(options: {
  rows: QuotationListRow[];
  rangeLabel: string;
  companyLabel: string;
  searchTerm: string;
}): string {
  const { rows, rangeLabel, companyLabel, searchTerm } = options;
  const generatedAt = format(new Date(), 'dd-MM-yyyy HH:mm:ss');
  const totalSubTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const totalDiscount = rows.reduce((sum, row) => sum + row.discount, 0);

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${row.quo_id}</td>
          <td>${escapeHtml(row.customer_name)}</td>
          <td>${escapeHtml(row.customer_type ?? '')}</td>
          <td>${escapeHtml(row.telephone ?? '')}</td>
          <td>${escapeHtml(row.quo_no)}</td>
          <td>${escapeHtml(formatDisplayDate(row.quo_date))}</td>
          <td class="num">${row.vat.toFixed(2)}</td>
          <td class="num">${dollars(row.discount)}</td>
          <td class="num">${dollars(row.total)}</td>
          <td>${escapeHtml(row.checklist_no ?? '')}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Quotation List Report</title>
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
        <h1 class="title">Quotation List Report</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Date range:</strong> ${escapeHtml(rangeLabel)}</div>
        <div><strong>Company:</strong> ${escapeHtml(companyLabel)}</div>
        <div><strong>Search:</strong> ${escapeHtml(searchTerm || 'All records')}</div>
      </div>
    </div>
    <div class="summary">
      <div class="card"><div class="label">Quotations</div><div class="value">${rows.length}</div></div>
      <div class="card"><div class="label">Sub Total</div><div class="value">$${dollars(totalSubTotal)}</div></div>
      <div class="card"><div class="label">Discount</div><div class="value">$${dollars(totalDiscount)}</div></div>
      <div class="card"><div class="label">Company</div><div class="value">${escapeHtml(companyLabel)}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Quo ID</th>
          <th>Customer</th>
          <th>Customer Type</th>
          <th>Mobile</th>
          <th>Quotation NO</th>
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
          <td colspan="7">Total</td>
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

function QuotationListReport() {
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
        closeHomeTab('/reports/quotations');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeHomeTab]);

  const handleClose = () => closeHomeTab('/reports/quotations');

  const handleRowDoubleClick = (quoId: number) => {
    navigate('/quotations/new', { state: { quotationId: quoId } });
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
    queryKey: ['quotationListReportSettings'],
    queryFn: () => query<Setting>('SELECT report_path FROM tbl_setting LIMIT 1'),
    staleTime: 5 * 60_000,
  });

  const { data: quotationData = [], isLoading } = useQuery({
    queryKey: [
      'quotationListReport',
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

      return query<QuotationListRow>(
        `SELECT
          tbl_quotation_main.id AS quo_id,
          LTRIM(COALESCE(tbl_customer.title_name + ' ', '') + tbl_customer.customer_name) AS customer_name,
          tbl_customer.customer_type,
          tbl_quotation_main.quo_no,
          tbl_quotation_main.quo_date,
          tbl_quotation_main.vat,
          tbl_quotation_main.discount,
          tbl_quotation_main.total,
          tbl_quotation_main.checklist_no,
          tbl_customer.telephone
        FROM tbl_quotation_main
        INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id
        WHERE tbl_quotation_main.quo_date BETWEEN ? AND ?
          AND (tbl_quotation_main.company_id = ? OR ? = 'ALL')
          AND (
            ? = '%%'
            OR tbl_customer.customer_name LIKE ?
            OR COALESCE(tbl_customer.customer_type, '') LIKE ?
            OR COALESCE(tbl_customer.telephone, '') LIKE ?
            OR tbl_quotation_main.quo_no LIKE ?
            OR COALESCE(tbl_quotation_main.checklist_no, '') LIKE ?
          )
          AND tbl_quotation_main.is_deleted = 0
        ORDER BY tbl_quotation_main.quo_date DESC, tbl_quotation_main.id DESC`,
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
      if (quotationData.length === 0) {
        toast.error('No Data Selected');
        return;
      }

      if (mode === 'pdf' && !settings[0]?.report_path?.trim()) {
        toast.error('Please Set Report Path from Setting');
        return;
      }

      const html = createQuotationListReportHtml({
        rows: quotationData,
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
                filenamePrefix: 'quotation-list-report',
                label: companyLabel,
              })
            : null,
      });
    },
    [companyLabel, rangeLabel, quotationData, searchTerm, settings],
  );

  const handleExportExcel = useCallback(() => {
    if (quotationData.length === 0) {
      toast.error('No Data Selected');
      return;
    }

    downloadExcelXml({
      filenamePrefix: 'quotation-list-report',
      worksheetName: 'Quotation List Report',
      headers: [
        'QUO ID',
        'CUSTOMER NAME',
        'CUSTOMER TYPE',
        'MOBILE',
        'QUOTATION NO',
        'DATE',
        'TAX(%)',
        'DISCOUNT',
        'SUB TOTAL',
        'CHECKLIST NO',
      ],
      rows: quotationData.map((row) => [
        String(row.quo_id),
        row.customer_name,
        row.customer_type ?? '',
        row.telephone ?? '',
        row.quo_no,
        formatDisplayDate(row.quo_date),
        row.vat.toFixed(2),
        dollars(row.discount),
        dollars(row.total),
        row.checklist_no ?? '',
      ]),
    });
  }, [quotationData]);

  const columns = useMemo<ColumnDef<QuotationListRow>[]>(
    () => [
      {
        accessorKey: 'quo_id',
        header: 'Quo ID',
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
        accessorKey: 'telephone',
        header: 'Mobile',
        cell: (info) => info.getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'quo_no',
        header: 'Quotation NO',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'quo_date',
        header: 'Date',
        cell: (info) => formatDisplayDate(info.getValue<string>()),
      },
      {
        accessorKey: 'vat',
        header: 'Tax%',
        cell: (info) => <span className="tabular-nums">{info.getValue<number>().toFixed(2)}</span>,
      },
      {
        accessorKey: 'discount',
        header: 'Discount',
        cell: (info) => (
          <span className="tabular-nums">${dollars(info.getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'total',
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
    data: quotationData,
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
          <h1 className="text-2xl font-semibold">Quotation List Report</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenPrintableReport('print')}
            disabled={quotationData.length === 0}
          >
            <Printer className="mr-2 size-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenPrintableReport('pdf')}
            disabled={quotationData.length === 0}
          >
            <FileText className="mr-2 size-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={quotationData.length === 0}
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
                placeholder="Search customer, type, telephone, quotation no, checklist"
                className="pl-9"
              />
            </div>

            {quotationData.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {quotationData.length} quotation{quotationData.length !== 1 ? 's' : ''}
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
                        No quotations found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onDoubleClick={() =>
                          handleRowDoubleClick(row.original.quo_id)
                        }
                        title="Double-click to view quotation"
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

export default QuotationListReport;