"use client";

import { useEffect } from "react";
import { reportRouteError } from "../error-actions";

export default function CalendarError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    void reportRouteError(error, "src/app/calendar/error.tsx");
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-4 px-6 py-10">
      <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-zinc-900">Не удалось открыть Calendar</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Данные не загрузились. Повторите попытку — изменения в плане не будут потеряны.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
