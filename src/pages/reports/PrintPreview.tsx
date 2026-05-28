import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import { getInvoicePdfPath } from '@/lib/pdf/path';
import type { Customer, InvoiceMain } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, FileText, MessageCircle } from 'lucide-react';
import { WhatsAppSendDialog } from '@/components/whatsapp/WhatsAppSendDialog';

interface InvoiceLineRow {
  id: number;
  main_id: number;
  qty: number;
  product_id: number | null;
  unit_price: number;
  row_total: number;
  s_no: number;
  product_name: string | null;
  type_name: string | null;
  product_code: string | null;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150] as const;

interface PrintPreviewProps {
  invoice_id: number;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function PrintPreview({ invoice_id }: PrintPreviewProps) {
  const params = useParams<{ invoiceId?: string }>();
  const resolvedInvoiceId = params.invoiceId ? parseInt(params.invoiceId, 10) : invoice_id;
  const [zoom, setZoom] = useState(() => (resolvedInvoiceId ? 100 : 100));

  const { data, isLoading } = useQuery({
    queryKey: ['printPreviewInvoice', resolvedInvoiceId],
    queryFn: async () => {
      const rows = await query<InvoiceMain>(
        'SELECT * FROM tbl_invoice_main WHERE id = ? AND is_deleted = 0',
        [resolvedInvoiceId],
      );
      if (rows.length === 0) return null;

      const inv = rows[0];
      if (!inv) return null;
      try {
        void (await getInvoicePdfPath(inv));
      } catch {
        /* PDF not ready yet */
      }
      const [customerRows, lineRows] = await Promise.all([
        query<Customer>('SELECT * FROM tbl_customer WHERE id = ?', [inv.customer_id]),
        query<InvoiceLineRow>(
          `SELECT 
            isub.*,
            p.product_name,
            p.product_id AS product_code,
            pt.type_name
          FROM tbl_invoice_sub isub
          LEFT JOIN tbl_product p ON isub.product_id = p.id
          LEFT JOIN tbl_product_type pt ON p.type_id = pt.id
          WHERE isub.main_id = ? AND isub.is_deleted = 0
          ORDER BY isub.s_no`,
          [resolvedInvoiceId],
        ),
      ]);
      return { invoice: inv, customer: customerRows[0] ?? null, lines: lineRows };
    },
    staleTime: 30_000,
  });

  const handleZoom = useCallback((level: number) => {
    setZoom(level);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const [waOpen, setWaOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  const waVariables: Record<number, string> = {
    1: data.invoice.invoice_no ?? '',
    2: data.customer?.customer_name ?? '',
    3: (Number(data.invoice.balance) / 100).toFixed(2),
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">
            Print Preview: {data.invoice.invoice_no}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border">
            {ZOOM_LEVELS.map((level) => (
              <Button
                key={level}
                variant={zoom === level ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none px-3 first:rounded-l-md last:rounded-r-md"
                onClick={() => handleZoom(level)}
              >
                {level}%
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setWaOpen(true)}>
            <MessageCircle className="mr-2 size-4" />
            WhatsApp
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex justify-center overflow-auto py-4">
        <div
          className="origin-top bg-white shadow-lg transition-transform duration-150"
          style={{
            transform: `scale(${zoom / 100})`,
            width: '210mm',
            minHeight: '297mm',
          }}
        >
          <Card className="h-full border-0 shadow-none">
            <CardContent className="p-10">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold tracking-tight">
                  XPress Billing
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tax Invoice
                </p>
                <p className="text-xs text-muted-foreground">
                  Invoice #{data.invoice.invoice_no}
                </p>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-6 border-b pb-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Customer
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    Customer #{data.invoice.customer_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {data.invoice.invoice_date}
                  </p>
                </div>
              </div>

              <div className="mb-6 overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                        #
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                        Code
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                        Product
                        <span className="text-xs text-muted-foreground/70 block">Type</span>
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                        Qty
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                        Price
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <tr key={line.id} className="border-b">
                        <td className="px-4 py-2.5">{line.s_no}</td>
                        <td className="px-4 py-2.5">{line.product_code ?? '-'}</td>
                        <td className="px-4 py-2.5">
                          {line.product_name ?? 'Unknown Product'}
                          {line.type_name && (
                            <span className="block text-xs text-muted-foreground">
                              {line.type_name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">{line.qty}</td>
                        <td className="px-4 py-2.5 text-right">Rs {dollars(line.unit_price)}</td>
                        <td className="px-4 py-2.5 text-right">Rs {dollars(line.row_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-8 rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2.5">Sub Total</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        Rs {dollars(data.invoice.sub_total)}
                      </td>
                    </tr>
                    {data.invoice.discount > 0 && (
                      <tr className="border-b">
                        <td className="px-4 py-2.5 text-green-700">
                          Discount
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-green-700">
                          -Rs {dollars(data.invoice.discount)}
                        </td>
                      </tr>
                    )}
                    {data.invoice.vat > 0 && (
                      <tr className="border-b">
                        <td className="px-4 py-2.5">
                          VAT ({data.invoice.per}%)
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          Rs {dollars(data.invoice.vat)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b bg-muted/20 font-semibold">
                      <td className="px-4 py-2.5">Total</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        Rs {dollars(data.invoice.total)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-green-700">Paid</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-green-700">
                        Rs {dollars(data.invoice.paid_amount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold">
                        Balance Due
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                          data.invoice.balance > 0 ? 'text-destructive' : ''
                        }`}
                      >
                        Rs {dollars(data.invoice.balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-center text-[10px] text-muted-foreground">
                This is a print preview. PDF rendering will be available when
                the invoice PDF is generated.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <WhatsAppSendDialog
        open={waOpen}
        onOpenChange={setWaOpen}
        phone={data.customer?.telephone ?? null}
        customerName={data.customer?.customer_name ?? ''}
        documentNo={data.invoice.invoice_no}
        documentType="INVOICE"
        variables={waVariables}
      />
    </div>
  );
}

export default PrintPreview;
