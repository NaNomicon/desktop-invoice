import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import {
  getInvoicePdfPath,
} from '@/lib/pdf/path';
import type {
  Company,
  Customer,
} from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Download, FileText, Calendar } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface StatementRow {
  ref_no: string;
  date: string;
  type: 'Invoice' | 'Receipt';
  amount: number; // INTEGER cents — positive for invoices, negative display for receipts
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function StatementPreview() {
  const [customerId, setCustomerId] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () =>
      query<Company>(
        'SELECT id, company_name FROM tbl_company WHERE is_active = 1',
      ),
    staleTime: 5 * 60_000,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', companyFilter],
    queryFn: () =>
      query<Customer>(
        `SELECT id, customer_name, due_amount, company_id
         FROM tbl_customer
         WHERE is_deleted = 0
           AND (company_id = ? OR ? = 'ALL')
         ORDER BY customer_name`,
        [companyFilter, companyFilter],
      ),
    staleTime: 30_000,
  });

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === customerId),
    [customers, customerId],
  );

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
      query<{ ref_no: string; date: string; amount: number }>(
        `SELECT invoice_no AS ref_no,
                invoice_date AS date,
                total AS amount
         FROM tbl_invoice_main
         WHERE customer_id = ?
           AND is_deleted = 0
           AND invoice_date BETWEEN ? AND ?
         ORDER BY invoice_date`,
        [customerId, fromDate, toDate],
      ),
    enabled: hasFilter,
    staleTime: 30_000,
  });

  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ['statementReceipts', customerId, fromDate, toDate],
    queryFn: () =>
      query<{ ref_no: string; date: string; amount: number }>(
        `SELECT receipt_no AS ref_no,
                receipt_date AS date,
                amount_received AS amount
         FROM tbl_receipt
         WHERE customer_id = ?
           AND is_deleted = 0
           AND receipt_date BETWEEN ? AND ?
         ORDER BY receipt_date`,
        [customerId, fromDate, toDate],
      ),
    enabled: hasFilter,
    staleTime: 30_000,
  });

  const transactions = useMemo<StatementRow[]>(() => {
    const combined: StatementRow[] = [
      ...invoices.map((inv) => ({
        ref_no: inv.ref_no,
        date: inv.date,
        type: 'Invoice' as const,
        amount: inv.amount,
      })),
      ...receipts.map((rec) => ({
        ref_no: rec.ref_no,
        date: rec.date,
        type: 'Receipt' as const,
        amount: rec.amount,
      })),
    ];
    combined.sort((a, b) => a.date.localeCompare(b.date));
    return combined;
  }, [invoices, receipts]);

  const openingBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    const dueAmount = selectedCustomer.due_amount;
    const invoiceSum = invoices.reduce((sum, i) => sum + i.amount, 0);
    const receiptSum = receipts.reduce((sum, r) => sum + r.amount, 0);
    return dueAmount - invoiceSum + receiptSum;
  }, [selectedCustomer, invoices, receipts]);

  const closingBalance = useMemo(() => {
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
        accessorKey: 'amount',
        header: 'Amount',
        cell: (info) => {
          const row = info.row.original;
          const d = info.getValue<number>();
          const sign = row.type === 'Receipt' ? '-' : '';
          return (
            <span className="tabular-nums">
              {sign}${dollars(d)}
            </span>
          );
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

  const handleExportPdf = useCallback(() => {
    if (!transactions.length || !selectedCustomer) return;
    getInvoicePdfPath({
      id: 0,
      customer_id: selectedCustomer.id,
      invoice_no: `STATEMENT_${selectedCustomer.customer_name}`,
      invoice_date: new Date().toISOString().split('T')[0],
      company_id: selectedCustomer.company_id,
      sub_total: 0,
      amount_due: 0,
      vat: 0,
      discount: 0,
      total: 0,
      per: 0,
      case_debit: null,
      paid_amount: 0,
      balance: 0,
      no: null,
      cr_dr: null,
      identify: null,
      print_due: null,
      is_deleted: 0,
      checklist_no: null,
    }).then((path) => {
      console.log('Statement PDF path (placeholder):', path);
    });
  }, [transactions, selectedCustomer]);

  const isLoading = loadingInvoices || loadingReceipts;
  const rangeLabel = dateRange?.from
    ? `${format(dateRange.from, 'MMM d, yyyy')}${dateRange.to ? ` – ${format(dateRange.to, 'MMM d, yyyy')}` : ''}`
    : 'All dates';

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">Statement Preview</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleExportPdf}
          disabled={transactions.length === 0}
        >
          <Download className="mr-2 size-4" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                {transactions.length} transaction
                {transactions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasFilter ? (
            <p className="py-8 text-center text-muted-foreground">
              Select a customer to view their statement
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
                      invoices.reduce((s, i) => s + i.amount, 0) -
                        receipts.reduce((s, r) => s + r.amount, 0) >
                      0
                        ? 'text-destructive'
                        : 'text-green-600'
                    }`}
                  >
                    {(() => {
                      const net =
                        invoices.reduce((s, i) => s + i.amount, 0) -
                        receipts.reduce((s, r) => s + r.amount, 0);
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
                    className={`text-lg font-semibold tabular-nums ${closingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}
                  >
                    {closingBalance > 0 ? '' : '-'}$
                    {dollars(Math.abs(closingBalance))}
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
