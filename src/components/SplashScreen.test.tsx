import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}))

import { SplashScreen } from './SplashScreen'

describe('SplashScreen', () => {
  it('starts on the first legacy loading frame', () => {
    vi.useFakeTimers()
    queryMock.mockReset()
    queryMock.mockResolvedValue([])

    render(<SplashScreen />)

    expect(screen.getByText('Loading.')).toBeInTheDocument()

    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('cycles through all five loading frames every 500ms', () => {
    vi.useFakeTimers()
    queryMock.mockReset()
    queryMock.mockResolvedValue([])

    render(<SplashScreen />)

    expect(screen.getByText('Loading.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('Loading..')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('Loading....')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('Loading.....')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('Loading.')).toBeInTheDocument()

    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('uses company branding when a logo is available', async () => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([
      {
        company_name: 'XPress Billing',
        company_short_name: 'XPress',
        logo: '/branding/p1.gif',
      },
    ])

    render(<SplashScreen />)

    expect(
      await screen.findByRole('img', { name: 'XPress' })
    ).toHaveAttribute('src', '/branding/p1.gif')
  })
})
