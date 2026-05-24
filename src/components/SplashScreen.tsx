import { useEffect, useState } from 'react'
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

const LEGACY_SPLASH_IMAGE_PATH = '/Icon512.png'

export function SplashScreen() {
  const [frameIndex, setFrameIndex] = useState(0)
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

  const title = branding?.company_short_name || branding?.company_name || 'XPress Billing'
  const splashImageSrc = branding?.logo || LEGACY_SPLASH_IMAGE_PATH

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-6">
      <Card className="w-full max-w-[385px] overflow-hidden border-border/70 shadow-xl">
        <CardContent className="p-0">
          <div className="flex h-[193px] items-center justify-center bg-black/5">
            <img
              src={splashImageSrc}
              alt={title}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex h-[41px] items-center justify-center border-t bg-background px-4">
            <p className="text-center font-[Monotype_Corsiva,Georgia,Times_New_Roman,serif] text-[21px] font-bold italic text-[#0067c0] dark:text-[#60cdff]">
              {LOADING_FRAMES[frameIndex]}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
