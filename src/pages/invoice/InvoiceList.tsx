import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import { deleteInvoice } from '@/lib/invoice/delete';
import type { InvoiceMain, Company } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/rbac';
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
import { toast } from 'sonner';
import { Eye, FilePenLine, FileText, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface InvoiceRow extends InvoiceMain {
  customer_name: string;
  status: string;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function InvoiceList() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [invRows, compRows] = await Promise.all([
      query<InvoiceRow>(
        `SELECT im.*, c.customer_name,
          CASE
            WHEN im.cr_dr = 'Cr.' THEN 'Credit'
            WHEN im.cr_dr = 'Dr.' THEN 'Debit'
            ELSE 'Unknown'
          END as status
         FROM tbl_invoice_main im
         JOIN tbl_customer c ON im.customer_id = c.id
         WHERE im.is_deleted = 0
         ORDER BY im.invoice_no DESC`,
      ),
      query<Company>(
        'SELECT id, company_name FROM tbl_company WHERE is_active = 1',
      ),
    ]);
    setInvoices(invRows);
    setCompanies(compRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let rows = invoices;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (inv) =>
          inv.customer_name.toLowerCase().includes(s) ||
          inv.invoice_no.toLowerCase().includes(s),
      );
    }
    if (companyFilter !== 'all') {
      rows = rows.filter((inv) => inv.company_id === parseInt(companyFilter));
    }
    return rows;
  }, [invoices, search, companyFilter]);

  const handleEdit = useCallback(
    (invoiceId: number) => {
      navigate('/invoices/new', { state: { invoiceId } });
    },
    [navigate],
  );

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
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
        accessorKey: 'total',
        header: 'Total',
        cell: (info) => `$${dollars(info.getValue<number>())}`,
      },
      {
        accessorKey: 'paid_amount',
        header: 'Paid',
        cell: (info) => `$${dollars(info.getValue<number>())}`,
      },
      {
        accessorKey: 'balance',
        header: 'Due',
        cell: (info) => {
          const v = info.getValue<number>();
          return (
            <span className={v > 0 ? 'font-medium text-orange-600' : ''}>
              ${dollars(Math.abs(v))}
              {v < 0 ? ' (overpaid)' : ''}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue<string>();
          return (
            <span
              className={
                status === 'Credit' ? 'text-green-600' : 'text-blue-600'
              }
            >
              {status}
            </span>
          );
        },
      },
      {
        id: 'edit',
        header: '',
        cell: (info) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleEdit(info.row.original.id)}
            aria-label={`Edit invoice ${info.row.original.invoice_no}`}
          >
            <FilePenLine className="size-3.5" />
          </Button>
        ),
      },
      {
        id: 'preview',
        header: '',
        cell: (info) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/reports/print/${info.row.original.id}`)}
            aria-label={`Preview invoice ${info.row.original.invoice_no}`}
          >
            <Eye className="size-3.5" />
          </Button>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (info) =>
          admin ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(info.row.original.id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </Button>
          ) : null,
      },
    ],
    [admin, handleEdit, navigate],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteInvoice(deleteConfirm);
      toast.success('Invoice deleted');
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      toast.error(`Delete failed: ${String(err)}`);
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, loadData]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">Invoices</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
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

      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this invoice? Customer balance will
            be reversed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvoiceList;
