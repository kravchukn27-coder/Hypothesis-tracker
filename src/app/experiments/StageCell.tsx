"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExperimentStage } from "./actions";
import { ArchiveExperimentModal } from "./ArchiveExperimentModal";
import {
  NONE_STAGE_COLOR_CLASSES,
  NONE_STAGE_ICON,
  STAGE_BADGE_CLASSES,
  STAGE_ICONS,
  STAGE_LABELS,
  STAGE_ORDER,
  shouldPromptArchiveExperiment,
} from "@/lib/experiment";
import { IconSelect } from "@/components/IconSelect";
import { HideFromCalendarModal } from "@/components/HideFromCalendarModal";
import type { ExperimentStage } from "@/generated/prisma/enums";

// TECH-005: same "—" sentinel as ExperimentForm's StageField — an
// experiment with no weeks can genuinely have no status yet.
const STAGE_CELL_OPTIONS = ["NONE", ...STAGE_ORDER] as const;
type StageCellOption = (typeof STAGE_CELL_OPTIONS)[number];
const STAGE_CELL_LABELS: Record<StageCellOption, string> = { NONE: "—", ...STAGE_LABELS };
const STAGE_CELL_ICONS: Record<StageCellOption, typeof STAGE_ICONS[ExperimentStage]> = {
  NONE: NONE_STAGE_ICON,
  ...STAGE_ICONS,
};
const STAGE_CELL_COLORS: Record<StageCellOption, string> = { NONE: NONE_STAGE_COLOR_CLASSES, ...STAGE_BADGE_CLASSES };

export function StageCell({
  experimentId,
  experimentName,
  stage,
  archived,
  onDoneModal = "archive",
}: {
  experimentId: string;
  experimentName: string;
  stage: ExperimentStage | null;
  archived: boolean;
  /** BUG-014: the detail card wants the same "убрать из календаря?"
   * prompt Calendar/`ExperimentWeekStagesEditor` show on reaching
   * Done, not the list's archive prompt — everything else about the
   * cell (writing the current week, the "just became Done" trigger)
   * stays identical between the two variants. */
  onDoneModal?: "archive" | "hide";
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<StageCellOption>(stage ?? "NONE");
  const [pending, startTransition] = useTransition();
  const [showArchivePrompt, setShowArchivePrompt] = useState(false);
  const [showHidePrompt, setShowHidePrompt] = useState(false);

  function handleChange(next: StageCellOption) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      await updateExperimentStage(experimentId, next);
      router.refresh();
      if (next !== previous && next !== "NONE" && shouldPromptArchiveExperiment(next, archived)) {
        if (onDoneModal === "hide") setShowHidePrompt(true);
        else setShowArchivePrompt(true);
      }
    });
  }

  return (
    <span>
      <IconSelect
        value={current}
        options={STAGE_CELL_OPTIONS}
        labels={STAGE_CELL_LABELS}
        icon={STAGE_CELL_ICONS[current]}
        colorClasses={STAGE_CELL_COLORS[current]}
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

      {showHidePrompt && (
        <HideFromCalendarModal
          experimentId={experimentId}
          experimentName={experimentName}
          onDismiss={() => setShowHidePrompt(false)}
        />
      )}
    </span>
  );
}
