import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface HomeTabItem {
  key: string
  title: string
  path: string
  closable?: boolean
}

export interface ProductAutoFill {
  targetForm: 'invoice' | 'quotation'
  productId: number | null
  productName: string
  unitPrice: number
}

interface UIState {
  leftSidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  lastQuickPaneEntry: string | null
  homeTabs: HomeTabItem[]
  activeHomeTab: string | null
  homeBackground: string | null
  productAutoFill: ProductAutoFill | null

  toggleLeftSidebar: () => void
  setLeftSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  setLastQuickPaneEntry: (text: string) => void
  setSquareCorners: (enabled: boolean) => void
  registerHomeTab: (tab: HomeTabItem) => void
  closeHomeTab: (key: string) => void
  setActiveHomeTab: (key: string | null) => void
  resetHomeTabs: () => void
  reorderHomeTabs: (fromIndex: number, toIndex: number) => void
  setHomeBackground: (path: string | null) => void
  setProductAutoFill: (fill: ProductAutoFill | null) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      leftSidebarVisible: true,
      commandPaletteOpen: false,
      preferencesOpen: false,
      lastQuickPaneEntry: null,
      homeTabs: [],
      activeHomeTab: null,
      homeBackground: null,
      productAutoFill: null,

      toggleLeftSidebar: () =>
        set(
          state => ({ leftSidebarVisible: !state.leftSidebarVisible }),
          undefined,
          'toggleLeftSidebar'
        ),

      setLeftSidebarVisible: visible =>
        set(
          { leftSidebarVisible: visible },
          undefined,
          'setLeftSidebarVisible'
        ),

      toggleCommandPalette: () =>
        set(
          state => ({ commandPaletteOpen: !state.commandPaletteOpen }),
          undefined,
          'toggleCommandPalette'
        ),

      setCommandPaletteOpen: open =>
        set({ commandPaletteOpen: open }, undefined, 'setCommandPaletteOpen'),

      togglePreferences: () =>
        set(
          state => ({ preferencesOpen: !state.preferencesOpen }),
          undefined,
          'togglePreferences'
        ),

      setPreferencesOpen: open =>
        set({ preferencesOpen: open }, undefined, 'setPreferencesOpen'),

      setLastQuickPaneEntry: text =>
        set({ lastQuickPaneEntry: text }, undefined, 'setLastQuickPaneEntry'),

      setSquareCorners: (enabled: boolean) => {
        document.documentElement.classList.toggle('square-corners', enabled)
      },

      registerHomeTab: tab =>
        set(
          state => {
            const existing = state.homeTabs.find(item => item.key === tab.key)
            return {
              homeTabs: existing
                ? state.homeTabs.map(item =>
                    item.key === tab.key ? { ...item, ...tab } : item
                  )
                : [...state.homeTabs, tab],
              activeHomeTab: tab.key,
            }
          },
          undefined,
          'registerHomeTab'
        ),

      closeHomeTab: key =>
        set(
          state => {
            const nextTabs = state.homeTabs.filter(tab => tab.key !== key)
            const nextActive =
              state.activeHomeTab === key
                ? (nextTabs.at(-1)?.key ?? null)
                : state.activeHomeTab

            return {
              homeTabs: nextTabs,
              activeHomeTab: nextActive,
            }
          },
          undefined,
          'closeHomeTab'
        ),

      setActiveHomeTab: key =>
        set({ activeHomeTab: key }, undefined, 'setActiveHomeTab'),

      resetHomeTabs: () =>
        set({ homeTabs: [], activeHomeTab: null }, undefined, 'resetHomeTabs'),

      reorderHomeTabs: (_fromIndex: number, _toIndex: number) => {},

      setHomeBackground: path =>
        set({ homeBackground: path }, undefined, 'setHomeBackground'),

      setProductAutoFill: fill =>
        set({ productAutoFill: fill }, undefined, 'setProductAutoFill'),
    }),
    {
      name: 'ui-store',
    }
  )
)
