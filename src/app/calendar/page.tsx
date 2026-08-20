import Link from "next/link";
import { CalendarOff, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { ViewTransition } from "react";
import { prisma } from "@/lib/prisma";
import {
  addWeeks,
  buildTimeline,
  compareByManualOrder,
  formatWeekLabel,
  getOverdueWeek,
  PAGE_STEP_WEEKS,
  startOfWeek,
  toDateParam,
  WINDOW_WEEKS,
} from "@/lib/calendar";
import { STAGE_LABELS, currentStageOf } from "@/lib/experiment";
import { ExperimentWeekRow } from "./ExperimentWeekRow";
import { WeekHeaderCell } from "./WeekHeaderCell";
import { UndatedRow } from "./UndatedRow";
import { OutOfRangeRow } from "./OutOfRangeRow";
import { OverdueExperimentReminder } from "./OverdueExperimentReminder";
import { CALENDAR_SURFACE_WIDTH, TABLE_CONTENT_WIDTH, TABLE_SURFACE_WIDTH } from "@/components/tableWidths";
import { HeaderMultiFilter } from "@/components/HeaderMultiFilter";
import { RolloutCell } from "./RolloutCell";
import { AuthorCell } from "./AuthorCell";
import { AllExperimentsTable } from "./AllExperimentsTable";
import { CalendarRowReorderHandle } from "./CalendarRowReorderHandle";
import { requireUserPage } from "@/lib/auth/page-guards";
import { ScrollToHighlighted } from "@/components/ScrollToHighlighted";

// UI-051: the default (no `?start=`) window anchors 2 weeks before the
// current one, not on it — so "Сегодня" shows 2 past weeks, the current
// week, and 5 future weeks (still WINDOW_WEEKS=8 total), instead of the
// current week plus 7 future ones with no history visible.
const DEFAULT_WINDOW_LOOKBACK_WEEKS = 2;

function parseWindowStart(start: string | undefined): Date {
  if (start) {
    const parsed = new Date(`${start}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return startOfWeek(parsed);
  }
  return addWeeks(startOfWeek(new Date()), -DEFAULT_WINDOW_LOOKBACK_WEEKS);
}

/** Keeps the grid a stable height regardless of how many rows are in the current window. */
const MIN_ROWS = 2;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    weekStage?: string | string[];
    experimentId?: string;
    calendarAuthor?: string | string[];
    calendarView?: string;
    stage?: string | string[];
    segment?: string | string[];
    author?: string | string[];
    hypothesisId?: string;
    q?: string;
    view?: string;
    sortBy?: string;
    dir?: string;
  }>;
}) {
  await requireUserPage();
  const params = await searchParams;
  const { start, weekStage, experimentId, calendarAuthor, calendarView, hypothesisId } = params;
  const showAll = calendarView === "all";
  const asList = (value: string | string[] | undefined) => Array.isArray(value) ? value : value ? [value] : [];
  const authorsFilter = asList(calendarAuthor);
  const weekStageEntries = Array.isArray(weekStage) ? weekStage : weekStage ? [weekStage] : [];
  const weekStageFilters = new Map<string, string>();
  weekStageEntries.forEach((entry) => {
    const divider = entry.indexOf(":");
    if (divider > 0 && divider < entry.length - 1) {
      weekStageFilters.set(entry.slice(0, divider), entry.slice(divider + 1));
    }
  });
  const windowStart = parseWindowStart(start);

  const now = new Date();
  const allExperiments = await prisma.experiment.findMany({
    where: { archived: false },
    include: {
      hypothesis: true,
      weekStages: { orderBy: { weekStart: "asc" } },
    },
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
  // BUG-066: kept separate from `experiments` (which also applies the
  // author filter) so the empty state below can tell "author filter
  // matched zero" apart from "there are truly zero experiments."
  const visibleForCalendar = allExperiments.filter((e) => {
    const currentStage = currentStageOf(e, now);
    return !(currentStage === "DONE" && e.calendarHiddenOnDone === true);
  });
  const experiments = authorsFilter.length
    ? visibleForCalendar.filter((e) => e.author && authorsFilter.includes(e.author))
    : visibleForCalendar;
  const authorNames = [...new Set(["Саша", "Дима", "Артем", ...allExperiments.map((item) => item.author).filter((author): author is string => Boolean(author))])];
  const authorOptions = authorNames.map((author) => ({ value: author, label: author }));

  // UI-030: experimentId only highlights its row on the full timeline
  // now (ring on its stage bars, see ExperimentWeekRow) — it used to
  // filter the table down to that one row, which hid every other
  // experiment and made the view harder to read in context.
  const focusedExperiment = experimentId ? experiments.find((experiment) => experiment.id === experimentId) : null;
  const displayedExperiments = [...experiments].sort(compareByManualOrder);
  const timelineExperiments = displayedExperiments.map((e) => ({
    id: e.id,
    name: e.name,
    hypothesisId: e.hypothesisId,
    hypothesisName: e.hypothesis.name,
    startDate: e.startDate,
    endDate: e.endDate,
    stage: e.stage,
    weekStages: e.weekStages.map((w) => ({ weekStart: w.weekStart, stage: w.stage, completed: w.completed })),
  }));
  const { weeks, rows, undated, outOfRange, todayColumn } = buildTimeline(timelineExperiments, windowStart);
  const calendarDetails = new Map(
    displayedExperiments.map((experiment) => [
      experiment.id,
      {
        author: experiment.author,
        rollout: experiment.rollout,
      },
    ]),
  );
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

  function calendarHref({
    start: nextStart,
    focused = Boolean(focusedExperiment),
    clearWeekStage = false,
    clearAuthors = false,
  }: {
    start?: Date;
    focused?: boolean;
    /** UI-052: drop the per-week status filters while keeping every other param. */
    clearWeekStage?: boolean;
    /** BUG-066: drop the author filter while keeping every other param. */
    clearAuthors?: boolean;
  } = {}): string {
    const params = new URLSearchParams();
    if (nextStart) params.set("start", toDateParam(nextStart));
    if (!clearWeekStage) weekStageEntries.forEach((entry) => params.append("weekStage", entry));
    if (!clearAuthors) authorsFilter.forEach((value) => params.append("calendarAuthor", value));
    if (focused && focusedExperiment) params.set("experimentId", focusedExperiment.id);
    const query = params.toString();
    return query ? `/calendar?${query}` : "/calendar";
  }

  // Every navigation keeps both the active stage filter and focused
  // experiment. The focused view is a view mode, not a filter reset.
  const prevHref = calendarHref({ start: addWeeks(windowStart, -PAGE_STEP_WEEKS) });
  const nextHref = calendarHref({ start: addWeeks(windowStart, PAGE_STEP_WEEKS) });
  const todayHref = calendarHref();
  const isToday = windowStart.getTime() === parseWindowStart(undefined).getTime();
  const todayTransition = windowStart < parseWindowStart(undefined) ? "calendar-forward" : "calendar-back";
  // BUG-066: resets both week-stage and author filters — previously
  // only cleared week-stage while silently re-appending every
  // `calendarAuthor` value, so "Сбросить фильтр" didn't actually reset
  // an active author filter.
  const resetFiltersHref = calendarHref({ start: windowStart, clearWeekStage: true, clearAuthors: true });

  function cellMatchesFilter(cellStage: string | null, weekStartISO: string): boolean {
    const selectedStage = weekStageFilters.get(weekStartISO);
    return !selectedStage || cellStage === selectedStage;
  }

  const hasWeekStageFilters = weekStageFilters.size > 0;
  const hasAuthorFilters = authorsFilter.length > 0;
  const hasActiveFilters = hasWeekStageFilters || hasAuthorFilters;
  const visibleRows = hasWeekStageFilters
    ? rows.filter((row) =>
        row.cells.some((cell) => {
          const selectedStage = weekStageFilters.get(toDateParam(cell.weekStart));
          return Boolean(selectedStage && cell.stage === selectedStage);
        }),
      )
    : rows;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-6 py-8">
      <div className={`flex items-center justify-between gap-4 ${showAll ? TABLE_SURFACE_WIDTH : ""}`}>
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Calendar</h1>
          </div>
          <Link
            href={showAll ? calendarHref() : "/calendar?calendarView=all"}
            className="mt-0.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {showAll ? "Таймлайн" : "Показать все эксперименты"}
          </Link>
        </div>
        {!showAll && (
          <div className="flex items-center gap-2">
              <Link
                href={resetFiltersHref}
                aria-disabled={!hasActiveFilters}
                className={`rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium ${
                  hasActiveFilters ? "text-zinc-700 hover:bg-zinc-50" : "pointer-events-none text-zinc-300"
                }`}
              >
                Сбросить фильтр
              </Link>
              <Link
                href={todayHref}
                transitionTypes={[todayTransition]}
                aria-disabled={isToday}
                className={`rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium ${
                  isToday ? "pointer-events-none text-zinc-300" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Сегодня
              </Link>
              <Link
                href={prevHref}
                transitionTypes={["calendar-back"]}
                aria-label={`Назад на ${PAGE_STEP_WEEKS} нед.`}
                className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={nextHref}
                transitionTypes={["calendar-forward"]}
                aria-label={`Вперёд на ${PAGE_STEP_WEEKS} нед.`}
                className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
          </div>
        )}
      </div>

      {(experimentId || hypothesisId) && <ScrollToHighlighted />}

      {showAll && <AllExperimentsTable searchParams={params} />}

      {!showAll && (displayedExperiments.length === 0 ? (
        <div className={`flex ${CALENDAR_SURFACE_WIDTH} h-[164px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 text-center`}>
          {hasAuthorFilters && visibleForCalendar.length > 0 ? (
            // BUG-066: the author filter matched zero experiments — distinct
            // from "no experiments at all" below, so this offers a reset
            // instead of the misleading "Добавить первый" link.
            <>
              <p className="text-sm text-zinc-500">По выбранному автору сейчас нет экспериментов.</p>
              <Link
                href={resetFiltersHref}
                className="text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                Сбросить фильтр
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-500">Пока нет ни одного эксперимента.</p>
              <Link
                href="/experiments/new"
                className="text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                Добавить первый
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <OverdueExperimentReminder reminders={overdueReminders} />

          <ViewTransition
            enter={{ "calendar-forward": "calendar-forward", "calendar-back": "calendar-back", default: "none" }}
            exit={{ "calendar-forward": "calendar-forward", "calendar-back": "calendar-back", default: "none" }}
            default="none"
          >
          <div className={`${CALENDAR_SURFACE_WIDTH} flex items-start gap-4`}>
            {(undated.length > 0 || outOfRange.length > 0) && (
              <div className="flex w-56 shrink-0 flex-col gap-4">
                {undated.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarOff className="h-3.5 w-3.5 text-zinc-400" strokeWidth={2} />
                      <p className="text-center text-xs font-bold text-zinc-500">
                        Эксперименты без даты
                      </p>
                      <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-600">
                        {undated.length}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {undated.map((e) => (
                        <UndatedRow
                          key={e.id}
                          experimentId={e.id}
                          name={e.name}
                          highlighted={e.id === experimentId}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {outOfRange.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarRange className="h-3.5 w-3.5 text-zinc-400" strokeWidth={2} />
                      <p className="text-center text-xs font-bold text-zinc-500">
                        Вне диапазона
                      </p>
                      <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-600">
                        {outOfRange.length}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {outOfRange.map(({ experiment: e, jumpStart }) => (
                        <OutOfRangeRow
                          key={e.id}
                          experimentId={e.id}
                          name={e.name}
                          jumpStart={jumpStart}
                          highlighted={e.id === experimentId}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="min-w-0 flex-1 rounded-xl border border-zinc-200">
              <div className={TABLE_CONTENT_WIDTH}>
                <div className="sticky top-0 z-20 flex border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500">
                <div className="sticky left-0 z-30 grid w-[22.5rem] shrink-0 grid-cols-[1.75rem_minmax(8.25rem,1fr)_4.5rem_minmax(7rem,1fr)] bg-zinc-50">
                  <div aria-hidden />
                  <div className="flex items-center justify-center px-3 py-2 text-center font-bold">Эксперимент</div>
                  <div className="flex items-center justify-center px-2 py-2 text-center font-bold"><HeaderMultiFilter name="calendarAuthor" label="Автор" options={authorOptions} iconPosition="end" /></div>
                  <div className="flex items-center justify-center px-2 py-2 text-center font-bold">Раскатка</div>
                </div>
                <div
                  className="grid min-w-0 flex-1"
                  style={{ gridTemplateColumns: `repeat(${WINDOW_WEEKS}, minmax(0, 1fr))` }}
                >
                  {weeks.map((w, i) => (
                    <WeekHeaderCell
                      key={i}
                      weekStartISO={toDateParam(w)}
                      isToday={i === todayColumn}
                      stageFilter={weekStageFilters.get(toDateParam(w))}
                      stageOptions={Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label }))}
                    >
                      {formatWeekLabel(w)}
                    </WeekHeaderCell>
                  ))}
                </div>
              </div>

              {visibleRows.map(({ experiment: e, cells, overdue, overdueWeekStart }) => {
                const details = calendarDetails.get(e.id);
                const isFocused = e.id === focusedExperiment?.id;
                return (
                <div
                  key={e.id}
                  data-calendar-reorder-row
                  data-experiment-id={e.id}
                  data-highlighted={isFocused || undefined}
                  className="highlight-calendar-row flex border-b border-zinc-100 transition-[transform,box-shadow,background-color] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] last:border-b-0 hover:bg-zinc-50"
                >
                  <div className="highlight-calendar-sticky sticky left-0 z-10 grid w-[22.5rem] shrink-0 grid-cols-[1.75rem_minmax(8.25rem,1fr)_4.5rem_minmax(7rem,1fr)] bg-white">
                    <div className="flex items-start justify-center pt-2"><CalendarRowReorderHandle experimentName={e.name} /></div>
                    <div className="min-w-0 py-2 pr-3 text-sm"><Link
                      href={`/experiments/${e.id}`}
                      title={e.name}
                      className="line-clamp-2 font-medium text-zinc-900 hover:underline"
                    >
                      {e.name}
                    </Link></div>
                    <div className="min-w-0 px-1 py-2"><AuthorCell experimentId={e.id} value={details?.author ?? null} options={authorNames} /></div>
                    <div className="min-w-0 px-1 py-2"><RolloutCell experimentId={e.id} value={details?.rollout ?? null} multiline /></div>
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
                      isToday: c.weekIndex === todayColumn,
                      stage: c.stage,
                      blockStartISO: c.blockStart ? toDateParam(c.blockStart) : null,
                      blockEndISO: c.blockEnd ? toDateParam(c.blockEnd) : null,
                      hidden: !cellMatchesFilter(c.stage, toDateParam(c.weekStart)),
                    }))}
                  />
                </div>
                );
              })}

              {visibleRows.length === 0 && (
                <div className="flex items-center border-b border-zinc-100 px-4 py-2 text-sm text-zinc-400">
                  Нет экспериментов в этом окне
                </div>
              )}

              {Array.from({ length: Math.max(MIN_ROWS - Math.max(visibleRows.length, 1), 0) }).map((_, i) => (
                <div key={`filler-${i}`} className="flex border-b border-zinc-100 last:border-b-0" aria-hidden="true">
                  <div className="w-56 shrink-0 px-4 py-2" />
                  <div className="flex-1" />
                </div>
              ))}
            </div>
            </div>
          </div>
          </ViewTransition>
        </>
      ))}
    </div>
  );
}
