import Link from "next/link";
import { Clock } from "lucide-react";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { computeScore, STATUS_BORDER_CLASSES, STATUS_LABELS, STATUS_ORDER } from "@/lib/hypothesis";
import { currentStageOf, stageLabel } from "@/lib/experiment";
import { toDateParam } from "@/lib/calendar";
import { FUNNEL_LEVEL_BADGE_COLOR } from "@/lib/tags";
import { StatusCell } from "./StatusCell";
import { archiveHypotheses, deleteHypotheses } from "./actions";
import { Badge } from "@/components/Badge";
import { BulkActionBar } from "@/components/BulkActionBar";
import { RowCheckbox, SelectAllCheckbox, SelectionProvider } from "@/components/BulkSelection";
import { FilterBar } from "@/components/FilterBar";
import { HeaderMultiFilter } from "@/components/HeaderMultiFilter";
import { TakeInWorkButton } from "./TakeInWorkButton";
import { SortableHeader, SortIcon, type SortDir } from "@/components/SortableHeader";
import {
  CHECKBOX_COL,
  COMMENT_COL,
  FUNNEL_LEVEL_COL,
  NAME_COL,
  STATUS_COL,
  TABLE_CONTENT_WIDTH,
  TABLE_SURFACE_WIDTH,
} from "@/components/tableWidths";
import { SavedToastGate } from "@/components/toast/SavedToastGate";
import type { HypothesisStatus } from "@/generated/prisma/enums";

