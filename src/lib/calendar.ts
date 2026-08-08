const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export const WINDOW_WEEKS = 8;
export const PAGE_STEP_WEEKS = 1;

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

/** `YYYY-MM-DD`, local — the wire format used at every server/client boundary here. */
export function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type WeekStageEntry = {
  weekStart: Date;
  stage: string;
};

export type TimelineExperiment = {
  id: string;
  name: string;
  hypothesisId: string;
  hypothesisName: string;
  startDate: Date | null;
  endDate: Date | null;
  stage: string;
  weekStages: WeekStageEntry[];
};

export type WeekCell = {
  weekIndex: number; // 0-based, matches the window's `weeks` array
  weekStart: Date;
  stage: string | null; // null = no entry for this experiment this week
};

export type TimelineRow = {
  experiment: TimelineExperiment;
  cells: WeekCell[]; // one per window week, in order
  overdue: boolean;
};

/**
 * PROD-019: builds a fixed-size week-granularity window starting at
 * `windowStart` (already normalized to a Monday). Each row is one cell
 * per window week rather than a single spanning bar, since an
 * experiment's stage can change week to week.
 *
 * An experiment with real `weekStages` uses those directly. One with
 * legacy `startDate`/`endDate` but no `weekStages` yet (not manually
 * re-tagged since PROD-019) gets its weeks synthesized on the fly —
 * one entry per week in its date range, all at its current `stage` —
 * purely for rendering; nothing is written back until the user
 * actually edits a week.
 */
export function buildTimeline(experiments: TimelineExperiment[], windowStart: Date, weeks: number = WINDOW_WEEKS) {
  const rangeStart = startOfWeek(windowStart);
  const weekList: Date[] = Array.from({ length: weeks }, (_, i) => addWeeks(rangeStart, i));

  const today = startOfWeek(new Date());
  const todayIdx = weeksBetween(rangeStart, today);
  const todayColumn = todayIdx >= 0 && todayIdx < weeks ? todayIdx : null;

  const dated = experiments.filter((e) => e.weekStages.length > 0 || (e.startDate && e.endDate));
  const undated = experiments.filter((e) => e.weekStages.length === 0 && !(e.startDate && e.endDate));

  const rows: TimelineRow[] = dated
    .map((e) => {
      let entries = e.weekStages;
      if (entries.length === 0 && e.startDate && e.endDate) {
        const s = startOfWeek(e.startDate);
        const en = startOfWeek(e.endDate);
        const count = Math.max(weeksBetween(s, en) + 1, 1);
        entries = Array.from({ length: count }, (_, i) => ({ weekStart: addWeeks(s, i), stage: e.stage }));
      }
      const byWeek = new Map(entries.map((en) => [en.weekStart.getTime(), en.stage]));

      const cells: WeekCell[] = weekList.map((w, i) => ({
        weekIndex: i,
        weekStart: w,
        stage: byWeek.get(w.getTime()) ?? null,
      }));

      if (!cells.some((c) => c.stage !== null)) return null; // nothing in this window

      const overdue = e.stage !== "DONE" && !!e.endDate && startOfWeek(e.endDate) < today;

      return { experiment: e, cells, overdue };
    })
    .filter((r): r is TimelineRow => r !== null);

  return { weeks: weekList, rows, undated, todayColumn };
}
