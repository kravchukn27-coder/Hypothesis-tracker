import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  EXPERIMENT_STATUS_BADGE_CLASSES,
  EXPERIMENT_STATUS_LABELS,
  STAGE_BADGE_CLASSES,
  STAGE_LABELS,
  formatDateRange,
} from "@/lib/experiment";

export default async function ExperimentsPage() {
  const experiments = await prisma.experiment.findMany({
    include: { hypothesis: true },
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Experiments</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {experiments.length} {experiments.length === 1 ? "эксперимент" : "экспериментов"}
          </p>
        </div>
        <Link
          href="/experiments/new"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          + Новый эксперимент
        </Link>
      </div>

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
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Эксперимент</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Stage</th>
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
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${EXPERIMENT_STATUS_BADGE_CLASSES[e.status]}`}
                    >
                      {EXPERIMENT_STATUS_LABELS[e.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.stage ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STAGE_BADGE_CLASSES[e.stage]}`}
                      >
                        {STAGE_LABELS[e.stage]}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{e.author || "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-500">
                    {[e.targeting, e.segment].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {formatDateRange(e.startDate, e.endDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/experiments/${e.id}`}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
                    >
                      Изменить
                    </Link>
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
