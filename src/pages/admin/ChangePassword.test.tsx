import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import ChangePasswordPage from './ChangePassword'
import { useAuthStore } from '@/store/authStore'

const queryMock = vi.fn()
const executeMock = vi.fn()
const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  execute: (...args: unknown[]) => executeMock(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}))

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    queryMock.mockReset()
    executeMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()

    useAuthStore.setState({
      user_id_log: 'ADMIN',
      user_name: 'admin',
      user_id: 1,
      company_id: 1,
      isLoggedIn: true,
    })
  })

  it('shows a validation error when new password confirmation does not match', async () => {
    const user = userEvent.setup()

    render(<ChangePasswordPage />)

    await user.type(screen.getByLabelText('Current Password'), 'old-pass')
    await user.type(screen.getByLabelText('New Password'), 'new-pass')
    await user.type(screen.getByLabelText('Confirm New Password'), 'different-pass')
    await user.click(screen.getByRole('button', { name: 'Save Password' }))

    expect(toastErrorMock).toHaveBeenCalledWith(
      'New password and confirmation do not match'
    )
    expect(queryMock).not.toHaveBeenCalled()
    expect(executeMock).not.toHaveBeenCalled()
  })

  it('updates the password when the current password is valid', async () => {
    const user = userEvent.setup()
    queryMock.mockResolvedValue([{ id: 1, password: 'old-pass' }])
    executeMock.mockResolvedValue(undefined)

    render(<ChangePasswordPage />)

    await user.type(screen.getByLabelText('Current Password'), 'old-pass')
    await user.type(screen.getByLabelText('New Password'), 'new-pass')
    await user.type(screen.getByLabelText('Confirm New Password'), 'new-pass')
    await user.click(screen.getByRole('button', { name: 'Save Password' }))

    expect(queryMock).toHaveBeenCalledWith(
      'SELECT id, password FROM tbl_user WHERE id = ? AND is_deleted = 0 LIMIT 1',
      [1]
    )
    expect(executeMock).toHaveBeenCalledWith(
      'UPDATE tbl_user SET password = ? WHERE id = ?',
      ['new-pass', 1]
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('Password updated')
    expect(screen.getByLabelText('Current Password')).toHaveValue('')
    expect(screen.getByLabelText('New Password')).toHaveValue('')
    expect(screen.getByLabelText('Confirm New Password')).toHaveValue('')
  })
})
