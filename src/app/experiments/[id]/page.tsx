import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateExperiment } from "../actions";
import { ExperimentForm } from "../ExperimentForm";

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
  const experiment = await prisma.experiment.findUnique({
    where: { id },
    include: { hypothesis: true },
  });

  if (!experiment) notFound();

  const action = updateExperiment.bind(null, experiment.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/experiments" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Experiments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{experiment.name}</h1>
      </div>

      <ExperimentForm
        action={action}
        hypothesis={{ id: experiment.hypothesisId, name: experiment.hypothesis.name }}
        submitLabel="Сохранить"
        initial={{
          name: experiment.name,
          author: experiment.author ?? "",
          targeting: experiment.targeting ?? "",
          segment: experiment.segment ?? "",
          stage: experiment.stage,
          startDate: toDateInputValue(experiment.startDate),
          endDate: toDateInputValue(experiment.endDate),
        }}
      />
    </div>
  );
}
