import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { query } from '@/lib/db';
import { cal } from '@/lib/receipt/cal';
import { saved } from '@/lib/receipt/saved';
import type { Customer, Company, Setting } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Receipt, Search, DollarSign } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

interface TransactionRow {
  extra: string;
  type: 'Invoice' | 'Receipt';
  date: string;
  no: string;
  amount: number;
  cr_dr: string | null;
  balance: number;
}

function ReceiptForm() {
  useAuthStore((s) => s.company_id);
  const location = useLocation();
  const receiptPrefill = location.state as {
    customerId?: number;
    customerName?: string;
    dueAmount?: number;
    adDueStatus?: string;
  } | null;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [, setCompanies] = useState<Company[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState<number>(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [dueAmount, setDueAmount] = useState(0);
  const [adDueStatus, setAdDueStatus] = useState('');
  const [loadDuaAmount, setLoadDuaAmount] = useState(0);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [notes, setNotes] = useState('');
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [transLoading, setTransLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'extra', desc: true }]);

  const calResult = cal({
    load_dua_amount: loadDuaAmount,
    amount_received: parseInt(amountReceived) || 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [custRows, compRows, setRows, seqRows] = await Promise.all([
      query<Customer>('SELECT * FROM tbl_customer WHERE is_deleted = 0 ORDER BY customer_name'),
      query<Company>('SELECT id, company_name FROM tbl_company WHERE is_active = 1'),
      query<Setting>('SELECT * FROM tbl_setting WHERE id = 1'),
      query<{ receipt_no: number }>('SELECT receipt_no FROM tbl_numbers WHERE id = (SELECT MAX(id) FROM tbl_numbers)'),
    ]);
    setCustomers(custRows);
    setCompanies(compRows);
    setSettings(setRows[0] ?? null);
    setReceiptNo(String(seqRows[0]?.receipt_no ?? 1));
    setLoading(false);
  }, []);

  const selectCustomer = useCallback((c: Customer) => {
    setCustomerId(c.id);
    setDueAmount(c.due_amount);
    setAdDueStatus(c.ad_due);
    const loadAmount = c.ad_due === 'Advance' ? -c.due_amount : c.due_amount;
    setLoadDuaAmount(loadAmount);
    setAmountReceived(String(Math.abs(loadAmount)));
  }, []);

  useEffect(() => {
    if (!receiptPrefill?.customerId || customers.length === 0) {
      return;
    }

    const matchedCustomer =
      customers.find((customer) => customer.id === receiptPrefill.customerId) ??
      null;

    if (matchedCustomer) {
      selectCustomer(matchedCustomer);
      setCustomerSearch(matchedCustomer.customer_name);
      return;
    }

    setCustomerId(receiptPrefill.customerId);
    setDueAmount(receiptPrefill.dueAmount ?? 0);
    setAdDueStatus(receiptPrefill.adDueStatus ?? 'Due');
    const loadAmount =
      receiptPrefill.adDueStatus === 'Advance'
        ? -(receiptPrefill.dueAmount ?? 0)
        : (receiptPrefill.dueAmount ?? 0);
    setLoadDuaAmount(loadAmount);
    setAmountReceived(String(Math.abs(loadAmount)));
    setCustomerSearch(receiptPrefill.customerName ?? '');
  }, [customers, receiptPrefill, selectCustomer]);

  const loadTransactions = useCallback(async (custId: number) => {
    if (!custId) return;
    setTransLoading(true);
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
       WHERE tbl_invoice_main.is_deleted = 0 AND tbl_invoice_main.customer_id = ?
      UNION ALL
      SELECT
        tbl_receipt.no AS extra,
        'Receipt' AS type,
        tbl_receipt.receipt_date AS date,
        tbl_receipt.receipt_no AS no,
        tbl_receipt.amount_received AS amount,
        tbl_receipt.cr_dr AS cr_dr,
        tbl_receipt.balance
       FROM tbl_receipt
       WHERE tbl_receipt.customer_id = ?
      ORDER BY extra DESC
    `;
    const rows = await query<TransactionRow>(sql, [custId, custId]);
    setTransactions(rows);
    setTransLoading(false);
  }, []);

  useEffect(() => {
    if (customerId > 0) {
      loadTransactions(customerId);
    } else {
      setTransactions([]);
    }
  }, [customerId, loadTransactions]);

  const transColumns = useMemo<ColumnDef<TransactionRow>[]>(() => [
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'type', header: 'Type', cell: (i) => i.getValue<string>() },
    { accessorKey: 'no', header: 'No' },
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
        return <span className={v === 'Cr.' ? 'text-green-600' : 'text-red-600'}>{v}</span>;
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: (info) => `$${dollars(Number(info.getValue()))}`,
    },
  ], []);

  const transTable = useReactTable({
    data: transactions,
    columns: transColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredCustomers = customerSearch
    ? customers.filter((c) =>
        c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()),
      )
    : customers;

  const paymentModes = settings
    ? [settings.cash, settings.cheque, settings.other].filter(Boolean)
    : ['Cash', 'Cheque', 'Other'];

  const handleSave = useCallback(async () => {
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    const amount = parseInt(amountReceived) || 0;
    if (amount <= 0) {
      toast.error('Please enter received amount');
      return;
    }

    setSaving(true);
    try {
      await saved({
        receipt_id: 0,
        receipt_no: receiptNo,
        receipt_date: receiptDate,
        customer_id: customerId,
        amount_received: amount,
        payment_mode: paymentMode || null,
        cheque_no: chequeNo || null,
        notes: notes || null,
        cr_dr: calResult.cr_dr,
        ad_due: calResult.ad_due,
        load_dua_amount: loadDuaAmount,
        pre_load_status: null,
      });
      toast.success('Receipt saved');
      await loadData();
      setCustomerId(0);
      setCustomerSearch('');
      setDueAmount(0);
      setAdDueStatus('');
      setLoadDuaAmount(0);
      setAmountReceived('');
      setPaymentMode('');
      setChequeNo('');
      setNotes('');
    } catch (err) {
      toast.error(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [customerId, amountReceived, receiptNo, receiptDate, paymentMode, chequeNo, notes, calResult, loadDuaAmount, loadData]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center gap-2">
        <Receipt className="size-5" />
        <h1 className="text-2xl font-semibold">Receipt Voucher</h1>
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="size-4" />
                <span className="font-medium">Receipt Details</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="receipt-no">Receipt No</Label>
                  <Input id="receipt-no" value={receiptNo} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="receipt-date">Date</Label>
                  <Input
                    id="receipt-date"
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="customer-search">Customer</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="customer-search"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {customerSearch && filteredCustomers.length > 0 && (
                    <div className="max-h-40 overflow-auto rounded-md border">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            selectCustomer(c);
                            setCustomerSearch('');
                          }}
                        >
                          <span>{c.customer_name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {c.ad_due === 'Advance' ? '-' : ''}${dollars(c.due_amount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {customerId > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Selected: {customers.find((c) => c.id === customerId)?.customer_name}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>{adDueStatus === 'Advance' ? 'Advance Amount' : 'Due Amount'}</Label>
                  <Input
                    value={`$${dollars(dueAmount)}`}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="amount-received">Amount Received *</Label>
                  <Input
                    id="amount-received"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountReceived ? String(parseInt(amountReceived) / 100) : ''}
                    onChange={(e) => {
                      const dollars = parseFloat(e.target.value) || 0;
                      setAmountReceived(String(Math.round(dollars * 100)));
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="payment-mode">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger id="payment-mode">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((m) => (
                        <SelectItem key={m} value={m ?? ''}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cheque-no">Cheque No</Label>
                  <Input
                    id="cheque-no"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Cr/Dr</Label>
                  <Input value={calResult.cr_dr || '-'} readOnly className="bg-muted" />
                </div>

                <div className="space-y-1">
                  <Label>New Balance</Label>
                  <Input
                    value={`$${dollars(calResult.new_due)}`}
                    readOnly
                    className={`bg-muted font-medium ${
                      calResult.new_due > 0
                        ? 'text-red-600'
                        : calResult.new_due < 0
                          ? 'text-green-600'
                          : ''
                    }`}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setCustomerId(0);
                  setCustomerSearch('');
                  setAmountReceived('');
                  setPaymentMode('');
                  setChequeNo('');
                  setNotes('');
                }}>
                  Reset
                </Button>
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Receipt'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <span className="font-medium">Transaction History</span>
            </CardHeader>
            <CardContent>
              {customerId === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select a customer to view their transaction history.
                </p>
              ) : transLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading...</p>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions found.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      {transTable.getHeaderGroups().map((hg) => (
                        <tr key={hg.id} className="bg-muted/50">
                          {hg.headers.map((h) => (
                            <th
                              key={h.id}
                              className="cursor-pointer select-none px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground"
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
                      {transTable.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="border-t hover:bg-muted/30">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-3 py-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ReceiptForm;
