import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
import { getNextInvoiceNo } from '@/lib/db/nextNumber';
import { sendEmail } from '@/lib/email/send';
import { getInvoicePdfPath } from '@/lib/pdf/path';
import type {
  Customer,
  Company,
  Product,
  ProductType,
  Setting,
  InvoiceMain,
  InvoiceSub,
} from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/ui-store';
import { cal } from '@/lib/invoice/cal';
import { saved } from '@/lib/invoice/saved';
import { splitInvoice } from '@/lib/invoice/splitInvoice';
import { canEditInvoice } from '@/lib/invoice/editLock';
import { formatMoney, parseCents, toDecimal } from '@/lib/currency';
import { useCurrencySymbol } from '@/services/company';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DateSinglePicker } from '@/components/ui/date-range-picker'
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Mail,
  Plus,
  Printer,
  Receipt,
  Save,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { ProductRow } from '@/components/billing/ProductRow';
import { createBlankLineItems, nextUid, type BillingLineItem } from '@/components/billing/lineItems';
type LineItem = BillingLineItem;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface InvoicePrefillState {
  invoiceId?: number;
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
  duplicateFromLockedInvoice?: boolean;
}

interface InvoiceLineRow extends InvoiceSub {
  product_name: string | null;
  product_company_id: number | null;
}


