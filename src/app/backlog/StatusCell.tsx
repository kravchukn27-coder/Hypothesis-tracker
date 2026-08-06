"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHypothesisStatus } from "./actions";
import { ConvertToExperimentModal } from "./ConvertToExperimentModal";
import {
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  STATUS_ORDER,
  shouldPromptExperimentConversion,
} from "@/lib/hypothesis";
import { BADGE_BASE_CLASSES } from "@/components/Badge";
import type { HypothesisStatus } from "@/generated/prisma/enums";

export function StatusCell({
  hypothesisId,
  hypothesisName,
  status,
  hasExperiments,
}: {
  hypothesisId: string;
  hypothesisName: string;
  status: HypothesisStatus;
  hasExperiments: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [showPrompt, setShowPrompt] = useState(false);

  function handleChange(next: HypothesisStatus) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      await updateHypothesisStatus(hypothesisId, next);
      router.refresh();
      if (next !== previous && shouldPromptExperimentConversion(next, hasExperiments)) {
        setShowPrompt(true);
      }
    });
  }

  return (
    <>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as HypothesisStatus)}
        onClick={(e) => e.stopPropagation()}
        className={`${BADGE_BASE_CLASSES} cursor-pointer border-0 outline-none disabled:opacity-60 ${STATUS_BADGE_CLASSES[current]}`}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {showPrompt && (
        <ConvertToExperimentModal
          hypothesisId={hypothesisId}
          hypothesisName={hypothesisName}
          status={current}
          onDismiss={() => setShowPrompt(false)}
        />
      )}
    </>
  );
}
