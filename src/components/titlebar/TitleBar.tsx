import { useCallback } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { cn } from '@/lib/utils'
import { usePlatform, type AppPlatform } from '@/hooks/use-platform'
import {
  TitleBarLeftActions,
  TitleBarRightActions,
} from './TitleBarContent'
import { LinuxTitleBar } from './LinuxTitleBar'

interface TitleBarProps {
  className?: string
  forcePlatform?: AppPlatform
}

export function TitleBar({ className, forcePlatform }: TitleBarProps) {
  const detectedPlatform = usePlatform()

  const platform =
    import.meta.env.DEV && forcePlatform ? forcePlatform : detectedPlatform

  const handleDoubleClick = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow()
      const isFullscreen = await appWindow.isFullscreen()
      await appWindow.setFullscreen(!isFullscreen)
    } catch {
      // Fullscreen not supported
    }
  }, [])

  if (platform === 'linux') {
    return <LinuxTitleBar className={className} />
  }

  return (
    <div
      data-tauri-drag-region
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
      </div>
    </div>
  )
}
