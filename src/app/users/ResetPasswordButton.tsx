"use client";

import { useState, useTransition } from "react";
import { resetUserPassword } from "./actions";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ link?: string; error?: string } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await resetUserPassword(userId);
      setResult(res.ok ? { link: res.link } : { error: res.error });
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:underline disabled:opacity-50"
      >
        {pending ? "Готовим ссылку…" : "Сбросить пароль"}
      </button>
      {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
      {result?.link && (
        <input
          readOnly
          aria-label="Ссылка сброса пароля"
          value={result.link}
          onFocus={(e) => e.currentTarget.select()}
          className="w-64 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-[11px]"
        />
      )}
    </div>
  );
}
