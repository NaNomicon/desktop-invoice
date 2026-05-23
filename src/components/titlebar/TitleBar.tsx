import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { usePlatform, type AppPlatform } from '@/hooks/use-platform'
import { MacOSWindowControls } from './MacOSWindowControls'
import { WindowsWindowControls } from './WindowsWindowControls'
import {
  TitleBarLeftActions,
  TitleBarRightActions,
  TitleBarTitle,
} from './TitleBarContent'
import { LinuxTitleBar } from './LinuxTitleBar'

interface TitleBarProps {
  className?: string
  title?: string
  forcePlatform?: AppPlatform
}

export function TitleBar({ className, title, forcePlatform }: TitleBarProps) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('titlebar.default')
  const detectedPlatform = usePlatform()

  const platform =
    import.meta.env.DEV && forcePlatform ? forcePlatform : detectedPlatform

  if (platform === 'linux') {
    return <LinuxTitleBar className={className} title={displayTitle} />
  }

  if (platform === 'windows') {
    return (
      <div
        data-tauri-drag-region
        className={cn(
          'relative flex h-8 w-full shrink-0 items-center justify-between border-b bg-background',
          className
        )}
      >
        <div className="flex items-center pl-2">
          <TitleBarLeftActions />
        </div>

        <TitleBarTitle title={displayTitle} />

        <div className="flex items-center">
          <TitleBarRightActions />
          <WindowsWindowControls />
        </div>
      </div>
    )
  }

  return (
    <div
      data-tauri-drag-region
      className={cn(
        'relative flex h-8 w-full shrink-0 items-center justify-between border-b bg-background',
        className
      )}
    >
      <div className="flex items-center">
        <MacOSWindowControls />
        <TitleBarLeftActions />
      </div>

      <TitleBarTitle title={displayTitle} />

      <div className="flex items-center pr-2">
        <TitleBarRightActions />
      </div>
    </div>
  )
}
