import { useState, useMemo, useCallback } from 'react';
import { sendEmail } from '@/lib/email/send';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import { commands } from '@/lib/tauri-bindings';
import {
  buildReportPdfPath,
  downloadExcelXml,
  escapeHtml,
  openPrintableReport,
} from '@/lib/report-output';
import type { Company, Customer, Setting } from '@/lib/types';
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
import { format } from 'date-fns';
import 'react-day-picker/style.css';
import { Download, FileText, Calendar, Search, Mail } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface StatementRow {
  id: number;
  ref_no: string;
  date: string;
  type: 'Invoice' | 'Payment';
  checklist_no: string | null;
  bill_amount: number;
  paid_amount: number;
  cheque_no: string | null;
  balance: number;
  extra: string | null;
  cr_dr: string | null;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function createStatementReportHtml(options: {
  customerName: string;
  companyLabel: string;
  rangeLabel: string;
  openingBalance: number;
  closingBalance: number;
  rows: StatementRow[];
}): string {
  const {
    customerName,
    companyLabel,
    rangeLabel,
    openingBalance,
    closingBalance,
    rows,
  } = options;

  const generatedAt = new Date().toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');

  const tableRows = rows.map((row) => {
    const isPayment = row.type === 'Payment';
    return `
        <tr>
          <td>${escapeHtml(row.ref_no)}</td>
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(row.type)}</td>
          <td>${escapeHtml(row.checklist_no ?? '-')}</td>
          <td class="amount">${isPayment ? '' : '$'}${dollars(row.bill_amount)}</td>
          <td class="amount">${isPayment ? '$' : ''}${dollars(row.paid_amount)}</td>
          <td>${escapeHtml(row.cheque_no ?? '-')}</td>
          <td class="amount">${dollars(row.balance)}</td>
        </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Statement of Account</title>
  <style>
    @page { margin: 14mm; size: A4 landscape; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    main { padding: 24px; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
    .title { margin: 0; font-size: 24px; }
    .meta { color: #4b5563; font-size: 12px; line-height: 1.5; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
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
        <h1 class="title">Statement of Account</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Customer:</strong> ${escapeHtml(customerName)}</div>
        <div><strong>Company:</strong> ${escapeHtml(companyLabel)}</div>
        <div><strong>Date range:</strong> ${escapeHtml(rangeLabel)}</div>
      </div>
    </div>
    <div class="summary">
      <div class="card"><div class="label">Opening Balance</div><div class="value">${escapeHtml(`${openingBalance > 0 ? '' : '-'}$${dollars(Math.abs(openingBalance))}`)}</div></div>
      <div class="card"><div class="label">Transactions</div><div class="value">${rows.length}</div></div>
      <div class="card"><div class="label">Closing Balance</div><div class="value">${escapeHtml(`${closingBalance > 0 ? '' : '-'}$${dollars(Math.abs(closingBalance))}`)}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Ref #</th>
          <th>Date</th>
          <th>Type</th>
          <th>Checklist No</th>
          <th>Bill Amount</th>
          <th>Paid Amount</th>
          <th>Cheque No</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </main>
</body>
</html>`;
}

function StatementPreview() {
  const [customerId, setCustomerId] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () =>
      query<Company>(
        'SELECT id, company_name FROM tbl_company WHERE is_active = 1',
      ),
    staleTime: 5 * 60_000,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['statementSettings'],
    queryFn: () => query<Setting>('SELECT report_path FROM tbl_setting LIMIT 1'),
    staleTime: 5 * 60_000,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['statementCustomers', companyFilter],
    queryFn: () =>
      query<Customer>(
        `SELECT id, customer_name, due_amount, company_id, email, title_name, contact
         FROM tbl_customer
         WHERE is_deleted = 0
           AND (company_id = ? OR ? = 'ALL')
         ORDER BY customer_name`,
        [companyFilter, companyFilter],
      ),
    staleTime: 30_000,
  });

  const companyLabel = useMemo(() => {
    if (companyFilter === 'ALL') {
      return 'All Companies';
    }

    const company = companies.find((entry) => String(entry.id) === companyFilter);
    return company?.company_name ?? `Company ${companyFilter}`;
  }, [companies, companyFilter]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === customerId),
    [customers, customerId],
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const search = customerSearch.toLowerCase();
    return customers
      .filter((c) => c.customer_name.toLowerCase().includes(search))
      .slice(0, 10);
  }, [customers, customerSearch]);

  const handleSelectCustomer = useCallback((c: Customer & { email?: string | null }) => {
    setCustomerId(String(c.id));
    setCustomerSearch(c.customer_name);
    setShowCustomerResults(false);
  }, []);

  const fromDate = dateRange?.from
    ? format(dateRange.from, 'yyyy-MM-dd')
    : '1970-01-01';
  const toDate = dateRange?.to
    ? format(dateRange.to, 'yyyy-MM-dd')
    : '2099-12-31';

  const hasFilter = customerId !== '';

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['statementInvoices', customerId, fromDate, toDate],
    queryFn: () =>
      query<StatementRow>(
        `SELECT 
          tbl_invoice_main.id,
          tbl_invoice_main.invoice_no AS ref_no,
          tbl_invoice_main.invoice_date AS date,
          tbl_invoice_main.checklist_no,
          (tbl_invoice_main.sub_total - tbl_invoice_main.discount) AS bill_amount,
          tbl_invoice_main.paid_amount,
          '-' AS cheque_no,
          tbl_invoice_main.balance,
          tbl_invoice_main.no AS extra,
          tbl_invoice_main.cr_dr
         FROM tbl_invoice_main
         INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
         WHERE tbl_invoice_main.customer_id = ?
           AND tbl_invoice_main.is_deleted = 0
           AND tbl_invoice_main.invoice_date BETWEEN ? AND ?
         ORDER BY tbl_invoice_main.invoice_date`,
        [customerId, fromDate, toDate],
      ),
    enabled: hasFilter,
    staleTime: 30_000,
  });

  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ['statementReceipts', customerId, fromDate, toDate],
    queryFn: () =>
      query<StatementRow>(
        `SELECT 
          tbl_receipt.id,
          tbl_receipt.receipt_no AS ref_no,
          tbl_receipt.receipt_date AS date,
          '-' AS checklist_no,
          0 AS bill_amount,
          tbl_receipt.amount_received AS paid_amount,
          tbl_receipt.cheque_no,
          tbl_receipt.due_amount AS balance,
          tbl_receipt.no AS extra,
          tbl_receipt.cr_dr
         FROM tbl_receipt
         INNER JOIN tbl_customer ON tbl_receipt.customer_id = tbl_customer.id
         WHERE tbl_receipt.customer_id = ?
           AND tbl_receipt.is_deleted = 0
           AND tbl_receipt.receipt_date BETWEEN ? AND ?
         ORDER BY tbl_receipt.receipt_date`,
        [customerId, fromDate, toDate],
      ),
    enabled: hasFilter,
    staleTime: 30_000,
  });

  const transactions = useMemo<StatementRow[]>(() => {
    const combined: StatementRow[] = [
      ...invoices.map((inv) => ({
        ...inv,
        type: 'Invoice' as const,
      })),
      ...receipts.map((rec) => ({
        ...rec,
        type: 'Payment' as const,
      })),
    ];
    combined.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.extra ?? '').localeCompare(b.extra ?? '');
    });
    return combined;
  }, [invoices, receipts]);

  const runningBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    return selectedCustomer.due_amount;
  }, [selectedCustomer]);

  const openingBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    return selectedCustomer.due_amount;
  }, [selectedCustomer]);

  const columns = useMemo<ColumnDef<StatementRow>[]>(
    () => [
      {
        accessorKey: 'ref_no',
        header: 'Ref #',
        cell: (info) => (
          <span className="font-medium">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (info) => {
          const t = info.getValue<string>();
          return (
            <span
              className={
                t === 'Invoice'
                  ? 'font-medium text-destructive'
                  : 'font-medium text-green-600'
              }
            >
              {t}
            </span>
          );
        },
      },
      {
        accessorKey: 'checklist_no',
        header: 'Checklist No',
        cell: (info) => info.getValue<string>() ?? '-',
      },
      {
        accessorKey: 'bill_amount',
        header: 'Bill Amount',
        cell: (info) => {
          const d = info.getValue<number>();
          return <span className="tabular-nums">${dollars(d)}</span>;
        },
      },
      {
        accessorKey: 'paid_amount',
        header: 'Paid Amount',
        cell: (info) => {
          const d = info.getValue<number>();
          return <span className="tabular-nums">${dollars(d)}</span>;
        },
      },
      {
        accessorKey: 'cheque_no',
        header: 'Cheque No',
        cell: (info) => info.getValue<string>() ?? '-',
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: (info) => {
          const d = info.getValue<number>();
          return <span className="tabular-nums">${dollars(d)}</span>;
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const isLoading = loadingInvoices || loadingReceipts;
  const rangeLabel = dateRange?.from
    ? `${format(dateRange.from, 'MMM d, yyyy')}${dateRange.to ? ` – ${format(dateRange.to, 'MMM d, yyyy')}` : ''}`
    : 'All dates';

  const handleOpenPrintableReport = useCallback(
    (mode: 'print' | 'pdf') => {
      if (!transactions.length || !selectedCustomer) {
        toast.error('No Data Selected');
        return;
      }

      const html = createStatementReportHtml({
        customerName: selectedCustomer.customer_name,
        companyLabel,
        rangeLabel,
        openingBalance,
        closingBalance: runningBalance,
        rows: transactions,
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
                filenamePrefix: 'SOA',
                label: selectedCustomer.customer_name,
              })
            : null,
      });
    },
    [companyLabel, openingBalance, rangeLabel, runningBalance, selectedCustomer, settings, transactions],
  );

  const handleExportExcel = useCallback(() => {
    if (!transactions.length || !selectedCustomer) {
      toast.error('No Data Selected');
      return;
    }

    downloadExcelXml({
      filenamePrefix: `SOA-${selectedCustomer.customer_name}`,
      worksheetName: 'Statement Report',
      headers: ['REF #', 'DATE', 'TYPE', 'CHECKLIST NO', 'BILL AMOUNT', 'PAID AMOUNT', 'CHEQUE NO', 'BALANCE'],
      rows: transactions.map((row) => [
        row.ref_no,
        row.date,
        row.type,
        row.checklist_no ?? '-',
        dollars(row.bill_amount),
        dollars(row.paid_amount),
        row.cheque_no ?? '-',
        dollars(row.balance),
      ]),
    });
  }, [selectedCustomer, transactions]);

  const handleSendEmail = useCallback(async () => {
    if (!transactions.length || !selectedCustomer) {
      toast.error('No Data Selected');
      return;
    }

    if (!selectedCustomer.email) {
      toast.error('Customer email is not configured');
      return;
    }

    if (!settings[0]?.report_path) {
      toast.error('Please Set Report Path from Setting');
      return;
    }

    const pdfPath = buildReportPdfPath({
      configuredPath: settings[0].report_path,
      filenamePrefix: 'SOA',
      label: selectedCustomer.customer_name,
    });

    const html = createStatementReportHtml({
      customerName: selectedCustomer.customer_name,
      companyLabel,
      rangeLabel,
      openingBalance,
      closingBalance: runningBalance,
      rows: transactions,
    });

    try {
      await commands.saveReportPdf({ html, output_path: pdfPath });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to generate PDF: ${msg}`);
      return;
    }

    const result = await sendEmail({
      to: selectedCustomer.email,
      template_type: 'STATEMENT',
      variables: {
        date: new Date().toLocaleDateString('en-GB'),
        contact_person: selectedCustomer.title_name ?? '',
        name: selectedCustomer.customer_name,
      },
      pdf_path: pdfPath,
    });

    if (!result.success) {
      toast.error(result.error ?? 'Failed to send email');
      return;
    }

    toast.success(`Statement emailed to ${selectedCustomer.email}`);
  }, [companyLabel, openingBalance, rangeLabel, runningBalance, selectedCustomer, settings, transactions]);


  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">Statement of Account</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenPrintableReport('print')}
            disabled={transactions.length === 0}
          >
            <FileText className="mr-2 size-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenPrintableReport('pdf')}
            disabled={transactions.length === 0}
          >
            <Download className="mr-2 size-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={transactions.length === 0}
          >
            <Download className="mr-2 size-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={transactions.length === 0}
          >
            <Mail className="mr-2 size-4" />
            Email PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search customer..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerResults(true);
                }}
                onFocus={() => setShowCustomerResults(true)}
                className="w-56 pl-8"
              />
              {showCustomerResults && filteredCustomers.length > 0 && (
                <div className="absolute z-10 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-md">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <span>{c.customer_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.due_amount > 0 ? `$${dollars(c.due_amount)}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

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

            {transactions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasFilter ? (
            <p className="py-8 text-center text-muted-foreground">
              Search and select a customer to view their statement
            </p>
          ) : isLoading ? (
            <p className="py-8 text-center text-muted-foreground">
              Loading...
            </p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Opening Balance
                  </div>
                  <div
                    className={`text-lg font-semibold tabular-nums ${openingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}
                  >
                    {openingBalance > 0 ? '' : '-'}$
                    {dollars(Math.abs(openingBalance))}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Period Activity
                  </div>
                  <div
                    className={`text-lg font-semibold tabular-nums ${
                      invoices.reduce((s, i) => s + i.bill_amount, 0) -
                        receipts.reduce((s, r) => s + r.paid_amount, 0) >
                      0
                        ? 'text-destructive'
                        : 'text-green-600'
                    }`}
                  >
                    {(() => {
                      const net =
                        invoices.reduce((s, i) => s + i.bill_amount, 0) -
                        receipts.reduce((s, r) => s + r.paid_amount, 0);
                      const sign = net > 0 ? '' : '-';
                      return `${sign}$${dollars(Math.abs(net))}`;
                    })()}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Closing Balance
                  </div>
                  <div
                    className={`text-lg font-semibold tabular-nums ${runningBalance > 0 ? 'text-destructive' : 'text-green-600'}`}
                  >
                    {runningBalance > 0 ? '' : '-'}$
                    {dollars(Math.abs(runningBalance))}
                  </div>
                </div>
              </div>

              {transactions.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No transactions found for this period
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
                      {table.getRowModel().rows.map((row) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StatementPreview;