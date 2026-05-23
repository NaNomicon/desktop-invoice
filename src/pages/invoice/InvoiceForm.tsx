import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { getInvoicePdfPath } from '@/lib/pdf/path';
import type { Customer, Company, Product, Setting } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { cal } from '@/lib/invoice/cal';
import { saved } from '@/lib/invoice/saved';
import { splitInvoice } from '@/lib/invoice/splitInvoice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  /** Company bucket: 1=XPI (Ironing), 2=XPW (Wash), or null for unassigned */
  company_id: number | null;
}

interface InvoicePrefillState {
  customerId?: number;
  companyId?: number;
  checklistNo?: string | null;
  refNo?: string | null;
  per?: number;
  lineItems?: {
    product_id: number | null;
    qty: number;
    unit_price: number;
    row_total: number;
    s_no: number;
  }[];
  sourceQuotationId?: number;
  sourceQuotationNo?: string;
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
      company_id: null,
    },
  ];
}

function InvoiceForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const authCompanyId = useAuthStore((s) => s.company_id);
  const invoicePrefill = location.state as InvoicePrefillState | null;

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
  const [printDue, setPrintDue] = useState(false);
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
        'SELECT id, customer_name, due_amount, ad_due, email, title_name FROM tbl_customer WHERE is_deleted = 0 ORDER BY customer_name',
      ),
      query<Product>(
        'SELECT id, product_id, product_name, price, company_id FROM tbl_product WHERE is_deleted = 0 ORDER BY product_name',
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
        company_id: null,
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
      setPrintDue(false);
      setLineItems(nextBlankLineItems());
      if (nextInvoiceNumber) {
        setInvoiceNumber(nextInvoiceNumber);
      }
      navigate(location.pathname, { replace: true, state: null });
    },
    [authCompanyId, location.pathname, navigate],
  );

  useEffect(() => {
    if (!invoicePrefill || customers.length === 0 || products.length === 0) {
      return;
    }

    if (invoicePrefill.customerId) {
      setCustomerId(invoicePrefill.customerId);
    }
    if (invoicePrefill.companyId) {
      setCompanyId(invoicePrefill.companyId);
    }
    setChecklistNo(invoicePrefill.checklistNo ?? '');
    setRefNo(invoicePrefill.refNo ?? invoicePrefill.sourceQuotationNo ?? '');
    setPer(
      invoicePrefill.per !== undefined && invoicePrefill.per !== null
        ? String(invoicePrefill.per)
        : '',
    );

    if (invoicePrefill.lineItems?.length) {
      setLineItems(
        invoicePrefill.lineItems.map((item, index) => {
          const product = products.find((entry) => entry.id === item.product_id);
          return {
            uid: nextUid(),
            qty: item.qty,
            product_id: item.product_id,
            product_name: product?.product_name ?? '',
            unit_price: item.unit_price,
            row_total: item.row_total,
            s_no: item.s_no || index + 1,
            deleted: false,
            company_id: null,
          };
        }),
      );
    }

    if (invoicePrefill.sourceQuotationId) {
      toast.success(
        `Quotation ${invoicePrefill.sourceQuotationNo ?? invoicePrefill.sourceQuotationId} loaded into invoice`,
      );
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [customers, invoicePrefill, location.pathname, navigate, products]);

  const persistInvoice = useCallback(async () => {
    if (!customerId) {
      toast.error('Please select a customer');
      return null;
    }
    if (!caseDebit) {
      toast.error('Please select case debit');
      return null;
    }
    if (!checklistNo.trim()) {
      toast.error('Checklist No is required');
      return null;
    }
    if (lineItems.filter((li) => !li.deleted).length === 0) {
      toast.error('At least one line item is required');
      return null;
    }

    setSaving(true);
    try {
      const activeItems = lineItems.filter((li) => !li.deleted && li.product_id !== null);
      const activeCompanyIds = [...new Set(activeItems.map((li) => li.company_id).filter((cid): cid is number => cid !== null))];
      const hasSplit = activeCompanyIds.length >= 2;

      const resolveCompanyId = (cid: number | null): number => {
        if (cid !== null && cid !== undefined) return cid;
        if (activeCompanyIds.length === 1) return activeCompanyIds[0]!;
        return companyId;
      };

      if (hasSplit) {
        const result = await splitInvoice({
          customer_id: customerId,
          invoice_date: invoiceDate,
          checklist_no: checklistNo || null,
          case_debit: caseDebit || 'CREDIT',
          paid_amount: caseDebit === 'CREDIT' ? 0 : cents(paidAmount),
          per: parseFloat(per || '0'),
          sub_total: subTotal,
          vat: calResult.vat,
          discount: calResult.discount,
          total: calResult.total,
          amount_due: selectedCustomer?.due_amount ?? 0,
          cr_dr: calResult.total > cents(paidAmount) ? 'Dr.' : 'Cr.',
          line_items: activeItems.map((li, i) => ({
            qty: li.qty,
            product_id: li.product_id,
            unit_price: li.unit_price,
            row_total: li.row_total,
            s_no: i + 1,
            company_id: li.company_id!,
          })),
        });
        const nextRows = await query<{ invoice_no: number }>(
          'SELECT invoice_no FROM tbl_numbers WHERE id = 1',
        );
        const nextInvoiceNumber = String(nextRows[0]?.invoice_no ?? 0);
        await loadData();
        return { ...result, nextInvoiceNumber };
      }

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
          paid_amount: caseDebit === 'CREDIT' ? 0 : cents(paidAmount),
          balance: caseDebit === 'CREDIT' ? calResult.total : balance,
          case_debit: caseDebit || null,
          no: refNo || null,
          identify: 'Invoice',
          print_due: printDue ? 'YES' : null,
          checklist_no: checklistNo || null,
          line_items: activeItems.map((li, i) => ({
            qty: li.qty,
            product_id: li.product_id,
            unit_price: li.unit_price,
            row_total: li.row_total,
            s_no: i + 1,
            company_id: li.company_id,
          })),
          isAdvance,
        },
        resolveCompanyId(activeItems[0]?.company_id ?? null),
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
    printDue,
    refNo,
    selectedCustomer,
    subTotal,
  ]);

  const handleSave = useCallback(async () => {
    const result = await persistInvoice();
    if (!result) {
      return;
    }

    const invNo = 'invoice_no' in result ? result.invoice_no : `${result.invoice1_no} & ${result.invoice2_no}`;
    toast.success(`Invoice ${invNo} saved`);
    resetForm(result.nextInvoiceNumber);
  }, [persistInvoice, resetForm]);

  const handlePrint = useCallback(async () => {
    const result = await persistInvoice();
    if (!result) {
      return;
    }

    const invId = 'id' in result ? result.id : result.invoice1_id;
    const invNo = 'invoice_no' in result ? result.invoice_no : `${result.invoice1_no} & ${result.invoice2_no}`;
    toast.success(`Invoice ${invNo} saved`);
    navigate(`/reports/print/${invId}`);
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

  const handleSend = useCallback(async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer before sending an invoice email');
      return;
    }
    if (!selectedCustomer.email?.trim()) {
      toast.error('The selected customer does not have an email address');
      return;
    }

    const result = await persistInvoice();
    if (!result) {
      return;
    }

    const resultId = 'id' in result ? result.id : result.invoice1_id;
    const invoiceRows = await query<{ id: number; invoice_no: string; invoice_date: string; company_id: number }>(
      'SELECT id, invoice_no, invoice_date, company_id FROM tbl_invoice_main WHERE id = ? LIMIT 1',
      [resultId],
    );
    const invoice = invoiceRows[0];
    if (!invoice) {
      toast.error('Invoice was saved but could not be reloaded for sending');
      return;
    }

    const customerName = [selectedCustomer.title_name?.trim(), selectedCustomer.customer_name.trim()]
      .filter(Boolean)
      .join(' ');
    const sendResult = await sendEmail({
      to: selectedCustomer.email.trim(),
      template_type: 'INVOICE',
      variables: {
        date: invoice.invoice_date,
        contact_person: selectedCustomer.title_name?.trim() || '',
        name: selectedCustomer.customer_name,
      },
      pdf_path: await getInvoicePdfPath({
        id: invoice.id,
        customer_id: selectedCustomer.id,
        invoice_no: invoice.invoice_no,
        checklist_no: checklistNo || null,
        company_id: invoice.company_id,
        sub_total: subTotal,
        amount_due: selectedCustomer.due_amount,
        vat: calResult.vat,
        discount: calResult.discount,
        total: calResult.total,
        per: parseFloat(per || '0'),
        invoice_date: invoice.invoice_date,
        case_debit: caseDebit || null,
        paid_amount: caseDebit === 'CREDIT' ? 0 : cents(paidAmount),
        balance: caseDebit === 'CREDIT' ? calResult.total : balance,
        no: refNo || null,
        cr_dr: null,
        identify: 'Invoice',
        print_due: printDue ? 'YES' : null,
        is_deleted: 0,
      }),
    });

    if (!sendResult.success) {
      toast.error(sendResult.error ?? 'Failed to send invoice email');
      return;
    }

    toast.success(`Invoice emailed to ${customerName}`, {
      description: 'Invoice email sent'
    });
    resetForm(result.nextInvoiceNumber);
  }, [
    balance,
    calResult.discount,
    calResult.total,
    calResult.vat,
    caseDebit,
    checklistNo,
    paidAmount,
    per,
    persistInvoice,
    printDue,
    refNo,
    resetForm,
    selectedCustomer,
    subTotal,
  ]);

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
          const filteredProducts = li.company_id
            ? products.filter((p) => p.company_id === li.company_id)
            : products;
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
                  company_id: prod?.company_id ?? null,
                });
              }}
            >
              <SelectTrigger className="h-8 w-full min-w-[180px]">
                <SelectValue placeholder="Select product..." />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.map((p) => (
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
          <Button variant="outline" onClick={() => void handleSend()} disabled={saving}>
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
            <Label>Case Debit *</Label>
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
            <Label>Checklist No *</Label>
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

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={printDue} onCheckedChange={(checked) => setPrintDue(checked === true)} />
              Print due amount on invoice
            </label>
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
              disabled={caseDebit === 'CREDIT'}
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
            <p className="text-lg font-medium">${dollars(caseDebit === 'CREDIT' ? calResult.total : balance)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InvoiceForm;
