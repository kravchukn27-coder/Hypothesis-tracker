"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExperimentWeekStage } from "@/app/experiments/actions";
import { useToast } from "@/components/toast/ToastProvider";
import { WeekStageFilter } from "./WeekStageFilter";

/**
 * Header cell for one week column (PROD-019). Also a drop target for
 * dragging an undated experiment (PROD-017) onto the grid — dropping
 * assigns that week a Discovery stage entry, the same default a new
 * experiment starts at.
 */
export function WeekHeaderCell({
  weekStartISO,
  isToday,
  stageFilter,
  stageOptions,
  children,
}: {
  weekStartISO: string;
  isToday: boolean;
  stageFilter?: string;
  stageOptions: { value: string; label: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  useEffect(() => {
    if (!isSettled) return;
    const timer = window.setTimeout(() => setIsSettled(false), 520);
    return () => window.clearTimeout(timer);
  }, [isSettled]);

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
        if (!experimentId || isPending) return;
        startTransition(async () => {
          try {
            await setExperimentWeekStage(experimentId, weekStartISO, "DISCOVERY", true);
            setIsSettled(true);
            router.refresh();
            showToast("Эксперимент запланирован на эту неделю.");
          } catch {
            showToast("Не удалось запланировать эксперимент. Попробуйте ещё раз.", "error");
          }
        });
      }}
      aria-busy={isPending}
      className={`motion-status-control min-w-0 overflow-hidden border-l border-zinc-100 px-1 py-2 text-center leading-tight ${
        isDragOver ? "motion-drop-target" : isToday ? "bg-indigo-100 font-semibold text-indigo-700" : ""
      } ${isPending ? "opacity-60" : ""} ${isSettled ? "motion-plan-settled" : ""}`}
    >
      <div className={isToday ? "text-sm" : ""}>{children}</div>
      <WeekStageFilter weekStartISO={weekStartISO} value={stageFilter} options={stageOptions} />
    </div>
  );
}
