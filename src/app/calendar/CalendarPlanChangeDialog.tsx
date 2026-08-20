"use client";

import { MotionDialog } from "@/components/MotionDialog";

export function CalendarPlanChangeDialog({
  mode,
  experimentName,
  previousRange,
  nextRange,
  pending,
  onCancel,
  onConfirm,
}: {
  mode: "move" | "resize-right";
  experimentName: string;
  previousRange: string;
  nextRange: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isMove = mode === "move";

  return (
    <MotionDialog
      onDismiss={onCancel}
      pending={pending}
      labelledBy="calendar-plan-change-title"
      describedBy="calendar-plan-change-description"
    >
      {({ dismiss }) => (
        <>
        <h2 id="calendar-plan-change-title" className="text-lg font-semibold text-zinc-900">
          {isMove ? "Перенести этап?" : "Изменить длительность этапа?"}
        </h2>
        <p id="calendar-plan-change-description" className="mt-2 text-sm text-zinc-600">
          «{experimentName}»: {previousRange} → <span className="font-medium text-zinc-900">{nextRange}</span>
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dismiss()}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Сохраняем..." : "Подтвердить"}
          </button>
        </div>
        </>
      )}
    </MotionDialog>
  );
}
