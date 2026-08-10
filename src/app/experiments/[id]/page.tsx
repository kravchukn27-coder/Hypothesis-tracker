import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  archiveExperiment,
  deleteExperiment,
  getAuthors,
  getChannels,
  getFunnelLevels,
  getMarkets,
  getPlatforms,
  getProducts,
  getSegments,
  unarchiveExperiment,
  updateExperiment,
} from "../actions";
import { ExperimentForm } from "../ExperimentForm";
import { ArchivePromptGate } from "../ArchivePromptGate";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SavedToastGate } from "@/components/toast/SavedToastGate";
import { toDateParam } from "@/lib/calendar";
import { getCurrentWeekStage } from "@/lib/experiment";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [experiment, authors, funnelLevels, platforms, channels, markets, products, segments] = await Promise.all([
    prisma.experiment.findUnique({
      where: { id },
      include: {
        hypothesis: true,
        funnelLevels: true,
        platforms: true,
        channels: true,
        markets: true,
        products: true,
        segments: true,
        weekStages: { orderBy: { weekStart: "asc" } },
      },
    }),
    getAuthors(),
    getFunnelLevels(),
    getPlatforms(),
    getChannels(),
    getMarkets(),
    getProducts(),
    getSegments(),
  ]);

  if (!experiment) notFound();

  const action = updateExperiment.bind(null, experiment.id);
  const currentStage = experiment.weekStages.length > 0 ? getCurrentWeekStage(experiment.weekStages) : experiment.stage;
  const isHiddenFromCalendar = currentStage === "DONE" && experiment.calendarHiddenOnDone === true;
  const firstWeek = experiment.weekStages[0];
  const calendarHref = firstWeek
    ? `/calendar?experimentId=${experiment.id}&start=${toDateParam(firstWeek.weekStart)}`
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense fallback={null}>
        <SavedToastGate />
      </Suspense>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb listLabel="Experiments" listHref="/experiments" current={experiment.name} />
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{experiment.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
            Создан{" "}
            {experiment.createdAt.toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
            {experiment.archived && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                В архиве
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {calendarHref && !isHiddenFromCalendar && (
            <Link
              href={calendarHref}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <CalendarDays className="size-4" aria-hidden />
              Показать на календаре
            </Link>
          )}
          {experiment.archived ? (
            <ConfirmDeleteButton
              onConfirm={unarchiveExperiment.bind(null, experiment.id)}
              confirmTitle="Разархивировать эксперимент?"
              confirmMessage={`«${experiment.name}» снова появится в основном списке.`}
              triggerLabel="Разархивировать"
              pendingLabel="Разархивируем..."
              confirmButtonClassName="bg-zinc-900 hover:bg-zinc-700"
              triggerClassName="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            />
          ) : (
            <ConfirmDeleteButton
              onConfirm={archiveExperiment.bind(null, experiment.id)}
              confirmTitle="Архивировать эксперимент?"
              confirmMessage={`«${experiment.name}» будет скрыт из основного списка. Это можно отменить.`}
              triggerLabel="Архивировать"
              pendingLabel="Архивируем..."
              confirmButtonClassName="bg-zinc-900 hover:bg-zinc-700"
              triggerClassName="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            />
          )}
          <ConfirmDeleteButton
            onConfirm={deleteExperiment.bind(null, experiment.id)}
            confirmTitle="Удалить эксперимент?"
            confirmMessage={`«${experiment.name}» будет удалён без возможности восстановления.`}
            triggerLabel="Удалить"
            triggerClassName="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <ArchivePromptGate experimentId={experiment.id} experimentName={experiment.name} />
      </Suspense>

      <ExperimentForm
        action={action}
        experimentId={experiment.id}
        hypothesis={{ id: experiment.hypothesisId, name: experiment.hypothesis.name }}
        authors={authors}
        funnelLevels={funnelLevels}
        platforms={platforms}
        channels={channels}
        markets={markets}
        products={products}
        segments={segments}
        submitLabel="Сохранить"
        initial={{
          name: experiment.name,
          author: experiment.author ?? "",
          stage: experiment.stage,
          startDate: toDateInputValue(experiment.startDate),
          endDate: toDateInputValue(experiment.endDate),
          funnelLevels: experiment.funnelLevels,
          platforms: experiment.platforms,
          channels: experiment.channels,
          markets: experiment.markets,
          products: experiment.products,
          segments: experiment.segments,
          weekStages: experiment.weekStages.map((w) => ({
            weekStartISO: toDateParam(w.weekStart),
            stage: w.stage,
          })),
        }}
      />
    </div>
  );
}
