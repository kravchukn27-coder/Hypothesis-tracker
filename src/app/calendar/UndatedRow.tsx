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
}: {
  experimentId: string;
  name: string;
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
      className={`group flex w-full cursor-grab items-center gap-1.5 rounded-md border py-1.5 pl-1.5 pr-3 text-[13px] font-medium leading-none transition-all duration-150 active:cursor-grabbing ${
        dragging
          ? "border-amber-300 bg-amber-100/70 opacity-50"
          : "border-amber-200/80 bg-amber-50 text-amber-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-px hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-sm"
      }`}
    >
      <GripVertical
        strokeWidth={2.25}
        className="h-3.5 w-3.5 shrink-0 text-amber-400 transition-colors group-hover:text-amber-500"
      />
      <span className="truncate">{name}</span>
    </li>
  );
}
