const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Monday 00:00 of the week containing `date`, in local time. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * MS_PER_WEEK);
}

export function weeksBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_WEEK);
}

export function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export type TimelineExperiment = {
  id: string;
  name: string;
  hypothesisId: string;
  hypothesisName: string;
  startDate: Date | null;
  endDate: Date | null;
  stage: string | null;
  status: string;
};

export type TimelineRow = {
  experiment: TimelineExperiment;
  colStart: number; // 1-indexed grid column
  colEnd: number; // exclusive, for `${colStart} / ${colEnd}`
};

export function buildTimeline(experiments: TimelineExperiment[]) {
  const dated = experiments.filter((e) => e.startDate || e.endDate);
  const undated = experiments.filter((e) => !e.startDate && !e.endDate);

  if (dated.length === 0) {
    return { weeks: [] as Date[], rows: [] as TimelineRow[], undated, todayColumn: null as number | null };
  }

  const allDates = dated.flatMap((e) => [e.startDate, e.endDate].filter((d): d is Date => !!d));
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  const rangeStart = startOfWeek(minDate);
  const rangeEndWeek = startOfWeek(maxDate);
  const weekCount = weeksBetween(rangeStart, rangeEndWeek) + 1;

  const weeks: Date[] = Array.from({ length: weekCount }, (_, i) => addWeeks(rangeStart, i));

  const rows: TimelineRow[] = dated.map((e) => {
    const start = startOfWeek(e.startDate ?? e.endDate!);
    const end = startOfWeek(e.endDate ?? e.startDate!);
    const colStart = weeksBetween(rangeStart, start) + 1;
    const colEnd = weeksBetween(rangeStart, end) + 2;
    return { experiment: e, colStart, colEnd: Math.max(colEnd, colStart + 1) };
  });

  const today = startOfWeek(new Date());
  const todayIdx = weeksBetween(rangeStart, today);
  const todayColumn = todayIdx >= 0 && todayIdx < weekCount ? todayIdx + 1 : null;

  return { weeks, rows, undated, todayColumn };
}
