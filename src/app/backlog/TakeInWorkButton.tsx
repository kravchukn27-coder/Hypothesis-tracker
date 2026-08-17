"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { takeHypothesisIntoWork } from "./actions";

export function TakeInWorkButton({ hypothesisId }: { hypothesisId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={() => startTransition(async () => router.push(await takeHypothesisIntoWork(hypothesisId)))} className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-60">{pending ? "Открываем…" : "Взять в работу"}</button>;
}
