export const MS_PER_DAY = 24 * 60 * 60 * 1000;
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

/**
 * UI-020/UI-021: ISO 8601 week-of-year (1–53) — Monday-start weeks,
 * week 1 is the week containing the year's first Thursday. Shared by
 * the Calendar grid's headers and the experiment detail card's
 * per-week editor so the two never drift onto different conventions.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday (0) -> 7, so Monday=1..Sunday=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of the same week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
}

/** `YYYY-MM-DD`, local — the wire format used at every server/client boundary here. */
export function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type ManualOrderSortable = {
  manualOrder: number | null;
  startDate: Date | null;
  createdAt: Date;
};

/**
 * PROD-036's Calendar row order: explicit `manualOrder` first (nulls
 * last), falling back to start date then most-recently-created.
 * Shared by the Calendar page's render sort and
 * `reorderCalendarExperiments`'s global-order merge (BUG-018) so both
 * sides agree on what "current order" means.
 */
export function compareByManualOrder(a: ManualOrderSortable, b: ManualOrderSortable): number {
  if (a.manualOrder === null && b.manualOrder !== null) return 1;
  if (a.manualOrder !== null && b.manualOrder === null) return -1;
  if (a.manualOrder !== null && b.manualOrder !== null) return a.manualOrder - b.manualOrder;
  const startDiff = (a.startDate?.getTime() ?? Number.POSITIVE_INFINITY) - (b.startDate?.getTime() ?? Number.POSITIVE_INFINITY);
  return startDiff || b.createdAt.getTime() - a.createdAt.getTime();
}

export type WeekStageEntry = {
  weekStart: Date;
  stage: string;
  completed: boolean;
};

export type TimelineExperiment = {
  id: string;
  name: string;
  hypothesisId: string;
  hypothesisName: string;
  startDate: Date | null;
  endDate: Date | null;
  // TECH-005: null when the experiment has no weeks and no manually-set
  // status — "no status yet", not a fake default.
  stage: string | null;
  weekStages: WeekStageEntry[];
};

export type WeekCell = {
  weekIndex: number; // 0-based, matches the window's `weeks` array
  weekStart: Date;
  stage: string | null; // null = no entry for this experiment this week
  // BUG-006: the contiguous block (run of consecutive weeks, no gaps)
  // this cell belongs to, computed from the experiment's FULL
  // weekStages list (not just the visible window) so drag/resize can
  // target exactly one block even when its true start/end falls
  // outside the current window. Null when the cell itself is empty.
  blockStart: Date | null;
  blockEnd: Date | null;
};

/**
 * BUG-006: groups a (possibly gapped) list of week entries into
 * contiguous runs — consecutive `weekStart` values exactly one week
 * apart — and returns each entry's block start/end keyed by its
 * `weekStart` time, so cells can be tagged with the true block they
 * belong to regardless of what's visible in the current window.
 */
function computeWeekBlocks(entries: WeekStageEntry[]): Map<number, { blockStart: Date; blockEnd: Date }> {
  const sorted = [...entries].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  const result = new Map<number, { blockStart: Date; blockEnd: Date }>();

  let blockStart: Date | null = null;
  let blockTimes: number[] = [];
  let prevTime: number | null = null;

  function flush(blockEnd: Date) {
    if (blockStart === null) return;
    for (const t of blockTimes) result.set(t, { blockStart, blockEnd });
  }

  for (const entry of sorted) {
    const t = entry.weekStart.getTime();
    if (prevTime !== null && t - prevTime !== MS_PER_WEEK) {
      flush(new Date(prevTime));
      blockStart = entry.weekStart;
      blockTimes = [];
    } else if (blockStart === null) {
      blockStart = entry.weekStart;
    }
    blockTimes.push(t);
    prevTime = t;
  }
  if (prevTime !== null) flush(new Date(prevTime));

  return result;
}

export type TimelineRow = {
  experiment: TimelineExperiment;
  cells: WeekCell[]; // one per window week, in order
  overdue: boolean;
  overdueWeekStart: Date | null;
};

// UI-040: a dated experiment whose weeks fall entirely outside the
// current window — `buildTimeline` used to just drop these (see the
// `null` return below), which made them look lost from the Calendar
// during normal navigation. `jumpStart` is the earliest real week so a
// sidebar link can jump the window straight to it.
export type OutOfRangeExperiment = {
  experiment: TimelineExperiment;
  jumpStart: Date;
};

/**
 * PROD-025: the Calendar's single overdue source of truth. A reminder
 * is due only when a real (not legacy synthesized) last week entry is
 * before the current week, this week has no entry, and that last entry
 * has not been explicitly completed.
 */
export function getOverdueWeek(experiment: TimelineExperiment, now: Date = new Date()): WeekStageEntry | null {
  if (experiment.stage === "DONE" || experiment.weekStages.length === 0) return null;

  const currentWeekStart = startOfWeek(now).getTime();
  const entries = [...experiment.weekStages].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  const last = entries[entries.length - 1];

  if (
    last.weekStart.getTime() >= currentWeekStart ||
    last.completed ||
    entries.some((entry) => entry.weekStart.getTime() === currentWeekStart)
  ) {
    return null;
  }

  return last;
}

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
  const outOfRange: OutOfRangeExperiment[] = [];

  const rows: TimelineRow[] = dated
    .map((e) => {
      let entries = e.weekStages;
      if (entries.length === 0 && e.startDate && e.endDate) {
        const s = startOfWeek(e.startDate);
        const en = startOfWeek(e.endDate);
        const count = Math.max(weeksBetween(s, en) + 1, 1);
        // Legacy pre-week-tracking data only — a real experiment's dates
        // always come with a stage; this defensive fallback just avoids
        // rendering an unlabeled bar if that ever isn't true.
        entries = Array.from({ length: count }, (_, i) => ({ weekStart: addWeeks(s, i), stage: e.stage ?? "DISCOVERY", completed: false }));
      }
      const byWeek = new Map(entries.map((en) => [en.weekStart.getTime(), en.stage]));
      const blocks = computeWeekBlocks(entries);

      const cells: WeekCell[] = weekList.map((w, i) => {
        const block = blocks.get(w.getTime());
        return {
          weekIndex: i,
          weekStart: w,
          stage: byWeek.get(w.getTime()) ?? null,
          blockStart: block?.blockStart ?? null,
          blockEnd: block?.blockEnd ?? null,
        };
      });

      if (!cells.some((c) => c.stage !== null)) {
        // Nothing in this window — dated but not here, not "undated".
        const earliest = [...entries].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())[0];
        if (earliest) outOfRange.push({ experiment: e, jumpStart: earliest.weekStart });
        return null;
      }

      const overdueWeek = getOverdueWeek(e, today);

      return { experiment: e, cells, overdue: overdueWeek !== null, overdueWeekStart: overdueWeek?.weekStart ?? null };
    })
    .filter((r): r is TimelineRow => r !== null);

  return { weeks: weekList, rows, undated, outOfRange, todayColumn };
}
