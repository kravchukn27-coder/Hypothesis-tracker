"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteExperimentWeek,
  resizeExperimentWeeks,
  setExperimentWeekStage,
  shiftExperimentWeeks,
} from "@/app/experiments/actions";
import { X } from "lucide-react";
import { STAGE_BAR_CLASSES, STAGE_LABELS } from "@/lib/experiment";
import { formatWeekLabel } from "@/lib/calendar";
import { HideFromCalendarModal } from "@/components/HideFromCalendarModal";
import { StageOptionsMenu } from "@/components/StageOptionsMenu";
import { useToast } from "@/components/toast/ToastProvider";
import { CalendarPlanChangeDialog } from "./CalendarPlanChangeDialog";
import type { ExperimentStage } from "@/generated/prisma/enums";

type Cell = {
  weekIndex: number;
  weekStartISO: string;
  stage: string | null;
  // BUG-006: the contiguous block this cell belongs to (its true
  // start/end, which may fall outside the visible window) — lets drag
  // and resize target exactly one block instead of every week entry
  // the experiment has.
  blockStartISO: string | null;
  blockEndISO: string | null;
  // PROD-022: true when a Calendar legend filter is active and this
  // cell doesn't match it — dimmed rather than removed, so the grid
  // stays intact and the cell stays fully interactive (filtering is
  // a view, not a read-only mode).
  dimmed?: boolean;
};

type DragMode = "move" | "resize-right";

type PendingPlanChange = {
  mode: DragMode;
  blockStartISO: string;
  blockEndISO: string;
  deltaWeeks: number;
  nextStartISO: string;
  nextEndISO: string;
};

