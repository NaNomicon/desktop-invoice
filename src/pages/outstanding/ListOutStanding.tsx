import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import { downloadExcelXml, escapeHtml, openPrintableReport } from '@/lib/report-output';
import type { Company, Setting } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  CreditCard,
  Download,
  FileText,
  Plus,
  Printer,
  Receipt,
  Search,
} from 'lucide-react';

interface OutstandingRow {
  id: number;
  customer_name: string;
  title_name?: string | null;
  customer_type?: string | null;
  due_amount: number;
  ad_due: string;
  company_id: number;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function customerDisplayName(row: OutstandingRow): string {
  return [row.title_name?.trim(), row.customer_name.trim()].filter(Boolean).join(' ');
}

function createOutstandingReportHtml(rows: OutstandingRow[]): string {

  const generatedAt = new Date().toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');
  const totalDue = rows
    .filter((row) => row.due_amount > 0)
    .reduce((sum, row) => sum + row.due_amount, 0);
  const totalAdvance = rows
    .filter((row) => row.due_amount < 0)
    .reduce((sum, row) => sum + Math.abs(row.due_amount), 0);

  const tableRows = rows
    .map((row) => {
      const amountPrefix = row.ad_due === 'Advance' ? '-' : '';
      const amount = `${amountPrefix}$${dollars(Math.abs(row.due_amount))}`;
      const statusClass = row.ad_due === 'Advance' ? 'advance' : 'due';
      return `
        <tr>
          <td>${escapeHtml(customerDisplayName(row))}</td>
          <td class="amount ${statusClass}">${escapeHtml(amount)}</td>
          <td class="${statusClass}">${escapeHtml(row.ad_due)}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Outstanding Report</title>
  <style>
    @page { margin: 14mm; size: A4 portrait; }
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
    .due { color: #dc2626; font-weight: 600; }
    .advance { color: #16a34a; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <div class="header">
      <div>
        <h1 class="title">Outstanding Report</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Customers:</strong> ${rows.length}</div>
        <div><strong>Total Due:</strong> $${dollars(totalDue)}</div>
        <div><strong>Total Advance:</strong> $${dollars(totalAdvance)}</div>
      </div>
    </div>
    <div class="summary">
      <div class="card"><div class="label">Customers</div><div class="value">${rows.length}</div></div>
      <div class="card"><div class="label">Total Due</div><div class="value">$${dollars(totalDue)}</div></div>
      <div class="card"><div class="label">Total Advance</div><div class="value">$${dollars(totalAdvance)}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Customer Name</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </main>
</body>
</html>`;
}

function ListOutStanding() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<OutstandingRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [custRows, compRows, setRows] = await Promise.all([
      query<OutstandingRow>(
        `SELECT id, customer_name, title_name, customer_type, due_amount, ad_due, company_id
         FROM tbl_customer
         WHERE is_deleted = 0 AND due_amount != 0
         ORDER BY customer_name`,
      ),
      query<Company>('SELECT id, company_name FROM tbl_company WHERE is_active = 1'),
      query<Setting>('SELECT report_path FROM tbl_setting WHERE id = 1 LIMIT 1'),
    ]);
    setCustomers(custRows);
    setCompanies(compRows);
    setSettings(setRows[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let rows = customers;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((c) => c.customer_name.toLowerCase().includes(s));
    }
    if (companyFilter !== 'all') {
      rows = rows.filter((c) => c.company_id === parseInt(companyFilter));
    }
    return rows;
  }, [customers, search, companyFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedCustomerId(null);
      return;
    }

    if (!filtered.some((row) => row.id === selectedCustomerId)) {
      setSelectedCustomerId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => filtered.find((row) => row.id === selectedCustomerId) ?? null,
    [filtered, selectedCustomerId],
  );

  const openReceiptVoucher = useCallback(
    (row: OutstandingRow | null) => {
      if (!row) {
        window.alert('No Data Selected');
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
        window.alert('No Data Selected');
        return;
      }

      if (mode === 'pdf' && !settings?.report_path?.trim()) {
        window.alert('Please Set Report Path from Setting');
        return;
      }

      const html = createOutstandingReportHtml(filtered);
      openPrintableReport({
        html,
        mode,
        requirePath: mode === 'pdf',
        configuredPath: settings?.report_path ?? null,
      });
    },
    [filtered, settings],
  );

  const handleExportExcel = useCallback(() => {
    if (filtered.length === 0) {
      window.alert('No Data Selected');
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
          `${amountPrefix}${dollars(Math.abs(row.due_amount))}`,
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
          return `${prefix}$${dollars(Math.abs(info.getValue<number>()))}`;
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalDue = filtered
    .filter((c) => c.due_amount > 0)
    .reduce((sum, c) => sum + c.due_amount, 0);
  const totalAdvance = filtered
    .filter((c) => c.due_amount < 0)
    .reduce((sum, c) => sum + Math.abs(c.due_amount), 0);

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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-red-600">
          Total Due: ${dollars(totalDue)}
        </span>
        <span className="font-medium text-green-600">
          Total Advance: ${dollars(totalAdvance)}
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
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.company_name ?? `Company ${c.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
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
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: '  ↑', desc: '  ↓' }[h.column.getIsSorted() as string] ?? ''}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ListOutStanding;
