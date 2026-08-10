"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExperimentWeekStage } from "@/app/experiments/actions";

function activeExperimentLabel(count: number): string {
  const remainder = count % 100;
  const lastDigit = count % 10;
  if (remainder >= 11 && remainder <= 14) return `${count} активных экспериментов`;
  if (lastDigit === 1) return `${count} активный эксперимент`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} активных эксперимента`;
  return `${count} активных экспериментов`;
}

/**
 * Header cell for one week column (PROD-019). Also a drop target for
 * dragging an undated experiment (PROD-017) onto the grid — dropping
 * assigns that week a Discovery stage entry, the same default a new
 * experiment starts at.
 */
export function WeekHeaderCell({
  weekStartISO,
  isToday,
  activeExperimentCount,
  children,
}: {
  weekStartISO: string;
  isToday: boolean;
  activeExperimentCount: number;
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
          await setExperimentWeekStage(experimentId, weekStartISO, "DISCOVERY");
          router.refresh();
        });
      }}
      className={`min-w-0 overflow-hidden border-l border-zinc-100 px-1 py-2 text-center leading-tight ${
        isDragOver ? "bg-zinc-900/10" : isToday ? "bg-blue-50/60 text-blue-700" : ""
      }`}
    >
      <div>{children}</div>
      <span
        className="mt-0.5 hidden text-[10px] font-normal normal-case tracking-normal text-zinc-400 min-[641px]:block"
        title={activeExperimentLabel(activeExperimentCount)}
      >
        {activeExperimentCount} актив.
      </span>
    </div>
  );
}
