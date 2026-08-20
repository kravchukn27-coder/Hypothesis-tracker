import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createExperiment } from "../actions";
import { getAuthorsAction, getProductsAction, getSegmentsAction } from "../actions/crud";
import { ExperimentForm } from "../ExperimentForm";
import { requireUserPage } from "@/lib/auth/page-guards";
import { getFunnelLevels } from "@/lib/funnelLevel";

export default async function NewExperimentPage({
  searchParams,
}: {
  searchParams: Promise<{ hypothesisId?: string }>;
}) {
  await requireUserPage();
  const { hypothesisId } = await searchParams;
  if (!hypothesisId) redirect("/backlog");

  const [hypothesis, existingExperiment, authors, funnelLevels, products, segments] = await Promise.all([
    prisma.hypothesis.findUnique({
      where: { id: hypothesisId },
      select: { id: true, name: true, funnelLevel: { select: { name: true } } },
    }),
    // PROD-034: a hypothesis has at most one experiment — send anyone
    // who reaches this page for a hypothesis that already has one
    // straight to its card instead of letting a second get created.
    prisma.experiment.findFirst({ where: { hypothesisId }, select: { id: true } }),
    getAuthorsAction(),
    getFunnelLevels(),
    getProductsAction(),
    getSegmentsAction(),
  ]);
  if (!hypothesis) redirect("/backlog");
  if (existingExperiment) redirect(`/experiments/${existingExperiment.id}`);

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href={`/backlog/${hypothesisId}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {hypothesis.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Новый эксперимент</h1>
      </div>

      <ExperimentForm
        action={createExperiment}
        hypothesis={hypothesis}
        authors={authors}
        funnelLevels={funnelLevels}
        products={products}
        segments={segments}
        submitLabel="Создать"
      />
    </div>
  );
}
