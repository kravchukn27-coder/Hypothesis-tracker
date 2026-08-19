"use client";

import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { reorderCalendarExperiments } from "@/app/experiments/actions";
import { useToast } from "@/components/toast/ToastProvider";

/** PROD-036: Calendar row ordering owns only this handle, never stage bars. */
export function CalendarRowReorderHandle({ experimentName }: { experimentName: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const orderBeforeDrag = useRef<string[]>([]);

  function beginReorder(event: React.PointerEvent<HTMLButtonElement>) {
    if (isPending) return;
    event.preventDefault();
    const row = event.currentTarget.closest<HTMLElement>("[data-calendar-reorder-row]");
    const container = row?.parentElement;
    if (!row || !container) return;
    const reorderContainer = container;

    event.currentTarget.setPointerCapture(event.pointerId);
    const rows = () => [...reorderContainer.querySelectorAll<HTMLElement>(":scope > [data-calendar-reorder-row]")];
    orderBeforeDrag.current = rows().map((item) => item.dataset.experimentId ?? "");
    const currentRow = row;
    let changed = false;
    row.classList.add("z-20", "scale-[1.01]", "shadow-md", "ring-1", "ring-zinc-300", "bg-white", "will-change-transform");

    function animateReflow(before: Map<HTMLElement, DOMRect>) {
      for (const item of rows()) {
        if (item === currentRow) continue;
        const oldRect = before.get(item);
        const newRect = item.getBoundingClientRect();
        if (!oldRect) continue;
        const delta = oldRect.top - newRect.top;
        if (!delta) continue;
        item.style.transform = `translateY(${delta}px)`;
        item.style.transition = "none";
        requestAnimationFrame(() => {
          item.style.transform = "";
          item.style.transition = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
        });
      }
    }

    function move(pointerEvent: PointerEvent) {
      const candidates = rows().filter((item) => item !== currentRow);
      const target = candidates.find((item) => {
        const rect = item.getBoundingClientRect();
        return pointerEvent.clientY >= rect.top && pointerEvent.clientY <= rect.bottom;
      });
      if (!target) return;
      const targetRect = target.getBoundingClientRect();
      const insertBefore = pointerEvent.clientY < targetRect.top + targetRect.height / 2;
      const sibling = insertBefore ? target : target.nextElementSibling;
      if (sibling === currentRow || (!sibling && currentRow === reorderContainer.lastElementChild)) return;
      const before = new Map(rows().map((item) => [item, item.getBoundingClientRect()]));
      reorderContainer.insertBefore(currentRow, sibling);
      animateReflow(before);
      changed = true;
    }

    function end() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      currentRow.classList.remove("z-20", "scale-[1.01]", "shadow-md", "ring-1", "ring-zinc-300", "bg-white", "will-change-transform");
      if (!changed) return;
      const orderedIds = rows().map((item) => item.dataset.experimentId ?? "").filter(Boolean);
      startTransition(async () => {
        try {
          const result = await reorderCalendarExperiments(orderedIds);
          if (result.error) throw new Error(result.error);
          showToast("Порядок экспериментов сохранён.");
        } catch (error) {
          const byId = new Map(rows().map((item) => [item.dataset.experimentId, item]));
          orderBeforeDrag.current.forEach((id) => {
            const item = byId.get(id);
            if (item) reorderContainer.append(item);
          });
          router.refresh();
          showToast(error instanceof Error ? error.message : "Не удалось сохранить порядок. Повторите попытку.", "error");
        }
      });
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  return (
    <button
      type="button"
      aria-label={`Изменить порядок эксперимента «${experimentName}»`}
      title="Перетащите, чтобы изменить порядок в Calendar"
      disabled={isPending}
      onPointerDown={beginReorder}
      className="cursor-grab rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:opacity-50"
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}
