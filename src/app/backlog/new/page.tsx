import Link from "next/link";
import { createHypothesis, getFunnelLevels } from "../actions";
import { HypothesisForm } from "../HypothesisForm";
import { requireUserPage } from "@/lib/auth/page-guards";

export default async function NewHypothesisPage() {
  await requireUserPage();
  const funnelLevels = await getFunnelLevels();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
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
