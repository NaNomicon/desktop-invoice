import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUIStore, type HomeTabItem } from '@/store/ui-store'
import { cn } from '@/lib/utils'

interface RouteTabDefinition {
  title: string
  closable?: boolean
}

const ROUTE_TABS: Record<string, RouteTabDefinition> = {
  '/invoices': { title: 'View Invoice', closable: false },
  '/invoices/new': { title: 'Add Invoice' },
  '/quotations': { title: 'View Quotation', closable: false },
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
  '/reports/statement': { title: 'Statement of Account' },
  '/reports/print': { title: 'Invoice Report' },
  '/reports/invoices': { title: 'Invoice Report' },
  '/reports/quotations': { title: 'Quotation List Report' },
  '/reports/receipts': { title: 'Receipt Report' },
  '/reports/outstanding': { title: 'Outstanding Report' },
  '/home/change-password': { title: 'Change Password' },
  '/home/backup': { title: 'Backup Database' },
  '/home/restore': { title: 'Restore Database' },
}

function getRouteTabDefinition(pathname: string): RouteTabDefinition | null {
  if (ROUTE_TABS[pathname]) return ROUTE_TABS[pathname]

  if (pathname.startsWith('/reports/print/')) return { title: 'Invoice Report' }
  if (pathname.startsWith('/reports/quotations/')) return { title: 'Quotation Report' }

  return null
}

interface ContextMenuState {
  x: number
  y: number
  tab: HomeTabItem
}

export function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  const tabs = useUIStore(state => state.homeTabs)
  const activeTab = useUIStore(state => state.activeHomeTab)
  const registerHomeTab = useUIStore(state => state.registerHomeTab)
  const closeHomeTab = useUIStore(state => state.closeHomeTab)
  const setActiveHomeTab = useUIStore(state => state.setActiveHomeTab)

  const [confirmClose, setConfirmClose] = useState<HomeTabItem | null>(null)
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)

  const tabsRef = useRef(tabs)
  tabsRef.current = tabs

  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  useEffect(() => {
    const definition = getRouteTabDefinition(location.pathname)
    if (!definition) return

    registerHomeTab({
      key: location.pathname,
      title: definition.title,
      path: location.pathname,
      closable: definition.closable ?? true,
    })
  }, [location.pathname, registerHomeTab])

  const handleActivate = useCallback(
    (tab: HomeTabItem) => {
      setActiveHomeTab(tab.key)
      navigate(tab.path)
    },
    [setActiveHomeTab, navigate],
  )

  const handleClose = useCallback(
    (tab: HomeTabItem) => {
      if (!tab.closable) return

      if (tab.path === '/invoices/new') {
        setConfirmClose(tab)
        return
      }

      closeHomeTab(tab.key)

      if (activeTabRef.current === tab.key) {
        const remaining = tabsRef.current.filter(t => t.key !== tab.key)
        navigate(remaining.at(-1)?.path ?? '/invoices')
      }
    },
    [closeHomeTab, navigate],
  )

  const confirmInvoiceClose = useCallback(() => {
    if (!confirmClose) return
    closeHomeTab(confirmClose.key)
    navigate('/invoices')
    setConfirmClose(null)
  }, [confirmClose, closeHomeTab, navigate])

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent, tab: HomeTabItem) => {
      if (e.button === 1) {
        e.preventDefault()
        handleClose(tab)
      }
    },
    [handleClose],
  )

  const openContextMenu = useCallback((e: React.MouseEvent, tab: HomeTabItem) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, tab })
  }, [])

  const closeContextMenu = useCallback(() => setCtxMenu(null), [])

  const handleCloseOthers = useCallback(() => {
    if (!ctxMenu) return
    const key = ctxMenu.tab.key
    tabsRef.current.forEach(tab => {
      if (tab.key !== key && tab.closable !== false) {
        closeHomeTab(tab.key)
      }
    })
    navigate(ctxMenu.tab.path)
    setCtxMenu(null)
  }, [ctxMenu, closeHomeTab, navigate])

  const handleCloseAll = useCallback(() => {
    tabsRef.current.forEach(tab => {
      if (tab.closable !== false) closeHomeTab(tab.key)
    })
    navigate('/invoices')
    setCtxMenu(null)
  }, [closeHomeTab, navigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const currentTabs = tabsRef.current
      if (currentTabs.length === 0) return

      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        const currIdx = currentTabs.findIndex(t => t.key === activeTabRef.current)
        const nextIdx = e.shiftKey
          ? (currIdx - 1 + currentTabs.length) % currentTabs.length
          : (currIdx + 1) % currentTabs.length
        const next = currentTabs[nextIdx]!
        setActiveHomeTab(next.key)
        navigate(next.path)
        return
      }

      if ((e.ctrlKey && e.key === 'w') || (e.ctrlKey && e.key === 'F4')) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()

        const active = currentTabs.find(t => t.key === activeTabRef.current)
        if (!active || !active.closable) return

        if (active.path === '/invoices/new') {
          setConfirmClose(active)
        } else {
          closeHomeTab(active.key)
          const remaining = currentTabs.filter(t => t.key !== active.key)
          navigate(remaining.at(-1)?.path ?? '/invoices')
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeHomeTab, navigate, setActiveHomeTab])

  return (
    <>
      <div className="border-b bg-muted/40">
        <ScrollArea className="w-full">
          <div className="flex items-center">
            {tabs.map((tab, index) => {
              const selected = (activeTab ?? location.pathname) === tab.key

              return (
                <Tooltip key={tab.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleActivate(tab)}
                      onMouseDown={e => handleMiddleClick(e, tab)}
                      onContextMenu={e => openContextMenu(e, tab)}
                      className={cn(
                        'group relative flex items-center gap-1.5 h-8 shrink-0 px-3 text-sm whitespace-nowrap transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        index !== 0 && 'border-l border-border/50',
                        selected
                          ? 'bg-lime-500 text-slate-950 font-medium'
                          : 'text-muted-foreground hover:bg-muted/80',
                      )}
                    >
                      <span className="max-w-36 truncate">{tab.title}</span>

                      {tab.closable !== false && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={e => {
                            e.stopPropagation()
                            handleClose(tab)
                          }}
                          className={cn(
                            'inline-flex items-center justify-center rounded-full',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'size-4 text-xs leading-none',
                            selected
                              ? 'text-slate-600 hover:bg-red-400 hover:text-white'
                              : 'text-muted-foreground hover:bg-red-400 hover:text-white',
                          )}
                          aria-label={`Close ${tab.title}`}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-mono text-xs">{tab.path}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>

      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={closeContextMenu}
            onContextMenu={e => {
              e.preventDefault()
              closeContextMenu()
            }}
          />
          <div
            className="fixed z-50 min-w-40 rounded-md border bg-popover p-1 shadow-md"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => {
                handleClose(ctxMenu.tab)
                closeContextMenu()
              }}
              disabled={!ctxMenu.tab.closable}
              className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={handleCloseOthers}
              className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              Close Others
            </button>
            <button
              onClick={handleCloseAll}
              className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              Close All
            </button>
            <Separator className="my-1" />
            <span className="block max-w-48 truncate px-2 py-1.5 text-xs text-muted-foreground">
              {ctxMenu.tab.path}
            </span>
          </div>
        </>
      )}

      <AlertDialog open={!!confirmClose} onOpenChange={open => !open && setConfirmClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invoice entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the current invoice entry and close this tab?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmInvoiceClose}>Close Invoice Tab</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
