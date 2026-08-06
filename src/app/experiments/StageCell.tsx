"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExperimentStage } from "./actions";
import { STAGE_BADGE_CLASSES, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { BADGE_BASE_CLASSES } from "@/components/Badge";
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

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as ExperimentStage)}
      onClick={(e) => e.stopPropagation()}
      className={`${BADGE_BASE_CLASSES} cursor-pointer border-0 outline-none disabled:opacity-60 ${STAGE_BADGE_CLASSES[current]}`}
    >
      {STAGE_ORDER.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
