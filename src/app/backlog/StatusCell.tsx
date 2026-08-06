"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateHypothesisStatus } from "./actions";
import { STATUS_BADGE_CLASSES, STATUS_LABELS, STATUS_ORDER } from "@/lib/hypothesis";
import type { HypothesisStatus } from "@/generated/prisma/enums";

export function StatusCell({
  hypothesisId,
  hypothesisName,
  status,
  hasExperiments,
}: {
  hypothesisId: string;
  hypothesisName: string;
  status: HypothesisStatus;
  hasExperiments: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [showPrompt, setShowPrompt] = useState(false);

  function handleChange(next: HypothesisStatus) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      await updateHypothesisStatus(hypothesisId, next);
      router.refresh();
      if (!hasExperiments && next !== previous && next !== "NEW") {
        setShowPrompt(true);
      }
    });
  }

  return (
    <>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as HypothesisStatus)}
        onClick={(e) => e.stopPropagation()}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset outline-none disabled:opacity-60 ${STATUS_BADGE_CLASSES[current]}`}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {showPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-zinc-900">Перевести в эксперимент?</h2>
            <p className="mt-2 text-sm text-zinc-600">
              «{hypothesisName}» теперь в статусе «{STATUS_LABELS[current]}». Создать эксперимент
              по этой гипотезе?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowPrompt(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Не сейчас
              </button>
              <Link
                href={`/experiments/new?hypothesisId=${hypothesisId}`}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Создать эксперимент
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
