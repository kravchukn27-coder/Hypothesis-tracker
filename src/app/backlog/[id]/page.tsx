import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  archiveHypothesis,
  deleteHypothesis,
  getFunnelLevels,
  unarchiveHypothesis,
  updateHypothesis,
} from "../actions";
import { HypothesisForm } from "../HypothesisForm";
import { ExperimentPromptGate } from "../ExperimentPromptGate";
import { ArchivePromptGate } from "../ArchivePromptGate";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SavedToastGate } from "@/components/toast/SavedToastGate";

export default async function HypothesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [hypothesis, funnelLevels] = await Promise.all([
    prisma.hypothesis.findUnique({
      where: { id },
      include: { funnelLevel: true, _count: { select: { experiments: true } } },
    }),
    getFunnelLevels(),
  ]);

  if (!hypothesis) notFound();

  const action = updateHypothesis.bind(null, hypothesis.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense fallback={null}>
        <SavedToastGate />
      </Suspense>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb listLabel="Backlog" listHref="/backlog" current={hypothesis.name} />
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{hypothesis.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
            Создана{" "}
            {hypothesis.createdAt.toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
            {hypothesis.archived && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                В архиве
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {hypothesis._count.experiments > 0 ? (
            <Link
              href={`/experiments?hypothesisId=${hypothesis.id}`}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Показать эксперимент
            </Link>
          ) : (
            <Link
              href={`/experiments/new?hypothesisId=${hypothesis.id}`}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Создать эксперимент
            </Link>
          )}
          {hypothesis.archived ? (
            <ConfirmDeleteButton
              onConfirm={unarchiveHypothesis.bind(null, hypothesis.id)}
              confirmTitle="Разархивировать гипотезу?"
              confirmMessage={`«${hypothesis.name}» снова появится в основном списке.`}
              triggerLabel="Разархивировать"
              pendingLabel="Разархивируем..."
              confirmButtonClassName="bg-zinc-900 hover:bg-zinc-700"
              triggerClassName="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            />
          ) : (
            <ConfirmDeleteButton
              onConfirm={archiveHypothesis.bind(null, hypothesis.id)}
              confirmTitle="Архивировать гипотезу?"
              confirmMessage={`«${hypothesis.name}» будет скрыта из основного списка. Это можно отменить.`}
              triggerLabel="Архивировать"
              pendingLabel="Архивируем..."
              confirmButtonClassName="bg-zinc-900 hover:bg-zinc-700"
              triggerClassName="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            />
          )}
          <ConfirmDeleteButton
            onConfirm={deleteHypothesis.bind(null, hypothesis.id)}
            confirmTitle="Удалить гипотезу?"
            confirmMessage={`«${hypothesis.name}» будет удалена без возможности восстановления.`}
            triggerLabel="Удалить"
            triggerClassName="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <ExperimentPromptGate
          hypothesisId={hypothesis.id}
          hypothesisName={hypothesis.name}
          status={hypothesis.status}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ArchivePromptGate hypothesisId={hypothesis.id} hypothesisName={hypothesis.name} />
      </Suspense>

      <HypothesisForm
        action={action}
        funnelLevels={funnelLevels}
        submitLabel="Сохранить"
        initial={{
          name: hypothesis.name,
          text: hypothesis.text,
          funnelLevelName: hypothesis.funnelLevel?.name ?? "",
          conversion: hypothesis.conversion,
          impact: hypothesis.impact,
          effort: hypothesis.effort,
          reach: hypothesis.reach,
          confidence: hypothesis.confidence,
          status: hypothesis.status,
          result: hypothesis.result ?? "",
          comment: hypothesis.comment ?? "",
          modeling: hypothesis.modeling ?? "",
          sampleSize: hypothesis.sampleSize ?? "",
          taskUrl: hypothesis.taskUrl ?? "",
        }}
      />
    </div>
  );
}
