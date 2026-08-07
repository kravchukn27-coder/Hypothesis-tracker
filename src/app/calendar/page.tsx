import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { addDays, buildTimeline, formatDayLabel, startOfDay, WINDOW_DAYS } from "@/lib/calendar";
import { STAGE_BAR_CLASSES, STAGE_LABELS, formatDateRange } from "@/lib/experiment";
import { ExperimentBar } from "./ExperimentBar";

function parseWindowStart(start: string | undefined): Date {
  if (start) {
    const parsed = new Date(`${start}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed);
  }
  return startOfDay(new Date());
}

function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  const windowStart = parseWindowStart(start);

  const experiments = await prisma.experiment.findMany({
    include: { hypothesis: true },
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  const { days, rows, undated, todayColumn } = buildTimeline(
    experiments.map((e) => ({
      id: e.id,
      name: e.name,
      hypothesisId: e.hypothesisId,
      hypothesisName: e.hypothesis.name,
      startDate: e.startDate,
      endDate: e.endDate,
      stage: e.stage,
    })),
    windowStart,
  );

  const prevHref = `/calendar?start=${toDateParam(addDays(windowStart, -1))}`;
  const nextHref = `/calendar?start=${toDateParam(addDays(windowStart, 1))}`;
  const isToday = windowStart.getTime() === startOfDay(new Date()).getTime();

  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {experiments.length === 0
              ? "Пока нет экспериментов"
              : `${rows.length} на таймлайне${undated.length ? `, ${undated.length} без дат` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            aria-disabled={isToday}
            className={`rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium ${
              isToday ? "pointer-events-none text-zinc-300" : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Сегодня
          </Link>
          <Link
            href={prevHref}
            aria-label="Назад на день"
            className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={nextHref}
            aria-label="Вперёд на день"
            className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
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
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-red-500" />
              Просрочен
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <div className="w-fit min-w-full">
              <div className="flex border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <div className="sticky left-0 z-10 w-56 shrink-0 bg-zinc-50 px-4 py-3">
                  Эксперимент
                </div>
                <div
                  className="grid flex-1"
                  style={{ gridTemplateColumns: `repeat(${WINDOW_DAYS}, minmax(112px, 1fr))` }}
                >
                  {days.map((d, i) => (
                    <div
                      key={i}
                      className={`border-l border-zinc-100 px-2 py-3 text-center ${
                        i + 1 === todayColumn ? "bg-blue-50/60 text-blue-700" : ""
                      }`}
                    >
                      {formatDayLabel(d)}
                    </div>
                  ))}
                </div>
              </div>

              {rows.map(({ experiment: e, colStart, colEnd, overdue }) => (
                <div key={e.id} className="flex border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50">
                  <div className="sticky left-0 z-10 w-56 shrink-0 bg-white px-4 py-3">
                    <Link
                      href={`/backlog/${e.hypothesisId}`}
                      title={`Гипотеза: ${e.hypothesisName}`}
                      className="block truncate text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {e.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{e.hypothesisName}</p>
                  </div>
                  <div
                    className="relative grid flex-1"
                    style={{ gridTemplateColumns: `repeat(${WINDOW_DAYS}, minmax(112px, 1fr))` }}
                  >
                    {days.map((_, i) => (
                      <div
                        key={i}
                        className={`border-l border-zinc-100 ${i + 1 === todayColumn ? "bg-blue-50/40" : ""}`}
                        style={{ gridColumn: i + 1, gridRow: 1 }}
                      />
                    ))}
                    <ExperimentBar
                      experimentId={e.id}
                      href={`/experiments/${e.id}`}
                      label={STAGE_LABELS[e.stage as keyof typeof STAGE_LABELS]}
                      title={`${STAGE_LABELS[e.stage as keyof typeof STAGE_LABELS]} · ${formatDateRange(e.startDate, e.endDate)}${overdue ? " · Просрочен" : ""}`}
                      barClass={STAGE_BAR_CLASSES[e.stage as keyof typeof STAGE_BAR_CLASSES]}
                      overdue={overdue}
                      colStart={colStart}
                      colEnd={colEnd}
                      days={WINDOW_DAYS}
                      windowStart={toDateParam(windowStart)}
                    />
                  </div>
                </div>
              ))}

              {rows.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-zinc-400">
                  Нет экспериментов в этом окне
                </div>
              )}
            </div>
          </div>

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
