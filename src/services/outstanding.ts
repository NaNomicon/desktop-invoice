import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import type { Setting } from '@/lib/types';
import type { OutstandingCompanyOption, OutstandingDataSet, OutstandingRow } from '@/pages/outstanding/outstanding-report-helpers';

export const outstandingQueryKeys = {
  all: ['outstanding'] as const,
  data: () => [...outstandingQueryKeys.all, 'data'] as const,
};

async function fetchOutstandingData(): Promise<OutstandingDataSet> {
  const [customers, companies, settings] = await Promise.all([
    query<OutstandingRow>(
      `SELECT id, customer_name, title_name, customer_type, due_amount, ad_due, company_id
       FROM tbl_customer
       WHERE is_deleted = 0 AND due_amount != 0
       ORDER BY customer_name`,
    ),
    query<OutstandingCompanyOption>('SELECT id, company_name FROM tbl_company WHERE is_active = 1'),
    query<Setting>('SELECT report_path FROM tbl_setting WHERE id = 1 LIMIT 1'),
  ]);

  return {
    customers,
    companies,
    settings: settings[0] ?? null,
  };
}

export function useOutstandingData() {
  return useQuery({
    queryKey: outstandingQueryKeys.data(),
    queryFn: fetchOutstandingData,
    staleTime: 30_000,
  });
}
