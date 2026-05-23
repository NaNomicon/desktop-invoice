import { useEffect, useMemo, useState } from 'react'
import { Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'

interface CompanyBranding {
  company_name: string | null
  company_short_name?: string | null
  logo: string | null
}

const LOADING_FRAMES = [
  'Loading.',
  'Loading..',
  'Loading...',
  'Loading....',
  'Loading.....',
] as const

export function SplashScreen() {
  const [frameIndex, setFrameIndex] = useState(2)
  const [branding, setBranding] = useState<CompanyBranding | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex(current => (current + 1) % LOADING_FRAMES.length)
    }, 500)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadBranding = async () => {
      try {
        const rows = await query<CompanyBranding>(
          'SELECT company_name, company_short_name, logo FROM tbl_company WHERE is_active = 1 ORDER BY id LIMIT 1'
        )

        if (!cancelled && rows[0]) {
          setBranding(rows[0])
        }
      } catch (error) {
        logger.debug('Splash branding unavailable during startup', {
          error: String(error),
        })
      }
    }

    void loadBranding()

    return () => {
      cancelled = true
    }
  }, [])

  const title = useMemo(() => {
    return (
      branding?.company_short_name || branding?.company_name || 'XPress Billing'
    )
  }, [branding])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-6">
      <Card className="w-full max-w-[385px] overflow-hidden border-border/70 shadow-xl">
        <CardContent className="p-0">
          <div className="flex h-[193px] items-center justify-center bg-linear-to-br from-slate-100 via-sky-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
            {branding?.logo ? (
              <img
                src={branding.logo}
                alt={title}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center text-slate-700 dark:text-slate-100">
                <div className="flex size-16 items-center justify-center rounded-full bg-white/70 shadow-sm dark:bg-slate-800/80">
                  <Building2 className="size-8" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Starting application
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex h-[41px] items-center justify-center border-t bg-background px-4">
            <p className="text-center font-serif text-2xl font-semibold italic text-sky-700 dark:text-sky-300">
              {LOADING_FRAMES[frameIndex]}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
