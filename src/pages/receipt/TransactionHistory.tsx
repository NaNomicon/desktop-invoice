import { useState, useCallback, useEffect, useMemo } from 'react';
import { query } from '@/lib/db';
import type { Customer } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { History } from 'lucide-react';

interface TransactionRow {
  extra: string;
  type: 'Invoice' | 'Receipt';
  date: string;
  no: string;
  amount: number;
  cr_dr: string | null;
  balance: string;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function TransactionHistory() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'extra', desc: true }]);

  const loadCustomers = useCallback(async () => {
    const rows = await query<Customer>(
      'SELECT id, customer_name FROM tbl_customer WHERE is_deleted = 0 ORDER BY customer_name',
    );
    setCustomers(rows);
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const params = customerFilter !== 'all' ? [parseInt(customerFilter), parseInt(customerFilter)] : [];

    const sql = `
      SELECT
        tbl_invoice_main.no AS extra,
        'Invoice' AS type,
        tbl_invoice_main.invoice_date AS date,
        tbl_invoice_main.invoice_no AS no,
        tbl_invoice_main.total AS amount,
        tbl_invoice_main.cr_dr AS cr_dr,
        tbl_invoice_main.balance
       FROM tbl_invoice_main
       WHERE tbl_invoice_main.is_deleted = 0
       ${customerFilter !== 'all' ? 'AND tbl_invoice_main.customer_id = ?' : ''}
      UNION ALL
      SELECT
        tbl_receipt.no AS extra,
        'Receipt' AS type,
        tbl_receipt.receipt_date AS date,
        tbl_receipt.receipt_no AS no,
        tbl_receipt.amount_received AS amount,
        tbl_receipt.cr_dr AS cr_dr,
        tbl_receipt.amount_received
       FROM tbl_receipt
       WHERE 1=1
       ${customerFilter !== 'all' ? 'AND tbl_receipt.customer_id = ?' : ''}
      ORDER BY extra DESC
    `;

    const rows = await query<TransactionRow>(sql, params);
    setTransactions(rows);
    setLoading(false);
  }, [customerFilter]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (info) => {
          const type = info.getValue<string>();
          return (
            <span
              className={`font-medium ${type === 'Invoice' ? 'text-blue-600' : 'text-green-600'}`}
            >
              {type}
            </span>
          );
        },
      },
      {
        accessorKey: 'no',
        header: 'No',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: (info) => {
          const amt = info.getValue<number>();
          const row = info.row.original;
          const prefix = row.cr_dr === 'Cr.' ? '-' : '';
          return `${prefix}$${dollars(amt)}`;
        },
      },
      {
        accessorKey: 'cr_dr',
        header: 'Cr/Dr',
        cell: (info) => {
          const v = info.getValue<string | null>();
          if (!v) return <span className="text-muted-foreground">-</span>;
          return (
            <span className={v === 'Cr.' ? 'text-green-600' : 'text-red-600'}>
              {v}
            </span>
          );
        },
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: (info) => `$${dollars(Number(info.getValue()))}`,
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally returns non-memoizable helpers
  const table = useReactTable({
    data: transactions,
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
          <History className="size-5" />
          <h1 className="text-2xl font-semibold">Transaction History</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.customer_name}
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
                          {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                        No transactions found
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
  );
}

export default TransactionHistory;
