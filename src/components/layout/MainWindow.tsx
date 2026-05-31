import { useEffect, useCallback } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { TitleBar } from '@/components/titlebar/TitleBar'
import { LeftSideBar } from './LeftSideBar'
import { MainWindowContent } from './MainWindowContent'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { Toaster } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import { useUIStore } from '@/store/ui-store'
import { useMainWindowEventListeners } from '@/hooks/useMainWindowEventListeners'
import { cn } from '@/lib/utils'
import { query } from '@/lib/db'
import type { Setting } from '@/lib/types'

const LAYOUT = {
  leftSidebar: { default: 20, min: 15, max: 40 },
  main: { min: 30 },
} as const

export function MainWindow() {
  const { theme } = useTheme()
  const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)
  const setHomeBackground = useUIStore(state => state.setHomeBackground)

  useMainWindowEventListeners()

  const loadHomeBackground = useCallback(async () => {
    try {
      const rows = await query<Setting>(
        'SELECT back_path FROM tbl_setting WHERE id = 1 LIMIT 1'
      )
      const backPath = rows[0]?.back_path?.trim()
      setHomeBackground(backPath ? convertFileSrc(backPath) : null)
    } catch {
      setHomeBackground(null)
    }
  }, [setHomeBackground])

  useEffect(() => {
    void loadHomeBackground()
  }, [loadHomeBackground])

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden rounded-[var(--app-corner-radius)] bg-background">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={LAYOUT.leftSidebar.default}
            minSize={LAYOUT.leftSidebar.min}
            maxSize={LAYOUT.leftSidebar.max}
            className={cn(!leftSidebarVisible && 'hidden')}
          >
            <LeftSideBar />
          </ResizablePanel>

          <ResizableHandle className={cn(!leftSidebarVisible && 'hidden')} />

          <ResizablePanel minSize={LAYOUT.main.min}>
            <MainWindowContent />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <CommandPalette />
      <PreferencesDialog />
      <Toaster
        position="bottom-right"
        theme={
          theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system'
        }
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-muted-foreground',
            actionButton:
              'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton:
              'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          },
        }}
      />
    </div>
  )
}
