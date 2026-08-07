"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExperimentDates } from "@/app/experiments/actions";

/**
 * Header cell for one day column. Also acts as a drop target for
 * dragging an undated experiment (PROD-017) onto the grid — dropping
 * sets a 1-day duration (start === end === this day), matching
 * PROD-016's existing 1-day minimum-duration floor.
 */
export function DayHeaderCell({
  date,
  isToday,
  children,
}: {
  /** `YYYY-MM-DD`, local. */
  date: string;
  isToday: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const experimentId = e.dataTransfer.getData("text/plain");
        if (!experimentId) return;
        startTransition(async () => {
          await updateExperimentDates(experimentId, date, date);
          router.refresh();
        });
      }}
      className={`border-l border-zinc-100 px-1 py-2 text-center leading-tight ${
        isDragOver ? "bg-zinc-900/10" : isToday ? "bg-blue-50/60 text-blue-700" : ""
      }`}
    >
      {children}
    </div>
  );
}
