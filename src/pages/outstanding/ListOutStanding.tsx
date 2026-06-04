import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatMoney } from '@/lib/currency';
import { useCurrencySymbol } from '@/services/company';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { buildReportPdfPath, downloadExcelXml, openPrintableReport } from '@/lib/report-output';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui-store';
import { useOutstandingStore } from '@/store/outstanding-store';
import {
  createOutstandingReportHtml,
  customerDisplayName,
  filterOutstandingRows,
  type OutstandingRow,
} from './outstanding-report-helpers';
import { useOutstandingData } from '@/services/outstanding';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { DataTablePagination } from '@/components/DataTablePagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CreditCard,
  Download,
  FileText,
  Plus,
  Printer,
  Receipt,
  Search,
  X,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

function ListOutStanding() {
  const currency = useCurrencySymbol();
  const navigate = useNavigate();
  const closeHomeTab = useUIStore((state) => state.closeHomeTab);
  const search = useOutstandingStore((state) => state.search);
  const companyFilter = useOutstandingStore((state) => state.companyFilter);
  const selectedCustomerId = useOutstandingStore((state) => state.selectedCustomerId);
  const setSearch = useOutstandingStore((state) => state.setSearch);
  const setCompanyFilter = useOutstandingStore((state) => state.setCompanyFilter);
  const setSelectedCustomerId = useOutstandingStore((state) => state.setSelectedCustomerId);
  const { data, isLoading } = useOutstandingData();
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const customers = useMemo(() => data?.customers ?? [], [data?.customers]);
  const companies = useMemo(() => data?.companies ?? [], [data?.companies]);
  const settings = data?.settings ?? null;

  const filtered = useMemo(
    () => filterOutstandingRows(customers, search, companyFilter),
    [companyFilter, customers, search],
  );

  useEffect(() => {
    if (!filtered.length) {
      setSelectedCustomerId(null);
      return;
    }

    if (!filtered.some((row) => row.id === selectedCustomerId)) {
      setSelectedCustomerId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedCustomerId, setSelectedCustomerId]);

  const selectedCustomer = useMemo(
    () => filtered.find((row) => row.id === selectedCustomerId) ?? null,
    [filtered, selectedCustomerId],
  );

  const openReceiptVoucher = useCallback(
    (row: OutstandingRow | null) => {
      if (!row) {
        toast.error('No Data Selected');
        return;
      }

      navigate('/receipts/new', {
        state: {
          customerId: row.id,
          customerName: row.customer_name,
          dueAmount: row.due_amount,
          adDueStatus: row.ad_due,
        },
      });
    },
    [navigate],
  );

  const handleOpenPrintableReport = useCallback(
    (mode: 'print' | 'pdf') => {
      if (filtered.length === 0) {
        toast.error('No Data Selected');
        return;
      }

      if (mode === 'pdf' && !settings?.report_path?.trim()) {
        toast.error('Please Set Report Path from Setting');
        return;
      }

      const html = createOutstandingReportHtml(filtered, companyFilter === 'all' ? 'all-companies' : `company-${companyFilter}`, currency);
      openPrintableReport({
        html,
        mode,
        requirePath: mode === 'pdf',
        configuredPath: settings?.report_path ?? null,
        outputPath:
          mode === 'pdf' && settings?.report_path
            ? buildReportPdfPath({
                configuredPath: settings.report_path,
                filenamePrefix: 'outstanding-report',
                label: companyFilter === 'all' ? 'all-companies' : `company-${companyFilter}`,
              })
            : null,
      });
    },
    [companyFilter, filtered, settings],
  );

  const handleExportExcel = useCallback(() => {
    if (filtered.length === 0) {
      toast.error('No Data Selected');
      return;
    }

    downloadExcelXml({
      filenamePrefix: 'outstanding-report',
      worksheetName: 'Outstanding Report',
      headers: ['CUSTOMER NAME', 'AMOUNT', 'STATUS'],
      rows: filtered.map((row) => {
        const amountPrefix = row.ad_due === 'Advance' ? '-' : '';
        return [
          customerDisplayName(row),
          `${amountPrefix}${formatMoney(Math.abs(row.due_amount), currency)}`,
          row.ad_due,
        ];
      }),
    });
  }, [filtered]);

  const columns = useMemo<ColumnDef<OutstandingRow>[]>(
    () => [
      {
        accessorKey: 'customer_name',
        header: 'Customer Name',
        cell: (info) => customerDisplayName(info.row.original),
      },
      {
        accessorKey: 'due_amount',
        header: 'Amount',
        cell: (info) => {
          const row = info.row.original;
          const prefix = row.ad_due === 'Advance' ? '-' : '';
          return `${prefix}${formatMoney(Math.abs(info.getValue<number>()), currency)}`;
        },
      },
      {
        accessorKey: 'ad_due',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue<string>();
          const row = info.row.original;
          let colorClass = '';
          if (row.ad_due === 'Advance') colorClass = 'text-green-600 font-medium';
          else if (row.ad_due === 'Due') colorClass = 'text-red-600 font-medium';
          else colorClass = 'text-muted-foreground';
          return <span className={colorClass}>{status}</span>;
        },
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally returns non-memoizable helpers
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  
  const { getDragHandlers } = useColumnOrder(table);
  const { totalDue, totalAdvance } = useMemo(
    () =>
      filtered.reduce(
        (totals, customer) => {
          if (customer.ad_due === 'Advance') {
            totals.totalAdvance += Math.abs(customer.due_amount);
          } else {
            totals.totalDue += Math.abs(customer.due_amount);
          }
          return totals;
        },
        { totalDue: 0, totalAdvance: 0 },
      ),
    [filtered],
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="size-5" />
          <h1 className="text-2xl font-semibold">Outstanding Balances</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/receipts/new')}>
            <Plus className="mr-2 size-4" />
            New Receipt
          </Button>
          <Button variant="outline" onClick={() => openReceiptVoucher(selectedCustomer)}>
            <Receipt className="mr-2 size-4" />
            Receipt Voucher
          </Button>
          <Button variant="outline" onClick={() => handleOpenPrintableReport('print')}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>
          <Button variant="outline" onClick={() => handleOpenPrintableReport('pdf')}>
            <FileText className="mr-2 size-4" />
            View PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => closeHomeTab('/outstanding')}>
            <X className="mr-2 size-4" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-red-600">
          Total Due: {formatMoney(totalDue, currency)}
        </span>
        <span className="font-medium text-green-600">
          Total Advance: {formatMoney(totalAdvance, currency)}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companyOpen}
                  className="w-44 justify-between font-normal"
                >
                  {companyFilter === 'all'
                    ? 'All Companies'
                    : companies.find((c) => String(c.id) === companyFilter)?.company_name ?? 'All Companies'}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search company..." value={companySearch} onValueChange={setCompanySearch} />
                  <CommandList>
                    <CommandEmpty>No company found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="all" onSelect={() => { setCompanyFilter('all'); setCompanyOpen(false); }}>
                        <Check className={cn('mr-2 size-4', companyFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                        All Companies
                      </CommandItem>
                      {companyOpen && companies.slice(0, 50).map((c) => (
                        <CommandItem key={c.id} value={String(c.id)} onSelect={(v) => { setCompanyFilter(v); setCompanyOpen(false); }}>
                          <Check className={cn('mr-2 size-4', companyFilter === String(c.id) ? 'opacity-100' : 'opacity-0')} />
                          {c.company_name ?? `Company ${c.id}`}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
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
                          onClick={h.column.getToggleSortingHandler()} {...getDragHandlers(h.column.id)}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: '  ↑', desc: '  ↓' }[h.column.getIsSorted() as string] ?? ''}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getPrePaginationRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                        No outstanding balances found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => {
                      const current = row.original;
                      const selected = current.id === selectedCustomerId;
                      const rowColor =
                        current.ad_due === 'Advance'
                          ? 'text-green-600'
                          : current.ad_due === 'Due'
                            ? 'text-red-600'
                            : 'text-muted-foreground';

                      return (
                        <tr
                          key={row.id}
                          className={`border-t hover:bg-muted/30 ${selected ? 'bg-muted/40' : ''}`}
                          onClick={() => setSelectedCustomerId(current.id)}
                          onDoubleClick={() => openReceiptVoucher(current)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className={`px-4 py-2 ${rowColor}`}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <DataTablePagination table={table} pagination={pagination} totalLabel="outstanding invoices" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ListOutStanding;
