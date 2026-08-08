import Link from "next/link";
import { Clock } from "lucide-react";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { STAGE_BORDER_CLASSES, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { Avatar } from "@/components/Avatar";
import { FilterBar } from "@/components/FilterBar";
import { ScrollToHighlighted } from "@/components/ScrollToHighlighted";
import { SortableHeader, SortIcon, type SortDir } from "@/components/SortableHeader";
import { DATE_COL, LONG_TEXT_COL, META_COL, NAME_COL, STATUS_COL } from "@/components/tableWidths";
import { DateCell } from "./DateCell";
import { StageCell } from "./StageCell";
import { SavedToastGate } from "@/components/toast/SavedToastGate";
import type { ExperimentStage } from "@/generated/prisma/enums";

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string;
    segment?: string;
    author?: string;
    hypothesisId?: string;
    sortBy?: string;
    dir?: string;
  }>;
}) {
  const { stage, segment, author, hypothesisId, sortBy = "startDate", dir } = await searchParams;
  const currentDir: SortDir =
    dir === "asc" ? "asc" : dir === "desc" ? "desc" : sortBy === "createdAt" ? "desc" : "asc";

  const [experiments, segments, authorRows] = await Promise.all([
    prisma.experiment.findMany({
      where: {
        ...(stage ? { stage: stage as ExperimentStage } : {}),
        ...(segment ? { segments: { some: { id: segment } } } : {}),
        ...(author ? { author } : {}),
      },
      include: { hypothesis: true, segments: true, _count: { select: { weekStages: true } } },
    }),
    prisma.segment.findMany({ orderBy: { name: "asc" } }),
    prisma.experiment.findMany({
      where: { author: { not: null } },
      select: { author: true },
      distinct: ["author"],
      orderBy: { author: "asc" },
    }),
  ]);

  const segmentOptions = segments.map((s) => ({ value: s.id, label: s.name }));

  const authorOptions = authorRows
    .map((r) => r.author)
    .filter((a): a is string => Boolean(a))
    .map((a) => ({ value: a, label: a }));

  experiments.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name, "ru");
    else if (sortBy === "stage") cmp = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
    else if (sortBy === "author") cmp = (a.author ?? "").localeCompare(b.author ?? "", "ru");
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
    if (stage) params.set("stage", stage);
    if (segment) params.set("segment", segment);
    if (author) params.set("author", author);
    if (hypothesisId) params.set("hypothesisId", hypothesisId);
    params.set("sortBy", field);
    params.set("dir", nextDir);
    return `/experiments?${params.toString()}`;
  }

  const isFiltered = Boolean(stage || segment || author);

  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense fallback={null}>
        <SavedToastGate />
      </Suspense>
      {hypothesisId && <ScrollToHighlighted />}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Experiments</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {experiments.length} {experiments.length === 1 ? "эксперимент" : "экспериментов"}
          {isFiltered ? " (с фильтром)" : ""}
        </p>
      </div>

      <Suspense fallback={null}>
        <FilterBar
          fields={[
            {
              name: "stage",
              label: "Status",
              options: STAGE_ORDER.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
            },
            ...(segmentOptions.length > 0
              ? [{ name: "segment", label: "Segment", options: segmentOptions }]
              : []),
            ...(authorOptions.length > 0
              ? [{ name: "author", label: "Автор", options: authorOptions }]
              : []),
          ]}
        />
      </Suspense>

      {experiments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 py-24 text-center">
          <p className="text-sm text-zinc-500">
            {isFiltered
              ? "Нет экспериментов под текущий фильтр."
              : "Пока нет ни одного эксперимента. Эксперимент создаётся из карточки гипотезы в Backlog."}
          </p>
          <Link
            href="/backlog"
            className="text-sm font-medium text-zinc-900 underline underline-offset-4"
          >
            Перейти в Backlog
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
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
                <th className={`${LONG_TEXT_COL} px-4 py-3`}>Segment</th>
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
                return (
                <tr
                  key={e.id}
                  data-highlighted={isHighlighted || undefined}
                  className={`border-l-4 transition-colors hover:bg-zinc-50 ${STAGE_BORDER_CLASSES[e.stage]} ${isHighlighted ? "bg-amber-50" : ""}`}
                >
                  <td className={`${NAME_COL} px-4 py-3`}>
                    <Link
                      href={`/experiments/${e.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {e.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{e.hypothesis.name}</p>
                  </td>
                  <td className={`${STATUS_COL} px-4 py-3`}>
                    <StageCell experimentId={e.id} stage={e.stage} locked={e._count.weekStages > 0} />
                  </td>
                  <td className={`${META_COL} px-4 py-3 text-zinc-600`}>
                    {e.author ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={e.author} />
                        {e.author}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${LONG_TEXT_COL} truncate px-4 py-3 text-zinc-500`}>
                    {e.segments.map((s) => s.name).join(", ") || "—"}
                  </td>
                  <td className={`${DATE_COL} px-4 py-3`}>
                    <DateCell
                      experimentId={e.id}
                      startDate={e.startDate}
                      endDate={e.endDate}
                      locked={e._count.weekStages > 0}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
