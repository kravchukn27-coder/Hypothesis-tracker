"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHypothesisStatus } from "./actions";
import { ConvertToExperimentModal } from "./ConvertToExperimentModal";
import {
  STATUS_BADGE_CLASSES,
  STATUS_ICONS,
  STATUS_LABELS,
  STATUS_ORDER,
  shouldPromptExperimentConversion,
} from "@/lib/hypothesis";
import { BADGE_SHAPE_CLASSES } from "@/components/Badge";
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

  const Icon = STATUS_ICONS[current];

  return (
    <>
      <span className="relative inline-block">
        <Icon
          aria-hidden
          className={`pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 ${STATUS_BADGE_CLASSES[current]}`}
        />
        <select
          value={current}
          disabled={pending}
          onChange={(e) => handleChange(e.target.value as HypothesisStatus)}
          onClick={(e) => e.stopPropagation()}
          className={`${BADGE_SHAPE_CLASSES} cursor-pointer border-0 pr-2.5 pl-6 outline-none disabled:opacity-60 ${STATUS_BADGE_CLASSES[current]}`}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </span>

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
