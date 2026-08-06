"use client";

import { useState, useTransition } from "react";

export function ConfirmDeleteButton({
  onConfirm,
  confirmTitle,
  confirmMessage,
  triggerLabel = "Удалить",
  triggerClassName,
}: {
  onConfirm: () => Promise<{ error?: string } | void>;
  confirmTitle: string;
  confirmMessage: string;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result?.error) {
        setError(result.error);
      }
      // On success the server action redirects and this component unmounts.
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          triggerClassName ??
          "text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
        }
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-zinc-900">{confirmTitle}</h2>
            <p className="mt-2 text-sm text-zinc-600">{confirmMessage}</p>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/20">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
