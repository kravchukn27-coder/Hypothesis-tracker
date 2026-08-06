import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  STAGE_BADGE_CLASSES,
  STAGE_LABELS,
  STAGE_ORDER,
  formatDateRange,
} from "@/lib/experiment";
import { deleteExperiment } from "./actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { FilterBar } from "@/components/FilterBar";
import type { ExperimentStage } from "@/generated/prisma/enums";

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; segment?: string }>;
}) {
  const { stage, segment } = await searchParams;

  const [experiments, segmentRows] = await Promise.all([
    prisma.experiment.findMany({
      where: {
        ...(stage ? { stage: stage as ExperimentStage } : {}),
        ...(segment ? { segment } : {}),
      },
      include: { hypothesis: true },
      orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    }),
    prisma.experiment.findMany({
      where: { segment: { not: null } },
      select: { segment: true },
      distinct: ["segment"],
      orderBy: { segment: "asc" },
    }),
  ]);

  const segmentOptions = segmentRows
    .map((r) => r.segment)
    .filter((s): s is string => Boolean(s))
    .map((s) => ({ value: s, label: s }));

  const isFiltered = Boolean(stage || segment);

  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Experiments</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {experiments.length} {experiments.length === 1 ? "эксперимент" : "экспериментов"}
          {isFiltered ? " (с фильтром)" : ""}
        </p>
      </div>

      {segmentOptions.length > 0 && (
        <Suspense fallback={null}>
          <FilterBar
            fields={[
              {
                name: "stage",
                label: "Status",
                options: STAGE_ORDER.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
              },
              { name: "segment", label: "Segment", options: segmentOptions },
            ]}
          />
        </Suspense>
      )}

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
                <th className="px-4 py-3">Эксперимент</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Автор</th>
                <th className="px-4 py-3">Таргетинг / Segment</th>
                <th className="px-4 py-3">Даты</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {experiments.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-zinc-50">
                  <td className="max-w-xs px-4 py-3">
                    <Link
                      href={`/backlog/${e.hypothesisId}`}
                      title={`Гипотеза: ${e.hypothesis.name}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {e.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{e.hypothesis.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STAGE_BADGE_CLASSES[e.stage]}`}
                    >
                      {STAGE_LABELS[e.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{e.author || "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-500">
                    {[e.targeting, e.segment].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {formatDateRange(e.startDate, e.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/experiments/${e.id}`}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
                      >
                        Изменить
                      </Link>
                      <ConfirmDeleteButton
                        onConfirm={deleteExperiment.bind(null, e.id)}
                        confirmTitle="Удалить эксперимент?"
                        confirmMessage={`«${e.name}» будет удалён без возможности восстановления.`}
                      />
                    </div>
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
