"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Plus } from "lucide-react";
import { completeExperimentWeek, setExperimentWeekStage } from "@/app/experiments/actions";
import { addWeeks, formatWeekLabel, startOfWeek, toDateParam } from "@/lib/calendar";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import type { ExperimentStage } from "@/generated/prisma/enums";

type Reminder = {
  experimentId: string;
  experimentName: string;
  lastWeekStartISO: string;
  lastStage: ExperimentStage;
};

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const [isPending, startTransition] = useTransition();
  const [isScheduling, setIsScheduling] = useState(false);
  const [stage, setStage] = useState<ExperimentStage>(reminder.lastStage);
  const [date, setDate] = useState(() => toDateParam(addWeeks(startOfWeek(new Date()), 1)));
  const [error, setError] = useState<string | null>(null);

  function complete() {
    startTransition(async () => {
      setError(null);
      try {
        await completeExperimentWeek(reminder.experimentId, reminder.lastWeekStartISO);
      } catch {
        setError("Не удалось завершить этап. Попробуйте ещё раз.");
      }
    });
  }

  function schedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      try {
        await setExperimentWeekStage(reminder.experimentId, date, stage);
        setIsScheduling(false);
      } catch {
        setError("Не удалось запланировать этап. Попробуйте ещё раз.");
      }
    });
  }

  const lastWeek = new Date(`${reminder.lastWeekStartISO}T00:00:00`);

  return (
    <li className="flex flex-col gap-3 border-t border-amber-200 py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">{reminder.experimentName}</p>
        <p className="mt-0.5 text-sm text-zinc-600">
          Этап за неделю {formatWeekLabel(lastWeek)} ещё не завершён.
        </p>
        {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={complete}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="size-4" aria-hidden />
          Завершить этап
        </button>
        <button
          type="button"
          onClick={() => setIsScheduling((value) => !value)}
          disabled={isPending}
          aria-expanded={isScheduling}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden />
          Запланировать следующий этап
        </button>
      </div>

      {isScheduling && (
        <form onSubmit={schedule} className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Стадия
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value as ExperimentStage)}
              disabled={isPending}
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900"
            >
              {STAGE_ORDER.map((option) => (
                <option key={option} value={option}>
                  {STAGE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Дата
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              disabled={isPending}
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Сохраняем…" : "Добавить"}
          </button>
        </form>
      )}
    </li>
  );
}

export function OverdueExperimentReminder({ reminders }: { reminders: Reminder[] }) {
  if (reminders.length === 0) return null;

  return (
    <section aria-labelledby="overdue-reminders-title" className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="overdue-reminders-title" className="text-sm font-semibold text-amber-950">
            Требуют внимания: {reminders.length}
          </h2>
          <p className="mt-0.5 text-sm text-amber-900">Завершите прошлый этап или запланируйте следующий.</p>
          <ul className="mt-4">{reminders.map((reminder) => <ReminderRow key={reminder.experimentId} reminder={reminder} />)}</ul>
        </div>
      </div>
    </section>
  );
}
