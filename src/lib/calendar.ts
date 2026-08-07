const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const WINDOW_DAYS = 15;
export const PAGE_STEP_DAYS = 5;

/** Midnight of `date`, in local time. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export function formatWeekdayLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", { weekday: "short" });
}

export type TimelineExperiment = {
  id: string;
  name: string;
  hypothesisId: string;
  hypothesisName: string;
  startDate: Date | null;
  endDate: Date | null;
  stage: string;
};

export type TimelineRow = {
  experiment: TimelineExperiment;
  colStart: number; // 1-indexed grid column, clipped to the window
  colEnd: number; // exclusive, for `${colStart} / ${colEnd}`, clipped to the window
  overdue: boolean;
};

/**
 * Builds a fixed-size day-granularity window starting at `windowStart`
 * (already normalized to a local midnight). Bars are clipped to the
 * window rather than omitted when they extend past its edges.
 */
export function buildTimeline(experiments: TimelineExperiment[], windowStart: Date, days: number = WINDOW_DAYS) {
  const dated = experiments.filter((e) => e.startDate || e.endDate);
  const undated = experiments.filter((e) => !e.startDate && !e.endDate);

  const rangeStart = startOfDay(windowStart);
  const dayList: Date[] = Array.from({ length: days }, (_, i) => addDays(rangeStart, i));
  const rangeEnd = addDays(rangeStart, days); // exclusive upper bound

  const today = startOfDay(new Date());

  const rows: TimelineRow[] = dated
    .map((e) => {
      const start = startOfDay(e.startDate ?? e.endDate!);
      const end = startOfDay(e.endDate ?? e.startDate!);
      if (end < rangeStart || start >= rangeEnd) return null;

      const colStart = Math.max(daysBetween(rangeStart, start) + 1, 1);
      const colEnd = Math.min(daysBetween(rangeStart, end) + 2, days + 1);
      const overdue = e.stage !== "DONE" && !!e.endDate && startOfDay(e.endDate) < today;

      return { experiment: e, colStart, colEnd: Math.max(colEnd, colStart + 1), overdue };
    })
    .filter((r): r is TimelineRow => r !== null);

  const todayIdx = daysBetween(rangeStart, today);
  const todayColumn = todayIdx >= 0 && todayIdx < days ? todayIdx + 1 : null;

  return { days: dayList, rows, undated, todayColumn };
}
