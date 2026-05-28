import { useState, useCallback, useEffect, useMemo, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import { deleteQuotation } from '@/lib/quotation/delete';
import type { Company, QuotationMain, Setting } from '@/lib/types';
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
import {
  ArrowRightLeft,
  Eye,
  FilePenLine,
  FileText,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface QuotationRow extends QuotationMain {
  customer_name: string;
}

interface QuotationLineRow {
  main_id: number;
  product_id: number | null;
  qty: number;
  unit_price: number;
  row_total: number;
  s_no: number;
}

interface QuotationPreviewRouteState {
  quotationId: number;
  quotationNo: string;
  autoPrint?: boolean;
  autoExportPdf?: boolean;
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function QuotationList() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user_id_log);
  const admin = isAdmin(userId);

  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openingPreviewId, setOpeningPreviewId] = useState<number | null>(null);
  const [openingPdfId, setOpeningPdfId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [quotationRows, companyRows] = await Promise.all([
      query<QuotationRow>(
        `SELECT qm.*, c.customer_name
         FROM tbl_quotation_main qm
         JOIN tbl_customer c ON qm.customer_id = c.id
         WHERE qm.is_deleted = 0
         ORDER BY CAST(qm.quo_no AS INTEGER) DESC, qm.id DESC`,
      ),
      query<Company>('SELECT id, company_name FROM tbl_company WHERE is_active = 1'),
    ]);
    setQuotations(quotationRows);
    setCompanies(companyRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let rows = quotations;
    if (search) {
      const value = search.toLowerCase();
      rows = rows.filter((quotation) => {
        const checklist = quotation.checklist_no?.toLowerCase() ?? '';
        return (
          quotation.customer_name.toLowerCase().includes(value) ||
          quotation.quo_no.toLowerCase().includes(value) ||
          checklist.includes(value)
        );
      });
    }
    if (companyFilter !== 'all') {
      rows = rows.filter((quotation) => quotation.company_id === parseInt(companyFilter, 10));
    }
    return rows;
  }, [companyFilter, quotations, search]);

  const handleConvertToInvoice = useCallback(
    async (quotation: QuotationRow) => {
      const lineRows = await query<QuotationLineRow>(
        `SELECT main_id, product_id, qty, unit_price, row_total, s_no
         FROM tbl_quotation_sub
         WHERE main_id = ? AND is_deleted = 0
         ORDER BY s_no`,
        [quotation.id],
      );

      navigate('/invoices/new', {
        state: {
          customerId: quotation.customer_id,
          companyId: quotation.company_id,
          checklistNo: quotation.checklist_no ?? '',
          refNo: quotation.no ?? '',
          per: quotation.per,
          sourceQuotationId: quotation.id,
          sourceQuotationNo: quotation.quo_no,
          lineItems: lineRows.map((item) => ({
            product_id: item.product_id,
            qty: item.qty,
            unit_price: item.unit_price,
            row_total: item.row_total,
            s_no: item.s_no,
          })),
        },
      });
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (quotationId: number) => {
      navigate('/quotations/new', { state: { quotationId } });
    },
    [navigate],
  );

  const openQuotationPreview = useCallback(
    async (quotation: QuotationRow, options?: { autoExportPdf?: boolean }) => {
      const { autoExportPdf = false } = options ?? {};
      const setBusy = autoExportPdf ? setOpeningPdfId : setOpeningPreviewId;
      setBusy(quotation.id);

      try {
        const settingRows = await query<Setting>('SELECT * FROM tbl_setting WHERE id = 1 LIMIT 1');
        const settings = settingRows[0] ?? null;

        if (autoExportPdf && !settings?.quo_path?.trim()) {
          toast.error('Please Set Quotation Save Path from Setting');
          return;
        }

        const routeState: QuotationPreviewRouteState = {
          quotationId: quotation.id,
          quotationNo: quotation.quo_no,
        };

        if (autoExportPdf) {
          routeState.autoExportPdf = true;
        }

        navigate('/reports/quotations', { state: routeState });
      } catch (error) {
        toast.error(`Unable to open quotation report: ${String(error)}`);
      } finally {
        setBusy(null);
      }
    },
    [navigate],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) {
      return;
    }
    setDeleting(true);
    try {
      await deleteQuotation(deleteConfirm);
      toast.success('Quotation deleted');
      setDeleteConfirm(null);
      await loadData();
    } catch (error) {
      toast.error(`Delete failed: ${String(error)}`);
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, loadData]);

  const columns = useMemo<ColumnDef<QuotationRow>[]>(
    () => [
      {
        accessorKey: 'quo_no',
        header: 'Quotation #',
        cell: (info) => <span className="font-medium">{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'quo_date',
        header: 'Date',
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer',
      },
      {
        accessorKey: 'checklist_no',
        header: 'Checklist',
        cell: (info) => info.getValue<string | null>() || '-',
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: (info) => `Rs ${dollars(info.getValue<number>())}`,
      },
      {
        accessorKey: 'identify',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue<string | null>();
          return (
            <span className={status === 'Converted' ? 'text-green-600' : 'text-yellow-600'}>
              {status || 'Quotation'}
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
            aria-label={`Edit quotation ${info.row.original.quo_no}`}
          >
            <FilePenLine className="size-3.5" />
          </Button>
        ),
      },
      {
        id: 'convert',
        header: '',
        cell: (info) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start gap-1 text-sky-700 hover:text-sky-800"
            onClick={() => void handleConvertToInvoice(info.row.original)}
          >
            <ArrowRightLeft className="size-3.5" />
            Convert
          </Button>
        ),
      },
      {
        id: 'preview',
        header: '',
        cell: (info) => {
          const quotation = info.row.original;
          const busy = openingPreviewId === quotation.id;

          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-1 text-emerald-700 hover:text-emerald-800"
              onClick={() => void openQuotationPreview(quotation)}
              disabled={busy}
            >
              <FileText className="size-3.5" />
              {busy ? 'Opening...' : 'Preview'}
            </Button>
          );
        },
      },
      {
        id: 'viewPdf',
        header: '',
        cell: (info) => {
          const quotation = info.row.original;
          const busy = openingPdfId === quotation.id;

          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-1 text-violet-700 hover:text-violet-800"
              onClick={() => void openQuotationPreview(quotation, { autoExportPdf: true })}
              disabled={busy}
            >
              <Eye className="size-3.5" />
              {busy ? 'Opening...' : 'View PDF'}
            </Button>
          );
        },
      },
      {
        id: 'delete',
        header: '',
        cell: (info) =>
          admin ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(info.row.original.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null,
      },
    ],
    [admin, handleConvertToInvoice, handleEdit, openQuotationPreview, openingPdfId, openingPreviewId],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>, quotation: QuotationRow) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      handleEdit(quotation.id);
    },
    [handleEdit],
  );

  return (
    <>
      <div className="flex h-full flex-col gap-4 overflow-auto p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-5" />
            <h1 className="text-2xl font-semibold">Quotations</h1>
          </div>
          <Button onClick={() => navigate('/quotations/new')}>
            <FilePenLine className="size-4" />
            Add Quotation
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotations..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.company_name ?? `Company ${company.id}`}
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
                    {table.getHeaderGroups().map((group) => (
                      <tr key={group.id} className="bg-muted/50">
                        {group.headers.map((header) => (
                          <th
                            key={header.id}
                            className="cursor-pointer select-none px-4 py-2 text-left font-medium text-muted-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[
                              header.column.getIsSorted() as string
                            ] ?? ''}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                          No quotations found
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="cursor-pointer border-t hover:bg-muted/30"
                          onDoubleClick={() => void handleConvertToInvoice(row.original)}
                          onKeyDown={(event) => handleRowKeyDown(event, row.original)}
                          tabIndex={0}
                          title="Double-click to convert quotation to invoice"
                        >
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the quotation and its line items, matching the original app behavior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Quotation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default QuotationList;
