import { format } from 'date-fns';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function openPrintableReport(options: {
  html: string;
  mode: 'print' | 'pdf';
  requirePath?: boolean;
  configuredPath?: string | null;
}): void {
  const { html, mode, requirePath = false, configuredPath } = options;

  if (requirePath && !configuredPath?.trim()) {
    window.alert('Please Set Report Path from Setting');
    return;
  }

  const reportWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!reportWindow) {
    window.alert('Unable to open report preview window');
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  reportWindow.focus();

  if (mode === 'pdf') {
    reportWindow.print();
  }
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
