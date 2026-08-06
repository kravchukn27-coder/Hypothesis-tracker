import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildTimeline, formatWeekLabel } from "@/lib/calendar";
import {
  EXPERIMENT_STATUS_BADGE_CLASSES,
  EXPERIMENT_STATUS_LABELS,
  NO_STAGE_BAR_CLASS,
  STAGE_BAR_CLASSES,
  STAGE_LABELS,
  formatDateRange,
} from "@/lib/experiment";

export default async function CalendarPage() {
  const experiments = await prisma.experiment.findMany({
    include: { hypothesis: true },
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  const { weeks, rows, undated, todayColumn } = buildTimeline(
    experiments.map((e) => ({
      id: e.id,
      name: e.name,
      hypothesisId: e.hypothesisId,
      hypothesisName: e.hypothesis.name,
      startDate: e.startDate,
      endDate: e.endDate,
      stage: e.stage,
      status: e.status,
    })),
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {experiments.length === 0
            ? "Пока нет экспериментов"
            : `${rows.length} на таймлайне${undated.length ? `, ${undated.length} без дат` : ""}`}
        </p>
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
        <>
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
            {Object.entries(STAGE_LABELS).map(([stage, label]) => (
              <span key={stage} className="flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${STAGE_BAR_CLASSES[stage as keyof typeof STAGE_BAR_CLASSES]}`}
                />
                {label}
              </span>
            ))}
          </div>

          {weeks.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <div className="w-fit min-w-full">
                <div className="flex border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <div className="sticky left-0 z-10 w-56 shrink-0 bg-zinc-50 px-4 py-3">
                    Эксперимент
                  </div>
                  <div
                    className="grid flex-1"
                    style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(72px, 1fr))` }}
                  >
                    {weeks.map((w, i) => (
                      <div
                        key={i}
                        className={`border-l border-zinc-100 px-2 py-3 text-center ${
                          i + 1 === todayColumn ? "bg-blue-50/60 text-blue-700" : ""
                        }`}
                      >
                        {formatWeekLabel(w)}
                      </div>
                    ))}
                  </div>
                </div>

                {rows.map(({ experiment: e, colStart, colEnd }) => (
                  <div key={e.id} className="flex border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50">
                    <div className="sticky left-0 z-10 w-56 shrink-0 bg-white px-4 py-3">
                      <Link
                        href={`/backlog/${e.hypothesisId}`}
                        title={`Гипотеза: ${e.hypothesisName}`}
                        className="block truncate text-sm font-medium text-zinc-900 hover:underline"
                      >
                        {e.name}
                      </Link>
                      <span
                        className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${EXPERIMENT_STATUS_BADGE_CLASSES[e.status as keyof typeof EXPERIMENT_STATUS_BADGE_CLASSES]}`}
                      >
                        {EXPERIMENT_STATUS_LABELS[e.status as keyof typeof EXPERIMENT_STATUS_LABELS]}
                      </span>
                    </div>
                    <div
                      className="relative grid flex-1"
                      style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(72px, 1fr))` }}
                    >
                      {weeks.map((_, i) => (
                        <div
                          key={i}
                          className={`border-l border-zinc-100 ${i + 1 === todayColumn ? "bg-blue-50/40" : ""}`}
                          style={{ gridColumn: i + 1, gridRow: 1 }}
                        />
                      ))}
                      <Link
                        href={`/experiments/${e.id}`}
                        title={`${STAGE_LABELS[e.stage as keyof typeof STAGE_LABELS] ?? "Stage не задан"} · ${formatDateRange(e.startDate, e.endDate)}`}
                        style={{ gridColumn: `${colStart} / ${colEnd}`, gridRow: 1 }}
                        className={`my-2 flex items-center truncate rounded-md px-2 text-xs font-medium text-white transition-opacity hover:opacity-90 ${
                          e.stage ? STAGE_BAR_CLASSES[e.stage as keyof typeof STAGE_BAR_CLASSES] : NO_STAGE_BAR_CLASS
                        }`}
                      >
                        {e.stage ? STAGE_LABELS[e.stage as keyof typeof STAGE_LABELS] : e.name}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {undated.length > 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Без дат
              </p>
              <ul className="flex flex-col gap-1.5">
                {undated.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/experiments/${e.id}`}
                      className="text-sm text-zinc-700 hover:underline"
                    >
                      {e.name}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-400">{e.hypothesisName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
