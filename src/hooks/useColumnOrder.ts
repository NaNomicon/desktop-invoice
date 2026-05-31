import { useCallback, useRef, useReducer } from 'react';
import type { Table } from '@tanstack/react-table';

/**
 * Hook for column reordering via HTML5 drag-and-drop.
 *
 * Returns `getDragHandlers(columnId)` — spread onto each `<th>` to make
 * the column draggable. Drop target is determined by which column header
 * the pointer is over when the drag ends.
 */
export function useColumnOrder<TData>(table: Table<TData>) {
  const draggingId = useRef<string | null>(null);
  const overId = useRef<string | null>(null);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const getDragHandlers = useCallback(
    (columnId: string) => ({
      draggable: true as const,
      onDragStart: () => {
        draggingId.current = columnId;
        forceUpdate();
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        if (draggingId.current && draggingId.current !== columnId) {
          overId.current = columnId;
        }
      },
      onDragEnd: () => {
        const from = draggingId.current;
        const to = overId.current;
        if (from && to && from !== to) {
          const cols =
            table.getState().columnOrder ??
            table.getAllLeafColumns().map((c) => c.id);
          const fi = cols.indexOf(from);
          const ti = cols.indexOf(to);
          if (fi !== -1 && ti !== -1) {
            const next = [...cols];
            next.splice(fi, 1);
            next.splice(ti, 0, from);
            table.setColumnOrder(next);
          }
        }
        draggingId.current = null;
        overId.current = null;
        forceUpdate();
      },
      style: draggingId.current === columnId ? { opacity: 0.3 } : undefined,
    }),
    [table],
  );

  return { getDragHandlers };
}
