import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFunnelLevels, updateHypothesis } from "../actions";
import { HypothesisForm } from "../HypothesisForm";

export default async function HypothesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [hypothesis, funnelLevels] = await Promise.all([
    prisma.hypothesis.findUnique({
      where: { id },
      include: { funnelLevel: true },
    }),
    getFunnelLevels(),
  ]);

  if (!hypothesis) notFound();

  const action = updateHypothesis.bind(null, hypothesis.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/backlog" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Backlog
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{hypothesis.name}</h1>
        </div>
        <Link
          href={`/experiments/new?hypothesisId=${hypothesis.id}`}
          className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Создать эксперимент
        </Link>
      </div>

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
