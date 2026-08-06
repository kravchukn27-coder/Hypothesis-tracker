import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createExperiment } from "../actions";
import { ExperimentForm } from "../ExperimentForm";

export default async function NewExperimentPage({
  searchParams,
}: {
  searchParams: Promise<{ hypothesisId?: string }>;
}) {
  const { hypothesisId } = await searchParams;
  if (!hypothesisId) redirect("/backlog");

  const hypothesis = await prisma.hypothesis.findUnique({
    where: { id: hypothesisId },
    select: { id: true, name: true },
  });
  if (!hypothesis) redirect("/backlog");

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/experiments" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Experiments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Новый эксперимент</h1>
      </div>

      <ExperimentForm action={createExperiment} hypothesis={hypothesis} submitLabel="Создать" />
    </div>
  );
}
