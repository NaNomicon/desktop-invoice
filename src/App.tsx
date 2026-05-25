import { useEffect, useState } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { toast } from 'sonner'
import { initializeCommandSystem } from './lib/commands'
import { buildAppMenu, setupMenuLanguageListener } from './lib/menu'
import { initializeLanguage } from './i18n/language-init'
import { logger } from './lib/logger'
import { cleanupOldFiles } from './lib/recovery'
import { commands } from './lib/tauri-bindings'
import './App.css'
import { MainWindow } from './components/layout/MainWindow'
import { ThemeProvider } from './components/ThemeProvider'
import Login from './pages/auth/Login'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SplashScreen } from './components/SplashScreen'
import { useSquareCornersEffect } from './hooks/useSquareCornersEffect'
import { useAuthStore } from './store/authStore'

const MIN_SPLASH_DURATION_MS = 2500

function App() {
  useSquareCornersEffect()
  const [isInitializing, setIsInitializing] = useState(true)

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const setAuth = useAuthStore.setState
  // Restore session from persisted credentials
  useEffect(() => {
    const { user_id_log, user_name, user_id, company_id } =
      useAuthStore.getState()
    if (user_id_log) {
      setAuth({
        user_id_log,
        user_name,
        user_id,
        company_id,
        isLoggedIn: true,
      })
    }
  }, [setAuth])
  // Initialize command system and cleanup on app startup
  useEffect(() => {
    logger.info('🚀 Frontend application starting up')
    initializeCommandSystem()
    logger.debug('Command system initialized')

    let isMounted = true
    let removeMenuLanguageListener: (() => void) | undefined

    const initLanguageAndMenu = async () => {
      const startedAt = Date.now()

      try {
        const rendererCheck = await commands.validateBundledPdfRenderer()
        if (rendererCheck.status === 'ok') {
          logger.info('Bundled PDF renderer ready', { path: rendererCheck.data })
        } else {
          logger.warn('Bundled PDF renderer validation failed', {
            error: rendererCheck.error,
          })
          toast.warning(rendererCheck.error)
        }

        // Load preferences to get saved language
        const result = await commands.loadPreferences()
        const savedLanguage =
          result.status === 'ok' ? result.data.language : null

        // Initialize language (will use system locale if no preference)
        await initializeLanguage(savedLanguage)

        // Build the application menu with the initialized language
        await buildAppMenu()
        logger.debug('Application menu built')
        removeMenuLanguageListener = setupMenuLanguageListener()
      } catch (error) {
        logger.warn('Failed to initialize language or menu', { error })
      } finally {
        const remainingDelay = Math.max(
          0,
          MIN_SPLASH_DURATION_MS - (Date.now() - startedAt)
        )

        if (remainingDelay > 0) {
          await new Promise(resolve => window.setTimeout(resolve, remainingDelay))
        }

        if (isMounted) {
          setIsInitializing(false)
        }
      }
    }

    void initLanguageAndMenu()

    // Clean up old recovery files on startup
    cleanupOldFiles().catch(error => {
      logger.warn('Failed to cleanup old recovery files', { error })
    })

    // Example of logging with context
    logger.info('App environment', {
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
    })

    // Auto-updater logic - check for updates 5 seconds after app loads
    const checkForUpdates = async () => {
      try {
        const update = await check()
        if (update) {
          logger.info(`Update available: ${update.version}`)

          // Show confirmation dialog
          const shouldUpdate = confirm(
            `Update available: ${update.version}\n\nWould you like to install this update now?`
          )

          if (shouldUpdate) {
            try {
              // Download and install with progress logging
              await update.downloadAndInstall(event => {
                switch (event.event) {
                  case 'Started':
                    logger.info(`Downloading ${event.data.contentLength} bytes`)
                    break
                  case 'Progress':
                    logger.info(`Downloaded: ${event.data.chunkLength} bytes`)
                    break
                  case 'Finished':
                    logger.info('Download complete, installing...')
                    break
                }
              })

              // Ask if user wants to restart now
              const shouldRestart = confirm(
                'Update completed successfully!\n\nWould you like to restart the app now to use the new version?'
              )

              if (shouldRestart) {
                await relaunch()
              }
            } catch (updateError) {
              logger.error(`Update installation failed: ${String(updateError)}`)
              alert(
                `Update failed: There was a problem with the automatic download.\n\n${String(updateError)}`
              )
            }
          }
        }
      } catch (checkError) {
        logger.error(`Update check failed: ${String(checkError)}`)
        // Silent fail for update checks - don't bother user with network issues
      }
    }

    // Check for updates 5 seconds after app loads
    const updateTimer = setTimeout(checkForUpdates, 5000)
    return () => {
      isMounted = false
      removeMenuLanguageListener?.()
      clearTimeout(updateTimer)
    }
  }, [])

  if (isInitializing) {
    return (
      <ThemeProvider>
        <SplashScreen />
      </ThemeProvider>
    )
  }

  if (!isLoggedIn) {
    return (
      <ThemeProvider>
        <Login />
      </ThemeProvider>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MainWindow />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
