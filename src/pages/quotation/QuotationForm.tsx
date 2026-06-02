import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import { formatMoney, parseCents, toDecimal } from '@/lib/currency';
import { useCurrencySymbol } from '@/services/company';
import { sendEmail } from '@/lib/email/send';
import { getQuotationPdfPath } from '@/lib/pdf/path';
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
import { useUIStore } from '@/store/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { DateSinglePicker } from '@/components/ui/date-range-picker'
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  FileText,
  Mail,
  Plus,
  Printer,
  Save,
} from 'lucide-react';
import { ProductRow } from '@/components/billing/ProductRow';
import { createBlankLineItems, nextUid, type BillingLineItem } from '@/components/billing/lineItems';

interface QuotationRouteState {
  quotationId?: number;
}

type LineItem = BillingLineItem;

interface ProductSearchRow {
  id: number;
  product_id: string | null;
  product_name: string;
  type_id: number | null;
  price: number;
  company_id: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function QuotationForm() {
  const navigate = useNavigate();
  const currency = useCurrencySymbol();
  const location = useLocation();
  const authCompanyId = useAuthStore((s) => s.company_id);
  const routeState = (location.state as QuotationRouteState | null) ?? null;
  const productAutoFill = useUIStore((s) => s.productAutoFill);
  const setProductAutoFill = useUIStore((s) => s.setProductAutoFill);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(routeState?.quotationId ?? null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [companyId, setCompanyId] = useState(authCompanyId);
  const [quotationNumber, setQuotationNumber] = useState('0');
  const [quotationDate, setQuotationDate] = useState(today());
  const [checklistNo, setChecklistNo] = useState('');
  const [refNo, setRefNo] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [per, setPer] = useState('');
  const [discountFlat, setDiscountFlat] = useState('');
  const [discountMode, setDiscountMode] = useState<'per' | 'flat'>('per');
  const [lineItems, setLineItems] = useState<LineItem[]>(() => createBlankLineItems());
  const [deletedLineItemIds, setDeletedLineItemIds] = useState<number[]>([]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customers, customerId],
  );

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();
    if (!search) {
      return customers;
    }

    return customers.filter((customer) => {
      const values = [
        customer.customer_name,
        customer.title_name,
        customer.telephone,
        customer.contact,
        customer.address,
        customer.email,
      ];

      return values.some((value) => (value ?? '').toLowerCase().includes(search));
    });
  }, [customerSearch, customers]);

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
        per: discountMode === 'per' ? parseFloat(per || '0') : 0,
        discount_flat: discountMode === 'flat' ? parseCents(discountFlat) : 0,
      }),
    [per, discountFlat, discountMode, settings, subTotal],
  );

  // Derived display values for the non-active discount field
  const derivedDiscountFlat = discountMode === 'per' ? toDecimal(calcResult.discount) : discountFlat;
  const derivedPer = discountMode === 'flat'
    ? (subTotal > 0 ? ((parseCents(discountFlat) / Math.abs(subTotal + calcResult.vat)) * 100).toFixed(2) : '')
    : per;

  const total = subTotal + calcResult.vat - calcResult.discount;




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
      setCustomerSearch('');
      setCompanyId(authCompanyId);
      setQuotationDate(today());
      setChecklistNo('');
      setRefNo('');
      setTypeFilter('all');
      setPer('');
      setDiscountFlat('');
      setDiscountMode('per');
      setLineItems(createBlankLineItems(companies.map((c) => c.id)));
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
        // Seed one blank row per company
        const companyIds = companyRows.map((c) => c.id);
        if (companyIds.length > 0) {
          setLineItems((prev) => {
            const first = prev[0];
            if (prev.length === 1 && first && !first.product_id && first.company_id === null) {
              return createBlankLineItems(companyIds);
            }
            return prev;
          });
        }
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
      setDiscountFlat(toDecimal(quotation.discount ?? 0));
      setDiscountMode(quotation.per > 0 ? 'per' : 'flat');
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
          : createBlankLineItems(companies.map((c) => c.id)),
      );
      setTypeFilter('all');
      setCustomerSearch('');
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

  const addLineItem = useCallback((nextCompanyId?: number | null) => {
    setLineItems((current) => [
      ...current,
      {
        uid: nextUid(),
        id: 0,
        qty: 1,
        product_id: null,
        product_name: '',
        unit_price: 0,
        row_total: 0,
        s_no: current.filter((item) => !item.deleted).length + 1,
        deleted: false,
        company_id: nextCompanyId ?? null,
      },
    ]);
  }, []);

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
          return createBlankLineItems(companies.map((c) => c.id));
        }
        return reindexLineItems(next);
      });
    },
    [reindexLineItems],
  );


  useEffect(() => {
    if (productAutoFill?.targetForm !== 'quotation') return;
    if (!products.length) return;
    const product = products.find((p) => p.id === productAutoFill.productId);
    if (product) {
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
    }
    setProductAutoFill(null);
  }, [addLineItem, lineItems, productAutoFill, products, setProductAutoFill, updateLineItem]);

  const selectCustomer = useCallback((customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerSearch('');
    setCustomerOpen(false);
  }, []);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        addLineItem();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        const activeLine = [...lineItems].reverse().find((item) => !item.deleted);
        if (activeLine) {
          toggleDeleteLineItem(activeLine.uid);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addLineItem, lineItems, toggleDeleteLineItem]);

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
      const activeCompanyIds = [
        ...new Set(activeItems.map((item) => item.company_id).filter((cid): cid is number => cid !== null)),
      ];
      const hasSplit = activeCompanyIds.length >= 2;
      const splitLineItems = activeItems.flatMap((item) =>
        item.company_id === null
          ? []
          : [{
              id: item.id > 0 ? item.id : undefined,
              qty: item.qty,
              product_id: item.product_id,
              unit_price: item.unit_price,
              row_total: item.row_total,
              s_no: item.s_no,
              company_id: item.company_id,
            }],
      );

      if (hasSplit) {
        const result = await splitQuotation({
          customer_id: customerId,
          quo_date: quotationDate,
          checklist_no: checklistNo.trim() || null,
          no: refNo.trim() || null,
          identify: 'Quotation',
          sub_total: subTotal,
          vat: calcResult.vat,
          discount: calcResult.discount,
          total,
          per: parseFloat(per || '0'),
          isvat: settings?.isvat ?? 0,
          vat_per: settings?.vat_per ?? 0,
          line_items: splitLineItems,
        });
        await loadInitialData();
        return {
          ...result,
          nextQuotationNumber: String(
            (await query<NumberSequence>('SELECT quo_no FROM tbl_numbers WHERE id = 1 LIMIT 1'))[0]
              ?.quo_no ?? 0,
          ),
        };
      }

      const result = await saveQuotation({
        quotation_id: editingId,
        customer_id: customerId,
        quo_no: quotationNumber,
        checklist_no: checklistNo.trim() || null,
        company_id:
          activeCompanyIds.length === 1 && activeCompanyIds[0] !== undefined
            ? activeCompanyIds[0]
            : companyId,
        sub_total: subTotal,
        amount_due: selectedCustomer?.due_amount ?? 0,
        vat: calcResult.vat,
        discount: calcResult.discount,
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
    calcResult.discount,
    checklistNo,
    companyId,
    customerId,
    deletedLineItemIds,
    editingId,
    lineItems,
    loadInitialData,
    per,
    discountFlat,
    quotationDate,
    quotationNumber,
    refNo,
    reindexLineItems,
    selectedCustomer?.due_amount,
    settings?.isvat,
    settings?.vat_per,
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
    navigate(`/reports/quotations/${quoId}`, {
      state: { quotationId: quoId, quotationNo: quoNo },
    });
  }, [navigate, persistQuotation]);

  const handleSaveAndPrint = useCallback(async () => {
    const result = await persistQuotation();
    if (!result) {
      return;
    }
    const quoId = 'id' in result ? result.id : result.quotation1_id;
    const quoNo = 'quo_no' in result ? result.quo_no : `${result.quotation1_no} & ${result.quotation2_no}`;
    toast.success(`Quotation ${quoNo} saved`);
    navigate(`/reports/quotations/${quoId}`, {
      state: { quotationId: quoId, quotationNo: quoNo, autoPrint: true },
    });
  }, [navigate, persistQuotation]);

  const handleSend = useCallback(async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer before sending a quotation email');
      return;
    }
    if (!selectedCustomer.email?.trim()) {
      toast.error('The selected customer does not have an email address');
      return;
    }

    const result = await persistQuotation();
    if (!result) {
      return;
    }

    const resultId = 'id' in result ? result.id : result.quotation1_id;
    const quotationRows = await query<QuotationMain>(
      'SELECT * FROM tbl_quotation_main WHERE id = ? LIMIT 1',
      [resultId],
    );
    const quotation = quotationRows[0];
    if (!quotation) {
      toast.error('Quotation was saved but could not be reloaded for sending');
      return;
    }

    const customerName = [selectedCustomer.title_name?.trim(), selectedCustomer.customer_name.trim()]
      .filter(Boolean)
      .join(' ');
    const sendResult = await sendEmail({
      to: selectedCustomer.email.trim(),
      template_type: 'QUOTATION',
      variables: {
        date: quotation.quo_date,
        contact_person: selectedCustomer.title_name?.trim() || '',
        name: selectedCustomer.customer_name,
      },
      pdf_path: await getQuotationPdfPath(quotation),
    });

    if (!sendResult.success) {
      toast.error(sendResult.error ?? 'Failed to send quotation email');
      return;
    }

    toast.success(`Quotation emailed to ${customerName}`, {
      description: 'Quotation email sent',
    });
    resetForm(result.nextQuotationNumber);
  }, [persistQuotation, resetForm, selectedCustomer]);


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
          <Button variant="outline" onClick={() => resetForm()} disabled={saving}>
            Clear
          </Button>
          <Button variant="outline" onClick={() => void handlePreview()} disabled={saving}>
            <Printer className="size-4" />
            Preview
          </Button>
          <Button variant="outline" onClick={() => void handleSend()} disabled={saving}>
            <Mail className="size-4" />
            Send
          </Button>
          <Button variant="default" onClick={() => void handleSaveAndPrint()} disabled={saving}>
            <Printer className="size-4" />
            Save & Print
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
            <Input value={quotationNumber} disabled className="bg-muted" />
          </div>
          <div className="space-y-1">
            <Label>Quotation Date</Label>
            <DateSinglePicker value={quotationDate} onChange={setQuotationDate} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Customer *</Label>
              <Button type="button" variant="ghost" size="sm"
                className="h-5 px-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/customers')}>
                <Plus className="size-3" />
                New Customer
              </Button>
            </div>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={customerOpen} className="w-full justify-between font-normal">
                  <span className="truncate">
                    {selectedCustomer
                      ? [selectedCustomer.title_name?.trim(), selectedCustomer.customer_name, selectedCustomer.telephone?.trim()].filter(Boolean).join(' - ')
                      : 'Select customer...'}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search customer by name, phone, email..." value={customerSearch} onValueChange={setCustomerSearch} />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {filteredCustomers.slice(0, 100).map((customer) => (
                        <CommandItem key={customer.id} value={[customer.title_name, customer.customer_name, customer.telephone, customer.email].filter(Boolean).join(' ')} onSelect={() => selectCustomer(customer)}>
                          <Check className={cn('mr-2 size-4', customerId === customer.id ? 'opacity-100' : 'opacity-0')} />
                          {[customer.title_name?.trim(), customer.customer_name, customer.telephone?.trim()].filter(Boolean).join(' - ')}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label>Product Type</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {typeFilter === "all"
                    ? "All Types"
                    : (productTypes.find((t) => String(t.id) === typeFilter)?.type_name ?? "All Types")}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search types..." />
                  <CommandList>
                    <CommandEmpty>No type found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => setTypeFilter("all")}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            typeFilter === "all" ? "opacity-100" : "opacity-0",
                          )}
                        />
                        All Types
                      </CommandItem>
                      {productTypes.map((type) => (
                        <CommandItem
                          key={type.id}
                          value={type.type_name}
                          onSelect={() => setTypeFilter(String(type.id))}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              typeFilter === String(type.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {type.type_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>


      {companies.map((company) => {
        const companyProducts = products.filter((p) => p.company_id === company.id);
        const companyItems = lineItems.filter((li) => li.company_id === company.id);
        const companySubtotal = companyItems.filter((li) => !li.deleted).reduce((sum, li) => sum + li.row_total, 0);
        const companyName = company.company_name ?? company.company_code ?? `Company ${company.id}`;
        return (
          <Card key={company.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{companyName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="w-12 px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                      <th className="w-20 px-3 py-2 text-left font-medium text-muted-foreground">Qty</th>
                      <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">Price</th>
                      <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">Total</th>
                      <th className="w-10 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyItems.map((li, idx) => (
                      <ProductRow
                        key={li.uid}
                        li={li}
                        idx={idx}
                        companyProducts={companyProducts}
                        currency={currency}
                        priceEditable
                        onProductSelect={(product) => {
                          updateLineItem(li.uid, {
                            product_id: product.id,
                            product_name: product.product_name,
                            unit_price: product.price,
                            company_id: product.company_id,
                          });
                          const hasBlank = lineItems.some((item) => item.uid !== li.uid && !item.deleted && !item.product_id && item.company_id === company.id);
                          if (!hasBlank) {
                            setLineItems((prev) => [...prev, { uid: nextUid(), id: 0, qty: 1, product_id: null, product_name: '', unit_price: 0, row_total: 0, s_no: prev.length + 1, deleted: false, company_id: company.id }]);
                          }
                        }}
                        onQtyChange={(qty) => updateLineItem(li.uid, { qty })}
                        onPriceChange={(price) => updateLineItem(li.uid, { unit_price: price })}
                        onDelete={() => toggleDeleteLineItem(li.uid)}
                      />
                    ))}
                  </tbody>
                  {companySubtotal > 0 && (
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="px-3 py-2 text-right font-medium">Subtotal</td>
                        <td className="px-3 py-2 font-semibold">{formatMoney(companySubtotal, currency)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sub Total</span>
            <span className="font-medium">{formatMoney(subTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${settings?.isvat === 1 ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
              VAT ({settings?.isvat === 1 ? toDecimal(settings.vat_per) : '0'}%)
            </span>
            <span className={`font-medium ${settings?.isvat !== 1 ? 'text-muted-foreground/50' : ''}`}>
              {formatMoney(calcResult.vat, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Discount</span>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="0" max="100" className="h-8 w-20"
                value={derivedPer}
                onChange={(e) => { const v = Math.min(parseFloat(e.target.value) || 0, 100); setPer(v > 0 ? String(v) : e.target.value); setDiscountMode('per'); }}
                placeholder="0%"
              />
              <Input
                type="number" min="0" step="0.01" className="h-8 w-24"
                value={derivedDiscountFlat}
                onChange={(e) => { const maxFlat = toDecimal(Math.abs(subTotal + calcResult.vat)); const v = Math.min(parseFloat(e.target.value) || 0, parseFloat(maxFlat)); setDiscountFlat(v > 0 ? String(v) : e.target.value); setDiscountMode('flat'); }}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Total Amount</span>
            <span className="text-2xl font-bold">{formatMoney(total, currency)}</span>
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
