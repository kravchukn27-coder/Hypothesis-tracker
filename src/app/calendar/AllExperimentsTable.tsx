import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  currentStageOf,
  formatWeekRange,
  stageBorderClass,
  stageRank,
  STAGE_LABELS,
} from "@/lib/experiment";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { archiveExperiments, deleteExperiments } from "../experiments/actions";
import { BulkActionBar } from "@/components/BulkActionBar";
import { RowCheckbox, SelectAllCheckbox, SelectionProvider, SelectModeToggle } from "@/components/BulkSelection";
import { FilterBar } from "@/components/FilterBar";
import { HeaderMultiFilter } from "@/components/HeaderMultiFilter";
import { SortableHeader, SortIcon, type SortDir } from "@/components/SortableHeader";
import {
  ACTION_COL,
  CHECKBOX_COL,
  STATUS_COL,
  TABLE_CONTENT_WIDTH,
  TABLE_SURFACE_WIDTH,
} from "@/components/tableWidths";
import { FUNNEL_LEVEL_BADGE_COLOR } from "@/lib/tags";
import { StageCell } from "../experiments/StageCell";
import { RolloutCell } from "./RolloutCell";
import { toDateParam } from "@/lib/calendar";

// UI-041: this table's 9 columns don't all fit at their shared-constant
// widths within the surface that existed before Backlog was widened, so
// several stay local overrides rather than the shared NAME_COL/
// META_COL/LONG_TEXT_COL/DATE_COL — same "local override" pattern this
// file already used for Segment before the redesign. NAME_COL and
// META_COL are trimmed slightly (both still use `truncate`, so a
// narrower column just truncates a bit sooner — safe); DATE_COL is
// narrower because this table's Dates cell renders a short duration
// ("34 нед."), not the wider date-range text the shared constant was
// sized for. This file is the sole consumer of all of them, so none of
// this can affect Backlog or any other screen.
//
// Rollout in particular needed real width, not just enough to avoid
// truncating instantly: at 48px the unbreakable header word "РАСКАТКА"
// bled into the Даты header next to it (headers here have no
// `truncate` treatment, unlike body cells, so a too-narrow column
// doesn't ellide — it overflows into its neighbor). `break-words`
// stops the bleed at any width, but a legible content column still
// needs real room, reclaimed from Name/Author's slack below.
const NAME_COL = "w-48";
// Icon-only now (Автор shows just the initials Avatar, no name text,
// per user request for a more compact look) — sized for the "АВТОР"
// header text plus its cell padding (the avatar itself needs far
// less), not for name text anymore. Going narrower risks the same
// header overflow-bleed class of bug already hit on Раскатка.
const META_COL = "w-20";
// Local override of the shared FUNNEL_LEVEL_COL (160px, matches
// Backlog exactly there) — narrowed here at the user's request to free
// width for Раскатка. Safe to go tight: the header already carries
// `break-words` (wraps "FUNNEL"/"LEVEL" onto two lines instead of
// bleeding), and the Badge itself truncates long values.
const FUNNEL_LEVEL_COL = "w-24";
const SEGMENT_COL = "w-20";
const ROLLOUT_COL = "w-48";
const DATE_COL = "w-24";

