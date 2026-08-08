import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  deleteExperiment,
  getAuthors,
  getChannels,
  getFunnelLevels,
  getMarkets,
  getPlatforms,
  getProducts,
  updateExperiment,
} from "../actions";
import { ExperimentForm } from "../ExperimentForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SavedToastGate } from "@/components/toast/SavedToastGate";

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
  const [experiment, authors, funnelLevels, platforms, channels, markets, products] = await Promise.all([
    prisma.experiment.findUnique({
      where: { id },
      include: {
        hypothesis: true,
        funnelLevels: true,
        platforms: true,
        channels: true,
        markets: true,
        products: true,
      },
    }),
    getAuthors(),
    getFunnelLevels(),
    getPlatforms(),
    getChannels(),
    getMarkets(),
    getProducts(),
  ]);

  if (!experiment) notFound();

  const action = updateExperiment.bind(null, experiment.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense fallback={null}>
        <SavedToastGate />
      </Suspense>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb listLabel="Experiments" listHref="/experiments" current={experiment.name} />
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{experiment.name}</h1>
        </div>
        <ConfirmDeleteButton
          onConfirm={deleteExperiment.bind(null, experiment.id)}
          confirmTitle="Удалить эксперимент?"
          confirmMessage={`«${experiment.name}» будет удалён без возможности восстановления.`}
          triggerLabel="Удалить"
          triggerClassName="shrink-0 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        />
      </div>

      <ExperimentForm
        action={action}
        hypothesis={{ id: experiment.hypothesisId, name: experiment.hypothesis.name }}
        authors={authors}
        funnelLevels={funnelLevels}
        platforms={platforms}
        channels={channels}
        markets={markets}
        products={products}
        submitLabel="Сохранить"
        initial={{
          name: experiment.name,
          author: experiment.author ?? "",
          segment: experiment.segment ?? "",
          stage: experiment.stage,
          startDate: toDateInputValue(experiment.startDate),
          endDate: toDateInputValue(experiment.endDate),
          funnelLevels: experiment.funnelLevels,
          platforms: experiment.platforms,
          channels: experiment.channels,
          markets: experiment.markets,
          products: experiment.products,
        }}
      />
    </div>
  );
}
