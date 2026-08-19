"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { hideExperimentFromCalendar } from "./actions";

/**
 * BUG-014 follow-up: `HideFromCalendarModal` only fires at the moment a
 * week's stage transitions to Done. An experiment that's already sitting
 * at Done (dismissed the prompt, or predates this feature) had no way to
 * hide it from the card afterward — this is the persistent counterpart,
 * mirroring "Показать на календаре"'s one-click style rather than a
 * confirm dialog, since toggling `calendarHiddenOnDone` is reversible.
 */
export function HideFromCalendarButton({
  experimentId,
  experimentName,
}: {
  experimentId: string;
  experimentName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={`Убрать «${experimentName}» с Calendar`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await hideExperimentFromCalendar(experimentId);
          router.refresh();
        })
      }
      className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
    >
      {pending ? "Убираем..." : "Убрать из календаря"}
    </button>
  );
}
