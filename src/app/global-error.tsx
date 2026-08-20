"use client";

import { useEffect } from "react";
import { reportRouteError } from "./error-actions";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { void reportRouteError(error, "src/app/global-error.tsx"); }, [error]);
  return <html lang="ru"><body className="flex min-h-screen items-center justify-center bg-white text-zinc-900"><main className="rounded-xl border border-zinc-200 p-6"><h1 className="text-lg font-semibold">Что-то пошло не так</h1><button type="button" onClick={retry} className="mt-5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white">Попробовать снова</button></main></body></html>;
}
