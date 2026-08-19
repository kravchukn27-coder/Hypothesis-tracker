"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setPasswordFromInvite, type SetPasswordActionState } from "@/lib/auth/invite-actions";

const initialState: SetPasswordActionState = {};

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setPasswordFromInvite, initialState);
  if (state.success) return <p className="mt-4 text-sm text-emerald-800">Пароль установлен. <Link className="underline" href="/login">Войти</Link></p>;

  return (
    <form action={action} className="mt-5 space-y-4">
      <input name="token" type="hidden" value={token} />
      <label className="block text-sm font-medium">Новый пароль<input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className="block text-sm font-medium">Повторите пароль<input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} required /></label>
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <button className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Сохраняем…" : "Сохранить пароль"}</button>
    </form>
  );
}