const GESTURE_HINT_STORAGE_KEY = "calendar-week-plan-gesture-hint";
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function shiftWeekISO(weekStartISO: string, deltaWeeks: number): string {
  const date = new Date(`${weekStartISO}T00:00:00`);
  date.setDate(date.getDate() + deltaWeeks * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatRange(startISO: string, endISO: string): string {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  return startISO === endISO ? formatWeekLabel(start) : `${formatWeekLabel(start)} — ${formatWeekLabel(end)}`;
}

/**
 * One experiment's interactive row on the Calendar (PROD-019) — a
 * week-cell per window week. Click an empty cell to assign it a
 * stage, click a filled cell to change it (including re-picking the
 * same stage, to mean "this stage continued"). Drag a filled cell's
 * body to shift that cell's whole block by whole weeks — gapped
 * blocks on the same experiment move independently (BUG-006); drag a
 * block's own rightmost cell's edge to extend/shrink just that block.
 */
export function ExperimentWeekRow({
  experimentId,
  experimentName,
  cells,
  overdue,
  overdueWeekStartISO,
}: {
  experimentId: string;
  experimentName: string;
  cells: Cell[];
  overdue: boolean;
  overdueWeekStartISO: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const [openWeekIndex, setOpenWeekIndex] = useState<number | null>(null);
  const [showHidePrompt, setShowHidePrompt] = useState(false);
  const [pendingPlanChange, setPendingPlanChange] = useState<PendingPlanChange | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  function persistStage(weekStartISO: string, stage: ExperimentStage) {
    startTransition(async () => {
      try {
        const { becameDone } = await setExperimentWeekStage(experimentId, weekStartISO, stage);
        router.refresh();
        showToast("Стадия недели обновлена.");
        if (becameDone) setShowHidePrompt(true);
      } catch {
        showToast("Не удалось обновить стадию. Попробуйте ещё раз.", "error");
      }
    });
  }

  function deleteWeek(weekStartISO: string) {
    setOpenWeekIndex(null);
    startTransition(async () => {
      try {
        await deleteExperimentWeek(experimentId, weekStartISO);
        router.refresh();
      } catch {
        showToast("Не удалось удалить стадию. Попробуйте ещё раз.", "error");
      }
    });
  }

  function beginDrag(mode: DragMode, cell: Cell, e: React.PointerEvent) {
    if (isPending) return;
    e.preventDefault();
    const row = rowRef.current;
    // BUG-006 follow-up: moving a cell only ever targets that single
    // week — no adjacency-based grouping, even when weeks sit right
    // next to each other with no gap (confirmed with the user:
    // "snake" dragging shouldn't happen at all, not just across
    // gaps). Resize still operates on the true contiguous same-stage
    // run — extending/shrinking a run is the point of resize, not the
    // "gluing" behavior being fixed here.
    const blockStartISO = mode === "move" ? cell.weekStartISO : (cell.blockStartISO ?? cell.weekStartISO);
    const blockEndISO = mode === "move" ? cell.weekStartISO : (cell.blockEndISO ?? cell.weekStartISO);
    if (!row || cells.length === 0) return;
    const cellWidth = row.getBoundingClientRect().width / cells.length;
    const startX = e.clientX;
    didDragRef.current = false;

    let shouldShowHint = false;
    try {
      shouldShowHint = !window.localStorage.getItem(GESTURE_HINT_STORAGE_KEY);
      if (shouldShowHint) window.localStorage.setItem(GESTURE_HINT_STORAGE_KEY, "1");
    } catch {
      shouldShowHint = true;
    }
    if (shouldShowHint) {
      showToast(
        mode === "move"
          ? "Перетащите этап на нужную неделю, затем подтвердите новый диапазон."
          : "Потяните за правый край, затем подтвердите новую длительность.",
      );
    }

    function weekDeltaFrom(clientX: number) {
      return Math.round((clientX - startX) / cellWidth);
    }

    function onMove(ev: PointerEvent) {
      if (weekDeltaFrom(ev.clientX) !== 0) didDragRef.current = true;
    }

    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const weekDelta = weekDeltaFrom(ev.clientX);
      if (weekDelta !== 0) {
        const blockLength = Math.round(
          (new Date(`${blockEndISO}T00:00:00`).getTime() - new Date(`${blockStartISO}T00:00:00`).getTime()) / MS_PER_WEEK,
        ) + 1;
        const deltaWeeks = mode === "resize-right" ? Math.max(weekDelta, -(blockLength - 1)) : weekDelta;
        if (deltaWeeks === 0) return;
        setPendingPlanChange({
          mode,
          blockStartISO,
          blockEndISO,
          deltaWeeks,
          nextStartISO: mode === "move" ? shiftWeekISO(blockStartISO, deltaWeeks) : blockStartISO,
          nextEndISO: mode === "move" ? shiftWeekISO(blockEndISO, deltaWeeks) : shiftWeekISO(blockEndISO, deltaWeeks),
        });
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function confirmPlanChange() {
    if (!pendingPlanChange) return;
    const change = pendingPlanChange;
    startTransition(async () => {
      try {
        const result =
          change.mode === "move"
            ? await shiftExperimentWeeks(experimentId, change.blockStartISO, change.blockEndISO, change.deltaWeeks)
            : await resizeExperimentWeeks(experimentId, change.blockStartISO, change.blockEndISO, change.deltaWeeks);
        setPendingPlanChange(null);
        if (!result.changed) {
          showToast("Не удалось сохранить: новый диапазон пересекается с другим этапом этого эксперимента.", "error");
          return;
        }
        router.refresh();
        showToast(change.mode === "move" ? "Этап перенесён." : "Длительность этапа обновлена.");
      } catch {
        setPendingPlanChange(null);
        showToast(
          change.mode === "move"
            ? "Не удалось переместить этап. Попробуйте ещё раз."
            : "Не удалось изменить длительность этапа. Попробуйте ещё раз.",
          "error",
        );
      }
    });
  }

  return (
    <div
      ref={rowRef}
      className="relative grid min-w-0 flex-1"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, i) => {
        const isOpen = openWeekIndex === i;
        const isOverdueCell = overdue && cell.weekStartISO === overdueWeekStartISO;
        return (
          <div
            key={i}
            className="group relative border-l border-zinc-100"
            style={{ gridColumn: i + 1, gridRow: 1 }}
          >
            {cell.stage ? (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onPointerDown={(e) => beginDrag("move", cell, e)}
                  onClick={() => {
                    if (didDragRef.current) {
                      didDragRef.current = false;
                      return;
                    }
                    setOpenWeekIndex(isOpen ? null : i);
                  }}
                  aria-label={`${STAGE_LABELS[cell.stage as ExperimentStage]}. Перетащите, чтобы перенести неделю.`}
                  title={`${STAGE_LABELS[cell.stage as ExperimentStage]}${isOverdueCell ? " · Просрочен" : ""}`}
                  className={`relative my-2 flex h-11 w-full cursor-grab items-center justify-center rounded-md px-3 text-[11px] font-medium text-white shadow-sm transition-opacity active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:opacity-60 ${STAGE_BAR_CLASSES[cell.stage as ExperimentStage]} ${isOverdueCell ? "ring-2 ring-red-500 ring-offset-1" : ""} ${cell.dimmed ? "opacity-20 hover:opacity-40" : ""}`}
                >
                  <span className="w-full text-center leading-[1.15] break-words">
                    {STAGE_LABELS[cell.stage as ExperimentStage]}
                  </span>
                  {cell.weekStartISO === cell.blockEndISO && (
                    <span
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        beginDrag("resize-right", cell, e);
                      }}
                      aria-hidden="true"
                      className="absolute right-0 top-0 z-20 h-full w-3 cursor-ew-resize border-r-2 border-white/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    />
                  )}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => deleteWeek(cell.weekStartISO)}
                  aria-label="Удалить стадию этой недели"
                  title="Удалить стадию этой недели"
                  className="absolute -left-1 top-1 z-10 flex size-6 items-center justify-center rounded-md bg-white/95 text-zinc-500 opacity-0 shadow-sm ring-1 ring-zinc-200 transition-opacity hover:text-red-600 focus:opacity-100 focus:outline-2 focus:outline-offset-1 focus:outline-zinc-900 group-hover:opacity-100 disabled:cursor-wait disabled:opacity-60"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpenWeekIndex(isOpen ? null : i)}
                aria-label="Назначить стадию на эту неделю"
                className="my-2 h-8 w-full rounded-md border border-dashed border-transparent hover:border-zinc-300 disabled:cursor-wait disabled:opacity-60"
              />
            )}
            {isOpen && (
              <StageOptionsMenu
                onSelect={(stage) => {
                  persistStage(cell.weekStartISO, stage);
                  setOpenWeekIndex(null);
                }}
                onClose={() => setOpenWeekIndex(null)}
              />
            )}
          </div>
        );
      })}

      {showHidePrompt && (
        <HideFromCalendarModal
          experimentId={experimentId}
          experimentName={experimentName}
          onDismiss={() => setShowHidePrompt(false)}
        />
      )}

      {pendingPlanChange && (
        <CalendarPlanChangeDialog
          mode={pendingPlanChange.mode}
          experimentName={experimentName}
          previousRange={formatRange(pendingPlanChange.blockStartISO, pendingPlanChange.blockEndISO)}
          nextRange={formatRange(pendingPlanChange.nextStartISO, pendingPlanChange.nextEndISO)}
          pending={isPending}
          onCancel={() => setPendingPlanChange(null)}
          onConfirm={confirmPlanChange}
        />
      )}
    </div>
  );
}
