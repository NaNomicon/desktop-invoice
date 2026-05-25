import {
  Menu,
  MenuItem,
  Submenu,
  PredefinedMenuItem,
} from '@tauri-apps/api/menu'
import { check } from '@tauri-apps/plugin-updater'
import i18n from '@/i18n/config'
import { useUIStore } from '@/store/ui-store'
import { useAuthStore } from '@/store/authStore'
import { logger } from '@/lib/logger'
import { notifications } from '@/lib/notifications'

const APP_NAME = 'XPress Billing'

export async function buildAppMenu(): Promise<Menu> {
  const t = i18n.t.bind(i18n)

  try {
    const fileSubmenu = await Submenu.new({
      text: 'File',
      items: [
        await MenuItem.new({
          id: 'change-password',
          text: 'Change Password',
          action: () => handleNavigate('/home/change-password'),
        }),
        await MenuItem.new({
          id: 'backup-database',
          text: 'Backup Database',
          action: () => handleNavigate('/home/backup'),
        }),
        await MenuItem.new({
          id: 'restore-database',
          text: 'Restore Database',
          action: () => handleNavigate('/home/restore'),
        }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await MenuItem.new({
          id: 'logout',
          text: 'Logout',
          action: handleLogout,
        }),
      ],
    })

    const masterSubmenu = await Submenu.new({
      text: 'Master',
      items: [
        await createNavItem('Company Details', '/companies'),
        await createNavItem('Customer', '/customers'),
        await createNavItem('Product Type', '/product-types'),
        await createNavItem('Product', '/products'),
        await createNavItem('User', '/users'),
      ],
    })

    const invoiceSubmenu = await Submenu.new({
      text: 'Invoice',
      items: [
        await createNavItem('Add Invoice', '/invoices/new'),
        await createNavItem('View Invoice', '/invoices'),
        await createNavItem('Sales Report', '/reports/sales'),
      ],
    })

    const quotationSubmenu = await Submenu.new({
      text: 'Quotation',
      items: [
        await createNavItem('Add Quotation', '/quotations/new'),
        await createNavItem('View Quotation', '/quotations'),
      ],
    })

    const outstandingSubmenu = await Submenu.new({
      text: 'Outstanding',
      items: [
        await createNavItem('Outstanding List', '/outstanding'),
        await createNavItem('Add Receipt', '/receipts/new'),
        await createNavItem('View Receipt', '/history'),
      ],
    })

    const reportSubmenu = await Submenu.new({
      text: 'Report',
      items: [
        await createNavItem('Invoice Report', '/reports/invoices'),
        await createNavItem('Quotation Report', '/reports/quotations'),
        await createNavItem('Receipt Report', '/reports/receipts'),
        await createNavItem('Sales Report', '/reports/sales'),
        await createNavItem('Outstanding Report', '/reports/outstanding'),
      ],
    })

    const settingsSubmenu = await Submenu.new({
      text: 'Settings',
      items: [
        await createNavItem('Application Settings', '/settings'),
        await createNavItem('E-mail Config', '/email-templates'),
        await createNavItem('Direct Email', '/direct-email'),
        await createNavItem('WhatsApp Templates', '/whatsapp-templates'),
        await MenuItem.new({
          id: 'preferences',
          text: t('menu.preferences'),
          accelerator: 'CmdOrCtrl+,',
          action: handleOpenPreferences,
        }),
      ],
    })

    const appSubmenu = await Submenu.new({
      text: APP_NAME,
      items: [
        await MenuItem.new({
          id: 'about',
          text: t('menu.about', { appName: APP_NAME }),
          action: handleAbout,
        }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await MenuItem.new({
          id: 'check-updates',
          text: t('menu.checkForUpdates'),
          action: handleCheckForUpdates,
        }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({
          item: 'Hide',
          text: t('menu.hide', { appName: APP_NAME }),
        }),
        await PredefinedMenuItem.new({
          item: 'HideOthers',
          text: t('menu.hideOthers'),
        }),
        await PredefinedMenuItem.new({
          item: 'ShowAll',
          text: t('menu.showAll'),
        }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({
          item: 'Quit',
          text: t('menu.quit', { appName: APP_NAME }),
        }),
      ],
    })

    const viewSubmenu = await Submenu.new({
      text: t('menu.view'),
      items: [
        await MenuItem.new({
          id: 'toggle-left-sidebar',
          text: t('menu.toggleLeftSidebar'),
          accelerator: 'CmdOrCtrl+1',
          action: handleToggleLeftSidebar,
        }),
        await MenuItem.new({
          id: 'toggle-right-sidebar',
          text: t('menu.toggleRightSidebar'),
          accelerator: 'CmdOrCtrl+2',
          action: handleToggleRightSidebar,
        }),
      ],
    })

    const menu = await Menu.new({
      items: [
        appSubmenu,
        fileSubmenu,
        masterSubmenu,
        invoiceSubmenu,
        quotationSubmenu,
        outstandingSubmenu,
        reportSubmenu,
        settingsSubmenu,
        viewSubmenu,
      ],
    })

    await menu.setAsAppMenu()

    logger.info('Application menu built successfully')
    return menu
  } catch (error) {
    logger.error('Failed to build application menu', { error })
    throw error
  }
}

async function createNavItem(text: string, path: string): Promise<MenuItem> {
  return MenuItem.new({
    id: `nav:${path}`,
    text,
    action: () => handleNavigate(path, text),
  })
}

export function setupMenuLanguageListener(): () => void {
  const handler = async () => {
    logger.info('Language changed, rebuilding menu')
    try {
      await buildAppMenu()
    } catch (error) {
      logger.error('Failed to rebuild menu on language change', { error })
    }
  }
  i18n.on('languageChanged', handler)
  return () => i18n.off('languageChanged', handler)
}

function handleAbout(): void {
  logger.info('About menu item clicked')
  alert(
    `${APP_NAME}\n\nVersion: ${__APP_VERSION__}\n\nBuilt with Tauri v2 + React + TypeScript`
  )
}

async function handleCheckForUpdates(): Promise<void> {
  logger.info('Check for Updates menu item clicked')
  try {
    const update = await check()
    if (update) {
      notifications.info(
        'Update Available',
        `Version ${update.version} is available`
      )
    } else {
      notifications.success('Up to Date', 'You are running the latest version')
    }
  } catch (error) {
    logger.error('Update check failed', { error })
    notifications.error('Update Check Failed', 'Could not check for updates')
  }
}

function handleOpenPreferences(): void {
  logger.info('Preferences menu item clicked')
  useUIStore.getState().setPreferencesOpen(true)
}

function handleToggleLeftSidebar(): void {
  logger.info('Toggle Left Sidebar menu item clicked')
  useUIStore.getState().toggleLeftSidebar()
}

function handleToggleRightSidebar(): void {
  logger.info('Toggle Right Sidebar menu item clicked')
  useUIStore.getState().toggleRightSidebar()
}

function handleNavigate(path: string, title?: string): void {
  if (title) {
    useUIStore.getState().registerHomeTab({
      key: path,
      title,
      path,
      closable: path !== '/invoices',
    })
  }

  window.location.hash = `#${path}`
}

function handleLogout(): void {
  logger.info('Logout menu item clicked')
  useAuthStore.getState().logout()
  useUIStore.getState().resetHomeTabs()
  window.location.hash = '#/'
}
