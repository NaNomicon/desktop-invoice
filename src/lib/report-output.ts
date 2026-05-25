import { format } from 'date-fns';
import { openPath } from '@tauri-apps/plugin-opener';
import { toast } from 'sonner';
import { commands, unwrapResult } from '@/lib/tauri-bindings';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeFilenamePart(value: string): string {
  return value.replaceAll(/[\\/:*?"<>|]/g, '_').trim() || 'report';
}

function joinPath(basePath: string, filename: string): string {
  const normalizedBase = basePath.replace(/[\\/]+$/, '');
  const separator = /\\/.test(normalizedBase) ? '\\' : '/';
  return `${normalizedBase}${separator}${filename}`;
}

export function buildReportPdfPath(options: {
  configuredPath: string;
  filenamePrefix: string;
  label?: string | null;
  date?: Date;
}): string {
  const { configuredPath, filenamePrefix, label, date = new Date() } = options;
  const parts = [
    sanitizeFilenamePart(filenamePrefix),
    label ? sanitizeFilenamePart(label) : null,
    format(date, 'yyyy-MM-dd'),
  ].filter(Boolean);

  return joinPath(configuredPath, `${parts.join('-')}.pdf`);
}

export async function openPrintableReport(options: {
  html: string;
  mode: 'print' | 'pdf';
  requirePath?: boolean;
  configuredPath?: string | null;
  outputPath?: string | null;
}): Promise<void> {
  const { html, mode, requirePath = false, configuredPath, outputPath } = options;

  if (requirePath && !configuredPath?.trim()) {
    toast.error('Please Set Report Path from Setting');
    return;
  }

  if (mode === 'pdf') {
    if (!outputPath?.trim()) {
      toast.error('Unable to determine PDF output path');
      return;
    }

    try {
      const savedPath = unwrapResult(
        await commands.saveReportPdf({
          html,
          output_path: outputPath,
        }),
      );
      await openPath(savedPath);
      toast.success(`PDF saved to ${savedPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to generate PDF: ${message}`);
    }
    return;
  }

  const reportWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!reportWindow) {
    toast.error('Unable to open report preview window');
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
}

export function downloadExcelXml(options: {
  filenamePrefix: string;
  worksheetName: string;
  headers: string[];
  rows: string[][];
}): void {
  const { filenamePrefix, worksheetName, headers, rows } = options;

  const workbook = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeHtml(worksheetName)}">
    <Table>
      <Row>
        ${headers
          .map(
            (header) => `<Cell><Data ss:Type="String">${escapeHtml(header)}</Data></Cell>`,
          )
          .join('')}
      </Row>
      ${rows
        .map(
          (row) => `
      <Row>
        ${row
          .map(
            (cell) => `<Cell><Data ss:Type="String">${escapeHtml(cell)}</Data></Cell>`,
          )
          .join('')}
      </Row>`,
        )
        .join('')}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([workbook], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${format(new Date(), 'yyyy-MM-dd')}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}
