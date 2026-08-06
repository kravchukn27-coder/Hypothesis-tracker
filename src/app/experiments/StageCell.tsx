"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExperimentStage } from "./actions";
import { STAGE_BADGE_CLASSES, STAGE_ICONS, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { BADGE_SHAPE_CLASSES } from "@/components/Badge";
import type { ExperimentStage } from "@/generated/prisma/enums";

export function StageCell({
  experimentId,
  stage,
}: {
  experimentId: string;
  stage: ExperimentStage;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(stage);
  const [pending, startTransition] = useTransition();

  function handleChange(next: ExperimentStage) {
    setCurrent(next);
    startTransition(async () => {
      await updateExperimentStage(experimentId, next);
      router.refresh();
    });
  }

  const Icon = STAGE_ICONS[current];

  return (
    <span className="relative inline-block">
      <Icon
        aria-hidden
        className={`pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 ${STAGE_BADGE_CLASSES[current]}`}
      />
      <select
        value={current}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as ExperimentStage)}
        onClick={(e) => e.stopPropagation()}
        className={`${BADGE_SHAPE_CLASSES} cursor-pointer border-0 pr-2.5 pl-6 outline-none disabled:opacity-60 ${STAGE_BADGE_CLASSES[current]}`}
      >
        {STAGE_ORDER.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </span>
  );
}
