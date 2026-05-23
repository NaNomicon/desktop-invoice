import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import type { Customer, Company, Product, Setting } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { cal } from '@/lib/invoice/cal';
import { saved } from '@/lib/invoice/saved';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  Mail,
  Plus,
  Printer,
  Receipt,
  Save,
  Trash2,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface LineItem {
  uid: string;
  qty: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  row_total: number;
  s_no: number;
  deleted: boolean;
}

let _uid = 1;
function nextUid(): string {
  return `li-${_uid++}`;
}

function cents(s: string): number {
  return Math.round(parseFloat(s || '0') * 100);
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextBlankLineItems(): LineItem[] {
  return [
    {
      uid: nextUid(),
      qty: 1,
      product_id: null,
      product_name: '',
      unit_price: 0,
      row_total: 0,
      s_no: 1,
      deleted: false,
    },
  ];
}

function InvoiceForm() {
  const navigate = useNavigate();
  const authCompanyId = useAuthStore((s) => s.company_id);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [companyId, setCompanyId] = useState(authCompanyId);
  const [invoiceNumber, setInvoiceNumber] = useState('0');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [paidAmount, setPaidAmount] = useState('');
  const [caseDebit, setCaseDebit] = useState('CREDIT');
  const [refNo, setRefNo] = useState('');
  const [checklistNo, setChecklistNo] = useState('');
  const [per, setPer] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>(nextBlankLineItems);
  const [saving, setSaving] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  const subTotal = useMemo(
    () =>
      lineItems
        .filter((li) => !li.deleted)
        .reduce((sum, li) => sum + li.row_total, 0),
    [lineItems],
  );

  const calResult = useMemo(() => {
    return cal({
      sub_total: subTotal,
      ad_due: selectedCustomer?.ad_due ?? '',
      amount_due: selectedCustomer?.due_amount ?? 0,
      isvat: settings?.isvat ?? 0,
      vat_per: settings?.vat_per ?? 0,
      per: parseFloat(per || '0'),
    });
  }, [subTotal, selectedCustomer, settings, per]);

  const balance = useMemo(() => {
    const paid = cents(paidAmount);
    if (paid > 0 && paid < calResult.total) {
      return calResult.total - paid;
    }
    return Math.max(calResult.total - paid, 0);
  }, [paidAmount, calResult.total]);

  const signedBalanceLabel = useMemo(() => {
    if (!selectedCustomer) {
      return '$0.00';
    }

    const prefix = selectedCustomer.ad_due === 'Advance' ? '-' : '';
    return `${prefix}$${dollars(selectedCustomer.due_amount)}`;
  }, [selectedCustomer]);

  const isAdvance = selectedCustomer?.ad_due === 'Advance';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [custRows, prodRows, compRows, setRows, seqRows] = await Promise.all([
      query<Customer>(
        'SELECT id, customer_name, due_amount, ad_due FROM tbl_customer WHERE is_deleted = 0 ORDER BY customer_name',
      ),
      query<Product>(
        'SELECT id, product_id, product_name, price FROM tbl_product WHERE is_deleted = 0 ORDER BY product_name',
      ),
      query<Company>(
        'SELECT id, company_name FROM tbl_company WHERE is_active = 1',
      ),
      query<Setting>('SELECT * FROM tbl_setting WHERE id = 1'),
      query<{ invoice_no: number }>('SELECT invoice_no FROM tbl_numbers WHERE id = 1'),
    ]);
    setCustomers(custRows);
    setProducts(prodRows);
    setCompanies(compRows);
    setSettings(setRows[0] ?? null);
    setInvoiceNumber(String(seqRows[0]?.invoice_no ?? 0));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateLineItem = useCallback(
    (uid: string, patch: Partial<LineItem>) => {
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.uid !== uid) return li;
          const updated = { ...li, ...patch };
          updated.row_total = updated.qty * updated.unit_price;
          return updated;
        }),
      );
    },
    [],
  );

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        uid: nextUid(),
        qty: 1,
        product_id: null,
        product_name: '',
        unit_price: 0,
        row_total: 0,
        s_no: prev.length + 1,
        deleted: false,
      },
    ]);
  }, []);

  const toggleDeleteLineItem = useCallback((uid: string) => {
    setLineItems((prev) =>
      prev.map((li) =>
        li.uid === uid ? { ...li, deleted: !li.deleted } : li,
      ),
    );
  }, []);

  const resetForm = useCallback(
    (nextInvoiceNumber?: string) => {
      setCustomerId(null);
      setCompanyId(authCompanyId);
      setInvoiceDate(today());
      setPaidAmount('');
      setCaseDebit('CREDIT');
      setRefNo('');
      setChecklistNo('');
      setPer('');
      setLineItems(nextBlankLineItems());
      if (nextInvoiceNumber) {
        setInvoiceNumber(nextInvoiceNumber);
      }
    },
    [authCompanyId],
  );

  const persistInvoice = useCallback(async () => {
    if (!customerId) {
      toast.error('Please select a customer');
      return null;
    }
    if (lineItems.filter((li) => !li.deleted).length === 0) {
      toast.error('At least one line item is required');
      return null;
    }

    setSaving(true);
    try {
      const activeItems = lineItems.filter((li) => !li.deleted);
      const result = await saved(
        {
          customer_id: customerId,
          invoice_date: invoiceDate,
          sub_total: subTotal,
          amount_due: selectedCustomer?.due_amount ?? 0,
          vat: calResult.vat,
          discount: calResult.discount,
          total: calResult.total,
          per: parseFloat(per || '0'),
          paid_amount: cents(paidAmount),
          balance,
          case_debit: caseDebit || null,
          no: refNo || null,
          identify: 'Invoice',
          print_due: null,
          checklist_no: checklistNo || null,
          line_items: activeItems.map((li, i) => ({
            qty: li.qty,
            product_id: li.product_id,
            unit_price: li.unit_price,
            row_total: li.row_total,
            s_no: i + 1,
          })),
          isAdvance,
        },
        companyId,
      );
      const nextRows = await query<{ invoice_no: number }>(
        'SELECT invoice_no FROM tbl_numbers WHERE id = 1',
      );
      const nextInvoiceNumber = String(nextRows[0]?.invoice_no ?? result.invoice_no);
      await loadData();
      return { ...result, nextInvoiceNumber };
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`);
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    balance,
    calResult.discount,
    calResult.total,
    calResult.vat,
    caseDebit,
    checklistNo,
    companyId,
    customerId,
    invoiceDate,
    isAdvance,
    lineItems,
    loadData,
    paidAmount,
    per,
    refNo,
    selectedCustomer,
    subTotal,
  ]);

  const handleSave = useCallback(async () => {
    const result = await persistInvoice();
    if (!result) {
      return;
    }

    toast.success(`Invoice ${result.invoice_no} saved`);
    resetForm(result.nextInvoiceNumber);
  }, [persistInvoice, resetForm]);

  const handlePrint = useCallback(async () => {
    const result = await persistInvoice();
    if (!result) {
      return;
    }

    toast.success(`Invoice ${result.invoice_no} saved`);
    navigate(`/reports/print/${result.id}`);
  }, [navigate, persistInvoice]);

  const handleCreateReceipt = useCallback(() => {
    if (!selectedCustomer) {
      toast.error('Please select a customer before creating a receipt');
      return;
    }

    navigate('/receipts/new', {
      state: {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.customer_name,
        dueAmount: selectedCustomer.due_amount,
        adDueStatus: selectedCustomer.ad_due,
      },
    });
  }, [navigate, selectedCustomer]);

  const handleSend = useCallback(() => {
    toast.info('Invoice SEND email flow will be completed with the dedicated email spec pass');
  }, []);

  const columns = useMemo<ColumnDef<LineItem>[]>(
    () => [
      {
        accessorKey: 's_no',
        header: '#',
        size: 40,
        cell: (info) => info.getValue<number>(),
      },
      {
        id: 'product',
        header: 'Product',
        cell: (info) => {
          const li = info.row.original;
          if (li.deleted) {
            return <span className="text-muted-foreground line-through">{li.product_name || '-'}</span>;
          }
          return (
            <Select
              value={li.product_id ? String(li.product_id) : ''}
              onValueChange={(v) => {
                const prod = products.find((p) => p.id === parseInt(v));
                updateLineItem(li.uid, {
                  product_id: prod ? prod.id : null,
                  product_name: prod?.product_name ?? '',
                  unit_price: prod?.price ?? 0,
                });
              }}
            >
              <SelectTrigger className="h-8 w-full min-w-[180px]">
                <SelectValue placeholder="Select product..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.product_id ? `${p.product_id} - ${p.product_name}` : p.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        accessorKey: 'qty',
        header: 'Qty',
        size: 80,
        cell: (info) => {
          const li = info.row.original;
          if (li.deleted) return <span className="text-muted-foreground">{li.qty}</span>;
          return (
            <Input
              type="number"
              min="0"
              step="1"
              className="h-8 w-20"
              value={li.qty}
              onChange={(e) =>
                updateLineItem(li.uid, { qty: parseInt(e.target.value) || 0 })
              }
            />
          );
        },
      },
      {
        accessorKey: 'unit_price',
        header: 'Price',
        size: 100,
        cell: (info) => {
          const li = info.row.original;
          if (li.deleted) return <span className="text-muted-foreground">${dollars(li.unit_price)}</span>;
          return (
            <Input
              type="number"
              min="0"
              step="0.01"
              className="h-8 w-28"
              value={(li.unit_price / 100).toFixed(2)}
              onChange={(e) =>
                updateLineItem(li.uid, { unit_price: cents(e.target.value) })
              }
            />
          );
        },
      },
      {
        accessorKey: 'row_total',
        header: 'Total',
        size: 100,
        cell: (info) => {
          const value = info.getValue<number>();
          return <span className={info.row.original.deleted ? 'text-muted-foreground line-through' : 'font-medium'}>${dollars(value)}</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        size: 40,
        cell: (info) => (
          <Button
            variant="ghost"
            size="icon-sm"
            className={
              info.row.original.deleted
                ? 'text-destructive'
                : 'text-muted-foreground hover:text-destructive'
            }
            onClick={() => toggleDeleteLineItem(info.row.original.uid)}
            title="Ctrl+D to toggle delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      },
    ],
    [products, updateLineItem, toggleDeleteLineItem],
  );

  const table = useReactTable({
    data: lineItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        addLineItem();
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const activeRow = [...lineItems].reverse().find((item) => !item.deleted);
        if (activeRow) {
          toggleDeleteLineItem(activeRow.uid);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addLineItem, lineItems, toggleDeleteLineItem]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">New Invoice</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => resetForm()} disabled={saving}>
            <RotateCcw className="size-4" />
            Create New Invoice
          </Button>
          <Button variant="outline" onClick={handleCreateReceipt} disabled={saving}>
            <Receipt className="size-4" />
            Create Receipt
          </Button>
          <Button variant="outline" onClick={handleSend} disabled={saving}>
            <Mail className="size-4" />
            Send
          </Button>
          <Button variant="outline" onClick={() => void handlePrint()} disabled={saving}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Save className="size-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Invoice #</Label>
            <Input value={invoiceNumber} disabled className="bg-muted" />
          </div>

          <div className="space-y-1">
            <Label>Customer *</Label>
            <Select
              value={customerId ? String(customerId) : ''}
              onValueChange={(v) => setCustomerId(parseInt(v))}
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-1">
            <Label>Company</Label>
            <Select
              value={String(companyId)}
              onValueChange={(v) => setCompanyId(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.company_name ?? `Company ${c.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Invoice Date</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Case Debit</Label>
            <Select value={caseDebit} onValueChange={setCaseDebit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">CASH</SelectItem>
                <SelectItem value="CREDIT">CREDIT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Checklist No</Label>
            <Input
              value={checklistNo}
              onChange={(e) => setChecklistNo(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Reference No</Label>
            <Input
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
            />
          </div>

          {selectedCustomer && (
            <>
              <div className="space-y-1">
                <Label>Advance/Due</Label>
                <Input
                  value={selectedCustomer.ad_due || 'None'}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1">
                <Label>Customer Balance</Label>
                <Input
                  value={`$${dollars(selectedCustomer.due_amount)}`}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1">
                <Label>Signed Balance</Label>
                <Input value={signedBalanceLabel} disabled className="bg-muted" />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Paid Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="size-3.5" />
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="bg-muted/50">
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="px-3 py-2 text-left font-medium text-muted-foreground"
                        style={{ width: h.column.columnDef.size }}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-t hover:bg-muted/30 ${row.original.deleted ? 'bg-muted/20 opacity-50' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-1.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sub Total</Label>
            <p className="text-lg font-medium">${dollars(subTotal)}</p>
          </div>
          {settings?.isvat === 1 && calResult.vat > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">VAT</Label>
              <p className="text-lg font-medium">${dollars(calResult.vat)}</p>
            </div>
          )}
          {calResult.discount > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Discount</Label>
              <p className="text-lg font-medium text-destructive">
                -${dollars(calResult.discount)}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {selectedCustomer?.ad_due === 'Advance'
                ? 'Less Advance'
                : selectedCustomer?.ad_due === 'Due'
                  ? 'Add Due'
                  : 'New Total'}
            </Label>
            <p className="text-lg font-medium">${dollars(calResult.new_tot)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Discount %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              className="h-8 w-24"
              value={per}
              onChange={(e) => setPer(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Grand Total</Label>
            <p className="text-2xl font-bold">
              ${dollars(calResult.total)}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Balance</Label>
            <p className="text-lg font-medium">${dollars(balance)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InvoiceForm;
