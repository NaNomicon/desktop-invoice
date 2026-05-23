import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface HomeTabItem {
  key: string
  title: string
  path: string
  closable?: boolean
}

interface UIState {
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  lastQuickPaneEntry: string | null
  homeTabs: HomeTabItem[]
  activeHomeTab: string | null
  homeBackground: string | null

  toggleLeftSidebar: () => void
  setLeftSidebarVisible: (visible: boolean) => void
  toggleRightSidebar: () => void
  setRightSidebarVisible: (visible: boolean) => void
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
  setHomeBackground: (path: string | null) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      leftSidebarVisible: true,
      rightSidebarVisible: true,
      commandPaletteOpen: false,
      preferencesOpen: false,
      lastQuickPaneEntry: null,
      homeTabs: [],
      activeHomeTab: null,
      homeBackground: null,

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

      toggleRightSidebar: () =>
        set(
          state => ({ rightSidebarVisible: !state.rightSidebarVisible }),
          undefined,
          'toggleRightSidebar'
        ),

      setRightSidebarVisible: visible =>
        set(
          { rightSidebarVisible: visible },
          undefined,
          'setRightSidebarVisible'
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

      setHomeBackground: path =>
        set({ homeBackground: path }, undefined, 'setHomeBackground'),
    }),
    {
      name: 'ui-store',
    }
  )
)
