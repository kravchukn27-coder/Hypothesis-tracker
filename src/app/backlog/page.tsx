import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { computeScore, STATUS_LABELS, STATUS_ORDER } from "@/lib/hypothesis";
import { StatusCell } from "./StatusCell";
import { Badge } from "@/components/Badge";
import { FilterBar } from "@/components/FilterBar";
import { SortableHeader, type SortDir } from "@/components/SortableHeader";
import type { HypothesisStatus } from "@/generated/prisma/enums";

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    funnelLevel?: string;
    status?: string;
  }>;
}) {
  const { sort = "score", dir, funnelLevel, status } = await searchParams;
  const currentDir: SortDir = dir === "asc" ? "asc" : dir === "desc" ? "desc" : sort === "score" ? "desc" : "asc";

  const [hypotheses, funnelLevels] = await Promise.all([
    prisma.hypothesis.findMany({
      where: {
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
    else cmp = a.score - b.score;
    return currentDir === "asc" ? cmp : -cmp;
  });

  function sortHref(field: string, nextDir: SortDir) {
    const params = new URLSearchParams();
    if (funnelLevel) params.set("funnelLevel", funnelLevel);
    if (status) params.set("status", status);
    params.set("sort", field);
    params.set("dir", nextDir);
    return `/backlog?${params.toString()}`;
  }

  const isFiltered = Boolean(funnelLevel || status);

  return (
    <div className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Backlog</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows.length} {rows.length === 1 ? "гипотеза" : "гипотез"}
            {isFiltered ? " (с фильтром)" : ""}
          </p>
        </div>
        <Link
          href="/backlog/new"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          + Новая гипотеза
        </Link>
      </div>

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

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 py-24 text-center">
          <p className="text-sm text-zinc-500">
            {isFiltered ? "Нет гипотез под текущий фильтр." : "Пока нет ни одной гипотезы."}
          </p>
          <Link
            href="/backlog/new"
            className="text-sm font-medium text-zinc-900 underline underline-offset-4"
          >
            Добавить первую
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">
                  <SortableHeader
                    label="Name"
                    active={sort === "name"}
                    dir={currentDir}
                    defaultDir="asc"
                    href={(d) => sortHref("name", d)}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeader
                    label="Status"
                    active={sort === "status"}
                    dir={currentDir}
                    defaultDir="asc"
                    href={(d) => sortHref("status", d)}
                  />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortableHeader
                    label="Score"
                    active={sort === "score"}
                    dir={currentDir}
                    defaultDir="desc"
                    href={(d) => sortHref("score", d)}
                  />
                </th>
                <th className="px-4 py-3">Comment</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((h) => (
                <tr key={h.id} className="transition-colors hover:bg-zinc-50">
                  <td className="max-w-xs px-4 py-3">
                    <Link
                      href={`/backlog/${h.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {h.name}
                    </Link>
                    {h.funnelLevel && (
                      <div className="mt-1">
                        <Badge>{h.funnelLevel.name}</Badge>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusCell
                      hypothesisId={h.id}
                      hypothesisName={h.name}
                      status={h.status}
                      hasExperiments={h._count.experiments > 0}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-zinc-900">
                    {h.score.toFixed(2)}
                  </td>
                  <td className="max-w-sm truncate px-4 py-3 text-zinc-500">
                    {h.comment || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {h._count.experiments > 0 ? (
                      <Link
                        href={`/experiments?hypothesisId=${h.id}`}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
                      >
                        → Эксперимент
                      </Link>
                    ) : (
                      <Link
                        href={`/experiments/new?hypothesisId=${h.id}`}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
                      >
                        Создать эксперимент
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
