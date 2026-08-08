"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { updateExperimentDates } from "./actions";

function toInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

const dateInputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-600 outline-none transition-colors focus:border-zinc-900 disabled:opacity-60";

export function DateCell({
  experimentId,
  startDate,
  endDate,
  locked,
}: {
  experimentId: string;
  startDate: Date | null;
  endDate: Date | null;
  /** PROD-019: true once the experiment has per-week stage entries — dates are then derived, edit on the card instead. */
  locked?: boolean;
}) {
  const router = useRouter();
  const [start, setStart] = useState(toInputValue(startDate));
  const [end, setEnd] = useState(toInputValue(endDate));
  const [pending, startTransition] = useTransition();
  // For a previously undated experiment, hold off saving until both
  // fields are filled — otherwise picking just a start date saves
  // immediately with the end still empty, and the Calendar defaults
  // the missing end to the start, moving it into the grid as a 1-day
  // bar before the user has had a chance to pick an end date.
  const awaitingFirstCompleteRange = useRef(!startDate && !endDate);

  function handleChange(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    if (awaitingFirstCompleteRange.current && (!nextStart || !nextEnd)) {
      return;
    }
    awaitingFirstCompleteRange.current = false;
    startTransition(async () => {
      await updateExperimentDates(experimentId, nextStart || null, nextEnd || null);
      router.refresh();
    });
  }

  function handleClear() {
    setStart("");
    setEnd("");
    // Cleared back to undated — re-arm the "wait for both fields"
    // guard so picking a new start date doesn't save a 1-day range
    // before an end date is chosen.
    awaitingFirstCompleteRange.current = true;
    startTransition(async () => {
      await updateExperimentDates(experimentId, null, null);
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      title={locked ? "Управляется по неделям — редактируй на карточке эксперимента" : undefined}
    >
      <input
        type="date"
        value={start}
        disabled={pending || locked}
        onChange={(e) => handleChange(e.target.value, end)}
        className={dateInputClass}
      />
      <span className="text-zinc-400">–</span>
      <input
        type="date"
        value={end}
        disabled={pending || locked}
        onChange={(e) => handleChange(start, e.target.value)}
        className={dateInputClass}
      />
      {(start || end) && !locked && (
        <button
          type="button"
          onClick={handleClear}
          disabled={pending}
          aria-label="Сбросить даты"
          title="Сбросить даты"
          className="shrink-0 text-zinc-400 hover:text-zinc-900 disabled:opacity-60"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
