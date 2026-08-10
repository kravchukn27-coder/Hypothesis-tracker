"use client";

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !pending && onCancel()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-plan-change-title"
        aria-describedby="calendar-plan-change-description"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="calendar-plan-change-title" className="text-lg font-semibold text-zinc-900">
          {isMove ? "Перенести этап?" : "Изменить длительность этапа?"}
        </h2>
        <p id="calendar-plan-change-description" className="mt-2 text-sm text-zinc-600">
          «{experimentName}»: {previousRange} → <span className="font-medium text-zinc-900">{nextRange}</span>
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
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
      </div>
    </div>
  );
}