// PROD-031: this is the former /experiments list, moved in as Calendar's
// "show all experiments" mode — same table, filters, sort, and bulk
// actions, just embedded instead of living at its own top-level route.
export async function AllExperimentsTable({
  searchParams,
}: {
  searchParams: {
    stage?: string | string[];
    segment?: string | string[];
    author?: string | string[];
    funnelLevel?: string | string[];
    hypothesisId?: string;
    q?: string;
    view?: string;
    sortBy?: string;
    dir?: string;
  };
}) {
  const { stage, segment, author, funnelLevel, hypothesisId, q, view, sortBy = "startDate", dir } = searchParams;
  const stages = Array.isArray(stage) ? stage : stage ? [stage] : [];
  const segmentsFilter = Array.isArray(segment) ? segment : segment ? [segment] : [];
  const authors = Array.isArray(author) ? author : author ? [author] : [];
  const funnelLevelsFilter = Array.isArray(funnelLevel) ? funnelLevel : funnelLevel ? [funnelLevel] : [];
  const currentDir: SortDir =
    dir === "asc" ? "asc" : dir === "desc" ? "desc" : sortBy === "createdAt" ? "desc" : "asc";

  const [allExperiments, usedFunnelLevels, usedSegments, usedAuthors] = await Promise.all([
    prisma.experiment.findMany({
      where: {
        archived: false,
        ...(segmentsFilter.length ? { segments: { some: { id: { in: segmentsFilter } } } } : {}),
        ...(authors.length ? { author: { in: authors } } : {}),
        ...(funnelLevelsFilter.length ? { hypothesis: { funnelLevelId: { in: funnelLevelsFilter } } } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: {
        hypothesis: { include: { funnelLevel: true } },
        segments: true,
        weekStages: { select: { weekStart: true, stage: true }, orderBy: { weekStart: "asc" } },
      },
    }),
    prisma.funnelLevel.findMany({
      where: { hypotheses: { some: { archived: false, experiments: { some: { archived: false } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.segment.findMany({
      where: { experiments: { some: { archived: false } } },
      orderBy: { name: "asc" },
    }),
    prisma.experiment.findMany({
      where: { archived: false, author: { not: null } },
      select: { author: true },
      distinct: ["author"],
      orderBy: { author: "asc" },
    }),
  ]);

  const stageOptions = Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label }));
  const authorOptions = usedAuthors.flatMap((item) => item.author ? [{ value: item.author, label: item.author }] : []);
  const funnelLevelOptions = usedFunnelLevels.map((item) => ({ value: item.id, label: item.name }));
  const segmentOptions = usedSegments.map((item) => ({ value: item.id, label: item.name }));

  const now = new Date();

  const experiments = allExperiments.filter((experiment) => {
    const currentStage = currentStageOf(experiment, now);
    // A null (unset) stage doesn't match any specific stage filter.
    if (stages.length && (!currentStage || !stages.includes(currentStage))) return false;
    if (view === "active" && currentStage === "DONE") return false;
    if (view === "completed" && currentStage !== "DONE") return false;
    return true;
  });

  function segmentLabel(e: (typeof experiments)[number]): string {
    return e.segments
      .map((segment) => segment.name)
      .sort((a, b) => a.localeCompare(b, "ru"))
      .join(", ");
  }

  experiments.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name, "ru");
    else if (sortBy === "stage")
      cmp = stageRank(currentStageOf(a, now)) - stageRank(currentStageOf(b, now));
    else if (sortBy === "author") cmp = (a.author ?? "").localeCompare(b.author ?? "", "ru");
    else if (sortBy === "segment") cmp = segmentLabel(a).localeCompare(segmentLabel(b), "ru");
    else if (sortBy === "createdAt") cmp = a.createdAt.getTime() - b.createdAt.getTime();
    else {
      const at = a.startDate ? a.startDate.getTime() : Infinity;
      const bt = b.startDate ? b.startDate.getTime() : Infinity;
      cmp = at - bt;
    }
    return currentDir === "asc" ? cmp : -cmp;
  });

  function sortHref(field: string, nextDir: SortDir) {
    const params = new URLSearchParams();
    params.set("calendarView", "all");
    stages.forEach((value) => params.append("stage", value));
    segmentsFilter.forEach((value) => params.append("segment", value));
    authors.forEach((value) => params.append("author", value));
    funnelLevelsFilter.forEach((value) => params.append("funnelLevel", value));
    if (hypothesisId) params.set("hypothesisId", hypothesisId);
    if (q) params.set("q", q);
    if (view) params.set("view", view);
    params.set("sortBy", field);
    params.set("dir", nextDir);
    return `/calendar?${params.toString()}`;
  }

  function resetColumnFiltersHref() {
    const params = new URLSearchParams();
    params.set("calendarView", "all");
    if (hypothesisId) params.set("hypothesisId", hypothesisId);
    if (q) params.set("q", q);
    if (view) params.set("view", view);
    params.set("sortBy", sortBy);
    params.set("dir", currentDir);
    return `/calendar?${params.toString()}`;
  }

  const isFiltered = Boolean(stages.length || segmentsFilter.length || authors.length || funnelLevelsFilter.length || q || view);
  const hasColumnFilters = Boolean(stages.length || segmentsFilter.length || authors.length || funnelLevelsFilter.length);

  return (
    // UI-041: this table now caps at TABLE_SURFACE_WIDTH (1160px, the
    // same width as Backlog) instead of the outer Calendar page's own wider
    // max-w-[1600px] chrome — that outer cap is shared with the
    // Timeline view and stays wide on purpose, so the count/search/bulk
    // rows get their own matching cap here rather than inheriting the
    // page's, keeping every row's left/right edges aligned with the
    // table below it.
    <div className={`${TABLE_SURFACE_WIDTH} flex flex-col gap-4`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {experiments.length} {experiments.length === 1 ? "эксперимент" : "экспериментов"}
          {isFiltered ? " (с фильтром)" : ""}
        </p>
      </div>

      <SelectionProvider ids={experiments.map((e) => e.id)}>
        <div className="flex items-center justify-between gap-3">
          <Suspense fallback={null}>
            <FilterBar
              search={{ name: "q", placeholder: "Поиск по названию", ariaLabel: "Поиск экспериментов" }}
              quickFilters={{
                name: "view",
                options: [
                  { value: "active", label: "Активные" },
                  { value: "completed", label: "Завершённые" },
                ],
              }}
              fields={[]}
            />
          </Suspense>
          <div className="flex items-center gap-3">
            <Link
              href={resetColumnFiltersHref()}
              aria-disabled={!hasColumnFilters}
              className={`rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium ${
                hasColumnFilters ? "text-zinc-700 hover:bg-zinc-50" : "pointer-events-none text-zinc-300"
              }`}
            >
              Сбросить фильтр
            </Link>
            <SelectModeToggle />
          </div>
        </div>

        <BulkActionBar
          itemLabelOne="эксперимент"
          itemLabelMany="экспериментов"
          onArchive={archiveExperiments}
          onDelete={deleteExperiments}
        />

        {experiments.length === 0 ? (
          <div className={`flex ${TABLE_SURFACE_WIDTH} h-[164px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 text-center`}>
            <p className="text-sm text-zinc-500">
              {q
                ? "По этому запросу ничего не найдено. Попробуйте изменить или сбросить поиск."
                : isFiltered
                ? "Нет экспериментов под текущий фильтр."
                : "Пока нет ни одного эксперимента. Эксперимент создаётся из карточки гипотезы в Backlog."}
            </p>
            <Link href="/backlog" className="text-sm font-medium text-zinc-900 underline underline-offset-4">
              Перейти в Backlog
            </Link>
          </div>
        ) : (
          <div className={`${TABLE_SURFACE_WIDTH} overflow-x-clip rounded-xl border border-zinc-200`}>
            <table className={`${TABLE_CONTENT_WIDTH} table-fixed text-left text-sm max-[640px]:[&_th]:!w-auto max-[640px]:[&_td]:!w-auto max-[640px]:[&_th]:px-2 max-[640px]:[&_td]:px-2`}>
              <thead className="sticky top-0 z-20 bg-zinc-50 text-xs font-medium text-zinc-500">
                <tr>
                  <th className={`${CHECKBOX_COL} px-4 py-2`}>
                    <SelectAllCheckbox />
                  </th>
                  <th className={`${NAME_COL} px-4 py-2`}>
                    <div className="flex items-center gap-2">
                      <SortableHeader
                        label="Эксперимент"
                        active={sortBy === "name"}
                        dir={currentDir}
                        defaultDir="asc"
                        href={(d) => sortHref("name", d)}
                      />
                      <SortIcon
                        icon={Clock}
                        label="Created"
                        active={sortBy === "createdAt"}
                        dir={currentDir}
                        defaultDir="desc"
                        href={(d) => sortHref("createdAt", d)}
                      />
                    </div>
                  </th>
                  <th className={`${STATUS_COL} px-4 py-2 text-center`}>
                    <div className="flex justify-center gap-1">
                      <SortableHeader
                        label="Status"
                        active={sortBy === "stage"}
                        dir={currentDir}
                        defaultDir="asc"
                        href={(d) => sortHref("stage", d)}
                      />
                      <HeaderMultiFilter name="stage" label="" options={stageOptions} />
                    </div>
                  </th>
                  <th className={`${META_COL} px-4 py-2 text-center`}>
                    <div className="flex justify-center gap-1">
                      <SortableHeader
                        label="Автор"
                        active={sortBy === "author"}
                        dir={currentDir}
                        defaultDir="asc"
                        href={(d) => sortHref("author", d)}
                      />
                      <HeaderMultiFilter name="author" label="" options={authorOptions} />
                    </div>
                  </th>
                  <th className={`${FUNNEL_LEVEL_COL} break-words px-4 py-2 text-center`}>
                    <HeaderMultiFilter
                      name="funnelLevel"
                      label="Funnel Level"
                      options={funnelLevelOptions}
                      iconPosition="end"
                    />
                  </th>
                  <th className={`${SEGMENT_COL} px-4 py-2 text-center`}>
                    <div className="flex justify-center gap-1">
                      <SortableHeader
                        label="Segment"
                        active={sortBy === "segment"}
                        dir={currentDir}
                        defaultDir="asc"
                        href={(d) => sortHref("segment", d)}
                      />
                      <HeaderMultiFilter name="segment" label="" options={segmentOptions} />
                    </div>
                  </th>
                  <th className={`${ROLLOUT_COL} break-words px-4 py-2`}>Раскатка</th>
                  <th className={`${DATE_COL} px-4 py-2`}>
                    <SortableHeader
                      label="Даты"
                      active={sortBy === "startDate"}
                      dir={currentDir}
                      defaultDir="asc"
                      href={(d) => sortHref("startDate", d)}
                    />
                  </th>
                  <th className={`${ACTION_COL} px-4 py-2 text-center`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {experiments.map((e) => {
                  const isHighlighted = e.hypothesisId === hypothesisId;
                  const currentStage = currentStageOf(e, now);
                  const calendarStart = e.weekStages[0]?.weekStart ?? e.startDate;
                  return (
                    <tr
                      key={e.id}
                      data-highlighted={isHighlighted || undefined}
                      className={`border-l-4 transition-colors hover:bg-zinc-50 ${stageBorderClass(currentStage)} ${isHighlighted ? "bg-amber-50" : ""}`}
                    >
                      <td className={`${CHECKBOX_COL} px-4 py-2`}>
                        <RowCheckbox id={e.id} />
                      </td>
                      <td className={`${NAME_COL} min-w-0 px-4 py-2`}>
                        <Link
                          href={`/experiments/${e.id}`}
                          title={e.name}
                          className="line-clamp-2 font-medium text-zinc-900 hover:underline"
                        >
                          {e.name}
                        </Link>
                      </td>
                      <td className={`${STATUS_COL} px-4 py-2 text-center`}>
                        <div className="flex justify-center">
                          <StageCell
                            experimentId={e.id}
                            experimentName={e.name}
                            stage={currentStage}
                            archived={e.archived}
                          />
                        </div>
                      </td>
                      <td className={`${META_COL} min-w-0 px-4 py-2 text-center text-zinc-600`}>
                        {e.author ? (
                          <span className="flex min-w-0 items-center justify-center" title={e.author}>
                            <Avatar name={e.author} />
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${FUNNEL_LEVEL_COL} min-w-0 px-4 py-2 text-center`}>
                        {e.hypothesis.funnelLevel ? (
                          <span className="block max-w-full" title={e.hypothesis.funnelLevel.name}>
                            <Badge color={FUNNEL_LEVEL_BADGE_COLOR} className="max-w-full truncate">
                              {e.hypothesis.funnelLevel.name}
                            </Badge>
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className={`${SEGMENT_COL} px-4 py-2 text-center text-zinc-500`}>
                        <span className="block truncate" title={segmentLabel(e) || undefined}>
                          {segmentLabel(e) || "—"}
                        </span>
                      </td>
                      <td className={`${ROLLOUT_COL} min-w-0 px-1 py-2`}>
                        <RolloutCell experimentId={e.id} value={e.rollout} />
                      </td>
                      <td className={`${DATE_COL} px-4 py-2 text-zinc-500`}>
                        {formatWeekRange(e.startDate, e.endDate)}
                      </td>
                      <td className={`${ACTION_COL} px-4 py-2`}>
                        <Link
                          href={`/calendar?experimentId=${e.id}${calendarStart ? `&start=${toDateParam(calendarStart)}` : ""}`}
                          aria-label="Показать на календаре"
                          title="Показать на календаре"
                          className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SelectionProvider>
    </div>
  );
}
