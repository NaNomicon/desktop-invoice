import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { query } from '@/lib/db';
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
  NumberSequence,
} from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/ui-store';
import { cal } from '@/lib/invoice/cal';
import { saved } from '@/lib/invoice/saved';
import { splitInvoice } from '@/lib/invoice/splitInvoice';
import { canEditInvoice } from '@/lib/invoice/editLock';
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
  Search,
} from 'lucide-react';

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
  /** Company bucket: 1=XPI (Ironing), 2=XPW (Wash), or null for unassigned */
  company_id: number | null;
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
      id: 0,
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
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchIndex, setCustomerSearchIndex] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(invoicePrefill?.invoiceId ?? null);
  const [deletedLineItemIds, setDeletedLineItemIds] = useState<number[]>([]);
  const [companyId, setCompanyId] = useState(authCompanyId);
  const [invoiceNumber, setInvoiceNumber] = useState('0');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [paidAmount, setPaidAmount] = useState('');
  const [caseDebit, setCaseDebit] = useState('CREDIT');
  const [refNo, setRefNo] = useState('');
  const [checklistNo, setChecklistNo] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  const [productSearchIndex, setProductSearchIndex] = useState(0);
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

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();
    if (!search) {
      return customers;
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

  useEffect(() => {
    setCustomerSearchIndex(0);
  }, [customerSearch]);

  useEffect(() => {
    if (customerSearchIndex >= filteredCustomers.length) {
      setCustomerSearchIndex(0);
    }
  }, [customerSearchIndex, filteredCustomers.length]);

  useEffect(() => {
    setProductSearchIndex(0);
  }, [productSearch]);

  useEffect(() => {
    if (productSearchIndex >= filteredProducts.length) {
      setProductSearchIndex(0);
    }
  }, [filteredProducts.length, productSearchIndex]);

  const isAdvance = selectedCustomer?.ad_due === 'Advance';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [custRows, prodRows, typeRows, compRows, setRows, seqRows] = await Promise.all([
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
      query<{ invoice_no: number }>('SELECT invoice_no FROM tbl_numbers WHERE id = 1'),
    ]);
    setCustomers(custRows);
    setProducts(prodRows);
    setProductTypes(typeRows);
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

  const handleProductPick = useCallback(
    (product: Product) => {
      const emptyTarget = lineItems.find((item) => !item.deleted && !item.product_id) ?? null;
      if (emptyTarget) {
        updateLineItem(emptyTarget.uid, {
          product_id: product.id,
          product_name: product.product_name,
          unit_price: product.price,
          company_id: product.company_id,
        });
        setProductSearch('');
        setProductSearchIndex(0);
        return;
      }

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
      setProductSearch('');
      setProductSearchIndex(0);
    },
    [lineItems, updateLineItem],
  );

  const handleProductSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        if (filteredProducts.length === 0) {
          return;
        }
        event.preventDefault();
        setProductSearchIndex((current) => Math.min(current + 1, filteredProducts.length - 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        if (filteredProducts.length === 0) {
          return;
        }
        event.preventDefault();
        setProductSearchIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selectedMatch = filteredProducts[productSearchIndex] ?? filteredProducts[0];
        if (selectedMatch) {
          handleProductPick(selectedMatch);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setProductSearch('');
        return;
      }

      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        discountInputRef.current?.focus();
      }
    },
    [filteredProducts, handleProductPick, productSearchIndex],
  );

  const selectCustomer = useCallback((customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerSearch('');
    setCustomerSearchIndex(0);
  }, []);

  const handleCustomerSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        if (filteredCustomers.length === 0) {
          return;
        }
        event.preventDefault();
        setCustomerSearchIndex((current) => Math.min(current + 1, filteredCustomers.length - 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        if (filteredCustomers.length === 0) {
          return;
        }
        event.preventDefault();
        setCustomerSearchIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selectedMatch = filteredCustomers[customerSearchIndex] ?? filteredCustomers[0];
        if (selectedMatch) {
          selectCustomer(selectedMatch);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setCustomerSearch('');
        return;
      }
    },
    [customerSearchIndex, filteredCustomers, selectCustomer],
  );

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
          return nextBlankLineItems();
        }
        return next;
      });
    },
    [],
  );

  const resetForm = useCallback(
    (nextInvoiceNumber?: string) => {
      setEditingId(null);
      setDeletedLineItemIds([]);
      setCustomerId(null);
      setCustomerSearch('');
      setCustomerSearchIndex(0);
      setCompanyId(authCompanyId);
      setInvoiceDate(today());
      setPaidAmount('');
      setCaseDebit('CREDIT');
      setRefNo('');
      setChecklistNo('');
      setTypeFilter('all');
      setProductSearch('');
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
        const nextRows = await query<NumberSequence>('SELECT * FROM tbl_numbers WHERE id = 1 LIMIT 1');
        setEditingId(null);
        setDeletedLineItemIds([]);
        setCustomerSearch('');
        setCustomerSearchIndex(0);
        setCustomerId(invoice.customer_id);
        setCompanyId(invoice.company_id);
        setInvoiceNumber(String(nextRows[0]?.invoice_no ?? invoice.invoice_no));
        setInvoiceDate(today());
        setPaidAmount(invoice.case_debit === 'CREDIT' ? '' : dollars(invoice.paid_amount ?? 0));
        setCaseDebit(invoice.case_debit ?? 'CREDIT');
        setRefNo(invoice.no ?? '');
        setChecklistNo(invoice.checklist_no ?? '');
        setPer(String(invoice.per ?? 0));
        setTypeFilter('all');
        setProductSearch('');
        setPrintDue(invoice.print_due === 'YES');
        setLineItems(
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
            : nextBlankLineItems(),
        );
        toast.info(lockState.message ?? 'Loaded as a new invoice');
        navigate(location.pathname, { replace: true, state: null });
        return;
      }

      setEditingId(invoice.id);
      setDeletedLineItemIds([]);
      setCustomerSearch('');
      setCustomerSearchIndex(0);
      setCustomerId(invoice.customer_id);
      setCompanyId(invoice.company_id);
      setInvoiceNumber(invoice.invoice_no);
      setInvoiceDate(invoice.invoice_date || today());
      setPaidAmount(invoice.case_debit === 'CREDIT' ? '' : dollars(invoice.paid_amount ?? 0));
      setCaseDebit(invoice.case_debit ?? 'CREDIT');
      setRefNo(invoice.no ?? '');
      setChecklistNo(invoice.checklist_no ?? '');
      setPer(String(invoice.per ?? 0));
      setTypeFilter('all');
      setProductSearch('');
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
          : nextBlankLineItems(),
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
    setCustomerSearchIndex(0);
    setTypeFilter('all');
    setProductSearch('');
    setProductSearchIndex(0);

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
          paid_amount: caseDebit === 'CREDIT' ? 0 : cents(paidAmount),
          per: parseFloat(per || '0'),
          sub_total: subTotal,
          vat: calResult.vat,
          discount: calResult.discount,
          total: calResult.total,
          amount_due: selectedCustomer?.due_amount ?? 0,
          cr_dr: calResult.total > cents(paidAmount) ? 'Cr.' : 'Dr.',
          line_items: splitLineItems,
        });
        const nextRows = await query<NumberSequence>('SELECT * FROM tbl_numbers WHERE id = 1 LIMIT 1');
        const nextInvoiceNumber = String(nextRows[0]?.invoice_no ?? 0);
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
          paid_amount: caseDebit === 'CREDIT' ? 0 : cents(paidAmount),
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
      const nextRows = await query<NumberSequence>('SELECT * FROM tbl_numbers WHERE id = 1 LIMIT 1');
      const nextInvoiceNumber = String(
        editingId ? nextRows[0]?.invoice_no ?? Number(invoiceNumber) : nextRows[0]?.invoice_no ?? result.invoice_no,
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productAutoFill, products]);

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
      navigate(`/reports/print/${result.invoice1_id}`);
    } else {
      toast.success(`Invoice ${result.invoice_no} saved`);
      navigate(`/reports/print/${result.id}`);
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
            <div className="space-y-2">
              <Input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                onKeyDown={handleCustomerSearchKeyDown}
                placeholder="Search customer by name, phone, email, or address"
              />
              <Select
                value={customerId ? String(customerId) : ''}
                onValueChange={(v) => {
                  const selected = customers.find((customer) => customer.id === parseInt(v, 10));
                  if (selected) {
                    selectCustomer(selected);
                    return;
                  }
                  setCustomerId(parseInt(v, 10));
                  setCustomerSearchIndex(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCustomers.slice(0, 100).map((c, index) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {index === customerSearchIndex ? '→ ' : ''}
                      {[c.title_name?.trim(), c.customer_name, c.telephone?.trim()].filter(Boolean).join(' - ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4" />
            Product Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search by product code or name"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            onKeyDown={handleProductSearchKeyDown}
            className="max-w-md"
          />
          <div className="max-h-52 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Price</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Company</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredProducts.slice(0, 12).map((product, index) => (
                  <tr
                    key={product.id}
                    className={index === productSearchIndex ? 'border-t bg-muted/50' : 'border-t hover:bg-muted/30'}
                  >
                    <td className="px-3 py-2">{product.product_id ?? '-'}</td>
                    <td className="px-3 py-2">{product.product_name}</td>
                    <td className="px-3 py-2 text-right">${dollars(product.price)}</td>
                    <td className="px-3 py-2 text-right">
                      {companies.find((c) => c.id === product.company_id)?.company_name ?? '-'}
                    </td>
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
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No products match this search
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Vertical Company Sections - one per active company */}
      {companies.map((company) => {
        const companyProducts = products.filter((p) => p.company_id === company.id);
        const companyItems = lineItems.filter((li) => li.company_id === company.id);
        const companySubtotal = companyItems.filter((li) => !li.deleted).reduce((sum, li) => sum + li.row_total, 0);
        const companyName = company.company_name ?? company.company_code ?? `Company ${company.id}`;

        const addItemToCompany = () => {
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
        };

        return (
          <Card key={company.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{companyName}</CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(v: string) => {
                      const product = companyProducts.find((p) => p.id === parseInt(v, 10));
                      if (product) {
                        setLineItems((prev) => [
                          ...prev,
                          {
                            uid: nextUid(),
                            id: 0,
                            qty: 1,
                            product_id: product.id,
                            product_name: product.product_name,
                            unit_price: product.price,
                            row_total: product.price,
                            s_no: prev.length + 1,
                            deleted: false,
                            company_id: company.id,
                          },
                        ]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companyProducts.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.product_name} - ${dollars(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={addItemToCompany}>
                    <Plus className="size-3.5" />
                    Add Row
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {companyItems.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No items for {companyName}</p>
              ) : (
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
                        <tr
                          key={li.uid}
                          className={`border-t hover:bg-muted/30 ${li.deleted ? 'bg-muted/20 opacity-50' : ''}`}
                        >
                          <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-1.5">{li.product_name || '-'}</td>
                          <td className="px-3 py-1.5">
                            {li.deleted ? (
                              <span className="text-muted-foreground">{li.qty}</span>
                            ) : (
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
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            {li.deleted ? (
                              <span className="text-muted-foreground">${dollars(li.unit_price)}</span>
                            ) : (
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
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-medium">
                            ${dollars(li.row_total)}
                          </td>
                          <td className="px-3 py-1.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className={li.deleted ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}
                              onClick={() => toggleDeleteLineItem(li.uid)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="px-3 py-2 text-right font-medium">
                          Subtotal
                        </td>
                        <td className="px-3 py-2 font-semibold">${dollars(companySubtotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {companies.map((company) => {
            const companySubtotal = lineItems
              .filter((li) => li.company_id === company.id && !li.deleted)
              .reduce((sum, li) => sum + li.row_total, 0);
            if (companySubtotal === 0) return null;
            return (
              <div key={company.id} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {company.company_name ?? company.company_code ?? `Company ${company.id}`}
                </Label>
                <p className="text-lg font-medium">${dollars(companySubtotal)}</p>
              </div>
            );
          })}
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
              ref={discountInputRef}
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
