"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHypothesisStatus } from "./actions";
import { ConvertToExperimentModal } from "./ConvertToExperimentModal";
import { ArchiveHypothesisModal } from "./ArchiveHypothesisModal";
import {
  STATUS_BADGE_CLASSES,
  STATUS_ICONS,
  STATUS_LABELS,
  STATUS_ORDER,
  shouldPromptArchiveHypothesis,
  shouldPromptExperimentConversion,
} from "@/lib/hypothesis";
import { IconSelect } from "@/components/IconSelect";
import type { HypothesisStatus } from "@/generated/prisma/enums";

export function StatusCell({
  hypothesisId,
  hypothesisName,
  status,
  hasExperiments,
  archived,
}: {
  hypothesisId: string;
  hypothesisName: string;
  status: HypothesisStatus;
  hasExperiments: boolean;
  archived: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [showConvertPrompt, setShowConvertPrompt] = useState(false);
  const [showArchivePrompt, setShowArchivePrompt] = useState(false);

  function handleChange(next: HypothesisStatus) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      await updateHypothesisStatus(hypothesisId, next);
      router.refresh();
      if (next === previous) return;
      if (shouldPromptExperimentConversion(next, hasExperiments)) {
        setShowConvertPrompt(true);
      } else if (shouldPromptArchiveHypothesis(next, archived)) {
        setShowArchivePrompt(true);
      }
    });
  }

  return (
    <>
      <IconSelect
        value={current}
        options={STATUS_ORDER}
        labels={STATUS_LABELS}
        icon={STATUS_ICONS[current]}
        colorClasses={STATUS_BADGE_CLASSES[current]}
        disabled={pending}
        onChange={handleChange}
      />

      {showConvertPrompt && (
        <ConvertToExperimentModal
          hypothesisId={hypothesisId}
          hypothesisName={hypothesisName}
          status={current}
          onDismiss={() => setShowConvertPrompt(false)}
        />
      )}

      {showArchivePrompt && (
        <ArchiveHypothesisModal
          hypothesisId={hypothesisId}
          hypothesisName={hypothesisName}
          onDismiss={() => setShowArchivePrompt(false)}
        />
      )}
    </>
  );
}
