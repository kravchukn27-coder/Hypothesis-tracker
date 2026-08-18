"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExperimentRollout } from "@/app/experiments/actions";

export function RolloutCell({ experimentId, value }: { experimentId: string; value: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(value ?? "");
  const [savedValue, setSavedValue] = useState(value ?? "");

  function save() {
    const nextValue = draft.trim();
    if (nextValue === savedValue) return;
    startTransition(async () => {
      await updateExperimentRollout(experimentId, nextValue);
      setSavedValue(nextValue);
      router.refresh();
    });
  }

  return <input
    value={draft}
    placeholder="Добавить…"
    disabled={pending}
    aria-label="Раскатка"
    onChange={(event) => setDraft(event.target.value)}
    onBlur={save}
    onKeyDown={(event) => { if (event.key === "Enter") { save(); event.currentTarget.blur(); } }}
    className="w-full min-w-0 rounded border border-transparent bg-transparent px-2 py-1 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 hover:border-zinc-200 focus:border-zinc-300 focus:bg-white disabled:opacity-50"
  />;
}
