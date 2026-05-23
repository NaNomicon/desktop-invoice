import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import type { Company } from '@/lib/types';
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
import { Download, BarChart3, Calendar } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SalesRow {
  invoice_no: string;
  invoice_date: string;
  customer_id: number;
  customer_name: string;
  company_id: number;
  bill_amount: number; // INTEGER cents
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

type GroupBy = 'none' | 'date' | 'customer' | 'product' | 'company';

function SalesReport() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
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

  const { data: salesData = [], isLoading } = useQuery({
    queryKey: [
      'salesReport',
      dateRange?.from?.toISOString() ?? '',
      dateRange?.to?.toISOString() ?? '',
      companyFilter,
    ],
    queryFn: () => {
      const fromDate = dateRange?.from
        ? format(dateRange.from, 'yyyy-MM-dd')
        : '1970-01-01';
      const toDate = dateRange?.to
        ? format(dateRange.to, 'yyyy-MM-dd')
        : '2099-12-31';
      return query<SalesRow>(
        `SELECT
          tbl_invoice_main.invoice_no,
          tbl_invoice_main.invoice_date,
          tbl_invoice_main.customer_id,
          tbl_customer.customer_name,
          tbl_invoice_main.company_id,
          tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount as bill_amount
        FROM tbl_invoice_main
        LEFT JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
        WHERE tbl_invoice_main.invoice_date BETWEEN ? AND ?
          AND (tbl_invoice_main.company_id = ? OR ? = 'ALL')
          AND tbl_invoice_main.is_deleted = 0
        ORDER BY tbl_invoice_main.invoice_date DESC`,
        [fromDate, toDate, companyFilter, companyFilter],
      );
    },
    staleTime: 30_000,
  });

  const groupedSections = useMemo(() => {
    if (groupBy === 'none') return null;

    const groups = new Map<string, SalesRow[]>();
    for (const row of salesData) {
      let key: string;
      switch (groupBy) {
        case 'date':
          key = row.invoice_date;
          break;
        case 'customer':
          key = row.customer_name;
          break;
        case 'company':
          key = String(row.company_id);
          break;
        default:
          key = 'other';
      }
      if (!groups.has(key)) groups.set(key, []);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(row);
      }
    }
    const entries = Array.from(groups.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries;
  }, [salesData, groupBy]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Invoice #',
      'Date',
      'Customer',
      'Company ID',
      'Bill Amount',
    ];
    const rows = salesData.map((row) => [
      row.invoice_no,
      row.invoice_date,
      row.customer_name,
      String(row.company_id),
      dollars(row.bill_amount),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [salesData]);

  const columns = useMemo<ColumnDef<SalesRow>[]>(
    () => [
      {
        accessorKey: 'invoice_no',
        header: 'Invoice #',
        cell: (info) => (
          <span className="font-medium">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'invoice_date',
        header: 'Date',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'bill_amount',
        header: 'Bill Amount',
        cell: (info) => `$${dollars(info.getValue<number>())}`,
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally returns non-memoizable helpers
  const table = useReactTable({
    data: salesData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rangeLabel = dateRange?.from
    ? `${format(dateRange.from, 'MMM d, yyyy')}${dateRange.to ? ` – ${format(dateRange.to, 'MMM d, yyyy')}` : ''}`
    : 'All dates';

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5" />
          <h1 className="text-2xl font-semibold">Sales Report</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCSV}
          disabled={salesData.length === 0}
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
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

            <Select
              value={groupBy}
              onValueChange={(v: string) => setGroupBy(v as GroupBy)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="customer">By Customer</SelectItem>
                <SelectItem value="company">By Company</SelectItem>
              </SelectContent>
            </Select>

            {salesData.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {salesData.length} invoice{salesData.length !== 1 ? 's' : ''}
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
          ) : groupedSections ? (
            <div className="overflow-x-auto rounded-md border">
              {groupedSections.map(([label, rows]) => (
                <div key={label}>
                  <div className="bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
                    {label}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          Invoice #
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          Customer
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                          Bill Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.invoice_no}
                          className="border-t hover:bg-muted/30"
                        >
                          <td className="px-4 py-2 font-medium">
                            {row.invoice_no}
                          </td>
                          <td className="px-4 py-2">{row.invoice_date}</td>
                          <td className="px-4 py-2">{row.customer_name}</td>
                          <td className="px-4 py-2 text-right">
                            ${dollars(row.bill_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
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

export default SalesReport;
