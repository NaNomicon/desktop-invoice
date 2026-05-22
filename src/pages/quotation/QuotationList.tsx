import { useState, useCallback, useEffect, useMemo } from 'react';
import { query } from '@/lib/db';
import type { Company } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { FileText, Search } from 'lucide-react';

interface QuotationRow {
  id: number;
  quo_no: string;
  quo_date: string;
  customer_name: string;
  sub_total: number;
  vat: number;
  discount: number;
  total: number;
  identify: string | null;
  company_id: number;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function QuotationList() {
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [quoRows, compRows] = await Promise.all([
      query<QuotationRow>(
        `SELECT qm.id, qm.quo_no, qm.quo_date, qm.sub_total, qm.vat,
                qm.discount, qm.total, qm.identify, qm.company_id,
                c.customer_name
         FROM tbl_quotation_main qm
         JOIN tbl_customer c ON qm.customer_id = c.id
         WHERE qm.is_deleted = 0
         ORDER BY qm.quo_no DESC`,
      ),
      query<Company>(
        'SELECT id, company_name FROM tbl_company WHERE is_active = 1',
      ),
    ]);
    setQuotations(quoRows);
    setCompanies(compRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let rows = quotations;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (q) =>
          q.customer_name.toLowerCase().includes(s) ||
          q.quo_no.toLowerCase().includes(s),
      );
    }
    if (companyFilter !== 'all') {
      rows = rows.filter((q) => q.company_id === parseInt(companyFilter));
    }
    return rows;
  }, [quotations, search, companyFilter]);

  const columns = useMemo<ColumnDef<QuotationRow>[]>(
    () => [
      {
        accessorKey: 'quo_no',
        header: 'Quotation #',
        cell: (info) => (
          <span className="font-medium">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'quo_date',
        header: 'Date',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: (info) => `$${dollars(info.getValue<number>())}`,
      },
      {
        accessorKey: 'identify',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue<string | null>();
          return (
            <span
              className={
                status === 'Converted' ? 'text-green-600' : 'text-yellow-600'
              }
            >
              {status || 'Draft'}
            </span>
          );
        },
      },
    ],
    [],
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
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">Quotations</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search quotations..."
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
                          className="px-4 py-2 text-left font-medium text-muted-foreground cursor-pointer select-none"
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

export default QuotationList;
