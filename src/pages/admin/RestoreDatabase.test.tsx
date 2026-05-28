import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import RestoreDatabase from './RestoreDatabase'

const openMock = vi.fn()
const relaunchMock = vi.fn()
const closeDbMock = vi.fn()
const restoreDatabaseMock = vi.fn()
const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (...args: unknown[]) => openMock(...args),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: (...args: unknown[]) => relaunchMock(...args),
}))

vi.mock('@/lib/db', () => ({
  closeDb: (...args: unknown[]) => closeDbMock(...args),
}))

vi.mock('@/lib/bindings', () => ({
  commands: {
    restoreDatabase: (...args: unknown[]) => restoreDatabaseMock(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}))

describe('RestoreDatabase', () => {
  beforeEach(() => {
    openMock.mockReset()
    relaunchMock.mockReset()
    closeDbMock.mockReset()
    restoreDatabaseMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()

    closeDbMock.mockResolvedValue(undefined)
    relaunchMock.mockResolvedValue(undefined)
    restoreDatabaseMock.mockResolvedValue({ status: 'ok', data: null })
  })

  it('clears the selected file when the picker is canceled', async () => {
    const user = userEvent.setup()

    openMock.mockResolvedValueOnce('/tmp/backup.db')
    openMock.mockResolvedValueOnce(null)

    render(<RestoreDatabase />)

    await user.click(screen.getByRole('button', { name: 'Select Backup File' }))
    expect(await screen.findByText('/tmp/backup.db')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select Backup File' }))

    await waitFor(() => {
      expect(screen.getByText('No file selected')).toBeInTheDocument()
    })
  })

  it('closes the database before restoring and relaunches on success', async () => {
    const user = userEvent.setup()
    openMock.mockResolvedValue('/tmp/restore.db')

    render(<RestoreDatabase />)

    await user.click(screen.getByRole('button', { name: 'Select Backup File' }))
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.click(screen.getByRole('button', { name: 'Yes, Restore' }))

    await waitFor(() => {
      expect(closeDbMock).toHaveBeenCalledTimes(1)
      expect(restoreDatabaseMock).toHaveBeenCalledWith('/tmp/restore.db')
      expect(toastSuccessMock).toHaveBeenCalledWith('Database restored. Relaunching app...')
      expect(relaunchMock).toHaveBeenCalledTimes(1)
    })

    const closeDbOrder = closeDbMock.mock.invocationCallOrder[0]
    const restoreOrder = restoreDatabaseMock.mock.invocationCallOrder[0]

    if (closeDbOrder === undefined || restoreOrder === undefined) {
      throw new Error('Expected close and restore calls to be recorded')
    }

    expect(closeDbOrder).toBeLessThan(restoreOrder)
  })

  it('shows a restore error and does not relaunch when the backend fails', async () => {
    const user = userEvent.setup()
    openMock.mockResolvedValue('/tmp/restore.db')
    restoreDatabaseMock.mockResolvedValue({ status: 'error', error: 'disk failure' })

    render(<RestoreDatabase />)

    await user.click(screen.getByRole('button', { name: 'Select Backup File' }))
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.click(screen.getByRole('button', { name: 'Yes, Restore' }))

    await waitFor(() => {
      expect(closeDbMock).toHaveBeenCalledTimes(1)
      expect(restoreDatabaseMock).toHaveBeenCalledWith('/tmp/restore.db')
      expect(toastErrorMock).toHaveBeenCalledWith('Restore failed: disk failure')
    })

    expect(relaunchMock).not.toHaveBeenCalled()
  })
})
