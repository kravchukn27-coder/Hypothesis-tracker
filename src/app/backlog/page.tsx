import Link from "next/link";
import { ArrowRight, Clock, Plus } from "lucide-react";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { computeScore, STATUS_BORDER_CLASSES, STATUS_LABELS, STATUS_ORDER } from "@/lib/hypothesis";
import { FUNNEL_LEVEL_BADGE_COLOR } from "@/lib/tags";
import { StatusCell } from "./StatusCell";
import { archiveHypotheses, deleteHypotheses } from "./actions";
import { Badge } from "@/components/Badge";
import { BulkActionBar } from "@/components/BulkActionBar";
import { RowCheckbox, SelectAllCheckbox, SelectionProvider, SelectModeToggle } from "@/components/BulkSelection";
import { FilterBar } from "@/components/FilterBar";
import { SortableHeader, SortIcon, type SortDir } from "@/components/SortableHeader";
import {
  ACTION_COL,
  CHECKBOX_COL,
  LONG_TEXT_COL,
  META_COL,
  NAME_COL,
  STATUS_COL,
} from "@/components/tableWidths";
import { SavedToastGate } from "@/components/toast/SavedToastGate";
import type { HypothesisStatus } from "@/generated/prisma/enums";

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    funnelLevel?: string;
    status?: string;
    archived?: string;
  }>;
}) {
  const { sort = "score", dir, funnelLevel, status, archived } = await searchParams;
  const showArchived = archived === "1";
  const currentDir: SortDir =
    dir === "asc" ? "asc" : dir === "desc" ? "desc" : sort === "score" || sort === "createdAt" ? "desc" : "asc";

  const [hypotheses, funnelLevels] = await Promise.all([
    prisma.hypothesis.findMany({
      where: {
        archived: showArchived,
        ...(funnelLevel ? { funnelLevelId: funnelLevel } : {}),
        ...(status ? { status: status as HypothesisStatus } : {}),
      },
      include: { funnelLevel: true, _count: { select: { experiments: true } } },
    }),
    prisma.funnelLevel.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = hypotheses.map((h) => ({ ...h, score: computeScore(h) }));
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
    if (funnelLevel) params.set("funnelLevel", funnelLevel);
    if (status) params.set("status", status);
    if (showArchived) params.set("archived", "1");
    params.set("sort", field);
    params.set("dir", nextDir);
    return `/backlog?${params.toString()}`;
  }

  const isFiltered = Boolean(funnelLevel || status);

  return (
    <div className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense fallback={null}>
        <SavedToastGate />
      </Suspense>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Backlog</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows.length} {rows.length === 1 ? "гипотеза" : "гипотез"}
            {showArchived ? " в архиве" : ""}
            {isFiltered ? " (с фильтром)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={showArchived ? "/backlog" : "/backlog?archived=1"}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            {showArchived ? "Скрыть архив" : "Показать архив"}
          </Link>
          <Link
            href="/backlog/new"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            + Новая гипотеза
          </Link>
        </div>
      </div>

      <SelectionProvider ids={rows.map((h) => h.id)}>
        <div className="flex items-center justify-between gap-3">
          <Suspense fallback={null}>
            <FilterBar
              fields={[
                {
                  name: "funnelLevel",
                  label: "Funnel Level",
                  options: funnelLevels.map((f) => ({ value: f.id, label: f.name })),
                },
                {
                  name: "status",
                  label: "Status",
                  options: STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
                },
              ]}
            />
          </Suspense>
          <SelectModeToggle />
        </div>

        <BulkActionBar
          itemLabelOne="гипотеза"
          itemLabelMany="гипотез"
          onArchive={archiveHypotheses}
          onDelete={deleteHypotheses}
        />

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 py-24 text-center">
          <p className="text-sm text-zinc-500">
            {isFiltered
              ? "Нет гипотез под текущий фильтр."
              : showArchived
                ? "В архиве пока пусто."
                : "Пока нет ни одной гипотезы."}
          </p>
          {!showArchived && (
            <Link
              href="/backlog/new"
              className="text-sm font-medium text-zinc-900 underline underline-offset-4"
            >
              Добавить первую
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className={`${CHECKBOX_COL} px-4 py-3`}>
                  <SelectAllCheckbox />
                </th>
                <th className={`${NAME_COL} px-4 py-3`}>
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
                <th className={`${STATUS_COL} px-4 py-3`}>
                  <SortableHeader
                    label="Status"
                    active={sort === "status"}
                    dir={currentDir}
                    defaultDir="asc"
                    href={(d) => sortHref("status", d)}
                  />
                </th>
                <th className={`${META_COL} px-4 py-3 text-right`}>
                  <SortableHeader
                    label="Score"
                    active={sort === "score"}
                    dir={currentDir}
                    defaultDir="desc"
                    href={(d) => sortHref("score", d)}
                  />
                </th>
                <th className={`${LONG_TEXT_COL} px-4 py-3`}>Comment</th>
                <th className={`${ACTION_COL} px-4 py-3`} />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((h) => (
                <tr
                  key={h.id}
                  className={`border-l-4 transition-colors hover:bg-zinc-50 ${STATUS_BORDER_CLASSES[h.status]}`}
                >
                  <td className={`${CHECKBOX_COL} px-4 py-3`}>
                    <RowCheckbox id={h.id} />
                  </td>
                  <td className={`${NAME_COL} px-4 py-3`}>
                    <Link
                      href={`/backlog/${h.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {h.name}
                    </Link>
                    {h.funnelLevel && (
                      <div className="mt-1">
                        <Badge color={FUNNEL_LEVEL_BADGE_COLOR}>{h.funnelLevel.name}</Badge>
                      </div>
                    )}
                  </td>
                  <td className={`${STATUS_COL} px-4 py-3`}>
                    <StatusCell
                      hypothesisId={h.id}
                      hypothesisName={h.name}
                      status={h.status}
                      hasExperiments={h._count.experiments > 0}
                      archived={h.archived}
                    />
                  </td>
                  <td className={`${META_COL} px-4 py-3 text-right font-medium tabular-nums text-zinc-900`}>
                    {h.score.toFixed(2)}
                  </td>
                  <td className={`${LONG_TEXT_COL} px-4 py-3`}>
                    {h.comment ? (
                      <Link
                        href={`/backlog/${h.id}`}
                        className="block overflow-hidden whitespace-nowrap text-zinc-500 hover:text-zinc-900 hover:underline [mask-image:linear-gradient(to_right,black_85%,transparent_100%)]"
                      >
                        {h.comment}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className={`${ACTION_COL} px-4 py-3 text-right`}>
                    {h._count.experiments > 0 ? (
                      <Link
                        href={`/experiments?hypothesisId=${h.id}`}
                        aria-label="Перейти к эксперименту"
                        title="Перейти к эксперименту"
                        className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                      >
                        <ArrowRight className="size-[18px]" />
                      </Link>
                    ) : (
                      <Link
                        href={`/experiments/new?hypothesisId=${h.id}`}
                        aria-label="Создать эксперимент"
                        title="Создать эксперимент"
                        className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                      >
                        <Plus className="size-[18px]" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </SelectionProvider>
    </div>
  );
}
