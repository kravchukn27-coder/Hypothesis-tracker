"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Plus } from "lucide-react";
import { completeExperimentWeek, setExperimentWeekStage } from "@/app/experiments/actions";
import { addWeeks, formatWeekLabel, startOfWeek, toDateParam } from "@/lib/calendar";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { useToast } from "@/components/toast/ToastProvider";
import type { ExperimentStage } from "@/generated/prisma/enums";

type Reminder = {
  experimentId: string;
  experimentName: string;
  lastWeekStartISO: string;
  lastStage: ExperimentStage;
};

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const router = useRouter();
  const { showToast } = useToast();
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
        router.refresh();
        showToast("Этап отмечен как завершённый.");
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
        router.refresh();
        showToast("Следующий этап запланирован.");
      } catch {
        setError("Не удалось запланировать этап. Попробуйте ещё раз.");
      }
    });
  }

  const lastWeek = new Date(`${reminder.lastWeekStartISO}T00:00:00`);

  return (
    <li className="flex flex-col gap-3 border-t border-amber-200 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">{reminder.experimentName}</p>
        <p className="mt-0.5 text-sm text-zinc-600">
          Этап за неделю {formatWeekLabel(lastWeek)} ещё не завершён.
        </p>
        {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={complete}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium leading-4 text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="size-3.5" aria-hidden />
          Завершить этап
        </button>
        <button
          type="button"
          onClick={() => setIsScheduling((value) => !value)}
          disabled={isPending}
          aria-expanded={isScheduling}
          className="inline-flex items-center justify-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium leading-4 text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="size-3.5" aria-hidden />
          Запланировать следующий этап
        </button>
      </div>

      {isScheduling && (
        <form onSubmit={schedule} className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Стадия
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value as ExperimentStage)}
              disabled={isPending}
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900"
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
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {isPending ? "Сохраняем…" : "Добавить"}
          </button>
        </form>
      )}
    </li>
  );
}

export function OverdueExperimentReminder({ reminders }: { reminders: Reminder[] }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function dismiss(event: MouseEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  if (reminders.length === 0) return null;

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        aria-label={`Требуют внимания: ${reminders.length}`}
        aria-controls="overdue-reminders-popover"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="relative flex size-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        <Bell className="size-4" aria-hidden />
        <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
          {reminders.length}
        </span>
      </button>

      {open && (
        <section
          id="overdue-reminders-popover"
          role="dialog"
          aria-labelledby="overdue-reminders-title"
          className="motion-popover-enter absolute right-0 top-full z-30 mt-2 max-h-[calc(100dvh-8rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
        >
          <h2 id="overdue-reminders-title" className="text-sm font-semibold text-zinc-900">
            Требуют внимания: {reminders.length}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">Завершите прошлый этап или запланируйте следующий.</p>
          <ul className="mt-4">{reminders.map((reminder) => <ReminderRow key={reminder.experimentId} reminder={reminder} />)}</ul>
        </section>
      )}
    </div>
  );
}
