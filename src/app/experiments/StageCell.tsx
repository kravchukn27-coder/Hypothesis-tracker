"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExperimentStage } from "./actions";
import { STAGE_BADGE_CLASSES, STAGE_ICONS, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { IconSelect } from "@/components/IconSelect";
import type { ExperimentStage } from "@/generated/prisma/enums";

export function StageCell({
  experimentId,
  stage,
  locked,
}: {
  experimentId: string;
  stage: ExperimentStage;
  /** PROD-019: true once the experiment has per-week stage entries — stage is then derived, edit on the card instead. */
  locked?: boolean;
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
    <span title={locked ? "Управляется по неделям — редактируй на карточке эксперимента" : undefined}>
      <IconSelect
        value={current}
        options={STAGE_ORDER}
        labels={STAGE_LABELS}
        icon={STAGE_ICONS[current]}
        colorClasses={STAGE_BADGE_CLASSES[current]}
        disabled={pending || locked}
        onChange={handleChange}
      />
    </span>
  );
}
