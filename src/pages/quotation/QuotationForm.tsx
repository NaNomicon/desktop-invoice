import { useState, useCallback, useEffect } from 'react';
import { query, execute } from '@/lib/db';
import { quoCal } from '@/lib/quotation/cal';
import type { Customer, Product } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, FileText } from 'lucide-react';

interface LineItem {
  id: number;
  product_id: number | null;
  qty: number;
  unit_price: number;
  row_total: number;
  s_no: number;
  is_deleted: number;
}

export default function QuotationForm() {
  const { company_id } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [typeId, setTypeId] = useState<number>(1);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [isvat, setIsvat] = useState(0);
  const [vatPer, setVatPer] = useState(0);
  const [per, setPer] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadProducts();
    loadSettings();
  }, []);

  const loadCustomers = async () => {
    const rows = await query<Customer>('SELECT * FROM tbl_customer WHERE is_deleted = 0 ORDER BY customer_name');
    setCustomers(rows);
  };

  const loadProducts = async () => {
    const rows = await query<Product>('SELECT * FROM tbl_product WHERE is_deleted = 0 AND company_id = ?', [company_id]);
    setProducts(rows);
  };

  const loadSettings = async () => {
    const rows = await query<{ isvat: number; vat_per: number }>('SELECT isvat, vat_per FROM tbl_setting WHERE id = 1');
    if (rows[0]) {
      setIsvat(rows[0].isvat);
      setVatPer(rows[0].vat_per);
    }
  };

  const recalc = useCallback(() => {
    const result = quoCal({ sub_total: subTotal, isvat, vat_per: vatPer, per });
    setDiscount(result.discount);
    setTotal(result.total);
  }, [subTotal, isvat, vatPer, per]);

  useEffect(() => {
    recalc();
  }, [recalc]);

  const addLine = () => {
    setLineItems(prev => [
      ...prev,
      { id: Date.now(), product_id: null, qty: 1, unit_price: 0, row_total: 0, s_no: prev.length + 1, is_deleted: 0 },
    ]);
  };

  const updateLine = (index: number, field: keyof LineItem, value: number) => {
    setLineItems(prev => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item;
        const updatedItem = { ...item, [field]: value };
        if (field === 'product_id' || field === 'qty' || field === 'unit_price') {
          updatedItem.row_total = updatedItem.qty * updatedItem.unit_price;
        }
        return updatedItem as LineItem;
      });
      return updated;
    });
    recalcSubTotal();
  };

  const recalcSubTotal = () => {
    const sum = lineItems.filter(l => !l.is_deleted).reduce((acc, l) => acc + l.row_total, 0);
    setSubTotal(sum);
  };

  const removeLine = (index: number) => {
    setLineItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      if (item) item.is_deleted = 1;
      return updated;
    });
    recalcSubTotal();
  };

  const handleSave = async () => {
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (lineItems.filter(l => !l.is_deleted).length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const quoNo = String(Date.now());
      
      await execute(
        `INSERT INTO tbl_quotation_main (customer_id, quo_no, company_id, sub_total, amount_due, vat, discount, total, per, quo_date, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), 0)`,
        [customerId, quoNo, company_id, subTotal, 0, Math.round(subTotal * vatPer / 10000), discount, total, per]
      );

      const quoRows = await query<{ id: number }>('SELECT last_insert_rowid() as id');
      const quoId = quoRows[0]?.id;
      if (quoId) {
        for (const item of lineItems.filter(l => !l.is_deleted)) {
          await execute(
            `INSERT INTO tbl_quotation_sub (main_id, qty, product_id, unit_price, row_total, s_no, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [quoId, item.qty, item.product_id, item.unit_price, item.row_total, item.s_no]
          );
        }
      }

      toast.success('Quotation saved');
      setDialogOpen(false);
    } catch (e) {
      toast.error('Failed to save quotation');
    }
    setSaving(false);
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quotation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => { setDialogOpen(true); setEditingId(null); }} className="mb-4">
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Quotation' : 'New Quotation'}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Customer</Label>
                    <Select onValueChange={(v) => setCustomerId(Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.customer_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Product Type</Label>
                    <Select onValueChange={(v) => setTypeId(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {products.filter(p => p.type_id).map(p => (
                          <SelectItem key={p.type_id} value={String(p.type_id)}>
                            {String(p.type_id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border rounded-md overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-left">Qty</th>
                        <th className="p-2 text-left">Price</th>
                        <th className="p-2 text-left">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.filter(l => !l.is_deleted).map((item, idx) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">
                            <Select onValueChange={(v) => updateLine(idx, 'product_id', Number(v))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {products.filter(p => p.type_id === typeId).map(p => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input type="number" value={item.qty} onChange={(e) => updateLine(idx, 'qty', Number(e.target.value))} className="w-20" />
                          </td>
                          <td className="p-2">
                            <Input type="number" value={item.unit_price} onChange={(e) => updateLine(idx, 'unit_price', Number(e.target.value))} className="w-24" />
                          </td>
                          <td className="p-2">{item.row_total.toLocaleString()}</td>
                          <td className="p-2">
                            <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button variant="outline" onClick={addLine} className="m-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Sub Total</Label>
                    <Input value={subTotal.toLocaleString()} disabled />
                  </div>
                  <div>
                    <Label>VAT ({vatPer / 100}%)</Label>
                    <Input value={Math.round(subTotal * vatPer / 10000).toLocaleString()} disabled />
                  </div>
                  <div>
                    <Label>Discount %</Label>
                    <Input type="number" value={per} onChange={(e) => setPer(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input value={total.toLocaleString()} disabled className="font-bold" />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>Save Quotation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}