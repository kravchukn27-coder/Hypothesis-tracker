"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveHypothesis } from "./actions";

export function ArchiveHypothesisModal({
  hypothesisId,
  hypothesisName,
  onDismiss,
}: {
  hypothesisId: string;
  hypothesisName: string;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      await archiveHypothesis(hypothesisId);
      router.refresh();
      onDismiss();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !pending && onDismiss()}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900">Хотите архивировать эту гипотезу?</h2>
        <p className="mt-2 text-sm text-zinc-600">
          «{hypothesisName}» теперь в статусе «Done». Архивированные гипотезы скрываются из
          основного списка.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onDismiss}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Нет
          </button>
          <button
            onClick={handleArchive}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Архивируем..." : "Да, архивировать"}
          </button>
        </div>
      </div>
    </div>
  );
}
