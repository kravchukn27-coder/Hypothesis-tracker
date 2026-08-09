"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNextExperimentWeek, setExperimentWeekStage } from "./actions";
import { STAGE_BADGE_CLASSES, STAGE_ICONS, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { HideFromCalendarModal } from "@/components/HideFromCalendarModal";
import { IconSelect } from "@/components/IconSelect";
import type { ExperimentStage } from "@/generated/prisma/enums";

type WeekEntry = { weekStartISO: string; stage: ExperimentStage };

function formatWeek(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
}

/**
 * PROD-019: per-week stage editor on the experiment detail card — the
 * same edits the Calendar's week-cells offer, so week-by-week
 * progress can be set from either place, per the user's requirement.
 */
export function ExperimentWeekStagesEditor({
  experimentId,
  experimentName,
  weeks,
}: {
  experimentId: string;
  experimentName: string;
  weeks: WeekEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showHidePrompt, setShowHidePrompt] = useState(false);

  function handleChange(weekStartISO: string, stage: ExperimentStage) {
    startTransition(async () => {
      const { becameDone } = await setExperimentWeekStage(experimentId, weekStartISO, stage);
      router.refresh();
      if (becameDone) setShowHidePrompt(true);
    });
  }

  function handleAddWeek() {
    startTransition(async () => {
      await addNextExperimentWeek(experimentId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {weeks.length === 0 ? (
        <p className="text-sm text-zinc-500">Пока нет недель — добавь первую.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {weeks.map((w) => (
            <li key={w.weekStartISO} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-zinc-500">
                Неделя от {formatWeek(w.weekStartISO)}
              </span>
              <IconSelect
                value={w.stage}
                options={STAGE_ORDER}
                labels={STAGE_LABELS}
                icon={STAGE_ICONS[w.stage]}
                colorClasses={STAGE_BADGE_CLASSES[w.stage]}
                disabled={pending}
                onChange={(next) => handleChange(w.weekStartISO, next)}
              />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={handleAddWeek}
        disabled={pending}
        className="w-fit rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 disabled:opacity-60"
      >
        + Добавить неделю
      </button>

      {showHidePrompt && (
        <HideFromCalendarModal
          experimentId={experimentId}
          experimentName={experimentName}
          onDismiss={() => setShowHidePrompt(false)}
        />
      )}
    </div>
  );
}
