import { useState, useCallback, useEffect, useMemo, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import { deleteInvoice } from '@/lib/invoice/delete';
import type { InvoiceMain, Company } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/rbac';
import { formatMoney } from '@/lib/currency';
import { useCurrencySymbol } from '@/services/company';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { DataTablePagination } from '@/components/DataTablePagination';
import { toast } from 'sonner';
import { Eye, FilePenLine, FileText, Plus, Search, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface InvoiceRow extends InvoiceMain {
  customer_name: string;
  status: string;
}


function InvoiceList() {
  const navigate = useNavigate();
  const currency = useCurrencySymbol();
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
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
          inv.invoice_no.toLowerCase().includes(s) ||
          (inv.checklist_no?.toLowerCase().includes(s) ?? false),
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

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

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
        cell: (info) => formatDate(info.getValue<string | null>()),
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'checklist_no',
        header: () => <span className="block w-full text-center">Checklist</span>,
        cell: (info) => (
          <span className="text-center block w-full">
            {info.getValue<string | null>() || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: () => <span className="block w-full text-right">Total</span>,
        cell: (info) => (
          <span className="text-right block w-full">
            {formatMoney(info.getValue<number>(), currency)}
          </span>
        ),
      },
      {
        accessorKey: 'paid_amount',
        header: () => <span className="block w-full text-right">Paid</span>,
        cell: (info) => (
          <span className="text-right block w-full">
            {formatMoney(info.getValue<number>(), currency)}
          </span>
        ),
      },
      {
        accessorKey: 'balance',
        header: () => <span className="block w-full text-right">Due</span>,
        cell: (info) => {
          const v = info.getValue<number>();
          return (
            <span
              className={`text-right block w-full ${
                v > 0 ? 'font-medium text-orange-600' : ''
              }`}
            >
              {formatMoney(Math.abs(v), currency)}
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
              onClick={() => navigate(`/reports/invoices/${info.row.original.id}`)}
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
    [admin, handleEdit, navigate, currency],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  
  const { getDragHandlers } = useColumnOrder(table);
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
        <Button onClick={() => navigate('/invoices/new')}>
          <Plus className="size-4" />
          Add Invoice
        </Button>
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
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearch('');
                  }
                }}
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
                          onClick={h.column.getToggleSortingHandler()} {...getDragHandlers(h.column.id)}
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
                  {table.getPrePaginationRowModel().rows.length === 0 ? (
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
                        className="cursor-pointer border-t hover:bg-muted/30"
                        onDoubleClick={() => handleEdit(row.original.id)}
                        onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleEdit(row.original.id);
                          }
                        }}
                        tabIndex={0}
                        title="Double-click to edit"
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
              <DataTablePagination table={table} totalLabel="invoices" />
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
