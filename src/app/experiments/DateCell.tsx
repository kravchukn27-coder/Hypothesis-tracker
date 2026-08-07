"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
}: {
  experimentId: string;
  startDate: Date | null;
  endDate: Date | null;
}) {
  const router = useRouter();
  const [start, setStart] = useState(toInputValue(startDate));
  const [end, setEnd] = useState(toInputValue(endDate));
  const [pending, startTransition] = useTransition();

  function handleChange(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    startTransition(async () => {
      await updateExperimentDates(experimentId, nextStart || null, nextEnd || null);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        type="date"
        value={start}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value, end)}
        className={dateInputClass}
      />
      <span className="text-zinc-400">–</span>
      <input
        type="date"
        value={end}
        disabled={pending}
        onChange={(e) => handleChange(start, e.target.value)}
        className={dateInputClass}
      />
    </div>
  );
}
