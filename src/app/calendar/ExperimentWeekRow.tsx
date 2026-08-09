"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resizeExperimentWeeks,
  setExperimentWeekStage,
  shiftExperimentWeeks,
} from "@/app/experiments/actions";
import { STAGE_BAR_CLASSES, STAGE_ICONS, STAGE_LABELS } from "@/lib/experiment";
import { HideFromCalendarModal } from "@/components/HideFromCalendarModal";
import { StageOptionsMenu } from "@/components/StageOptionsMenu";
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
}: {
  experimentId: string;
  experimentName: string;
  cells: Cell[];
  overdue: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openWeekIndex, setOpenWeekIndex] = useState<number | null>(null);
  const [showHidePrompt, setShowHidePrompt] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  const lastFilledIndex = cells.reduce((acc, c, i) => (c.stage ? i : acc), -1);

  function persistStage(weekStartISO: string, stage: ExperimentStage) {
    startTransition(async () => {
      const { becameDone } = await setExperimentWeekStage(experimentId, weekStartISO, stage);
      router.refresh();
      if (becameDone) setShowHidePrompt(true);
    });
  }

  function beginDrag(mode: DragMode, cell: Cell, e: React.PointerEvent) {
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
        startTransition(async () => {
          if (mode === "move") await shiftExperimentWeeks(experimentId, blockStartISO, blockEndISO, weekDelta);
          else await resizeExperimentWeeks(experimentId, blockStartISO, blockEndISO, weekDelta);
          router.refresh();
        });
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={rowRef}
      className="relative grid flex-1"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, i) => {
        const isOpen = openWeekIndex === i;
        const isOverdueCell = overdue && i === lastFilledIndex;
        const StageIcon = cell.stage ? STAGE_ICONS[cell.stage as ExperimentStage] : null;
        return (
          <div
            key={i}
            className="relative border-l border-zinc-100"
            style={{ gridColumn: i + 1, gridRow: 1 }}
          >
            {cell.stage ? (
              <button
                type="button"
                onPointerDown={(e) => beginDrag("move", cell, e)}
                onClick={() => {
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  setOpenWeekIndex(isOpen ? null : i);
                }}
                title={`${STAGE_LABELS[cell.stage as ExperimentStage]}${isOverdueCell ? " · Просрочен" : ""}`}
                className={`relative my-2 flex h-8 w-full items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-white transition-opacity ${STAGE_BAR_CLASSES[cell.stage as ExperimentStage]} ${isOverdueCell ? "ring-2 ring-red-500 ring-offset-1" : ""} ${cell.dimmed ? "opacity-20 hover:opacity-40" : ""}`}
              >
                {StageIcon && <StageIcon aria-hidden className="size-3 shrink-0" />}
                <span className="truncate">{STAGE_LABELS[cell.stage as ExperimentStage]}</span>
                {cell.weekStartISO === cell.blockEndISO && (
                  <span
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      beginDrag("resize-right", cell, e);
                    }}
                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                  />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setOpenWeekIndex(isOpen ? null : i)}
                aria-label="Назначить стадию на эту неделю"
                className="my-2 h-8 w-full rounded-md border border-dashed border-transparent hover:border-zinc-300"
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
    </div>
  );
}