function InvoiceForm() {
  const currency = useCurrencySymbol();
  const navigate = useNavigate();
  const location = useLocation();
  const authCompanyId = useAuthStore((s) => s.company_id);
  const invoicePrefill = location.state as InvoicePrefillState | null;
  const productAutoFill = useUIStore((s) => s.productAutoFill);
  const setProductAutoFill = useUIStore((s) => s.setProductAutoFill);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const discountInputRef = useRef<HTMLInputElement | null>(null);

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(invoicePrefill?.invoiceId ?? null);
  const [deletedLineItemIds, setDeletedLineItemIds] = useState<number[]>([]);
  const [companyId, setCompanyId] = useState(authCompanyId);
  const [invoiceNumber, setInvoiceNumber] = useState('0');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [paidAmount, setPaidAmount] = useState('');
  const [caseDebit, setCaseDebit] = useState('CREDIT');
  const [caseDebitOpen, setCaseDebitOpen] = useState(false);
  const [refNo, setRefNo] = useState('');
  const [checklistNo, setChecklistNo] = useState('');
  const [typeFilterByCompany, setTypeFilterByCompany] = useState<Record<number, string>>({});
  const [typeFilterOpenByCompany, setTypeFilterOpenByCompany] = useState<Record<number, boolean>>({});
  const [typeSearchByCompany, setTypeSearchByCompany] = useState<Record<number, string>>({});
  const [per, setPer] = useState('');
  const [discountFlat, setDiscountFlat] = useState('');
  const [discountMode, setDiscountMode] = useState<'per' | 'flat'>('per');
  const [printDue, setPrintDue] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>(createBlankLineItems);
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
      per: discountMode === 'per' ? parseFloat(per || '0') : 0,
      discount_flat: discountMode === 'flat' ? parseCents(discountFlat) : 0,
    });
  }, [subTotal, selectedCustomer, settings, per, discountFlat, discountMode]);

  // Derived display values for the non-active discount field
  const derivedDiscountFlat = discountMode === 'per' ? toDecimal(calResult.discount) : discountFlat;
  const derivedPer = discountMode === 'flat'
    ? (subTotal > 0 ? ((parseCents(discountFlat) / Math.abs(subTotal + calResult.vat)) * 100).toFixed(2) : '')
    : per;

  const balance = useMemo(() => {
    const paid = parseCents(paidAmount);
    if (paid > 0 && paid < calResult.total) {
      return calResult.total - paid;
    }
    return Math.max(calResult.total - paid, 0);
  }, [paidAmount, calResult.total]);

  const signedBalanceLabel = useMemo(() => {
    if (!selectedCustomer) {
      return formatMoney(0, currency);
    }

    const prefix = selectedCustomer.ad_due === 'Advance' ? '-' : '';
    return `${prefix}${formatMoney(selectedCustomer.due_amount, currency)}`;
  }, [selectedCustomer, currency]);

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();
    if (!search) {
      return customers.slice(0, 50);
    }

    return customers.filter((customer) => {
      const name = customer.customer_name?.toLowerCase() ?? '';
      const title = customer.title_name?.toLowerCase() ?? '';
      const telephone = customer.telephone?.toLowerCase() ?? '';
      const email = customer.email?.toLowerCase() ?? '';
      const address = customer.address?.toLowerCase() ?? '';
      return [name, title, telephone, email, address].some((value) => value.includes(search));
    });
  }, [customerSearch, customers]);


  const isAdvance = selectedCustomer?.ad_due === 'Advance';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [custRows, prodRows, typeRows, compRows, setRows, nextInvoiceNo] = await Promise.all([
      query<Customer>(
        'SELECT id, customer_name, due_amount, ad_due, email, title_name FROM tbl_customer WHERE is_deleted = 0 ORDER BY customer_name',
      ),
      query<Product>(
        'SELECT id, product_id, product_name, type_id, price, company_id FROM tbl_product WHERE is_deleted = 0 ORDER BY product_name',
      ),
      query<ProductType>(
        'SELECT * FROM tbl_product_type WHERE is_deleted = 0 ORDER BY type_name',
      ),
      query<Company>(
        'SELECT id, company_name FROM tbl_company WHERE is_active = 1',
      ),
      query<Setting>('SELECT * FROM tbl_setting WHERE id = 1'),
      getNextInvoiceNo(),
    ]);
    setCustomers(custRows);
    setProducts(prodRows);
    setProductTypes(typeRows);
    setCompanies(compRows);
    setSettings(setRows[0] ?? null);
    setInvoiceNumber(nextInvoiceNo);
    // Seed one blank row per company
    const companyIds = compRows.map((c) => c.id);
    if (companyIds.length > 0) {
      setLineItems((prev) => {
        const first = prev[0];
        if (prev.length === 1 && first && !first.product_id && first.company_id === null) {
          return createBlankLineItems(companyIds);
        }
        return prev;
      });
    }
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
          const shouldRecalculate =
            patch.qty !== undefined ||
            patch.unit_price !== undefined ||
            patch.product_id !== undefined;
          if (shouldRecalculate) {
            updated.row_total = updated.qty * updated.unit_price;
          }
          if (patch.product_id !== undefined) {
            const product = products.find((entry) => entry.id === patch.product_id) ?? null;
            updated.product_name = product?.product_name ?? '';
            updated.unit_price = product?.price ?? updated.unit_price;
            updated.company_id = product?.company_id ?? updated.company_id;
            updated.row_total = updated.qty * updated.unit_price;
          }
          return updated;
        }),
      );
    },
    [products],
  );

  const addLineItem = useCallback((nextCompanyId?: number | null) => {
    setLineItems((prev) => [
      ...prev,
      {
        uid: nextUid(),
        id: 0,
        qty: 1,
        product_id: null,
        product_name: '',
        unit_price: 0,
        row_total: 0,
        s_no: prev.length + 1,
        deleted: false,
        company_id: nextCompanyId ?? null,
      },
    ]);
  }, []);

  const selectCustomer = useCallback((customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerSearch('');
    setCustomerOpen(false);
  }, []);


  const toggleDeleteLineItem = useCallback(
    (uid: string) => {
      setLineItems((prev) => {
        const target = prev.find((li) => li.uid === uid);
        if (!target) {
          return prev;
        }

        if (target.id > 0 && !target.deleted) {
          setDeletedLineItemIds((ids) => [...new Set([...ids, target.id])]);
        }
        if (target.id > 0 && target.deleted) {
          setDeletedLineItemIds((ids) => ids.filter((id) => id !== target.id));
        }

        const next = prev.map((li) =>
          li.uid === uid ? { ...li, deleted: !li.deleted } : li,
        );
        const activeCount = next.filter((li) => !li.deleted).length;
        if (activeCount === 0) {
          // Restore one blank row per company
          return createBlankLineItems(companies.map((c) => c.id));
        }
        return next;
      });
    },
    [companies],
  );

  const resetForm = useCallback(
    (nextInvoiceNumber?: string) => {
      setEditingId(null);
      setDeletedLineItemIds([]);
      setCustomerId(null);
      setCustomerSearch('');
      setCompanyId(authCompanyId);
      setInvoiceDate(today());
      setPaidAmount('');
      setCaseDebit('CREDIT');
      setRefNo('');
      setChecklistNo('');
      setTypeFilterByCompany({});
      setTypeFilterOpenByCompany({});
      setTypeSearchByCompany({});
      setPer('');
      setDiscountFlat('');
      setDiscountMode('per');
      setPrintDue(false);
      setLineItems(createBlankLineItems(companies.map((c) => c.id)));
      if (nextInvoiceNumber) {
        setInvoiceNumber(nextInvoiceNumber);
      }
      navigate(location.pathname, { replace: true, state: null });
    },
    [authCompanyId, companies, location.pathname, navigate],
  );

  const loadInvoice = useCallback(
    async (invoiceId: number) => {
      const lockState = await canEditInvoice(invoiceId);
      if (!lockState.canEdit) {
        toast.error(lockState.message ?? 'Invoice cannot be edited');
        navigate('/invoices', { replace: true });
        return;
      }

      const [invoiceRows, lineRows] = await Promise.all([
        query<InvoiceMain>('SELECT * FROM tbl_invoice_main WHERE id = ? LIMIT 1', [invoiceId]),
        query<InvoiceLineRow>(
          `SELECT ins.*, p.product_name, p.company_id AS product_company_id
           FROM tbl_invoice_sub ins
           LEFT JOIN tbl_product p ON ins.product_id = p.id
           WHERE ins.main_id = ?
           ORDER BY ins.s_no`,
          [invoiceId],
        ),
      ]);

      const invoice = invoiceRows[0];
      if (!invoice) {
        toast.error('Invoice not found');
        navigate('/invoices', { replace: true });
        return;
      }

      if (lockState.forceDuplicate) {
        const nextNo = await getNextInvoiceNo();
        setEditingId(null);
        setDeletedLineItemIds([]);
        setCustomerSearch('');
        setCustomerId(invoice.customer_id);
        setCompanyId(invoice.company_id);
        setInvoiceNumber(nextNo);
        setInvoiceDate(today());
        setPaidAmount(invoice.case_debit === 'CREDIT' ? '' : toDecimal(invoice.paid_amount ?? 0));
        setCaseDebit(invoice.case_debit ?? 'CREDIT');
        setRefNo(invoice.no ?? '');
        setChecklistNo(invoice.checklist_no ?? '');
        setPer(String(invoice.per ?? 0));
        setDiscountFlat('');
        setTypeFilterByCompany({});
        setTypeFilterOpenByCompany({});
        setTypeSearchByCompany({});
        setPrintDue(invoice.print_due === 'YES');        setLineItems(
          lineRows.length > 0
            ? lineRows.map((item, index) => ({
                uid: nextUid(),
                id: 0,
                qty: item.qty,
                product_id: item.product_id,
                product_name: item.product_name ?? '',
                unit_price: item.unit_price,
                row_total: item.row_total,
                s_no: item.s_no || index + 1,
                deleted: false,
                company_id: item.company_id ?? item.product_company_id ?? null,
              }))
            : createBlankLineItems(),
        );
        toast.info(lockState.message ?? 'Loaded as a new invoice');
        navigate(location.pathname, { replace: true, state: null });
        return;
      }

      setEditingId(invoice.id);
      setDeletedLineItemIds([]);
      setCustomerSearch('');
      setCustomerId(invoice.customer_id);
      setCompanyId(invoice.company_id);
      setInvoiceNumber(invoice.invoice_no);
      setInvoiceDate(invoice.invoice_date || today());
        setPaidAmount(invoice.case_debit === 'CREDIT' ? '' : toDecimal(invoice.paid_amount ?? 0));
      setCaseDebit(invoice.case_debit ?? 'CREDIT');
      setRefNo(invoice.no ?? '');
      setChecklistNo(invoice.checklist_no ?? '');
      setPer(String(invoice.per ?? 0));
      setDiscountFlat('');
      setTypeFilterByCompany({});
      setTypeFilterOpenByCompany({});
      setTypeSearchByCompany({});
      setPrintDue(invoice.print_due === 'YES');
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
              company_id: item.company_id ?? item.product_company_id ?? null,
            }))
          : createBlankLineItems(),
      );
      navigate(location.pathname, { replace: true, state: null });
    },
    [location.pathname, navigate],
  );

  useEffect(() => {
    if (!invoicePrefill || loading || customers.length === 0 || products.length === 0) {
      return;
    }

    if (invoicePrefill.invoiceId) {
      void loadInvoice(invoicePrefill.invoiceId);
      return;
    }

    setEditingId(null);
    setDeletedLineItemIds([]);
    setCustomerSearch('');
    setTypeFilterByCompany({});
    setTypeFilterOpenByCompany({});
    setTypeSearchByCompany({});

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
    setDiscountFlat('');

    if (invoicePrefill.lineItems?.length) {
      setLineItems(
        invoicePrefill.lineItems.map((item, index) => {
          const product = products.find((entry) => entry.id === item.product_id);
          return {
            uid: nextUid(),
            id: 0,
            qty: item.qty,
            product_id: item.product_id,
            product_name: product?.product_name ?? '',
            unit_price: item.unit_price,
            row_total: item.row_total,
            s_no: item.s_no || index + 1,
            deleted: false,
            company_id: product?.company_id ?? invoicePrefill.companyId ?? null,
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
  }, [customers, invoicePrefill, loadInvoice, loading, location.pathname, navigate, products]);

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
      const activeCompanyIds = [
        ...new Set(activeItems.map((li) => li.company_id).filter((cid): cid is number => cid !== null)),
      ];
      const hasSplit = activeCompanyIds.length >= 2;

      const resolveCompanyId = (cid: number | null): number => {
        if (cid !== null && cid !== undefined) return cid;
        const onlyCompanyId = activeCompanyIds[0];
        if (onlyCompanyId !== undefined) return onlyCompanyId;
        return companyId;
      };

      const splitLineItems = activeItems.map((li, i) => {
        const resolvedCompanyId = li.company_id;
        if (resolvedCompanyId === null || resolvedCompanyId === undefined) {
          throw new Error('Split invoice line item is missing company assignment');
        }
        return {
          qty: li.qty,
          product_id: li.product_id,
          unit_price: li.unit_price,
          row_total: li.row_total,
          s_no: i + 1,
          company_id: resolvedCompanyId,
        };
      });

      if (editingId && hasSplit) {
        toast.error('Editing split invoices is not supported yet');
        return null;
      }

      if (hasSplit) {
        const result = await splitInvoice({
          customer_id: customerId,
          invoice_date: invoiceDate,
          checklist_no: checklistNo || null,
          case_debit: caseDebit || 'CREDIT',
          paid_amount: caseDebit === 'CREDIT' ? 0 : parseCents(paidAmount),
          per: parseFloat(per || '0'),
          sub_total: subTotal,
          vat: calResult.vat,
          discount: calResult.discount,
          total: calResult.total,
          amount_due: selectedCustomer?.due_amount ?? 0,
          cr_dr: calResult.total > parseCents(paidAmount) ? 'Cr.' : 'Dr.',
          line_items: splitLineItems,
        });
        const nextInvoiceNumber = await getNextInvoiceNo();
        await loadData();
        return { ...result, nextInvoiceNumber };
      }

      const result = await saved(
        {
          invoice_id: editingId,
          customer_id: customerId,
          invoice_no: invoiceNumber,
          invoice_date: invoiceDate,
          sub_total: subTotal,
          amount_due: selectedCustomer?.due_amount ?? 0,
          vat: calResult.vat,
          discount: calResult.discount,
          total: calResult.total,
          per: parseFloat(per || '0'),
          paid_amount: caseDebit === 'CREDIT' ? 0 : parseCents(paidAmount),
          balance: caseDebit === 'CREDIT' ? calResult.total : balance,
          case_debit: caseDebit || null,
          no: refNo || null,
          identify: 'Invoice',
          print_due: printDue ? 'YES' : null,
          checklist_no: checklistNo || null,
          line_items: activeItems.map((li, i) => ({
            id: li.id > 0 ? li.id : undefined,
            qty: li.qty,
            product_id: li.product_id,
            unit_price: li.unit_price,
            row_total: li.row_total,
            s_no: i + 1,
            company_id: li.company_id,
          })),
          deleted_line_item_ids: deletedLineItemIds,
          isAdvance,
        },
        resolveCompanyId(activeItems[0]?.company_id ?? null),
      );
      const nextInvoiceNumber = await getNextInvoiceNo();
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
    deletedLineItemIds,
    editingId,
    invoiceDate,
    invoiceNumber,
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

  useEffect(() => {
    if (productAutoFill?.targetForm !== 'invoice') return;
    if (!products.length) return;
    const product = products.find((p) => p.id === productAutoFill.productId);
    if (product) {
      const emptyTarget = lineItems.find((item) => !item.deleted && !item.product_id) ?? null;
      if (emptyTarget) {
        updateLineItem(emptyTarget.uid, {
          product_id: product.id,
          product_name: product.product_name,
          unit_price: product.price,
          company_id: product.company_id,
        });
      } else {
        const fallbackItem = {
          uid: nextUid(),
          id: 0,
          qty: 1,
          product_id: product.id,
          product_name: product.product_name,
          unit_price: product.price,
          row_total: product.price,
          s_no: lineItems.length + 1,
          deleted: false,
          company_id: product.company_id,
        };
        setLineItems((prev) => [...prev, fallbackItem]);
      }
    }
    setProductAutoFill(null);
  }, [productAutoFill, products, lineItems, setProductAutoFill, updateLineItem]);

  const handleSave = useCallback(async () => {
    const result = await persistInvoice();
    if (!result) {
      return;
    }

    const invNo = 'invoice_no' in result ? result.invoice_no : `${result.invoice1_no} & ${result.invoice2_no}`;
    toast.success(editingId ? `Invoice ${invNo} updated` : `Invoice ${invNo} saved`);
    resetForm(result.nextInvoiceNumber);
  }, [editingId, persistInvoice, resetForm]);

  const handlePrint = useCallback(async () => {
    const result = await persistInvoice();
    if (!result) {
      return;
    }

    const isSplit = 'invoice1_id' in result;
    if (isSplit) {
      toast.success(`Invoices ${result.invoice1_no} & ${result.invoice2_no} saved`);
      navigate(`/reports/print/${result.invoice1_id}`, { state: { invoiceNo: result.invoice1_no } });
    } else {
      toast.success(`Invoice ${result.invoice_no} saved`);
      navigate(`/reports/print/${result.id}`, { state: { invoiceNo: result.invoice_no } });
    }
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
        paid_amount: caseDebit === 'CREDIT' ? 0 : parseCents(paidAmount),
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        const activeCompanyId = [...lineItems].reverse().find((item) => !item.deleted)?.company_id ?? null;
        addLineItem(activeCompanyId);
        return;
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
          <h1 className="text-2xl font-semibold">
            {editingId ? `Edit Invoice ${invoiceNumber}` : 'New Invoice'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => resetForm()} disabled={saving}>
            <RotateCcw className="size-4" />
            {editingId ? 'Create New Invoice' : 'Clear'}
          </Button>
          <Button variant="outline" onClick={handleCreateReceipt} disabled={saving}>
            <Receipt className="size-4" />
            Create Receipt
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
            <div className="flex items-center justify-between">
              <Label>Customer *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/customers')}
              >
                <Plus className="size-3" />
                New Customer
              </Button>
            </div>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedCustomer
                      ? [selectedCustomer.title_name?.trim(), selectedCustomer.customer_name, selectedCustomer.telephone?.trim()].filter(Boolean).join(' - ')
                      : 'Select customer...'}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search by name, phone, email..."
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {customerOpen && filteredCustomers.slice(0, 100).map((c) => (
                        <CommandItem
                          key={c.id}
                          value={[c.title_name, c.customer_name, c.telephone, c.email, c.address].filter(Boolean).join(' ')}
                          onSelect={() => selectCustomer(c)}
                        >
                          <Check
                            className={cn('mr-2 size-4', customerId === c.id ? 'opacity-100' : 'opacity-0')}
                          />
                          {[c.title_name?.trim(), c.customer_name, c.telephone?.trim()].filter(Boolean).join(' - ')}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label>Invoice Date</Label>
            <DateSinglePicker
              value={invoiceDate}
              onChange={setInvoiceDate}
            />
          </div>

          <div className="space-y-1">
            <Label>Case Debit *</Label>
            <Popover open={caseDebitOpen} onOpenChange={setCaseDebitOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={caseDebitOpen} className="w-full justify-between font-normal">
                  {caseDebit || 'Select...'}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[160px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandEmpty>No option found.</CommandEmpty>
                    <CommandGroup>
                      {caseDebitOpen && (['CASH', 'CREDIT'] as const).map((val) => (
                        <CommandItem key={val} value={val} onSelect={(v) => { setCaseDebit(v); setCaseDebitOpen(false); }}>
                          <Check className={cn('mr-2 size-4', caseDebit === val ? 'opacity-100' : 'opacity-0')} />
                          {val}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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


        </CardContent>
      </Card>


      {/* Vertical Company Sections - one per active company */}
      {companies.map((company) => {
        const companyTypeFilter = typeFilterByCompany[company.id] ?? 'all';
        const companyProductTypes = productTypes.filter((t) =>
          products.some((p) => p.company_id === company.id && p.type_id === t.id)
        );
        const companyProducts = products
          .filter((p) => p.company_id === company.id)
          .filter((p) => companyTypeFilter === 'all' || String(p.type_id) === companyTypeFilter);
        const companyItems = lineItems.filter((li) => li.company_id === company.id);
        const companySubtotal = companyItems.filter((li) => !li.deleted).reduce((sum, li) => sum + li.row_total, 0);
        const companyName = company.company_name ?? company.company_code ?? `Company ${company.id}`;

        return (
          <Card key={company.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base font-semibold">{companyName}</CardTitle>
                {companyProductTypes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <Popover
                      open={typeFilterOpenByCompany[company.id] ?? false}
                      onOpenChange={(o) => {
                        setTypeFilterOpenByCompany((prev) => ({ ...prev, [company.id]: o }));
                        if (!o) setTypeSearchByCompany((prev) => ({ ...prev, [company.id]: '' }));
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="h-7 gap-1 px-2 text-xs font-normal">
                          {companyTypeFilter === 'all'
                            ? 'All Types'
                            : (companyProductTypes.find((t) => String(t.id) === companyTypeFilter)?.type_name ?? 'All Types')}
                          <ChevronsUpDown className="size-3 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="end">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search types..."
                            value={typeSearchByCompany[company.id] ?? ''}
                            onValueChange={(v) => setTypeSearchByCompany((prev) => ({ ...prev, [company.id]: v }))}
                          />
                          {(typeFilterOpenByCompany[company.id] ?? false) && (
                            <CommandList>
                              <CommandEmpty>No type found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all"
                                  onSelect={() => {
                                    setTypeFilterByCompany((prev) => ({ ...prev, [company.id]: 'all' }));
                                    setTypeFilterOpenByCompany((prev) => ({ ...prev, [company.id]: false }));
                                    setTypeSearchByCompany((prev) => ({ ...prev, [company.id]: '' }));
                                  }}
                                >
                                  <Check className={cn('mr-2 size-4', companyTypeFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                                  All Types
                                </CommandItem>
                                {companyProductTypes
                                  .filter((t) => t.type_name.toLowerCase().includes((typeSearchByCompany[company.id] ?? '').toLowerCase()))
                                  .map((t) => (
                                    <CommandItem
                                      key={t.id}
                                      value={String(t.id)}
                                      onSelect={(v) => {
                                        setTypeFilterByCompany((prev) => ({ ...prev, [company.id]: v }));
                                        setTypeFilterOpenByCompany((prev) => ({ ...prev, [company.id]: false }));
                                        setTypeSearchByCompany((prev) => ({ ...prev, [company.id]: '' }));
                                      }}
                                    >
                                      <Check className={cn('mr-2 size-4', companyTypeFilter === String(t.id) ? 'opacity-100' : 'opacity-0')} />
                                      {t.type_name}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          )}
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
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
                        onProductSelect={(product) => {
                          updateLineItem(li.uid, {
                            product_id: product.id,
                            product_name: product.product_name,
                            unit_price: product.price,
                            company_id: product.company_id,
                          });
                          const activeItems = lineItems.filter((item) => !item.deleted);
                          const hasBlank = activeItems.some((item) => item.uid !== li.uid && !item.product_id);
                          if (!hasBlank) {
                            setLineItems((prev) => [
                              ...prev,
                              {
                                uid: nextUid(),
                                id: 0,
                                qty: 1,
                                product_id: null,
                                product_name: '',
                                unit_price: 0,
                                row_total: 0,
                                s_no: prev.length + 1,
                                deleted: false,
                                company_id: company.id,
                              },
                            ]);
                          }
                        }}
                        onQtyChange={(qty) => updateLineItem(li.uid, { qty })}
                        onDelete={() => toggleDeleteLineItem(li.uid)}
                      />
                    ))}
                  </tbody>
                  {companySubtotal > 0 && (
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="px-3 py-2 text-right font-medium">
                          Subtotal
                        </td>
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
          {/* Sub Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sub Total</span>
            <span className="font-medium">{formatMoney(subTotal, currency)}</span>
          </div>
          {/* Due Amount with checkbox - always visible */}
          <div className="flex items-center justify-between">
            <label className={`flex items-center gap-2 text-sm ${selectedCustomer ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
              <Checkbox
                checked={printDue}
                onCheckedChange={(checked) => setPrintDue(checked === true)}
                disabled={!selectedCustomer}
              />
              {selectedCustomer?.ad_due === 'Advance' ? 'Advance Amount' : 'Due Amount'}
            </label>
            <span className={`font-medium ${!selectedCustomer ? 'text-muted-foreground/50' : ''}`}>
              {formatMoney(selectedCustomer?.due_amount ?? 0, currency)}
            </span>
          </div>

          {/* VAT - always visible */}
          <div className="flex items-center justify-between">
            <span className={`text-sm ${settings?.isvat === 1 ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
              VAT ({settings?.isvat === 1 ? toDecimal(settings.vat_per) : '0'}%)
            </span>
            <span className={`font-medium ${settings?.isvat !== 1 ? 'text-muted-foreground/50' : ''}`}>
              {formatMoney(calResult.vat, currency)}
            </span>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Discount</span>
            <div className="flex items-center gap-2">
              <Input
                ref={discountInputRef}
                type="number"
                min="0"
                max="100"
                className="h-8 w-20"
                value={derivedPer}
                onChange={(e) => { const v = Math.min(parseFloat(e.target.value) || 0, 100); setPer(v > 0 ? String(v) : e.target.value); setDiscountMode('per'); }}
                placeholder="0%"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-8 w-24"
                value={derivedDiscountFlat}
                onChange={(e) => { const maxFlat = toDecimal(Math.abs(subTotal + calResult.vat)); const v = Math.min(parseFloat(e.target.value) || 0, parseFloat(maxFlat)); setDiscountFlat(v > 0 ? String(v) : e.target.value); setDiscountMode('flat'); }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Total Amount</span>
            <span className="text-2xl font-bold">{formatMoney(calResult.total, currency)}</span>
          </div>

          {/* Paid Amount */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Paid Amount</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              className="h-8 w-32"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0.00"
              disabled={caseDebit === 'CREDIT'}
            />
          </div>

          {/* Customer info */}
          {selectedCustomer && (
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customer Balance</span>
                <span className="font-medium">{formatMoney(selectedCustomer.due_amount, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Signed Balance</span>
                <span className="font-medium">{signedBalanceLabel}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
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
  );
}

export default InvoiceForm;
