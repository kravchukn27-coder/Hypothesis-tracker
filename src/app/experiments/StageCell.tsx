"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExperimentStage } from "./actions";
import { ArchiveExperimentModal } from "./ArchiveExperimentModal";
import {
  STAGE_BADGE_CLASSES,
  STAGE_ICONS,
  STAGE_LABELS,
  STAGE_ORDER,
  shouldPromptArchiveExperiment,
} from "@/lib/experiment";
import { IconSelect } from "@/components/IconSelect";
import type { ExperimentStage } from "@/generated/prisma/enums";

export function StageCell({
  experimentId,
  experimentName,
  stage,
  archived,
}: {
  experimentId: string;
  experimentName: string;
  stage: ExperimentStage;
  archived: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(stage);
  const [pending, startTransition] = useTransition();
  const [showArchivePrompt, setShowArchivePrompt] = useState(false);

  function handleChange(next: ExperimentStage) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      await updateExperimentStage(experimentId, next);
      router.refresh();
      if (next !== previous && shouldPromptArchiveExperiment(next, archived)) {
        setShowArchivePrompt(true);
      }
    });
  }

  return (
    <span>
      <IconSelect
        value={current}
        options={STAGE_ORDER}
        labels={STAGE_LABELS}
        icon={STAGE_ICONS[current]}
        colorClasses={STAGE_BADGE_CLASSES[current]}
        disabled={pending}
        onChange={handleChange}
      />

      {showArchivePrompt && (
        <ArchiveExperimentModal
          experimentId={experimentId}
          experimentName={experimentName}
          onDismiss={() => setShowArchivePrompt(false)}
        />
      )}
    </span>
  );
}
