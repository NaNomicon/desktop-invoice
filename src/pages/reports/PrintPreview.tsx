import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import { getInvoicePdfPath } from '@/lib/pdf/path';
import type { InvoiceMain } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, FileText } from 'lucide-react';

const ZOOM_LEVELS = [50, 75, 100, 125, 150] as const;

interface PrintPreviewProps {
  invoice_id: number;
}

function dollars(c: number): string {
  return (c / 100).toFixed(2);
}

function PrintPreview({ invoice_id }: PrintPreviewProps) {
  const [zoom, setZoom] = useState(() => (invoice_id ? 100 : 100));

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['printPreviewInvoice', invoice_id],
    queryFn: async () => {
      const rows = await query<InvoiceMain>(
        'SELECT * FROM tbl_invoice_main WHERE id = ? AND is_deleted = 0',
        [invoice_id],
      );
      if (rows.length === 0) return null;

      const inv = rows[0];
      if (!inv) return null;
      try {
        void (await getInvoicePdfPath(inv));
      } catch {
        /* PDF not ready yet */
      }
      return inv;
    },
    staleTime: 30_000,
  });

  const handleZoom = useCallback((level: number) => {
    setZoom(level);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5" />
          <h1 className="text-2xl font-semibold">
            Print Preview: {invoice.invoice_no}
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
                  Invoice #{invoice.invoice_no}
                </p>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-6 border-b pb-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Customer
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    Customer #{invoice.customer_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {invoice.invoice_date}
                  </p>
                </div>
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
                        ${dollars(invoice.sub_total)}
                      </td>
                    </tr>
                    {invoice.discount > 0 && (
                      <tr className="border-b">
                        <td className="px-4 py-2.5 text-green-700">
                          Discount
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-green-700">
                          -${dollars(invoice.discount)}
                        </td>
                      </tr>
                    )}
                    {invoice.vat > 0 && (
                      <tr className="border-b">
                        <td className="px-4 py-2.5">
                          VAT ({invoice.per}%)
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          ${dollars(invoice.vat)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b bg-muted/20 font-semibold">
                      <td className="px-4 py-2.5">Total</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        ${dollars(invoice.total)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-green-700">Paid</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-green-700">
                        ${dollars(invoice.paid_amount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold">
                        Balance Due
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                          invoice.balance > 0 ? 'text-destructive' : ''
                        }`}
                      >
                        ${dollars(invoice.balance)}
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
    </div>
  );
}

export default PrintPreview;
