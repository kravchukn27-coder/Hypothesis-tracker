"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { hideExperimentFromCalendar, showExperimentOnCalendarWhenDone } from "@/app/experiments/actions";

/**
 * PROD-023: shown when a week's stage newly makes an experiment's
 * derived stage Done — replaces PROD-018's unconditional auto-hide
 * with an explicit per-transition choice. Triggered from both the
 * Calendar's week-cells (`ExperimentWeekRow`) and the detail card's
 * per-week editor (`ExperimentWeekStagesEditor`).
 */
export function HideFromCalendarModal({
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

  function handleAnswer(hide: boolean) {
    startTransition(async () => {
      if (hide) await hideExperimentFromCalendar(experimentId);
      else await showExperimentOnCalendarWhenDone(experimentId);
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
        <h2 className="text-lg font-semibold text-zinc-900">Убрать задачу из календаря?</h2>
        <p className="mt-2 text-sm text-zinc-600">
          «{experimentName}» теперь в статусе «Done». Можно убрать её с Calendar, или оставить
          видимой со статусом Done.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => handleAnswer(false)}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Нет
          </button>
          <button
            onClick={() => handleAnswer(true)}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Убираем..." : "Да, убрать"}
          </button>
        </div>
      </div>
    </div>
  );
}
