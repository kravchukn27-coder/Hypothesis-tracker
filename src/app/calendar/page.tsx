import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  addWeeks,
  buildTimeline,
  formatWeekLabel,
  getOverdueWeek,
  PAGE_STEP_WEEKS,
  startOfWeek,
  toDateParam,
  WINDOW_WEEKS,
} from "@/lib/calendar";
import { STAGE_LABELS, getCurrentWeekStage } from "@/lib/experiment";
import { ExperimentWeekRow } from "./ExperimentWeekRow";
import { WeekHeaderCell } from "./WeekHeaderCell";
import { UndatedRow } from "./UndatedRow";
import { OverdueExperimentReminder } from "./OverdueExperimentReminder";
import { CALENDAR_SURFACE_WIDTH, TABLE_CONTENT_WIDTH } from "@/components/tableWidths";
import { HeaderMultiFilter } from "@/components/HeaderMultiFilter";
import { RolloutCell } from "./RolloutCell";
import { AuthorCell } from "./AuthorCell";
import { AllExperimentsTable } from "./AllExperimentsTable";

function parseWindowStart(start: string | undefined): Date {
  if (start) {
    const parsed = new Date(`${start}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return startOfWeek(parsed);
  }
  return startOfWeek(new Date());
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
  const params = await searchParams;
  const { start, weekStage, experimentId, calendarAuthor, calendarView } = params;
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
  const experiments = allExperiments.filter((e) => {
    const currentStage = e.weekStages.length > 0 ? getCurrentWeekStage(e.weekStages, now) : e.stage;
    if (currentStage === "DONE" && e.calendarHiddenOnDone === true) return false;
    if (authorsFilter.length && (!e.author || !authorsFilter.includes(e.author))) return false;
    return true;
  });
  const authorNames = [...new Set(["Саша", "Дима", "Артем", ...allExperiments.map((item) => item.author).filter((author): author is string => Boolean(author))])];
  const authorOptions = authorNames.map((author) => ({ value: author, label: author }));

  // UI-030: experimentId only highlights its row on the full timeline
  // now (ring on its stage bars, see ExperimentWeekRow) — it used to
  // filter the table down to that one row, which hid every other
  // experiment and made the view harder to read in context.
  const focusedExperiment = experimentId ? experiments.find((experiment) => experiment.id === experimentId) : null;
  const displayedExperiments = experiments;
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
  const { weeks, rows, undated, todayColumn } = buildTimeline(timelineExperiments, windowStart);
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
  }: {
    start?: Date;
    focused?: boolean;
  } = {}): string {
    const params = new URLSearchParams();
    if (nextStart) params.set("start", toDateParam(nextStart));
    weekStageEntries.forEach((entry) => params.append("weekStage", entry));
    authorsFilter.forEach((value) => params.append("calendarAuthor", value));
    if (focused && focusedExperiment) params.set("experimentId", focusedExperiment.id);
    const query = params.toString();
    return query ? `/calendar?${query}` : "/calendar";
  }

  // Every navigation keeps both the active stage filter and focused
  // experiment. The focused view is a view mode, not a filter reset.
  const prevHref = calendarHref({ start: addWeeks(windowStart, -PAGE_STEP_WEEKS) });
  const nextHref = calendarHref({ start: addWeeks(windowStart, PAGE_STEP_WEEKS) });
  const todayHref = calendarHref();
  const isToday = windowStart.getTime() === startOfWeek(new Date()).getTime();

  function cellMatchesFilter(cellStage: string | null, weekStartISO: string): boolean {
    const selectedStage = weekStageFilters.get(weekStartISO);
    return !selectedStage || cellStage === selectedStage;
  }

  const hasWeekStageFilters = weekStageFilters.size > 0;
  const visibleRows = hasWeekStageFilters
    ? rows.filter((row) =>
        row.cells.some((cell) => {
          const selectedStage = weekStageFilters.get(toDateParam(cell.weekStart));
          return Boolean(selectedStage && cell.stage === selectedStage);
        }),
      )
    : rows;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
          {!showAll && (
            <p className="mt-1 text-sm text-zinc-500">
              {displayedExperiments.length === 0
                ? "Пока нет экспериментов"
                : `${rows.length} на таймлайне${undated.length ? `, ${undated.length} без дат` : ""}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={showAll ? calendarHref() : "/calendar?calendarView=all"}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {showAll ? "Таймлайн" : "Показать все эксперименты"}
          </Link>
          {!showAll && (
            <>
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
            </>
          )}
        </div>
      </div>

      {showAll && <AllExperimentsTable searchParams={params} />}

      {!showAll && (displayedExperiments.length === 0 ? (
        <div className={`flex ${CALENDAR_SURFACE_WIDTH} h-[164px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 text-center`}>
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

          <div className={`${CALENDAR_SURFACE_WIDTH} rounded-xl border border-zinc-200`}>
            <div className={TABLE_CONTENT_WIDTH}>
              <div className="flex border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <div className="sticky left-0 z-10 grid w-[24rem] shrink-0 grid-cols-[minmax(10rem,1fr)_4.5rem_minmax(7rem,1fr)] bg-zinc-50">
                  <div className="px-3 py-3">Эксперимент</div>
                  <div className="px-2 py-3"><HeaderMultiFilter name="calendarAuthor" label="Автор" options={authorOptions} /></div>
                  <div className="px-2 py-3">Раскатка</div>
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
                  data-experiment-id={e.id}
                  data-highlighted={isFocused || undefined}
                  className={`flex border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 ${isFocused ? "bg-amber-50/60" : ""}`}
                >
                  <div className={`sticky left-0 z-10 grid w-[24rem] shrink-0 grid-cols-[minmax(10rem,1fr)_4.5rem_minmax(7rem,1fr)] ${isFocused ? "bg-amber-50" : "bg-white"}`}>
                    {/* PROD-019: previously the colored bar itself linked to
                        /experiments/[id] — now that each week is its own
                        stage-editing button, the name here is the only
                        click-through to the experiment's own card. */}
                    <div className="min-w-0 px-3 py-3"><Link
                      href={`/experiments/${e.id}`}
                      title={e.name}
                      className="block truncate text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {e.name}
                    </Link><Link
                      href={`/backlog/${e.hypothesisId}`}
                      title={`Гипотеза: ${e.hypothesisName}`}
                      className="mt-0.5 block truncate text-xs text-zinc-400 hover:underline"
                    >
                      {e.hypothesisName}
                    </Link></div>
                    <div className="min-w-0 px-1 py-2"><AuthorCell experimentId={e.id} value={details?.author ?? null} options={authorNames} /></div>
                    <div className="min-w-0 px-1 py-2"><RolloutCell experimentId={e.id} value={details?.rollout ?? null} /></div>
                  </div>
                  <ExperimentWeekRow
                    key={`${e.id}-${toDateParam(windowStart)}`}
                    experimentId={e.id}
                    experimentName={e.name}
                    overdue={overdue}
                    overdueWeekStartISO={overdueWeekStart ? toDateParam(overdueWeekStart) : null}
                    highlighted={isFocused}
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
                <div className="flex items-center border-b border-zinc-100 px-4 py-3 text-sm text-zinc-400">
                  Нет экспериментов в этом окне
                </div>
              )}

              {Array.from({ length: Math.max(MIN_ROWS - Math.max(visibleRows.length, 1), 0) }).map((_, i) => (
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
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {undated.map((e) => (
                  <UndatedRow
                    key={e.id}
                    experimentId={e.id}
                    name={e.name}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      ))}
    </div>
  );
}
