import { Sidebar, Settings } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import type { AppCommand } from './types'

export const navigationCommands: AppCommand[] = [
  {
    id: 'show-left-sidebar',
    labelKey: 'commands.showLeftSidebar.label',
    descriptionKey: 'commands.showLeftSidebar.description',
    icon: Sidebar,
    group: 'navigation',
    shortcut: '⌘+1',
    keywords: ['sidebar', 'left', 'panel', 'show'],

    execute: () => {
      useUIStore.getState().setLeftSidebarVisible(true)
    },

    isAvailable: () => !useUIStore.getState().leftSidebarVisible,
  },

  {
    id: 'hide-left-sidebar',
    labelKey: 'commands.hideLeftSidebar.label',
    descriptionKey: 'commands.hideLeftSidebar.description',
    icon: Sidebar,
    group: 'navigation',
    shortcut: '⌘+1',
    keywords: ['sidebar', 'left', 'panel', 'hide'],

    execute: () => {
      useUIStore.getState().setLeftSidebarVisible(false)
    },

    isAvailable: () => useUIStore.getState().leftSidebarVisible,
  },

  {
    id: 'open-settings',
    labelKey: 'commands.openSettings.label',
    descriptionKey: 'commands.openSettings.description',
    icon: Settings,
    group: 'settings',
    shortcut: '⌘+,',
    keywords: ['settings', 'config', 'options', 'application'],

    execute: () => {
      window.location.hash = '#/settings'
    },
  },
]
