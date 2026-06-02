import * as React from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isAfter,
  isBefore,
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type DateRange = { from: Date | undefined; to: Date | undefined }

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
}

function buildCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  const days: Date[] = []
  let cur = start
  while (!isAfter(cur, end)) {
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [month, setMonth] = React.useState(() => startOfMonth(value?.from ?? new Date()))
  const [hovered, setHovered] = React.useState<Date | null>(null)

  const rangeLabel = value?.from
    ? `${format(value.from, 'MMM d, yyyy')}${value.to ? ` – ${format(value.to, 'MMM d, yyyy')}` : ''}`
    : placeholder

  const days = buildCalendarDays(month)

  function handleDayClick(day: Date) {
    if (!value?.from || (value.from && value.to)) {
      onChange({ from: day, to: undefined })
    } else {
      const from = value.from
      if (isBefore(day, from)) {
        onChange({ from: day, to: from })
      } else {
        onChange({ from, to: day })
        setOpen(false)
      }
    }
  }

  function isDayInRange(day: Date): boolean {
    const from = value?.from
    const to = value?.to ?? hovered
    if (!from || !to) return false
    const [start, end] = isAfter(to, from) ? [from, to] : [to, from]
    return isWithinInterval(day, { start, end })
  }

  function isDayStart(day: Date): boolean {
    return !!(value?.from && isSameDay(day, value.from))
  }

  function isDayEnd(day: Date): boolean {
    return !!(value?.to && isSameDay(day, value.to))
  }

  return (
    <div className="relative">
      {open && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          tabIndex={-1}
          role="presentation"
          onMouseDown={() => setOpen(false)}
          onClick={() => setOpen(false)}
        />
      )}
      <Button
        variant="outline"
        className="relative z-50 min-w-52 justify-start gap-2 text-left font-normal"
        onMouseDown={(e) => {
          e.stopPropagation()
          setOpen(prev => !prev)
        }}
      >
        <Calendar className="size-4" />
        <span>{rangeLabel}</span>
      </Button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover p-3 shadow-md"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="rounded p-1 hover:bg-accent"
              onMouseDown={(e) => { e.stopPropagation(); setMonth(subMonths(month, 1)) }}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
            <button
              type="button"
              className="rounded p-1 hover:bg-accent"
              onMouseDown={(e) => { e.stopPropagation(); setMonth(addMonths(month, 1)) }}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-1 text-center text-xs text-muted-foreground font-medium">
                {d}
              </div>
            ))}
            {days.map((day, i) => {
              const inRange = isDayInRange(day)
              const isStart = isDayStart(day)
              const isEnd = isDayEnd(day)
              const isToday = isSameDay(day, new Date())
              const outside = !isSameMonth(day, month)
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => { e.stopPropagation(); handleDayClick(day) }}
                  onMouseEnter={() => setHovered(day)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    'h-8 w-8 rounded text-sm transition-colors',
                    outside && 'text-muted-foreground opacity-40',
                    !outside && 'hover:bg-accent',
                    isToday && !isStart && !isEnd && 'font-semibold',
                    inRange && !isStart && !isEnd && 'bg-accent rounded-none',
                    (isStart || isEnd) && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function defaultDateRange(): DateRange {
  return { from: startOfMonth(new Date()), to: new Date() }
}

interface DateSinglePickerProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
}

export function DateSinglePicker({
  value,
  onChange,
  placeholder = 'Select date',
}: DateSinglePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? new Date(value + 'T00:00:00') : null
  const [month, setMonth] = React.useState(() => startOfMonth(selected ?? new Date()))

  const label = selected ? format(selected, 'MMM d, yyyy') : placeholder
  const days = buildCalendarDays(month)

  return (
    <div className="relative">
      {open && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          tabIndex={-1}
          role="presentation"
          onMouseDown={() => setOpen(false)}
          onClick={() => setOpen(false)}
        />
      )}
      <Button
        variant="outline"
        className="relative z-50 min-w-40 justify-start gap-2 text-left font-normal"
        onMouseDown={(e) => {
          e.stopPropagation()
          setOpen(prev => !prev)
        }}
      >
        <Calendar className="size-4" />
        <span>{label}</span>
      </Button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover p-3 shadow-md"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="rounded p-1 hover:bg-accent"
              onMouseDown={(e) => { e.stopPropagation(); setMonth(subMonths(month, 1)) }}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
            <button
              type="button"
              className="rounded p-1 hover:bg-accent"
              onMouseDown={(e) => { e.stopPropagation(); setMonth(addMonths(month, 1)) }}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-1 text-center text-xs text-muted-foreground font-medium">
                {d}
              </div>
            ))}
            {days.map((day, i) => {
              const isSelected = selected ? isSameDay(day, selected) : false
              const isToday = isSameDay(day, new Date())
              const outside = !isSameMonth(day, month)
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    onChange(format(day, 'yyyy-MM-dd'))
                    setOpen(false)
                  }}
                  className={cn(
                    'h-8 w-8 rounded text-sm transition-colors',
                    outside && 'text-muted-foreground opacity-40',
                    !outside && !isSelected && 'hover:bg-accent',
                    isToday && !isSelected && 'font-semibold',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