// Local override, not the shared META_COL — that constant also sizes
// Experiments' Author column (avatar + name), which needs real room.
// Score only ever renders a short number ("0.16"–"5.00"), so it gets
// its own, much narrower column here without touching META_COL's
// other usage.
const SCORE_COL = "w-20";

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    funnelLevel?: string | string[];
    status?: string | string[];
    q?: string;
    view?: string;
    archived?: string;
    hypothesisId?: string;
  }>;
}) {
  const { sort = "score", dir, funnelLevel, status, q, hypothesisId } = await searchParams;
  const funnelLevelsFilter = Array.isArray(funnelLevel) ? funnelLevel : funnelLevel ? [funnelLevel] : [];
  const statuses = Array.isArray(status) ? status : status ? [status] : [];
  const currentDir: SortDir =
    dir === "asc" ? "asc" : dir === "desc" ? "desc" : sort === "score" || sort === "createdAt" ? "desc" : "asc";

  const [hypotheses, funnelLevels] = await Promise.all([
    prisma.hypothesis.findMany({
      where: {
        archived: false,
        ...(funnelLevelsFilter.length ? { funnelLevelId: { in: funnelLevelsFilter } } : {}),
        ...(statuses.length ? { status: { in: statuses as HypothesisStatus[] } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { comments: { some: { message: { contains: q, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        funnelLevel: true,
        comments: { select: { message: true }, orderBy: { createdAt: "desc" }, take: 1 },
        experiments: {
          select: {
            id: true,
            name: true,
            stage: true,
            archived: true,
            startDate: true,
            weekStages: { select: { weekStart: true, stage: true }, orderBy: { weekStart: "asc" } },
          },
        },
      },
    }),
    prisma.funnelLevel.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = hypotheses.map((h) => ({ ...h, latestComment: h.comments[0]?.message ?? null, score: computeScore(h) }));
  rows.sort((a, b) => {
    let cmp = 0;
    if (sort === "status") cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    else if (sort === "name") cmp = a.name.localeCompare(b.name, "ru");
    else if (sort === "createdAt") cmp = a.createdAt.getTime() - b.createdAt.getTime();
    else cmp = a.score - b.score;
    return currentDir === "asc" ? cmp : -cmp;
  });

  function sortHref(field: string, nextDir: SortDir) {
    const params = new URLSearchParams();
    funnelLevelsFilter.forEach((value) => params.append("funnelLevel", value));
    statuses.forEach((value) => params.append("status", value));
    if (q) params.set("q", q);
    params.set("sort", field);
    params.set("dir", nextDir);
    return `/backlog?${params.toString()}`;
  }

  const isFiltered = Boolean(funnelLevelsFilter.length || statuses.length || q);
  const now = new Date();

  // Page container matches TABLE_SURFACE_WIDTH (1014px) so the header,
  // search box, and "+ Новая гипотеза" button share the table's exact
  // left/right edges instead of spanning a wider outer column the table
  // sits centered inside of.
  return (
    <div className="mx-auto flex w-full max-w-[1014px] flex-1 flex-col gap-4 px-6 py-8">
      <Suspense fallback={null}>
        <SavedToastGate />
      </Suspense>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Backlog</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows.length} {rows.length === 1 ? "гипотеза" : "гипотез"}
            {isFiltered ? " (с фильтром)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/backlog/new"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            + Новая гипотеза
          </Link>
        </div>
      </div>

      <SelectionProvider ids={rows.map((h) => h.id)}>
        <div>
          <Suspense fallback={null}>
            <FilterBar
              search={{ name: "q", placeholder: "Поиск по названию и комментарию", ariaLabel: "Поиск гипотез" }}
              fields={[]}
            />
          </Suspense>
        </div>

        <BulkActionBar
          itemLabelOne="гипотеза"
          itemLabelMany="гипотез"
          onArchive={archiveHypotheses}
          onDelete={deleteHypotheses}
        />

      {rows.length === 0 ? (
        <div className={`flex ${TABLE_SURFACE_WIDTH} h-[164px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 text-center`}>
          <p className="text-sm text-zinc-500">
            {q
              ? "По этому запросу ничего не найдено. Попробуйте изменить или сбросить поиск."
              : isFiltered
              ? "Нет гипотез под текущий фильтр."
              : "Пока нет ни одной гипотезы."}
          </p>
          {q || isFiltered ? (
            <Link
              href="/backlog"
              className="text-sm font-medium text-zinc-900 underline underline-offset-4"
            >
              Сбросить фильтр
            </Link>
          ) : (
            <Link
              href="/backlog/new"
              className="text-sm font-medium text-zinc-900 underline underline-offset-4"
            >
              Добавить первую
            </Link>
          )}
        </div>
      ) : (
        <div className={`${TABLE_SURFACE_WIDTH} overflow-x-hidden rounded-xl border border-zinc-200`}>
          <table className={`${TABLE_CONTENT_WIDTH} table-fixed text-left text-sm max-[640px]:[&_th]:!w-auto max-[640px]:[&_td]:!w-auto max-[640px]:[&_th]:px-2 max-[640px]:[&_td]:px-2`}>
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className={`${CHECKBOX_COL} px-4 py-2`}>
                  <SelectAllCheckbox />
                </th>
                <th className={`${NAME_COL} px-4 py-2`}>
                  <div className="flex items-center gap-2">
                    <SortableHeader
                      label="Name"
                      active={sort === "name"}
                      dir={currentDir}
                      defaultDir="asc"
                      href={(d) => sortHref("name", d)}
                    />
                    <SortIcon
                      icon={Clock}
                      label="Created"
                      active={sort === "createdAt"}
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
                      active={sort === "status"}
                      dir={currentDir}
                      defaultDir="asc"
                      href={(d) => sortHref("status", d)}
                    />
                    <HeaderMultiFilter name="status" label="" options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
                  </div>
                </th>
                <th className={`${FUNNEL_LEVEL_COL} px-4 py-2 text-center`}><HeaderMultiFilter name="funnelLevel" label="Funnel Level" options={funnelLevels.map((f) => ({ value: f.id, label: f.name }))} /></th>
                <th className={`${SCORE_COL} px-4 py-2 text-center`}>
                  <SortableHeader
                    label="Score"
                    active={sort === "score"}
                    dir={currentDir}
                    defaultDir="desc"
                    href={(d) => sortHref("score", d)}
                  />
                </th>
                {/* Left-aligned on purpose, unlike its siblings: Comment
                    previews a long excerpt with a right-edge fade mask
                    (see the body cell below) that assumes left-to-right
                    reading — centering would fight that truncation
                    pattern and read worse, not better. */}
                <th className={`${COMMENT_COL} px-4 py-2`}>Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((h) => {
                // PROD-034: a hypothesis has at most one experiment, so
                // this is 0 or 1 — no dedup/counter needed any more.
                const activeExperiment = h.experiments.find((experiment) => !experiment.archived);
                // BUG-012: always Calendar — a dated experiment (has
                // weeks, or legacy start/end dates) highlights on the
                // timeline (UI-030), an undated one highlights in the
                // "Без дат" panel instead (both are the same
                // `experimentId` highlight, Calendar itself decides
                // which side to light up). `start` jumps the timeline's
                // 8-week window to the experiment's own weeks so the
                // highlight is actually visible instead of landing on
                // whatever week happens to be "today".
                const calendarStart = activeExperiment?.weekStages[0]?.weekStart ?? activeExperiment?.startDate;
                const experimentHref = activeExperiment
                  ? `/calendar?experimentId=${activeExperiment.id}${calendarStart ? `&start=${toDateParam(calendarStart)}` : ""}`
                  : null;
                const experimentLabel = activeExperiment
                  ? stageLabel(currentStageOf(activeExperiment, now))
                  : h.experiments.length > 0
                    ? "Связанные эксперименты в архиве"
                    : null;

                const isHighlighted = h.id === hypothesisId;
                return (
                  <tr
                  key={h.id}
                  data-highlighted={isHighlighted || undefined}
                  className={`border-l-4 transition-colors hover:bg-zinc-50 ${STATUS_BORDER_CLASSES[h.status]} ${isHighlighted ? "bg-amber-50" : ""}`}
                >
                  <td className={`${CHECKBOX_COL} px-4 py-2`}>
                    <RowCheckbox id={h.id} />
                  </td>
                  <td className={`${NAME_COL} min-w-0 px-4 py-2`}>
                    <Link
                      href={`/backlog/${h.id}`}
                      title={h.name}
                      className="block truncate font-medium text-zinc-900 hover:underline"
                    >
                      {h.name}
                    </Link>
                    {experimentLabel && (
                      experimentHref ? (
                        <Link
                          href={experimentHref}
                          title={experimentLabel}
                          className="mt-1 block truncate text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
                        >
                          {experimentLabel}
                        </Link>
                      ) : (
                        <span
                          title={experimentLabel}
                          className="mt-1 block truncate text-xs text-zinc-500"
                        >
                          {experimentLabel}
                        </span>
                      )
                    )}
                  </td>
                  <td className={`${STATUS_COL} px-4 py-2 text-center`}>
                    <StatusCell
                      hypothesisId={h.id}
                      hypothesisName={h.name}
                      status={h.status}
                      archived={h.archived}
                    />
                    {h.status === "ACCEPTED" && <div className="mt-2"><TakeInWorkButton hypothesisId={h.id} /></div>}
                  </td>
                  <td className={`${FUNNEL_LEVEL_COL} min-w-0 px-4 py-2 text-center`}>
                    {h.funnelLevel ? (
                      <span className="block max-w-full" title={h.funnelLevel.name}>
                        <Badge color={FUNNEL_LEVEL_BADGE_COLOR} className="max-w-full truncate">
                          {h.funnelLevel.name}
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className={`${SCORE_COL} px-4 py-2 text-center font-medium tabular-nums text-zinc-900`}>
                    {h.score.toFixed(2)}
                  </td>
                  <td className={`${COMMENT_COL} px-4 py-2`}>
                    {h.latestComment ? (
                      <Link
                        href={`/backlog/${h.id}`}
                        title={h.latestComment}
                        className="block overflow-hidden whitespace-nowrap text-zinc-500 hover:text-zinc-900 hover:underline [mask-image:linear-gradient(to_right,black_85%,transparent_100%)]"
                      >
                        {h.latestComment}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">—</span>
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
