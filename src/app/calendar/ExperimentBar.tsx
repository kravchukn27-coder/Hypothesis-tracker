"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExperimentDates } from "@/app/experiments/actions";

const EDGE_WIDTH = 8; // px, width of the left/right resize-handle strips

type DragMode = "move" | "resize-left" | "resize-right";

function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function ExperimentBar({
  experimentId,
  href,
  label,
  title,
  barClass,
  overdue,
  colStart,
  colEnd,
  days,
  windowStart,
}: {
  experimentId: string;
  href: string;
  label: string;
  title: string;
  barClass: string;
  overdue: boolean;
  colStart: number;
  colEnd: number;
  days: number;
  /** Window's first day, `YYYY-MM-DD`, local. */
  windowStart: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pos, setPos] = useState({ colStart, colEnd });
  const barRef = useRef<HTMLAnchorElement>(null);
  const didDragRef = useRef(false);

  function persist(newColStart: number, newColEnd: number) {
    const start = addDays(new Date(`${windowStart}T00:00:00`), newColStart - 1);
    const end = addDays(new Date(`${windowStart}T00:00:00`), newColEnd - 2);
    startTransition(async () => {
      await updateExperimentDates(experimentId, toDateParam(start), toDateParam(end));
      router.refresh();
    });
  }

  function beginDrag(mode: DragMode, e: React.PointerEvent) {
    e.preventDefault();
    const grid = barRef.current?.parentElement;
    if (!grid) return;
    const gridWidth = grid.getBoundingClientRect().width;
    const dayWidth = gridWidth / days;
    const startX = e.clientX;
    const startColStart = colStart;
    const startColEnd = colEnd;
    didDragRef.current = false;

    let liveColStart = startColStart;
    let liveColEnd = startColEnd;

    function clampMove(dayDelta: number) {
      const span = startColEnd - startColStart;
      const newStart = Math.min(Math.max(startColStart + dayDelta, 1), days + 1 - span);
      return { colStart: newStart, colEnd: newStart + span };
    }

    function clampResizeLeft(dayDelta: number) {
      const newStart = Math.min(Math.max(startColStart + dayDelta, 1), startColEnd - 1);
      return { colStart: newStart, colEnd: startColEnd };
    }

    function clampResizeRight(dayDelta: number) {
      const newEnd = Math.max(Math.min(startColEnd + dayDelta, days + 1), startColStart + 1);
      return { colStart: startColStart, colEnd: newEnd };
    }

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dayDelta = Math.round(dx / dayWidth);
      if (dayDelta !== 0) didDragRef.current = true;

      const next =
        mode === "move"
          ? clampMove(dayDelta)
          : mode === "resize-left"
            ? clampResizeLeft(dayDelta)
            : clampResizeRight(dayDelta);

      liveColStart = next.colStart;
      liveColEnd = next.colEnd;
      setPos(next);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (didDragRef.current && (liveColStart !== startColStart || liveColEnd !== startColEnd)) {
        persist(liveColStart, liveColEnd);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <a
      ref={barRef}
      href={href}
      title={title}
      onClick={(e) => {
        if (didDragRef.current) e.preventDefault();
      }}
      onPointerDown={(e) => beginDrag("move", e)}
      style={{ gridColumn: `${pos.colStart} / ${pos.colEnd}`, gridRow: 1 }}
      className={`group relative my-2 flex items-center truncate rounded-md px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 ${barClass} ${overdue ? "ring-2 ring-red-500 ring-offset-1" : ""}`}
    >
      <span
        onPointerDown={(e) => {
          e.stopPropagation();
          beginDrag("resize-left", e);
        }}
        style={{ width: EDGE_WIDTH }}
        className="absolute left-0 top-0 h-full cursor-ew-resize"
      />
      <span className="pointer-events-none truncate">{label}</span>
      <span
        onPointerDown={(e) => {
          e.stopPropagation();
          beginDrag("resize-right", e);
        }}
        style={{ width: EDGE_WIDTH }}
        className="absolute right-0 top-0 h-full cursor-ew-resize"
      />
    </a>
  );
}
