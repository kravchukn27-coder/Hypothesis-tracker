"use client";

import { useActionState } from "react";
import { createInvite, type InviteActionState } from "@/lib/auth/invite-actions";

const initialState: InviteActionState = {};

export function InviteForm() {
  const [state, action, pending] = useActionState(createInvite, initialState);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold">Пригласить пользователя</h2>
      <p className="mt-1 text-sm text-zinc-600">Система не отправляет email — скопируйте ссылку и передайте её вручную.</p>
      <form action={action} className="mt-4 grid gap-3">
        <label className="text-sm font-medium">Email<input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" name="email" type="email" required /></label>
        <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Создаём…" : "Создать приглашение"}
        </button>
      </form>
      {state.error ? <p className="mt-3 text-sm text-red-700">{state.error}</p> : null}
      {state.link ? <label className="mt-3 block text-sm text-emerald-900">Ссылка-приглашение
        <input aria-label="Ссылка-приглашение" className="mt-1 w-full rounded-md border border-emerald-200 bg-emerald-50 p-3 font-mono text-xs" readOnly value={state.link} />
      </label> : null}
    </section>
  );
}
