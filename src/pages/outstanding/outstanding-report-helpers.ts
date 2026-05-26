import { escapeHtml } from '@/lib/report-output';
import type { Setting } from '@/lib/types';

export interface OutstandingCompanyOption {
  id: number;
  company_name: string | null;
}

export interface OutstandingRow {
  id: number;
  customer_name: string;
  title_name?: string | null;
  customer_type?: string | null;
  due_amount: number;
  ad_due: string;
  company_id: number;
}

export interface OutstandingDataSet {
  customers: OutstandingRow[];
  companies: OutstandingCompanyOption[];
  settings: Setting | null;
}

export function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function customerDisplayName(row: OutstandingRow): string {
  return [row.title_name?.trim(), row.customer_name.trim()].filter(Boolean).join(' ');
}

function toSignedOutstanding(row: Pick<OutstandingRow, 'due_amount' | 'ad_due'>): number {
  return row.ad_due === 'Advance' ? -Math.abs(row.due_amount) : Math.abs(row.due_amount);
}

export function filterOutstandingRows(
  rows: OutstandingRow[],
  search: string,
  companyFilter: string,
): OutstandingRow[] {
  let filtered = rows;

  if (search) {
    const searchTerm = search.toLowerCase();
    filtered = filtered.filter((row) => row.customer_name.toLowerCase().includes(searchTerm));
  }

  if (companyFilter !== 'all') {
    filtered = filtered.filter((row) => row.company_id === parseInt(companyFilter, 10));
  }

  return filtered;
}

export function getOutstandingCompanyLabel(
  companies: OutstandingCompanyOption[],
  companyFilter: string,
): string {
  if (companyFilter === 'all') {
    return 'All Companies';
  }

  const company = companies.find((row) => String(row.id) === companyFilter);
  return company?.company_name ?? `Company ${companyFilter}`;
}

export function getOutstandingTotals(rows: OutstandingRow[]): {
  totalDue: number;
  totalAdvance: number;
} {
  return rows.reduce(
    (totals, row) => {
      const signedAmount = toSignedOutstanding(row);
      if (signedAmount < 0) {
        totals.totalAdvance += Math.abs(signedAmount);
      } else {
        totals.totalDue += signedAmount;
      }
      return totals;
    },
    { totalDue: 0, totalAdvance: 0 },
  );
}

export function createOutstandingReportHtml(
  rows: OutstandingRow[],
  companyLabel = 'All Companies',
): string {
  const generatedAt = new Date()
    .toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', '');

  const { totalDue, totalAdvance } = getOutstandingTotals(rows);

  const tableRows = rows
    .map((row) => {
      const amountPrefix = row.ad_due === 'Advance' ? '-' : '';
      const amount = `${amountPrefix}$${dollars(Math.abs(row.due_amount))}`;
      const statusClass = row.ad_due === 'Advance' ? 'advance' : 'due';
      return `
        <tr>
          <td>${escapeHtml(customerDisplayName(row))}</td>
          <td class="amount ${statusClass}">${escapeHtml(amount)}</td>
          <td class="${statusClass}">${escapeHtml(row.ad_due)}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Outstanding Report</title>
  <style>
    @page { margin: 14mm; size: A4 portrait; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    main { padding: 24px; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
    .title { margin: 0; font-size: 24px; }
    .meta { color: #4b5563; font-size: 12px; line-height: 1.5; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
    .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
    .value { font-size: 16px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; text-align: left; }
    th { background: #e0f2fe; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .due { color: #dc2626; font-weight: 600; }
    .advance { color: #16a34a; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <div class="header">
      <div>
        <h1 class="title">Outstanding Report</h1>
        <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta">
        <div><strong>Company:</strong> ${escapeHtml(companyLabel)}</div>
        <div><strong>Customers:</strong> ${rows.length}</div>
        <div><strong>Total Due:</strong> $${dollars(totalDue)}</div>
        <div><strong>Total Advance:</strong> $${dollars(totalAdvance)}</div>
      </div>
    </div>
    <div class="summary">
      <div class="card"><div class="label">Company</div><div class="value">${escapeHtml(companyLabel)}</div></div>
      <div class="card"><div class="label">Customers</div><div class="value">${rows.length}</div></div>
      <div class="card"><div class="label">Total Due</div><div class="value">$${dollars(totalDue)}</div></div>
      <div class="card"><div class="label">Total Advance</div><div class="value">$${dollars(totalAdvance)}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Customer Name</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </main>
</body>
</html>`;
}
