"use client";

import { useEffect } from "react";
import { reportRouteError } from "./error-actions";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { void reportRouteError(error, "src/app/error.tsx"); }, [error]);
  return <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10"><div className="rounded-xl border border-zinc-200 bg-white p-6"><h1 className="text-lg font-semibold">Не удалось открыть страницу</h1><p className="mt-2 text-sm text-zinc-600">Повторите попытку.</p><button type="button" onClick={retry} className="mt-5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white">Попробовать снова</button></div></div>;
}
