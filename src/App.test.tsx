import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { useAuthStore } from '@/store/authStore'

const toastWarningMock = vi.fn()

const loadPreferencesMock = vi.fn()
const validateBundledPdfRendererMock = vi.fn()
const cleanupOldFilesMock = vi.fn()
const buildAppMenuMock = vi.fn()
const setupMenuLanguageListenerMock = vi.fn()
const initializeLanguageMock = vi.fn()
const checkMock = vi.fn()
const relaunchMock = vi.fn()
const initializeCommandSystemMock = vi.fn()

vi.mock('./lib/tauri-bindings', () => ({
  commands: {
    loadPreferences: (...args: unknown[]) => loadPreferencesMock(...args),
    validateBundledPdfRenderer: (...args: unknown[]) =>
      validateBundledPdfRendererMock(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    warning: (...args: unknown[]) => toastWarningMock(...args),
  },
}))

vi.mock('./lib/recovery', () => ({
  cleanupOldFiles: (...args: unknown[]) => cleanupOldFilesMock(...args),
}))

vi.mock('./lib/menu', () => ({
  buildAppMenu: (...args: unknown[]) => buildAppMenuMock(...args),
  setupMenuLanguageListener: (...args: unknown[]) =>
    setupMenuLanguageListenerMock(...args),
}))

vi.mock('./i18n/language-init', () => ({
  initializeLanguage: (...args: unknown[]) => initializeLanguageMock(...args),
}))

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: (...args: unknown[]) => checkMock(...args),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: (...args: unknown[]) => relaunchMock(...args),
}))

vi.mock('./lib/commands', () => ({
  initializeCommandSystem: (...args: unknown[]) =>
    initializeCommandSystemMock(...args),
}))

vi.mock('./hooks/useSquareCornersEffect', () => ({
  useSquareCornersEffect: vi.fn(),
}))

vi.mock('./pages/auth/Login', () => ({
  default: () => <div>Login Screen</div>,
}))

import App from './App'

describe('App splash flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAuthStore.setState({
      user_id_log: '',
      user_name: '',
      user_id: 0,
      company_id: 1,
      isLoggedIn: false,
    })
    loadPreferencesMock.mockReset()
    validateBundledPdfRendererMock.mockReset()
    cleanupOldFilesMock.mockReset()
    buildAppMenuMock.mockReset()
    setupMenuLanguageListenerMock.mockReset()
    initializeLanguageMock.mockReset()
    checkMock.mockReset()
    relaunchMock.mockReset()
    initializeCommandSystemMock.mockReset()
    toastWarningMock.mockReset()

    validateBundledPdfRendererMock.mockResolvedValue({
      status: 'ok',
      data: '/tmp/chromium/linux/chrome',
    })
    loadPreferencesMock.mockResolvedValue({
      status: 'ok',
      data: { theme: 'system', language: 'en' },
    })
    cleanupOldFilesMock.mockResolvedValue(undefined)
    buildAppMenuMock.mockResolvedValue(undefined)
    setupMenuLanguageListenerMock.mockReturnValue(vi.fn())
    initializeLanguageMock.mockResolvedValue(undefined)
    checkMock.mockResolvedValue(null)
    relaunchMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('shows the splash screen immediately and keeps it visible for one full cycle', async () => {
    render(<App />)

    expect(screen.getByText('Loading.')).toBeInTheDocument()
    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2400)
    })
    expect(screen.getByText('Loading.....')).toBeInTheDocument()
    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(screen.getByText('Login Screen')).toBeInTheDocument()
  })
})
