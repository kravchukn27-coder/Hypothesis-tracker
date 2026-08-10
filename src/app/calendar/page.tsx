import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  addWeeks,
  buildTimeline,
  formatWeekLabel,
  getOverdueWeek,
  getISOWeekNumber,
  PAGE_STEP_WEEKS,
  startOfWeek,
  toDateParam,
  WINDOW_WEEKS,
} from "@/lib/calendar";
import { STAGE_BAR_CLASSES, STAGE_LABELS, getCurrentWeekStage } from "@/lib/experiment";
import { ExperimentWeekRow } from "./ExperimentWeekRow";
import { WeekHeaderCell } from "./WeekHeaderCell";
import { UndatedRow } from "./UndatedRow";
import { OverdueExperimentReminder } from "./OverdueExperimentReminder";
import { ScrollToCalendarExperiment } from "./ScrollToCalendarExperiment";

function parseWindowStart(start: string | undefined): Date {
  if (start) {
    const parsed = new Date(`${start}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return startOfWeek(parsed);
  }
  return startOfWeek(new Date());
}

/** Keeps the grid a stable height regardless of how many rows are in the current window. */
const MIN_ROWS = 3;

/** PROD-022: "Просрочен" isn't a real `ExperimentStage` — it's a
 * derived per-experiment flag (see `overdue` on `TimelineRow`) — so
 * the legend's filter uses this sentinel value for it instead of
 * overloading a stage name. */
const OVERDUE_FILTER = "OVERDUE";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; stage?: string; experimentId?: string }>;
}) {
  const { start, stage: stageFilter, experimentId } = await searchParams;
  const windowStart = parseWindowStart(start);

  const now = new Date();
  const allExperiments = await prisma.experiment.findMany({
    include: { hypothesis: true, weekStages: { orderBy: { weekStart: "asc" } } },
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  // PROD-023: a Done experiment drops off the Calendar only once the
  // user confirms "Да" (`calendarHiddenOnDone: true`) — replaces
  // PROD-018's unconditional auto-hide. Stays visible while
  // `calendarHiddenOnDone` is null (not asked yet) or false ("Нет").
  //
  // BUG-005 follow-up #3: this used to key off `stage` (the cache —
  // the *furthest-future planned* stage), so an experiment someone had
  // pre-filled through to a future Done week stayed hidden even after
  // its current week was edited back to an earlier stage — reported
  // as "changed it back but it won't reappear." Keys off each
  // experiment's *current week* stage instead (`getCurrentWeekStage`,
  // same helper the Experiments list uses), so it's exactly whether
  // it looks Done *right now* that decides visibility.
  const experiments = allExperiments.filter((e) => {
    const currentStage = e.weekStages.length > 0 ? getCurrentWeekStage(e.weekStages, now) : e.stage;
    return !(currentStage === "DONE" && e.calendarHiddenOnDone === true);
  });

  const timelineExperiments = experiments.map((e) => ({
    id: e.id,
    name: e.name,
    hypothesisId: e.hypothesisId,
    hypothesisName: e.hypothesis.name,
    startDate: e.startDate,
    endDate: e.endDate,
    stage: e.stage,
    weekStages: e.weekStages.map((w) => ({ weekStart: w.weekStart, stage: w.stage, completed: w.completed })),
  }));
  const { weeks, rows, undated, todayColumn } = buildTimeline(timelineExperiments, windowStart);
  const overdueReminders = timelineExperiments.flatMap((experiment) => {
    const overdueWeek = getOverdueWeek(experiment, now);
    return overdueWeek
      ? [
          {
            experimentId: experiment.id,
            experimentName: experiment.name,
            lastWeekStartISO: toDateParam(overdueWeek.weekStart),
            lastStage: overdueWeek.stage as keyof typeof STAGE_LABELS,
          },
        ]
      : [];
  });

  // PROD-022: every navigation link on this page carries the active
  // stage filter along (URL query param, same convention `/backlog`
  // and `/experiments` use for their filters) so paging/"Сегодня"
  // doesn't silently drop it.
  const stageParam = stageFilter ? `&stage=${stageFilter}` : "";
  const prevHref = `/calendar?start=${toDateParam(addWeeks(windowStart, -PAGE_STEP_WEEKS))}${stageParam}`;
  const nextHref = `/calendar?start=${toDateParam(addWeeks(windowStart, PAGE_STEP_WEEKS))}${stageParam}`;
  const todayHref = stageFilter ? `/calendar?stage=${stageFilter}` : "/calendar";
  const isToday = windowStart.getTime() === startOfWeek(new Date()).getTime();

  function stageFilterHref(value: string): string {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (stageFilter !== value) params.set("stage", value);
    const qs = params.toString();
    return qs ? `/calendar?${qs}` : "/calendar";
  }

  function cellMatchesFilter(cellStage: string | null, overdue: boolean): boolean {
    if (!stageFilter) return true;
    if (stageFilter === OVERDUE_FILTER) return overdue;
    return cellStage === stageFilter;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {experiments.length === 0
              ? "Пока нет экспериментов"
              : `${rows.length} на таймлайне${undated.length ? `, ${undated.length} без дат` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={todayHref}
            aria-disabled={isToday}
            className={`rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium ${
              isToday ? "pointer-events-none text-zinc-300" : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Сегодня
          </Link>
          <Link
            href={prevHref}
            aria-label={`Назад на ${PAGE_STEP_WEEKS} нед.`}
            className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={nextHref}
            aria-label={`Вперёд на ${PAGE_STEP_WEEKS} нед.`}
            className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {experimentId && <ScrollToCalendarExperiment experimentId={experimentId} />}

      {experiments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 py-24 text-center">
          <p className="text-sm text-zinc-500">Пока нет ни одного эксперимента.</p>
          <Link
            href="/experiments/new"
            className="text-sm font-medium text-zinc-900 underline underline-offset-4"
          >
            Добавить первый
          </Link>
        </div>
      ) : (
        <>
          <OverdueExperimentReminder reminders={overdueReminders} />

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
            {Object.entries(STAGE_LABELS).map(([stage, label]) => (
              <Link
                key={stage}
                href={stageFilterHref(stage)}
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-zinc-100 ${
                  stageFilter === stage ? "bg-zinc-100 font-medium text-zinc-900" : ""
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${STAGE_BAR_CLASSES[stage as keyof typeof STAGE_BAR_CLASSES]}`}
                />
                {label}
              </Link>
            ))}
            <Link
              href={stageFilterHref(OVERDUE_FILTER)}
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-zinc-100 ${
                stageFilter === OVERDUE_FILTER ? "bg-zinc-100 font-medium text-zinc-900" : ""
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full border-2 border-red-500" />
              Просрочен
            </Link>
            {stageFilter && (
              <Link
                href={start ? `/calendar?start=${start}` : "/calendar"}
                className="text-zinc-400 underline underline-offset-4 hover:text-zinc-700"
              >
                ✕ Сбросить фильтр
              </Link>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <div className="w-fit min-w-full">
              <div className="flex border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <div className="sticky left-0 z-10 w-56 shrink-0 bg-zinc-50 px-4 py-3">
                  Эксперимент
                </div>
                <div
                  className="grid flex-1"
                  style={{ gridTemplateColumns: `repeat(${WINDOW_WEEKS}, minmax(0, 1fr))` }}
                >
                  {weeks.map((w, i) => (
                    <WeekHeaderCell key={i} weekStartISO={toDateParam(w)} isToday={i === todayColumn}>
                      {formatWeekLabel(w)} ({getISOWeekNumber(w)})
                    </WeekHeaderCell>
                  ))}
                </div>
              </div>

              {rows.map(({ experiment: e, cells, overdue, overdueWeekStart }) => (
                <div
                  key={e.id}
                  data-experiment-id={e.id}
                  className="flex border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50"
                >
                  <div className="sticky left-0 z-10 w-56 shrink-0 bg-white px-4 py-3">
                    {/* PROD-019: previously the colored bar itself linked to
                        /experiments/[id] — now that each week is its own
                        stage-editing button, the name here is the only
                        click-through to the experiment's own card. */}
                    <Link
                      href={`/experiments/${e.id}`}
                      title={e.name}
                      className="block truncate text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {e.name}
                    </Link>
                    <Link
                      href={`/backlog/${e.hypothesisId}`}
                      title={`Гипотеза: ${e.hypothesisName}`}
                      className="mt-0.5 block truncate text-xs text-zinc-400 hover:underline"
                    >
                      {e.hypothesisName}
                    </Link>
                  </div>
                  <ExperimentWeekRow
                    key={`${e.id}-${toDateParam(windowStart)}`}
                    experimentId={e.id}
                    experimentName={e.name}
                    overdue={overdue}
                    overdueWeekStartISO={overdueWeekStart ? toDateParam(overdueWeekStart) : null}
                    cells={cells.map((c) => ({
                      weekIndex: c.weekIndex,
                      weekStartISO: toDateParam(c.weekStart),
                      stage: c.stage,
                      blockStartISO: c.blockStart ? toDateParam(c.blockStart) : null,
                      blockEndISO: c.blockEnd ? toDateParam(c.blockEnd) : null,
                      dimmed: !cellMatchesFilter(c.stage, overdue),
                    }))}
                  />
                </div>
              ))}

              {rows.length === 0 && (
                <div className="flex items-center border-b border-zinc-100 px-4 py-3 text-sm text-zinc-400">
                  Нет экспериментов в этом окне
                </div>
              )}

              {Array.from({ length: Math.max(MIN_ROWS - Math.max(rows.length, 1), 0) }).map((_, i) => (
                <div key={`filler-${i}`} className="flex border-b border-zinc-100 last:border-b-0" aria-hidden="true">
                  <div className="w-56 shrink-0 px-4 py-3" />
                  <div className="flex-1" />
                </div>
              ))}
            </div>
          </div>

          {undated.length > 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Без дат
              </p>
              <ul className="flex flex-col gap-2">
                {undated.map((e) => (
                  <UndatedRow key={e.id} experimentId={e.id} name={e.name} hypothesisName={e.hypothesisName} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
