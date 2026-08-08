import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createExperiment,
  getAuthors,
  getChannels,
  getFunnelLevels,
  getMarkets,
  getPlatforms,
  getProducts,
  getSegments,
} from "../actions";
import { ExperimentForm } from "../ExperimentForm";

export default async function NewExperimentPage({
  searchParams,
}: {
  searchParams: Promise<{ hypothesisId?: string }>;
}) {
  const { hypothesisId } = await searchParams;
  if (!hypothesisId) redirect("/backlog");

  const [hypothesis, authors, funnelLevels, platforms, channels, markets, products, segments] = await Promise.all([
    prisma.hypothesis.findUnique({
      where: { id: hypothesisId },
      select: { id: true, name: true },
    }),
    getAuthors(),
    getFunnelLevels(),
    getPlatforms(),
    getChannels(),
    getMarkets(),
    getProducts(),
    getSegments(),
  ]);
  if (!hypothesis) redirect("/backlog");

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/experiments" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Experiments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Новый эксперимент</h1>
      </div>

      <ExperimentForm
        action={createExperiment}
        hypothesis={hypothesis}
        authors={authors}
        funnelLevels={funnelLevels}
        platforms={platforms}
        channels={channels}
        markets={markets}
        products={products}
        segments={segments}
        submitLabel="Создать"
      />
    </div>
  );
}
