import { useCallback } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Maximize } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  TitleBarLeftActions,
  TitleBarRightActions,
} from './TitleBarContent'

interface LinuxTitleBarProps {
  className?: string
}

export function LinuxTitleBar({ className }: LinuxTitleBarProps) {
  const handleDoubleClick = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow()
      const isFullscreen = await appWindow.isFullscreen()
      await appWindow.setFullscreen(!isFullscreen)
    } catch {
      // Fullscreen not supported
    }
  }, [])

  const handleToggleFullscreen = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow()
      const isFullscreen = await appWindow.isFullscreen()
      await appWindow.setFullscreen(!isFullscreen)
    } catch {
      // Fullscreen not supported
    }
  }, [])

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        'relative flex h-8 w-full shrink-0 items-center justify-between border-b bg-background',
        className
      )}
    >
      <div className="flex items-center pl-2">
        <TitleBarLeftActions />
      </div>
      <div className="flex items-center pr-2">
        <TitleBarRightActions />
        <Button
          onClick={handleToggleFullscreen}
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-foreground/70 hover:text-foreground"
          title="Toggle fullscreen"
          aria-label="Toggle fullscreen"
        >
          <Maximize className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
