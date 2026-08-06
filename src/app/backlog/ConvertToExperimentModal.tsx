"use client";

import Link from "next/link";
import { STATUS_LABELS } from "@/lib/hypothesis";
import type { HypothesisStatus } from "@/generated/prisma/enums";

export function ConvertToExperimentModal({
  hypothesisId,
  hypothesisName,
  status,
  onDismiss,
}: {
  hypothesisId: string;
  hypothesisName: string;
  status: HypothesisStatus;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900">Перевести в эксперимент?</h2>
        <p className="mt-2 text-sm text-zinc-600">
          «{hypothesisName}» теперь в статусе «{STATUS_LABELS[status]}». Создать эксперимент по
          этой гипотезе?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onDismiss}
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
  );
}
