import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { buildReportPdfPath, downloadExcelXml, openPrintableReport } from '@/lib/report-output';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui-store';
import { useOutstandingStore } from '@/store/outstanding-store';
import {
  createOutstandingReportHtml,
  customerDisplayName,
  dollars,
  filterOutstandingRows,
  getOutstandingCompanyLabel,
  getOutstandingTotals,
} from '@/pages/outstanding/outstanding-report-helpers';
import { useOutstandingData } from '@/services/outstanding';
import { Download, FileText, Search, X } from 'lucide-react';

function OutstandingReport() {
  const closeHomeTab = useUIStore((state) => state.closeHomeTab);
  const search = useOutstandingStore((state) => state.search);
  const companyFilter = useOutstandingStore((state) => state.companyFilter);
  const setSearch = useOutstandingStore((state) => state.setSearch);
  const setCompanyFilter = useOutstandingStore((state) => state.setCompanyFilter);
  const { data, isLoading } = useOutstandingData();
  const customers = data?.customers ?? [];
  const companies = data?.companies ?? [];
  const settings = data?.settings ?? null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeHomeTab('/reports/outstanding');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeHomeTab]);

  const filtered = useMemo(
    () => filterOutstandingRows(customers, search, companyFilter),
    [companyFilter, customers, search],
  );

  const companyLabel = useMemo(
    () => getOutstandingCompanyLabel(companies, companyFilter),
    [companies, companyFilter],
  );

  const { totalDue, totalAdvance } = useMemo(
    () => getOutstandingTotals(filtered),
    [filtered],
  );

  const handlePrintable = useCallback(
    (mode: 'print' | 'pdf') => {
      if (filtered.length === 0) {
        toast.error('No Data Selected');
        return;
      }

      if (mode === 'pdf' && !settings?.report_path?.trim()) {
        toast.error('Please Set Report Path from Setting');
        return;
      }

      openPrintableReport({
        html: createOutstandingReportHtml(filtered, companyLabel),
        mode,
        requirePath: mode === 'pdf',
        configuredPath: settings?.report_path ?? null,
        outputPath:
          mode === 'pdf' && settings?.report_path
            ? buildReportPdfPath({
                configuredPath: settings.report_path,
                filenamePrefix: 'outstanding-report',
                label: companyLabel,
              })
            : null,
      });
    },
    [companyLabel, filtered, settings],
  );

  const handleExportExcel = useCallback(() => {
    if (filtered.length === 0) {
      toast.error('No Data Selected');
      return;
    }

    downloadExcelXml({
      filenamePrefix: 'outstanding-report',
      worksheetName: 'Outstanding Report',
      headers: ['CUSTOMER NAME', 'AMOUNT', 'STATUS'],
      rows: filtered.map((row) => {
        const amountPrefix = row.ad_due === 'Advance' ? '-' : '';
        return [
          customerDisplayName(row),
          `${amountPrefix}${dollars(Math.abs(row.due_amount))}`,
          row.ad_due,
        ];
      }),
    });
  }, [filtered]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Outstanding Report</h1>
          <p className="text-sm text-muted-foreground">
            Filter outstanding balances, then print, export PDF, or download Excel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handlePrintable('print')}>
            <FileText className="mr-2 size-4" />
            Print
          </Button>
          <Button variant="outline" onClick={() => handlePrintable('pdf')}>
            <Download className="mr-2 size-4" />
            View PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => closeHomeTab('/reports/outstanding')}>
            <X className="mr-2 size-4" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Company</div>
            <div className="mt-1 font-medium">{companyLabel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Customers</div>
            <div className="mt-1 font-medium">{filtered.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground text-red-600">Total Due</div>
            <div className="mt-1 font-medium text-red-600">${dollars(totalDue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground text-green-600">Total Advance</div>
            <div className="mt-1 font-medium text-green-600">${dollars(totalAdvance)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.company_name ?? `Company ${company.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No outstanding balances found</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Customer Name</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const statusClass =
                      row.ad_due === 'Advance'
                        ? 'text-green-600 font-medium'
                        : row.ad_due === 'Due'
                          ? 'text-red-600 font-medium'
                          : 'text-muted-foreground';
                    const amountPrefix = row.ad_due === 'Advance' ? '-' : '';

                    return (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-2">{customerDisplayName(row)}</td>
                        <td className={`px-4 py-2 text-right ${statusClass}`}>
                          {amountPrefix}${dollars(Math.abs(row.due_amount))}
                        </td>
                        <td className={`px-4 py-2 ${statusClass}`}>{row.ad_due}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OutstandingReport;
