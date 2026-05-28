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
import DirectEmailPage from '@/pages/admin/DirectEmail'
import WhatsAppTemplatesPage from '@/pages/admin/WhatsAppTemplates'
import SettingsPage from '@/pages/admin/Settings'
import ChangePasswordPage from '@/pages/admin/ChangePassword'
import BackupDatabase from '@/pages/admin/BackupDatabase'
import RestoreDatabase from '@/pages/admin/RestoreDatabase'
import SalesReport from '@/pages/reports/SalesReport'
import StatementPreview from '@/pages/reports/StatementPreview'
import PrintPreview from '@/pages/reports/PrintPreview'
import QuotationPreview from '@/pages/reports/QuotationPreview'
import QuotationListReport from '@/pages/reports/QuotationListReport'
import OutstandingReport from '@/pages/reports/OutstandingReport'
import InvoiceListReport from '@/pages/reports/InvoiceListReport'
import InvoicePreview from '@/pages/reports/InvoicePreview'
import ReceiptPreview from '@/pages/reports/ReceiptPreview'
import { TabBar } from '@/components/tabs/TabBar'
import { useUIStore } from '@/store/ui-store'

interface MainWindowContentProps {
  className?: string
}

export function MainWindowContent({ className }: MainWindowContentProps) {
  const homeBackground = useUIStore(state => state.homeBackground)

  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden bg-background/85 backdrop-blur-[1px]',
        className
      )}
    >
      {homeBackground ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${homeBackground})` }}
        />
      ) : null}

      <div className="relative z-10 flex h-full flex-col">
        <TabBar />
        <div className="min-h-0 flex-1">
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
            <Route path="/direct-email" element={<DirectEmailPage />} />
            <Route path="/whatsapp-templates" element={<WhatsAppTemplatesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/home/change-password"
              element={<ChangePasswordPage />}
            />
            <Route path="/reports/sales" element={<SalesReport />} />
            <Route path="/reports/statement" element={<StatementPreview />} />
            <Route path="/reports/print" element={<PrintPreview invoice_id={0} />} />
            <Route path="/reports/print/:invoiceId" element={<PrintPreview invoice_id={0} />} />
            <Route path="/reports/invoices" element={<InvoiceListReport />} />
            <Route
              path="/reports/invoices/:invoiceId"
              element={<InvoicePreview />}
            />
            <Route
              path="/reports/quotations"
              element={<QuotationListReport />}
            />
            <Route
              path="/reports/quotations/:quotationId"
              element={<QuotationPreview />}
            />
            <Route
              path="/reports/receipts"
              element={<ReceiptPreview />}
            />
            <Route
              path="/reports/outstanding"
              element={<OutstandingReport />}
            />
            <Route path="/home/backup" element={<BackupDatabase />} />
            <Route
              path="/home/restore"
              element={<RestoreDatabase />}
            />
            <Route path="*" element={<Navigate to="/invoices" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
