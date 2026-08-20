import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  archiveExperiment,
  deleteExperiment,
  getAuthors,
  getProducts,
  getSegments,
  unarchiveExperiment,
  updateExperiment,
} from "../actions";
import { ExperimentForm } from "../ExperimentForm";
import { ArchivePromptGate } from "../ArchivePromptGate";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Badge } from "@/components/Badge";
import { SavedToastGate } from "@/components/toast/SavedToastGate";
import { toDateParam } from "@/lib/calendar";
import { STAGE_BADGE_CLASSES, currentStageOf, stageLabel } from "@/lib/experiment";
import { getFunnelLevels } from "@/lib/funnelLevel";
import { FUNNEL_LEVEL_BADGE_COLOR } from "@/lib/tags";
import { HideFromCalendarButton } from "../HideFromCalendarButton";
import { requireUserPage } from "@/lib/auth/page-guards";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage();
  const { id } = await params;
  const [experiment, authors, funnelLevels, products, segments] = await Promise.all([
    prisma.experiment.findUnique({
      where: { id },
      include: {
        hypothesis: { include: { funnelLevel: { select: { name: true } } } },
        products: true,
        segments: true,
        weekStages: { orderBy: { weekStart: "asc" } },
      },
    }),
    getAuthors(),
    getFunnelLevels(),
    getProducts(),
    getSegments(),
  ]);

  if (!experiment) notFound();

  const action = updateExperiment.bind(null, experiment.id);
  const currentStage = currentStageOf(experiment);
  const isHiddenFromCalendar = currentStage === "DONE" && experiment.calendarHiddenOnDone === true;
  const calendarStart = experiment.weekStages[0]?.weekStart ?? experiment.startDate;
  const calendarHref = calendarStart
    ? `/calendar?experimentId=${experiment.id}&start=${toDateParam(calendarStart)}`
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense fallback={null}>
        <SavedToastGate />
      </Suspense>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb listLabel="Calendar" listHref="/calendar" current={experiment.name} />
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Link
            href={`/backlog/${experiment.hypothesisId}`}
            title={experiment.hypothesis.name}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Гипотеза
          </Link>
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

      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={currentStage ? STAGE_BADGE_CLASSES[currentStage] : undefined}>
            {stageLabel(currentStage)}
          </Badge>
          {experiment.hypothesis.funnelLevel && (
            <Badge color={FUNNEL_LEVEL_BADGE_COLOR}>{experiment.hypothesis.funnelLevel.name}</Badge>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
          <p>Гипотеза: {experiment.hypothesis.name}</p>
          <div className="flex items-center gap-2">
            {currentStage === "DONE" && !isHiddenFromCalendar && (
              <HideFromCalendarButton experimentId={experiment.id} experimentName={experiment.name} />
            )}
            {calendarHref && !isHiddenFromCalendar && (
              <Link
                href={calendarHref}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Показать на календаре
              </Link>
            )}
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <ArchivePromptGate experimentId={experiment.id} experimentName={experiment.name} />
      </Suspense>

      <ExperimentForm
        action={action}
        experimentId={experiment.id}
        archived={experiment.archived}
        hypothesis={{
          id: experiment.hypothesisId,
          name: experiment.hypothesis.name,
          funnelLevel: experiment.hypothesis.funnelLevel,
        }}
        authors={authors}
        funnelLevels={funnelLevels}
        products={products}
        segments={segments}
        submitLabel="Сохранить"
        initial={{
          name: experiment.name,
          author: experiment.author ?? "",
          rollout: experiment.rollout ?? "",
          stage: experiment.stage,
          startDate: toDateInputValue(experiment.startDate),
          endDate: toDateInputValue(experiment.endDate),
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
