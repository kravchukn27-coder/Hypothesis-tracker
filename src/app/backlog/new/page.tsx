import Link from "next/link";
import { createHypothesis, getFunnelLevels } from "../actions";
import { HypothesisForm } from "../HypothesisForm";

export default async function NewHypothesisPage() {
  const funnelLevels = await getFunnelLevels();

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/backlog" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Backlog
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Новая гипотеза</h1>
      </div>

      <HypothesisForm
        action={createHypothesis}
        funnelLevels={funnelLevels}
        submitLabel="Создать"
      />
    </div>
  );
}
