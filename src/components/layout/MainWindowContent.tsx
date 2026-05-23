import { Routes, Route, Navigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import InvoiceList from '@/pages/invoice/InvoiceList'
import InvoiceForm from '@/pages/invoice/InvoiceForm'
import QuotationList from '@/pages/quotation/QuotationList'
import QuotationForm from '@/pages/quotation/QuotationForm'
import ReceiptForm from '@/pages/receipt/ReceiptForm'
import TransactionHistory from '@/pages/receipt/TransactionHistory'
import ListOutStanding from '@/pages/outstanding/ListOutStanding'
import CustomerPage from '@/pages/admin/Customer'
import ProductPage from '@/pages/admin/Product'
import ProductTypePage from '@/pages/admin/ProductType'
import CompanySettingsPage from '@/pages/admin/CompanySettings'
import UserPage from '@/pages/admin/User'
import EmailTemplatesPage from '@/pages/admin/EmailTemplates'
import WhatsAppTemplatesPage from '@/pages/admin/WhatsAppTemplates'
import SettingsPage from '@/pages/admin/Settings'
import SalesReport from '@/pages/reports/SalesReport'
import StatementPreview from '@/pages/reports/StatementPreview'
import PrintPreview from '@/pages/reports/PrintPreview'

interface MainWindowContentProps {
  className?: string
}

export function MainWindowContent({ className }: MainWindowContentProps) {
  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <Routes>
        <Route path="/" element={<Navigate to="/invoices" replace />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/new" element={<InvoiceForm />} />
        <Route path="/quotations" element={<QuotationList />} />
        <Route path="/quotations/new" element={<QuotationForm />} />
        <Route path="/receipts/new" element={<ReceiptForm />} />
        <Route path="/outstanding" element={<ListOutStanding />} />
        <Route path="/history" element={<TransactionHistory />} />
        <Route path="/customers" element={<CustomerPage />} />
        <Route path="/products" element={<ProductPage />} />
        <Route path="/product-types" element={<ProductTypePage />} />
        <Route path="/companies" element={<CompanySettingsPage />} />
        <Route path="/users" element={<UserPage />} />
        <Route path="/email-templates" element={<EmailTemplatesPage />} />
        <Route path="/whatsapp-templates" element={<WhatsAppTemplatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/reports/sales" element={<SalesReport />} />
        <Route path="/reports/statement" element={<StatementPreview />} />
        <Route path="/reports/print" element={<PrintPreview invoice_id={0} />} />
        <Route path="*" element={<Navigate to="/invoices" replace />} />
      </Routes>
    </div>
  )
}
