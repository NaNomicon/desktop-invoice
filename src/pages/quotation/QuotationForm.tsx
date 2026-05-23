import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import { quoCal } from '@/lib/quotation/cal';
import { saveQuotation } from '@/lib/quotation/saved';
import { splitQuotation } from '@/lib/quotation/splitQuotation';
import type {
  Company,
  Customer,
  NumberSequence,
  Product,
  ProductType,
  QuotationMain,
  QuotationSub,
  Setting,
} from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
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
  ArrowLeftRight,
  Eraser,
  FilePlus2,
  FileText,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';

interface QuotationRouteState {
  quotationId?: number;
}

interface LineItem {
  uid: string;
  id: number;
  qty: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  row_total: number;
  s_no: number;
  deleted: boolean;
  company_id: number | null;
}

interface ProductSearchRow {
  id: number;
  product_id: string | null;
  product_name: string;
  type_id: number | null;
  price: number;
  company_id: number;
}

let uidCounter = 1;
function nextUid(): string {
  return `quotation-li-${uidCounter++}`;
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function cents(value: string): number {
  return Math.round(parseFloat(value || '0') * 100);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function createBlankLineItem(): LineItem {
  return {
    uid: nextUid(),
    id: 0,
    qty: 1,
    product_id: null,
    product_name: '',
    unit_price: 0,
    row_total: 0,
    s_no: 1,
    deleted: false,
    company_id: null,
  };
}

function QuotationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const authCompanyId = useAuthStore((s) => s.company_id);
  const routeState = (location.state as QuotationRouteState | null) ?? null;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(routeState?.quotationId ?? null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [companyId, setCompanyId] = useState(authCompanyId);
  const [quotationNumber, setQuotationNumber] = useState('0');
  const [quotationDate, setQuotationDate] = useState(today());
  const [checklistNo, setChecklistNo] = useState('');
  const [refNo, setRefNo] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [per, setPer] = useState('0');
  const [manualDiscount, setManualDiscount] = useState('0.00');
  const [productSearch, setProductSearch] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([createBlankLineItem()]);
  const [deletedLineItemIds, setDeletedLineItemIds] = useState<number[]>([]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customers, customerId],
  );

  const subTotal = useMemo(
    () =>
      lineItems
        .filter((item) => !item.deleted)
        .reduce((sum, item) => sum + item.row_total, 0),
    [lineItems],
  );

  const calcResult = useMemo(
    () =>
      quoCal({
        sub_total: subTotal,
        isvat: settings?.isvat ?? 0,
        vat_per: settings?.vat_per ?? 0,
        per: parseFloat(per || '0'),
      }),
    [per, settings, subTotal],
  );

  const resolvedDiscount = useMemo(() => {
    if (parseFloat(per || '0') > 0) {
      return calcResult.discount;
    }
    return cents(manualDiscount);
  }, [calcResult.discount, manualDiscount, per]);

  const total = useMemo(
    () => subTotal + calcResult.vat - resolvedDiscount,
    [calcResult.vat, resolvedDiscount, subTotal],
  );

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      if (typeFilter !== 'all' && product.type_id !== parseInt(typeFilter, 10)) {
        return false;
      }
      if (!search) {
        return true;
      }
      return (
        (product.product_name ?? '').toLowerCase().includes(search) ||
        (product.product_id ?? '').toLowerCase().includes(search)
      );
    });
  }, [productSearch, products, typeFilter]);

  const reindexLineItems = useCallback((items: LineItem[]) => {
    let serial = 1;
    return items.map((item) => {
      if (item.deleted) {
        return item;
      }
      const nextItem = { ...item, s_no: serial };
      serial += 1;
      return nextItem;
    });
  }, []);

  const resetForm = useCallback(
    (nextQuotationNumber?: string) => {
      setEditingId(null);
      setCustomerId(null);
      setCompanyId(authCompanyId);
      setQuotationDate(today());
      setChecklistNo('');
      setRefNo('');
      setTypeFilter('all');
      setPer('0');
      setManualDiscount('0.00');
      setProductSearch('');
      setLineItems([createBlankLineItem()]);
      setDeletedLineItemIds([]);
      if (nextQuotationNumber) {
        setQuotationNumber(nextQuotationNumber);
      }
      navigate(location.pathname, { replace: true, state: null });
    },
    [authCompanyId, location.pathname, navigate],
  );

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        customerRows,
        productRows,
        typeRows,
        companyRows,
        settingRows,
        numberRows,
      ] = await Promise.all([
        query<Customer>(
          'SELECT * FROM tbl_customer WHERE is_deleted = 0 ORDER BY customer_name',
        ),
        query<Product>(
          'SELECT id, product_id, product_name, type_id, company_id, price, is_deleted FROM tbl_product WHERE is_deleted = 0 ORDER BY product_name',
        ),
        query<ProductType>(
          'SELECT * FROM tbl_product_type WHERE is_deleted = 0 ORDER BY type_name',
        ),
        query<Company>('SELECT * FROM tbl_company WHERE is_active = 1 ORDER BY id'),
        query<Setting>('SELECT * FROM tbl_setting WHERE id = 1 LIMIT 1'),
        query<NumberSequence>('SELECT * FROM tbl_numbers WHERE id = 1 LIMIT 1'),
      ]);

      setCustomers(customerRows);
      setProducts(productRows);
      setProductTypes(typeRows);
      setCompanies(companyRows);
      setSettings(settingRows[0] ?? null);

      if (!editingId) {
        setQuotationNumber(String((numberRows[0]?.quo_no ?? 0) + 1));
      }
    } finally {
      setLoading(false);
    }
  }, [editingId]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const loadQuotation = useCallback(
    async (quotationId: number) => {
      const [quotationRows, lineRows] = await Promise.all([
        query<QuotationMain>(
          'SELECT * FROM tbl_quotation_main WHERE id = ? LIMIT 1',
          [quotationId],
        ),
        query<QuotationSub & ProductSearchRow & { company_id: number }>(
          `SELECT qs.*, p.product_name, p.product_id, p.type_id, p.price, p.company_id
           FROM tbl_quotation_sub qs
           LEFT JOIN tbl_product p ON qs.product_id = p.id
           WHERE qs.main_id = ?
           ORDER BY qs.s_no`,
          [quotationId],
        ),
      ]);

      const quotation = quotationRows[0];
      if (!quotation) {
        toast.error('Quotation not found');
        return;
      }

      setEditingId(quotation.id);
      setCustomerId(quotation.customer_id);
      setCompanyId(quotation.company_id);
      setQuotationNumber(quotation.quo_no);
      setQuotationDate(quotation.quo_date || today());
      setChecklistNo(quotation.checklist_no ?? '');
      setRefNo(quotation.no ?? '');
      setPer(String(quotation.per ?? 0));
      setManualDiscount(dollars(quotation.discount ?? 0));
      setDeletedLineItemIds([]);
      setLineItems(
        lineRows.length > 0
          ? lineRows.map((item, index) => ({
              uid: nextUid(),
              id: item.id,
              qty: item.qty,
              product_id: item.product_id,
              product_name: item.product_name ?? '',
              unit_price: item.unit_price,
              row_total: item.row_total,
              s_no: item.s_no || index + 1,
              deleted: false,
              company_id: item.company_id ?? null,
            }))
          : [createBlankLineItem()],
      );
      setTypeFilter('all');
      setProductSearch('');
      navigate(location.pathname, { replace: true, state: null });
    },
    [location.pathname, navigate],
  );

  useEffect(() => {
    if (!routeState?.quotationId || loading) {
      return;
    }
    void loadQuotation(routeState.quotationId);
  }, [loadQuotation, loading, routeState?.quotationId]);

  const updateLineItem = useCallback(
    (uid: string, patch: Partial<LineItem>) => {
      setLineItems((current) =>
        current.map((item) => {
          if (item.uid !== uid) {
            return item;
          }
          const nextItem: LineItem = { ...item, ...patch };
          const shouldRecalculate =
            patch.qty !== undefined ||
            patch.unit_price !== undefined ||
            patch.product_id !== undefined;
          if (shouldRecalculate) {
            nextItem.row_total = nextItem.qty * nextItem.unit_price;
          }
          if (patch.product_id !== undefined) {
            const product = products.find((entry) => entry.id === patch.product_id) ?? null;
            nextItem.product_name = product?.product_name ?? '';
            nextItem.unit_price = product?.price ?? nextItem.unit_price;
            nextItem.row_total = nextItem.qty * nextItem.unit_price;
          }
          return nextItem;
        }),
      );
    },
    [products],
  );

  const addLineItem = useCallback(() => {
    setLineItems((current) =>
      reindexLineItems([
        ...current,
        {
          ...createBlankLineItem(),
          s_no: current.filter((item) => !item.deleted).length + 1,
        },
      ]),
    );
  }, [reindexLineItems]);

  const toggleDeleteLineItem = useCallback(
    (uid: string) => {
      setLineItems((current) => {
        const target = current.find((item) => item.uid === uid);
        if (!target) {
          return current;
        }

        if (target.id > 0 && !target.deleted) {
          setDeletedLineItemIds((ids) => [...new Set([...ids, target.id])]);
        }
        if (target.id > 0 && target.deleted) {
          setDeletedLineItemIds((ids) => ids.filter((id) => id !== target.id));
        }

        const next = current.map((item) =>
          item.uid === uid ? { ...item, deleted: !item.deleted } : item,
        );
        const activeCount = next.filter((item) => !item.deleted).length;
        if (activeCount === 0) {
          return [createBlankLineItem()];
        }
        return reindexLineItems(next);
      });
    },
    [reindexLineItems],
  );

  const handleProductPick = useCallback(
    (product: ProductSearchRow) => {
      const target = lineItems.find((item) => !item.deleted && !item.product_id) ??
        lineItems.find((item) => !item.deleted) ??
        null;
      if (!target) {
        addLineItem();
        return;
      }
      updateLineItem(target.uid, {
        product_id: product.id,
        product_name: product.product_name,
        unit_price: product.price,
        company_id: product.company_id,
      });
      setProductSearch('');
    },
    [addLineItem, lineItems, updateLineItem],
  );

  const persistQuotation = useCallback(async () => {
    if (!customerId) {
      toast.error('Please select a customer');
      return null;
    }
    if (!quotationNumber.trim()) {
      toast.error('Quotation No is required');
      return null;
    }
    if (lineItems.filter((item) => !item.deleted && item.product_id).length === 0) {
      toast.error('Please add at least one line item');
      return null;
    }

    setSaving(true);
    try {
      const activeItems = lineItems.filter((item) => !item.deleted && item.product_id);
      const activeCompanyIds = [...new Set(activeItems.map((item) => item.company_id).filter((cid): cid is number => cid !== null))];
      const hasSplit = activeCompanyIds.length >= 2;

      if (hasSplit) {
        const result = await splitQuotation({
          customer_id: customerId,
          quo_date: quotationDate,
          checklist_no: checklistNo.trim() || null,
          no: refNo.trim() || null,
          identify: 'Quotation',
          sub_total: subTotal,
          vat: calcResult.vat,
          discount: resolvedDiscount,
          total,
          per: parseFloat(per || '0'),
          line_items: activeItems.map((item) => ({
            id: item.id > 0 ? item.id : undefined,
            qty: item.qty,
            product_id: item.product_id,
            unit_price: item.unit_price,
            row_total: item.row_total,
            s_no: item.s_no,
            company_id: item.company_id!,
          })),
        });
        await loadInitialData();
        return { ...result, nextQuotationNumber: String((await query<NumberSequence>('SELECT quo_no FROM tbl_numbers WHERE id = 1 LIMIT 1'))[0]?.quo_no ?? 0) };
      }

      const result = await saveQuotation({
        quotation_id: editingId,
        customer_id: customerId,
        quo_no: quotationNumber,
        checklist_no: checklistNo.trim() || null,
        company_id: activeCompanyIds.length === 1 ? activeCompanyIds[0]! : companyId,
        sub_total: subTotal,
        amount_due: selectedCustomer?.due_amount ?? 0,
        vat: calcResult.vat,
        discount: resolvedDiscount,
        total,
        per: parseFloat(per || '0'),
        quo_date: quotationDate,
        no: refNo.trim() || null,
        identify: 'Quotation',
        line_items: reindexLineItems(lineItems)
          .filter((item) => !item.deleted && item.product_id)
          .map((item, index) => ({
            id: item.id > 0 ? item.id : undefined,
            qty: item.qty,
            product_id: item.product_id,
            unit_price: item.unit_price,
            row_total: item.row_total,
            s_no: index + 1,
          })),
        deleted_line_item_ids: deletedLineItemIds,
      });

      const numberRows = await query<NumberSequence>(
        'SELECT * FROM tbl_numbers WHERE id = 1 LIMIT 1',
      );
      const nextQuotationNumber = String((numberRows[0]?.quo_no ?? 0) + 1);
      await loadInitialData();
      return { ...result, nextQuotationNumber };
    } catch (error) {
      toast.error(`Save failed: ${String(error)}`);
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    calcResult.vat,
    checklistNo,
    companyId,
    customerId,
    deletedLineItemIds,
    editingId,
    lineItems,
    loadInitialData,
    per,
    quotationDate,
    quotationNumber,
    refNo,
    reindexLineItems,
    resolvedDiscount,
    selectedCustomer?.due_amount,
    subTotal,
    total,
  ]);

  const handleSave = useCallback(async () => {
    const result = await persistQuotation();
    if (!result) {
      return;
    }
    const quoNo = 'quo_no' in result ? result.quo_no : `${result.quotation1_no} & ${result.quotation2_no}`;
    toast.success(
      editingId ? `Quotation ${quoNo} updated` : `Quotation ${quoNo} saved`,
    );
    resetForm(result.nextQuotationNumber);
  }, [editingId, persistQuotation, resetForm]);

  const handlePreview = useCallback(async () => {
    const result = await persistQuotation();
    if (!result) {
      return;
    }
    const quoNo = 'quo_no' in result ? result.quo_no : `${result.quotation1_no} & ${result.quotation2_no}`;
    const quoId = 'id' in result ? result.id : result.quotation1_id;
    toast.success(`Quotation ${quoNo} saved`);
    navigate('/reports/quotations', {
      state: { quotationId: quoId, quotationNo: quoNo },
    });
  }, [navigate, persistQuotation]);

  const openCustomers = useCallback(() => {
    navigate('/customers');
  }, [navigate]);

  const openProducts = useCallback(() => {
    navigate('/products');
  }, [navigate]);

  const columns = useMemo<ColumnDef<LineItem>[]>(
    () => [
      {
        accessorKey: 's_no',
        header: '#',
        size: 40,
        cell: (info) => info.row.original.deleted ? '' : info.getValue<number>(),
      },
      {
        accessorKey: 'product_name',
        header: 'Item Name',
        cell: (info) => {
          const item = info.row.original;
          return item.deleted ? (
            <span className="text-muted-foreground line-through">{item.product_name || '-'}</span>
          ) : (
            <Select
              value={item.product_id ? String(item.product_id) : ''}
              onValueChange={(value) => {
                const prod = products.find((p) => p.id === parseInt(value, 10));
                updateLineItem(item.uid, {
                  product_id: parseInt(value, 10),
                  product_name: prod?.product_name ?? item.product_name,
                  unit_price: prod?.price ?? item.unit_price,
                  company_id: prod?.company_id ?? item.company_id,
                });
              }}
            >
              <SelectTrigger className="h-8 min-w-[220px]">
                <SelectValue placeholder="Select product..." />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.map((product) => (
                  <SelectItem key={product.id} value={String(product.id)}>
                    {product.product_id
                      ? `${product.product_id} - ${product.product_name}`
                      : product.product_name}
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
        cell: (info) => {
          const item = info.row.original;
          return item.deleted ? (
            <span className="text-muted-foreground">{item.qty}</span>
          ) : (
            <Input
              type="number"
              min="0"
              step="1"
              className="h-8 w-20"
              value={item.qty}
              onChange={(event) =>
                updateLineItem(item.uid, { qty: parseInt(event.target.value || '0', 10) || 0 })
              }
            />
          );
        },
      },
      {
        accessorKey: 'unit_price',
        header: 'Unit Price',
        cell: (info) => {
          const item = info.row.original;
          return item.deleted ? (
            <span className="text-muted-foreground">${dollars(item.unit_price)}</span>
          ) : (
            <Input
              type="number"
              min="0"
              step="0.01"
              className="h-8 w-28"
              value={dollars(item.unit_price)}
              onChange={(event) =>
                updateLineItem(item.uid, { unit_price: cents(event.target.value) })
              }
            />
          );
        },
      },
      {
        accessorKey: 'row_total',
        header: 'Total',
        cell: (info) => {
          const item = info.row.original;
          return (
            <span className={item.deleted ? 'text-muted-foreground line-through' : 'font-medium'}>
              ${dollars(info.getValue<number>())}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <Button
            variant="ghost"
            size="icon-sm"
            className={info.row.original.deleted ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}
            onClick={() => toggleDeleteLineItem(info.row.original.uid)}
            title="Ctrl+D to toggle delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      },
    ],
    [filteredProducts, toggleDeleteLineItem, updateLineItem],
  );

  const table = useReactTable({
    data: lineItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        addLineItem();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
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
          <h1 className="text-2xl font-semibold">
            {editingId ? `Edit Quotation ${quotationNumber}` : 'Add Quotation'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openCustomers}>
            <UserPlus className="size-4" />
            Add Customer
          </Button>
          <Button variant="outline" onClick={openProducts}>
            <FilePlus2 className="size-4" />
            Add Product
          </Button>
          <Button variant="outline" onClick={() => resetForm()} disabled={saving}>
            <Eraser className="size-4" />
            Clear
          </Button>
          <Button variant="outline" onClick={() => void handlePreview()} disabled={saving}>
            <Printer className="size-4" />
            Preview
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Save className="size-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Quotation #</Label>
            <Input value={quotationNumber} onChange={(event) => setQuotationNumber(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Quotation Date</Label>
            <Input type="date" value={quotationDate} onChange={(event) => setQuotationDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Customer *</Label>
            <Select
              value={customerId ? String(customerId) : ''}
              onValueChange={(value) => setCustomerId(parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Company</Label>
            <Select
              value={String(companyId)}
              onValueChange={(value) => setCompanyId(parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.company_name ?? `Company ${company.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Checklist No</Label>
            <Input value={checklistNo} onChange={(event) => setChecklistNo(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Ref No</Label>
            <Input value={refNo} onChange={(event) => setRefNo(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Customer Due</Label>
            <Input value={`$${dollars(selectedCustomer?.due_amount ?? 0)}`} disabled className="bg-muted" />
          </div>
          <div className="space-y-1">
            <Label>Product Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {productTypes.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.type_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4" />
            Product Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search by product code or name"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              className="max-w-md"
            />
            <Button variant="outline" onClick={addLineItem}>
              <Plus className="size-4" />
              Add Line
            </Button>
          </div>
          <div className="max-h-52 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Price</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredProducts.slice(0, 12).map((product) => (
                  <tr key={product.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">{product.product_id ?? '-'}</td>
                    <td className="px-3 py-2">{product.product_name}</td>
                    <td className="px-3 py-2 text-right">${dollars(product.price)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleProductPick(product)}
                      >
                        Use
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No products match this search
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id} className="bg-muted/50">
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left font-medium text-muted-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2 align-middle">
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
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <Label>Sub Total</Label>
            <Input value={dollars(subTotal)} disabled className="bg-muted" />
          </div>
          <div className="space-y-1">
            <Label>VAT ({settings?.vat_per ?? 0}%)</Label>
            <Input value={dollars(calcResult.vat)} disabled className="bg-muted" />
          </div>
          <div className="space-y-1">
            <Label>Discount %</Label>
            <Input value={per} onChange={(event) => setPer(event.target.value || '0')} />
          </div>
          <div className="space-y-1">
            <Label>Discount</Label>
            <Input
              value={parseFloat(per || '0') > 0 ? dollars(calcResult.discount) : manualDiscount}
              disabled={parseFloat(per || '0') > 0}
              onChange={(event) => setManualDiscount(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Total</Label>
            <Input value={dollars(total)} disabled className="bg-muted font-semibold" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          <ArrowLeftRight className="size-4" />
          View Quotations
        </Button>
      </div>
    </div>
  );
}

export default QuotationForm;
