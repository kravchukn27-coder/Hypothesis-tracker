import Link from "next/link";
import { Clock } from "lucide-react";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  STAGE_BORDER_CLASSES,
  STAGE_ORDER,
  formatDateRange,
  formatWeekRange,
  getCurrentWeekStage,
} from "@/lib/experiment";
import { Avatar } from "@/components/Avatar";
import { archiveExperiments, deleteExperiments } from "../experiments/actions";
import { BulkActionBar } from "@/components/BulkActionBar";
import { RowCheckbox, SelectAllCheckbox, SelectionProvider, SelectModeToggle } from "@/components/BulkSelection";
import { FilterBar } from "@/components/FilterBar";
import { SortableHeader, SortIcon, type SortDir } from "@/components/SortableHeader";
import {
  CALENDAR_SURFACE_WIDTH,
  CHECKBOX_COL,
  DATE_COL,
  META_COL,
  NAME_COL,
  STATUS_COL,
  TABLE_CONTENT_WIDTH,
} from "@/components/tableWidths";
import { StageCell } from "../experiments/StageCell";
import { toDateParam } from "@/lib/calendar";
import type { ExperimentStage } from "@/generated/prisma/enums";

// UI-033: Calendar's wider surface leaves the shared LONG_TEXT_COL width
// (also used by Backlog/Experiments) too narrow to fill the extra room —
// a local, calendar-only override so the space goes to real content
// instead of blank trailing space.
const SEGMENT_COL = "w-96";

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
    hypothesisId?: string;
    q?: string;
    view?: string;
    sortBy?: string;
    dir?: string;
  };
}) {
  const { stage, segment, author, hypothesisId, q, view, sortBy = "startDate", dir } = searchParams;
  const stages = Array.isArray(stage) ? stage : stage ? [stage] : [];
  const segmentsFilter = Array.isArray(segment) ? segment : segment ? [segment] : [];
  const authors = Array.isArray(author) ? author : author ? [author] : [];
  const currentDir: SortDir =
    dir === "asc" ? "asc" : dir === "desc" ? "desc" : sortBy === "createdAt" ? "desc" : "asc";

  const allExperiments = await prisma.experiment.findMany({
    where: {
      archived: false,
      ...(segmentsFilter.length ? { segments: { some: { id: { in: segmentsFilter } } } } : {}),
      ...(authors.length ? { author: { in: authors } } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: {
      hypothesis: true,
      segments: true,
      weekStages: { select: { weekStart: true, stage: true }, orderBy: { weekStart: "asc" } },
    },
  });

  const now = new Date();
  function currentStageOf(e: (typeof allExperiments)[number]): ExperimentStage {
    return e.weekStages.length > 0 ? getCurrentWeekStage(e.weekStages, now) : e.stage;
  }

  const experiments = allExperiments.filter((experiment) => {
    const currentStage = currentStageOf(experiment);
    if (stages.length && !stages.includes(currentStage)) return false;
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
      cmp = STAGE_ORDER.indexOf(currentStageOf(a)) - STAGE_ORDER.indexOf(currentStageOf(b));
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
    if (hypothesisId) params.set("hypothesisId", hypothesisId);
    if (q) params.set("q", q);
    if (view) params.set("view", view);
    params.set("sortBy", field);
    params.set("dir", nextDir);
    return `/calendar?${params.toString()}`;
  }

  const isFiltered = Boolean(stages.length || segmentsFilter.length || authors.length || q || view);

  return (
    <div className="flex flex-col gap-6">
      <div>
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
          <SelectModeToggle />
        </div>

        <BulkActionBar
          itemLabelOne="эксперимент"
          itemLabelMany="экспериментов"
          onArchive={archiveExperiments}
          onDelete={deleteExperiments}
        />

        {experiments.length === 0 ? (
          <div className={`flex ${CALENDAR_SURFACE_WIDTH} h-[164px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 text-center`}>
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
          <div className={`${CALENDAR_SURFACE_WIDTH} overflow-x-hidden rounded-xl border border-zinc-200`}>
            <table className={`${TABLE_CONTENT_WIDTH} table-fixed text-left text-sm max-[640px]:[&_th]:!w-auto max-[640px]:[&_td]:!w-auto max-[640px]:[&_th]:px-2 max-[640px]:[&_td]:px-2`}>
              <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className={`${CHECKBOX_COL} px-4 py-3`}>
                    <SelectAllCheckbox />
                  </th>
                  <th className={`${NAME_COL} px-4 py-3`}>
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
                  <th className={`${STATUS_COL} px-4 py-3`}>
                    <SortableHeader
                      label="Status"
                      active={sortBy === "stage"}
                      dir={currentDir}
                      defaultDir="asc"
                      href={(d) => sortHref("stage", d)}
                    />
                  </th>
                  <th className={`${META_COL} px-4 py-3`}>
                    <SortableHeader
                      label="Автор"
                      active={sortBy === "author"}
                      dir={currentDir}
                      defaultDir="asc"
                      href={(d) => sortHref("author", d)}
                    />
                  </th>
                  <th className={`${SEGMENT_COL} px-4 py-3`}>
                    <SortableHeader
                      label="Segment"
                      active={sortBy === "segment"}
                      dir={currentDir}
                      defaultDir="asc"
                      href={(d) => sortHref("segment", d)}
                    />
                  </th>
                  <th className={`${DATE_COL} px-4 py-3`}>
                    <SortableHeader
                      label="Даты"
                      active={sortBy === "startDate"}
                      dir={currentDir}
                      defaultDir="asc"
                      href={(d) => sortHref("startDate", d)}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {experiments.map((e) => {
                  const isHighlighted = e.hypothesisId === hypothesisId;
                  const currentStage = currentStageOf(e);
                  const calendarStart = e.weekStages[0]?.weekStart ?? e.startDate;
                  const calendarHref = calendarStart
                    ? `/calendar?experimentId=${e.id}&start=${toDateParam(calendarStart)}`
                    : null;
                  return (
                    <tr
                      key={e.id}
                      data-highlighted={isHighlighted || undefined}
                      className={`border-l-4 transition-colors hover:bg-zinc-50 ${STAGE_BORDER_CLASSES[currentStage]} ${isHighlighted ? "bg-amber-50" : ""}`}
                    >
                      <td className={`${CHECKBOX_COL} px-4 py-3`}>
                        <RowCheckbox id={e.id} />
                      </td>
                      <td className={`${NAME_COL} min-w-0 px-4 py-3`}>
                        <Link
                          href={`/experiments/${e.id}`}
                          title={e.name}
                          className="block truncate font-medium text-zinc-900 hover:underline"
                        >
                          {e.name}
                        </Link>
                        <Link
                          href={`/backlog/${e.hypothesisId}`}
                          title={e.hypothesis.name}
                          className="mt-0.5 block truncate text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
                        >
                          {e.hypothesis.name}
                        </Link>
                      </td>
                      <td className={`${STATUS_COL} px-4 py-3`}>
                        <StageCell
                          experimentId={e.id}
                          experimentName={e.name}
                          stage={currentStage}
                          archived={e.archived}
                        />
                      </td>
                      <td className={`${META_COL} min-w-0 px-4 py-3 text-zinc-600`}>
                        {e.author ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <Avatar name={e.author} />
                            <span className="truncate" title={e.author}>{e.author}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${SEGMENT_COL} px-4 py-3 text-zinc-500`}>
                        <span className="block truncate" title={segmentLabel(e) || undefined}>
                          {segmentLabel(e) || "—"}
                        </span>
                      </td>
                      <td
                        className={`${DATE_COL} px-4 py-3 text-zinc-500`}
                        title={formatDateRange(e.startDate, e.endDate)}
                      >
                        {calendarHref ? (
                          <Link href={calendarHref} className="font-medium text-zinc-700 hover:underline">
                            {formatWeekRange(e.startDate, e.endDate)}
                          </Link>
                        ) : (
                          formatWeekRange(e.startDate, e.endDate)
                        )}
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
