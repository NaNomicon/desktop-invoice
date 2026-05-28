import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, FolderOpen, LogOut, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore, type HomeTabItem } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { isAdmin } from '@/lib/rbac'

interface NavItem {
  title: string
  path: string
  closable?: boolean
  adminOnly?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
  defaultCollapsed?: boolean
}

// All groups collapse by default
const DEFAULT_COLLAPSED_GROUPS: string[] = [
  'File', 'Master', 'Invoice', 'Quotation', 'Outstanding', 'Report', 'Settings',
]

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'File',
    items: [
      { title: 'Change Password', path: '/home/change-password' },
      { title: 'Backup Database', path: '/home/backup' },
      { title: 'Restore Database', path: '/home/restore' },
    ],
  },
  {
    title: 'Master',
    items: [
      { title: 'Company Details', path: '/companies' },
      { title: 'Customer', path: '/customers' },
      { title: 'Product Type', path: '/product-types' },
      { title: 'Product', path: '/products' },
      { title: 'User', path: '/users', adminOnly: true },
    ],
  },
  {
    title: 'Invoice',
    items: [
      { title: 'Add Invoice', path: '/invoices/new' },
      { title: 'View Invoice', path: '/invoices', closable: false },
    ],
  },
  {
    title: 'Quotation',
    items: [
      { title: 'Add Quotation', path: '/quotations/new' },
      { title: 'View Quotation', path: '/quotations' },
    ],
  },
  {
    title: 'Outstanding',
    items: [
      { title: 'Outstanding List', path: '/outstanding' },
      { title: 'Add Receipt', path: '/receipts/new' },
      { title: 'View Receipt', path: '/history' },
    ],
  },
  {
    title: 'Report',
    items: [
      { title: 'Invoice Report', path: '/reports/invoices' },
      { title: 'Quotation Report', path: '/reports/quotations' },
      { title: 'Receipt Report', path: '/reports/receipts' },
      { title: 'Sales Report', path: '/reports/sales' },
      { title: 'Outstanding Report', path: '/reports/outstanding', adminOnly: true },
    ],
  },
  {
    title: 'Settings',
      items: [
        { title: 'Application Settings', path: '/settings' },
        { title: 'E-mail Config', path: '/email-templates' },
        { title: 'Direct Email', path: '/direct-email' },
        { title: 'WhatsApp Templates', path: '/whatsapp-templates' },
      ],
  },
]

function buildTab(item: NavItem): HomeTabItem {
  return {
    key: item.path,
    title: item.title,
    path: item.path,
    closable: item.closable ?? item.path !== '/invoices',
  }
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const role = useAuthStore(state => state.user_id_log)
  const logout = useAuthStore(state => state.logout)
  const registerHomeTab = useUIStore(state => state.registerHomeTab)
  const resetHomeTabs = useUIStore(state => state.resetHomeTabs)

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    DEFAULT_COLLAPSED_GROUPS.forEach(group => {
      initial[group] = true
    })
    return initial
  })

  const groups = useMemo(
    () =>
      NAV_GROUPS.map(group => ({
        ...group,
        items: group.items.filter(item => !(item.adminOnly && !isAdmin(role))),
      })),
    [role]
  )

  const handleNav = (item: NavItem) => {
    registerHomeTab(buildTab(item))
  }

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const handleLogout = () => {
    resetHomeTabs()
    logout()
    navigate('/')
  }

  return (
    <aside className="flex h-full w-full flex-col bg-muted/30">
      <div className="border-b px-4 py-4">
        <h2 className="text-lg font-semibold">XPress Billing</h2>
        <p className="text-muted-foreground mt-1 text-xs uppercase tracking-[0.2em]">
          HOME Navigation
        </p>
      </div>

      <nav className="flex-1 overflow-auto p-4 text-sm">
        {groups.map(group => {
          const collapsed = collapsedGroups[group.title]
          return (
            <section key={group.title} className="mb-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-accent"
              >
                <ChevronDown
                  className={cn(
                    'size-3 shrink-0 transition-transform',
                    collapsed && '-rotate-90'
                  )}
                />
                {group.title}
              </button>
              {!collapsed && (
                <div className="mt-1 space-y-1">
                  {group.items.map(item => {
                    const active = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => handleNav(item)}
                        className={cn(
                          'block rounded px-3 py-2 transition-colors hover:bg-accent',
                          active && 'bg-accent font-medium text-accent-foreground'
                        )}
                      >
                        {item.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          <ShieldAlert className="size-4" />
          <span>Role: {role || 'USER'}</span>
        </div>
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => {
              const item = { title: 'Backup Database', path: '/home/backup' }
              handleNav(item)
              navigate(item.path)
            }}
          >
            <FolderOpen className="size-4" />
            Backup Database
          </Button>
          <Button
            variant="destructive"
            className="justify-start"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
