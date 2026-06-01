import { useQuery } from '@tanstack/react-query'
import { query } from '@/lib/db'
import type { Company } from '@/lib/types'
import { DEFAULT_CURRENCY } from '@/lib/currency'

export const companyQueryKeys = {
  all: ['company'] as const,
  active: () => [...companyQueryKeys.all, 'active'] as const,
}

export function useActiveCompany() {
  return useQuery({
    queryKey: companyQueryKeys.active(),
    queryFn: () =>
      query<Company>('SELECT * FROM tbl_company WHERE is_active = 1 ORDER BY id LIMIT 1').then(
        (rows) => rows[0] ?? null,
      ),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCurrencySymbol(): string {
  const { data } = useActiveCompany()
  return data?.currency ?? DEFAULT_CURRENCY
}
