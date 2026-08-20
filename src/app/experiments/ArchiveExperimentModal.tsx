"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveExperiment } from "./actions";
import { MotionDialog } from "@/components/MotionDialog";

export function ArchiveExperimentModal({
  experimentId,
  experimentName,
  onDismiss,
}: {
  experimentId: string;
  experimentName: string;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleArchive(dismiss: (force?: boolean) => void) {
    startTransition(async () => {
      await archiveExperiment(experimentId);
      router.refresh();
      dismiss(true);
    });
  }

  return (
    <MotionDialog onDismiss={onDismiss} pending={pending} labelledBy="archive-experiment-title" describedBy="archive-experiment-description">
      {({ dismiss }) => (
        <>
        <h2 id="archive-experiment-title" className="text-lg font-semibold text-zinc-900">Хотите архивировать этот эксперимент?</h2>
        <p id="archive-experiment-description" className="mt-2 text-sm text-zinc-600">
          «{experimentName}» теперь в статусе «Done». Архивированные эксперименты скрываются из
          основного списка.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => dismiss()}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Нет
          </button>
          <button
            onClick={() => handleArchive(dismiss)}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Архивируем..." : "Да, архивировать"}
          </button>
        </div>
        </>
      )}
    </MotionDialog>
  );
}
