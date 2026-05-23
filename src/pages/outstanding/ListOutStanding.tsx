import { useState, useCallback, useEffect, useMemo } from 'react';
import { query } from '@/lib/db';
import type { Company } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { CreditCard, Search } from 'lucide-react';

interface OutstandingRow {
  id: number;
  customer_name: string;
  due_amount: number;
  ad_due: string;
  company_id: number;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function ListOutStanding() {
  const [customers, setCustomers] = useState<OutstandingRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [custRows, compRows] = await Promise.all([
      query<OutstandingRow>(
        `SELECT id, customer_name, due_amount, ad_due, company_id
         FROM tbl_customer
         WHERE is_deleted = 0 AND due_amount != 0
         ORDER BY customer_name`,
      ),
      query<Company>('SELECT id, company_name FROM tbl_company WHERE is_active = 1'),
    ]);
    setCustomers(custRows);
    setCompanies(compRows);
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

  const columns = useMemo<ColumnDef<OutstandingRow>[]>(
    () => [
      {
        accessorKey: 'customer_name',
        header: 'Customer Name',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'due_amount',
        header: 'Due Amount',
        cell: (info) => {
          const v = info.getValue<number>();
          return `$${dollars(Math.abs(v))}`;
        },
      },
      {
        accessorKey: 'ad_due',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue<string>();
          const row = info.row.original;
          let colorClass = '';
          if (row.due_amount > 0) colorClass = 'text-red-600 font-medium';
          else if (row.due_amount < 0) colorClass = 'text-green-600 font-medium';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="size-5" />
          <h1 className="text-2xl font-semibold">Outstanding Balances</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-red-600 font-medium">
          Total Due: ${dollars(totalDue)}
        </span>
        <span className="text-green-600 font-medium">
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
                          className="px-4 py-2 text-left font-medium text-muted-foreground cursor-pointer select-none"
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
                      const d = row.original.due_amount;
                      let rowColor = '';
                      if (d > 0) rowColor = 'text-red-600';
                      else if (d < 0) rowColor = 'text-green-600';
                      else rowColor = 'text-muted-foreground';

                      return (
                        <tr key={row.id} className="border-t hover:bg-muted/30">
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
