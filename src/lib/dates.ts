import { addDays, format, parseISO, startOfWeek } from 'date-fns'

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function weekStart(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function addDaysToDate(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), 'yyyy-MM-dd')
}

export function dayLabel(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE d MMM')
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** 0 = Monday .. 6 = Sunday, matching meal_plan_items.day_of_week. */
export function dayOfWeekIndex(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7
}

/** Simple moving average over the last `window` points, one output per input point. */
export function movingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}
