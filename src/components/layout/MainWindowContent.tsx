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
import ReceiptPreview from '@/pages/reports/ReceiptPreview'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useUIStore, type HomeTabItem } from '@/store/ui-store'
import { cn as mergeCn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface MainWindowContentProps {
  className?: string
}

interface RouteTabDefinition {
  title: string
  closable?: boolean
}

const ROUTE_TABS: Record<string, RouteTabDefinition> = {
  '/invoices': { title: 'View Invoice', closable: false },
  '/invoices/new': { title: 'Add Invoice' },
  '/quotations': { title: 'View Quotation' },
  '/quotations/new': { title: 'Add Quotation' },
  '/receipts/new': { title: 'Add Receipt' },
  '/outstanding': { title: 'Outstanding List' },
  '/history': { title: 'View Receipt', closable: false },
  '/customers': { title: 'Customer' },
  '/products': { title: 'Product' },
  '/product-types': { title: 'Product Type' },
  '/companies': { title: 'Company Details' },
  '/users': { title: 'User' },
  '/email-templates': { title: 'E-mail Config' },
  '/direct-email': { title: 'Direct Email' },
  '/whatsapp-templates': { title: 'WhatsApp Templates' },
  '/settings': { title: 'Application Settings' },
  '/reports/sales': { title: 'Sales Report' },
  '/reports/statement': { title: 'Outstanding Report' },
  '/reports/print': { title: 'Invoice Report' },
  '/reports/print/0': { title: 'Invoice Report' },
  '/reports/invoices': { title: 'Invoice Report' },
  '/reports/quotations': { title: 'Quotation List Report' },
  '/reports/quotations/:quotationId': { title: 'Quotation Report' },
  '/reports/receipts': { title: 'Receipt Report' },
  '/reports/outstanding': { title: 'Outstanding Report' },
  '/home/change-password': { title: 'Change Password' },
  '/home/backup': { title: 'Backup Database' },
  '/home/restore': { title: 'Restore Database' },
}

function getRouteTabDefinition(pathname: string): RouteTabDefinition | null {
  if (ROUTE_TABS[pathname]) {
    return ROUTE_TABS[pathname]
  }

  if (pathname.startsWith('/reports/print/')) {
    return { title: 'Invoice Report' }
  }

  if (pathname.startsWith('/reports/quotations/')) {
    return { title: 'Quotation Report' }
  }

  return null
}

function HomeTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const tabs = useUIStore(state => state.homeTabs)
  const activeTab = useUIStore(state => state.activeHomeTab)
  const registerHomeTab = useUIStore(state => state.registerHomeTab)
  const closeHomeTab = useUIStore(state => state.closeHomeTab)
  const setActiveHomeTab = useUIStore(state => state.setActiveHomeTab)
  const [confirmClose, setConfirmClose] = useState<HomeTabItem | null>(null)

  useEffect(() => {
    const definition = getRouteTabDefinition(location.pathname)
    if (!definition) {
      return
    }

    registerHomeTab({
      key: location.pathname,
      title: definition.title,
      path: location.pathname,
      closable: definition.closable ?? true,
    })
  }, [location.pathname, registerHomeTab])

  const handleActivate = (tab: HomeTabItem) => {
    setActiveHomeTab(tab.key)
    navigate(tab.path)
  }

  const handleClose = (tab: HomeTabItem) => {
    if (!tab.closable) {
      return
    }
    if (tab.path === '/invoices/new') {
      setConfirmClose(tab)
      return
    }

    closeHomeTab(tab.key)
    if (activeTab === tab.key) {
      const fallback = tabs.filter(item => item.key !== tab.key).at(-1)
      navigate(fallback?.path ?? '/invoices')
    }
  }

  const confirmInvoiceClose = () => {
    if (!confirmClose) {
      return
    }
    closeHomeTab(confirmClose.key)
    navigate('/invoices')
    setConfirmClose(null)
  }

  const orderedTabs = useMemo(() => tabs, [tabs])

  return (
    <>
      <div className="border-b bg-muted/40 px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {orderedTabs.map(tab => {
            const selected = (activeTab ?? location.pathname) === tab.key
            return (
              <div key={tab.key} className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? 'default' : 'secondary'}
                  className={mergeCn(
                    'rounded-full px-4',
                    selected
                      ? 'bg-lime-500 text-slate-950 hover:bg-lime-400'
                      : 'bg-sky-100 text-slate-900 hover:bg-sky-200'
                  )}
                  onClick={() => handleActivate(tab)}
                >
                  {tab.title}
                </Button>
                {tab.closable !== false ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={selected ? 'default' : 'secondary'}
                    className={mergeCn(
                      'rounded-full px-0',
                      selected
                        ? 'bg-red-500 text-white hover:bg-red-400'
                        : 'bg-red-500 text-white hover:bg-red-400'
                    )}
                    onClick={() => handleClose(tab)}
                    aria-label={`Close ${tab.title}`}
                  >
                    ×
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <AlertDialog
        open={!!confirmClose}
        onOpenChange={open => !open && setConfirmClose(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invoice entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the current invoice entry and close this tab?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmInvoiceClose}>
              Close Invoice Tab
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
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
        <HomeTabs />
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
