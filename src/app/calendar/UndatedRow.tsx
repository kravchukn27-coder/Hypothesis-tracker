"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";

/**
 * A compact drag token for an undated experiment. Dragging it onto a
 * `WeekHeaderCell` schedules the experiment there; a plain click (no
 * drag movement) opens its experiment card instead — the browser
 * only fires `click` when no `dragstart` preceded it, so the two
 * gestures don't need any extra disambiguation here.
 */
export function UndatedRow({
  experimentId,
  name,
  highlighted = false,
}: {
  experimentId: string;
  name: string;
  /** BUG-012: same "just arrived here from a link" signal as the
   * timelined rows' amber ring (see `ExperimentWeekRow`/UI-030). That
   * ring reads fine there because the bar underneath is a *different*
   * color (violet/gray/blue/...); here the row is amber by default,
   * so a same-hue ring barely shows up against its own border — this
   * swaps in a distinctly darker/more saturated amber fill plus a
   * wider offset ring instead of just overlaying one. */
  highlighted?: boolean;
}) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", experimentId);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => router.push(`/experiments/${experimentId}`)}
      title={`${name} — перетащите на нужную неделю или нажмите, чтобы открыть`}
      className={`group flex w-full cursor-grab items-start gap-1.5 rounded-md border py-1.5 pl-1.5 pr-3 text-[13px] font-medium leading-tight transition-all duration-150 active:cursor-grabbing ${
        dragging
          ? "border-amber-300 bg-amber-100/70 opacity-50"
          : highlighted
            ? "border-amber-400 bg-amber-200 text-amber-950 shadow-sm ring-2 ring-amber-500 ring-offset-2"
            : "border-amber-200/80 bg-amber-50 text-amber-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-px hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-sm"
      }`}
    >
      <GripVertical
        strokeWidth={2.25}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400 transition-colors group-hover:text-amber-500"
      />
      <span className="min-w-0 break-words">{name}</span>
    </li>
  );
}
