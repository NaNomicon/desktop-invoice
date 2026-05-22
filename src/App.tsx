import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { Sidebar, AuthProvider } from '@/components/Sidebar';
import Login from '@/pages/auth/Login';
import InvoiceList from '@/pages/invoice/InvoiceList';
import InvoiceForm from '@/pages/invoice/InvoiceForm';
import QuotationList from '@/pages/quotation/QuotationList';
import QuotationForm from '@/pages/quotation/QuotationForm';
import ReceiptForm from '@/pages/receipt/ReceiptForm';
import TransactionHistory from '@/pages/receipt/TransactionHistory';
import ListOutStanding from '@/pages/outstanding/ListOutStanding';
import Customer from '@/pages/admin/Customer';
import Product from '@/pages/admin/Product';
import ProductType from '@/pages/admin/ProductType';
import CompanySettings from '@/pages/admin/CompanySettings';
import User from '@/pages/admin/User';
import Settings from '@/pages/admin/Settings';
import EmailTemplates from '@/pages/admin/EmailTemplates';
import WhatsAppTemplates from '@/pages/admin/WhatsAppTemplates';
import SalesReport from '@/pages/reports/SalesReport';
import StatementPreview from '@/pages/reports/StatementPreview';
import PrintPreview from '@/pages/reports/PrintPreview';

const queryClient = new QueryClient();

function PrintPreviewWrapper() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  return <PrintPreview invoice_id={Number(invoiceId)} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/invoices/new" element={<InvoiceForm />} />
                <Route path="/invoices/:id" element={<InvoiceForm />} />
                <Route path="/quotations" element={<QuotationList />} />
                <Route path="/quotations/new" element={<QuotationForm />} />
                <Route path="/quotations/:id" element={<QuotationForm />} />
                <Route path="/receipts/new" element={<ReceiptForm />} />
                <Route path="/receipts/:id" element={<ReceiptForm />} />
                <Route path="/outstanding" element={<ListOutStanding />} />
                <Route path="/history" element={<TransactionHistory />} />
                <Route path="/customers" element={<Customer />} />
                <Route path="/products" element={<Product />} />
                <Route path="/product-types" element={<ProductType />} />
                <Route path="/companies" element={<CompanySettings />} />
                <Route path="/users" element={<User />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/email-templates" element={<EmailTemplates />} />
                <Route path="/whatsapp-templates" element={<WhatsAppTemplates />} />
                <Route path="/reports/sales" element={<SalesReport />} />
                <Route path="/reports/statement" element={<StatementPreview />} />
                <Route path="/reports/print/:invoiceId" element={<PrintPreviewWrapper />} />
                <Route path="/" element={<InvoiceList />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}