import Link from "next/link";
import { createExperiment, getHypothesesForPicker } from "../actions";
import { ExperimentForm } from "../ExperimentForm";

export default async function NewExperimentPage() {
  const hypotheses = await getHypothesesForPicker();

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
        hypotheses={hypotheses}
        submitLabel="Создать"
      />
    </div>
  );
}
