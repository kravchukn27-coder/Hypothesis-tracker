"use client";

import { useTransition } from "react";
import { updateExperimentAuthor } from "@/app/experiments/actions";

export function AuthorCell({ experimentId, value, options }: { experimentId: string; value: string | null; options: string[] }) {
  const [pending, startTransition] = useTransition();
  return <select
    value={value ?? ""}
    disabled={pending}
    aria-label="Автор"
    onChange={(event) => startTransition(() => updateExperimentAuthor(experimentId, event.target.value))}
    className="w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-200 focus:border-zinc-300 focus:bg-white disabled:opacity-50"
  >
    <option value="">—</option>
    {options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select>;
}
