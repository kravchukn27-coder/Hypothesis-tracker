"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExperimentWeekStage } from "@/app/experiments/actions";
import { useToast } from "@/components/toast/ToastProvider";

export function UndatedWeekPicker({
  experimentId,
  weekOptions,
}: {
  experimentId: string;
  weekOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function schedule(weekStartISO: string) {
    if (!weekStartISO) return;
    setValue(weekStartISO);
    startTransition(async () => {
      try {
        await setExperimentWeekStage(experimentId, weekStartISO, "DISCOVERY");
        router.refresh();
      } catch {
        setValue("");
        showToast("Не удалось запланировать эксперимент. Попробуйте ещё раз.", "error");
      }
    });
  }

  return (
    <select
      aria-label="Запланировать на неделю"
      value={value}
      disabled={pending}
      onChange={(event) => schedule(event.target.value)}
      className="w-44 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none transition-colors focus:border-zinc-900 disabled:cursor-wait disabled:opacity-60"
    >
      <option value="">Запланировать на неделю</option>
      {weekOptions.map((week) => (
        <option key={week.value} value={week.value}>
          {week.label}
        </option>
      ))}
    </select>
  );
}
