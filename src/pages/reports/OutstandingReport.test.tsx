import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import OutstandingReport from './OutstandingReport';
import ListOutStanding from '@/pages/outstanding/ListOutStanding';

const queryMock = vi.fn();
const openPrintableReportMock = vi.fn();
const downloadExcelXmlMock = vi.fn();
const closeHomeTabMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

vi.mock('@/lib/report-output', async () => {
  const actual = await vi.importActual<typeof import('@/lib/report-output')>('@/lib/report-output');
  return {
    ...actual,
    openPrintableReport: (...args: unknown[]) => openPrintableReportMock(...args),
    downloadExcelXml: (...args: unknown[]) => downloadExcelXmlMock(...args),
  };
});

vi.mock('@/store/ui-store', () => ({
  useUIStore: (selector: (state: { closeHomeTab: typeof closeHomeTabMock }) => unknown) =>
    selector({ closeHomeTab: closeHomeTabMock }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const customerRows = [
  {
    id: 1,
    customer_name: 'Alice',
    title_name: 'Ms',
    customer_type: 'Retail',
    due_amount: 2500,
    ad_due: 'Due',
    company_id: 1,
  },
  {
    id: 2,
    customer_name: 'Bob',
    title_name: 'Mr',
    customer_type: 'Retail',
    due_amount: -800,
    ad_due: 'Advance',
    company_id: 2,
  },
];

const companyRows = [
  { id: 1, company_name: 'Alpha Laundry' },
  { id: 2, company_name: 'Beta Pressing' },
];

const settingRows = [{ report_path: '/tmp/reports' }];

function setupOutstandingQueries() {
  queryMock.mockImplementation((sql: string) => {
    if (sql.includes('FROM tbl_customer')) {
      return Promise.resolve(customerRows);
    }
    if (sql.includes('FROM tbl_company')) {
      return Promise.resolve(companyRows);
    }
    if (sql.includes('FROM tbl_setting')) {
      return Promise.resolve(settingRows);
    }
    return Promise.resolve([]);
  });
}

describe('Outstanding report flows', () => {
  beforeEach(() => {
    queryMock.mockReset();
    openPrintableReportMock.mockReset();
    downloadExcelXmlMock.mockReset();
    closeHomeTabMock.mockReset();
    navigateMock.mockReset();
    setupOutstandingQueries();
  });

  it('renders outstanding report totals and filters by customer name before printing', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OutstandingReport />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Outstanding Report')).toBeInTheDocument();
    expect(await screen.findByText('Total Due')).toBeInTheDocument();
    expect(screen.getAllByText('$25.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$8.00').length).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText('Search customers...'), 'Alice');
    await user.click(screen.getByRole('button', { name: 'Print' }));

    expect(openPrintableReportMock).toHaveBeenCalledTimes(1);
    expect(openPrintableReportMock.mock.calls[0]?.[0]).toMatchObject({
      mode: 'print',
      configuredPath: '/tmp/reports',
    });
    expect(openPrintableReportMock.mock.calls[0]?.[0].html).toContain('All Companies');
    expect(openPrintableReportMock.mock.calls[0]?.[0].html).toContain('Alice');
    expect(openPrintableReportMock.mock.calls[0]?.[0].html).not.toContain('Bob');
  });

  it('closes the outstanding report tab when cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OutstandingReport />
      </MemoryRouter>,
    );

    await screen.findByText('Outstanding Report');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(closeHomeTabMock).toHaveBeenCalledWith('/reports/outstanding');
  });

  it('opens a receipt voucher for the selected outstanding customer', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ListOutStanding />
      </MemoryRouter>,
    );

    await screen.findByText('Outstanding Balances');

    await waitFor(() => {
      expect(screen.getByText('Ms Alice')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Receipt Voucher' }));

    expect(navigateMock).toHaveBeenCalledWith('/receipts/new', {
      state: {
        customerId: 1,
        customerName: 'Alice',
        dueAmount: 2500,
        adDueStatus: 'Due',
      },
    });
  });

  it('closes the outstanding list tab when cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ListOutStanding />
      </MemoryRouter>,
    );

    await screen.findByText('Outstanding Balances');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(closeHomeTabMock).toHaveBeenCalledWith('/outstanding');
  });
});
