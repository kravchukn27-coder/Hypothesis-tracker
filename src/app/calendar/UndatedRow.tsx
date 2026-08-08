"use client";

import Link from "next/link";
import { DateCell } from "@/app/experiments/DateCell";

/**
 * One row in the Calendar's "Без дат" list (PROD-017). The
 * name/hypothesis block is the drag handle — dragging it onto a
 * `DayHeaderCell` schedules the experiment there. `draggable` is
 * scoped to that block only, not the whole row, so it doesn't
 * interfere with clicking into the `DateCell` inputs.
 */
export function UndatedRow({
  experimentId,
  name,
  hypothesisName,
}: {
  experimentId: string;
  name: string;
  hypothesisName: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", experimentId);
          e.dataTransfer.effectAllowed = "move";
        }}
        className="min-w-0 cursor-grab active:cursor-grabbing"
      >
        {/* draggable=false: anchors are natively draggable, which would
            otherwise steal the drag gesture (as a browser link-drag)
            before it reaches the wrapping div's onDragStart below. */}
        <Link
          href={`/experiments/${experimentId}`}
          draggable={false}
          className="text-sm text-zinc-700 hover:underline"
        >
          {name}
        </Link>
        <span className="ml-2 text-xs text-zinc-400">{hypothesisName}</span>
      </div>
      <DateCell experimentId={experimentId} startDate={null} endDate={null} />
    </li>
  );
}
