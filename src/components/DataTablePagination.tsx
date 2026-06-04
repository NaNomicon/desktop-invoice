import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pagination: { pageIndex: number; pageSize: number };
  totalLabel?: string;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pagination,
  totalLabel = 'rows',
  pageSizeOptions = [10, 25, 50, 100],
}: DataTablePaginationProps<TData>) {
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const totalRows = table.getPrePaginationRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = pageCount === 0 ? 0 : pageIndex + 1;
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  const handleFirst = () => {
    console.debug('[Pagination] First clicked, pageIndex:', pageIndex);
    table.setPageIndex(0);
  };

  const handlePrev = () => {
    console.debug('[Pagination] Prev clicked, pageIndex:', pageIndex);
    table.previousPage();
  };

  const handleNext = () => {
    table.nextPage();
  };

  const handleLast = () => {
    console.debug('[Pagination] Last clicked, pageIndex:', pageIndex);
    table.setPageIndex(pageCount - 1);
  };

  return (
    <div className="flex flex-col gap-3 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {totalRows} {totalLabel}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={`${option}`}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-24 text-center">
          Page {currentPage} of {pageCount}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleFirst}
            disabled={!canPrev}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Go to next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleLast}
            disabled={!canNext}
            aria-label="Go to last page"
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
