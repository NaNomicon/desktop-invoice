import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveReportPdfMock = vi.fn();
const openPathMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    saveReportPdf: (...args: unknown[]) => saveReportPdfMock(...args),
  },
  unwrapResult: <T, E>(result: { status: 'ok'; data: T } | { status: 'error'; error: E }): T => {
    if (result.status === 'ok') return result.data;
    throw result.error;
  },
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: (...args: unknown[]) => openPathMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

import { openPrintableReport } from '@/lib/report-output';

describe('openPrintableReport pdf flow', () => {
  beforeEach(() => {
    saveReportPdfMock.mockReset();
    openPathMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('opens the saved PDF path after standalone export succeeds', async () => {
    saveReportPdfMock.mockResolvedValue({
      status: 'ok',
      data: '/tmp/reports/outstanding-report-All Companies-2025-01-01.pdf',
    });
    openPathMock.mockResolvedValue(undefined);

    await openPrintableReport({
      html: '<html><body>report</body></html>',
      mode: 'pdf',
      requirePath: true,
      configuredPath: '/tmp/reports',
      outputPath: '/tmp/reports/outstanding-report-All Companies-2025-01-01.pdf',
    });

    expect(saveReportPdfMock).toHaveBeenCalledWith({
      html: '<html><body>report</body></html>',
      output_path: '/tmp/reports/outstanding-report-All Companies-2025-01-01.pdf',
    });
    expect(openPathMock).toHaveBeenCalledWith(
      '/tmp/reports/outstanding-report-All Companies-2025-01-01.pdf',
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'PDF saved to /tmp/reports/outstanding-report-All Companies-2025-01-01.pdf',
    );
  });

  it('shows a friendly error when standalone export fails', async () => {
    saveReportPdfMock.mockResolvedValue({
      status: 'error',
      error: 'Bundled Chromium is missing',
    });

    await openPrintableReport({
      html: '<html><body>report</body></html>',
      mode: 'pdf',
      requirePath: true,
      configuredPath: '/tmp/reports',
      outputPath: '/tmp/reports/outstanding-report-All Companies-2025-01-01.pdf',
    });

    expect(openPathMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Failed to generate PDF: Bundled Chromium is missing',
    );
  });

  it('shows a toast when the configured report path is missing', async () => {
    await openPrintableReport({
      html: '<html><body>report</body></html>',
      mode: 'pdf',
      requirePath: true,
      configuredPath: null,
      outputPath: '/tmp/reports/outstanding-report-All Companies-2025-01-01.pdf',
    });

    expect(saveReportPdfMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('Please Set Report Path from Setting');
  });

  it('shows a toast when the PDF output path cannot be determined', async () => {
    await openPrintableReport({
      html: '<html><body>report</body></html>',
      mode: 'pdf',
      requirePath: true,
      configuredPath: '/tmp/reports',
      outputPath: null,
    });

    expect(saveReportPdfMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('Unable to determine PDF output path');
  });
});
