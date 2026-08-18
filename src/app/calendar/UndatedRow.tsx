"use client";

/**
 * A Miro-like sticky note for an undated experiment. Dragging it onto
 * a `WeekHeaderCell` schedules the experiment there.
 */
export function UndatedRow({
  experimentId,
  name,
}: {
  experimentId: string;
  name: string;
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", experimentId);
        e.dataTransfer.effectAllowed = "move";
      }}
      title="Перетащите на нужную неделю"
      className="flex min-h-24 cursor-grab items-start rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium leading-5 text-amber-950 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      <span className="line-clamp-3">{name}</span>
    </li>
  );
}
