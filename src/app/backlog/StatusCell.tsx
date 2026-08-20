"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHypothesisStatus } from "./actions";
import { ArchiveHypothesisModal } from "./ArchiveHypothesisModal";
import {
  STATUS_BADGE_CLASSES,
  STATUS_ICONS,
  STATUS_LABELS,
  STATUS_ORDER,
  shouldPromptArchiveHypothesis,
} from "@/lib/hypothesis";
import { IconSelect } from "@/components/IconSelect";
import { useToast } from "@/components/toast/ToastProvider";
import type { HypothesisStatus } from "@/generated/prisma/enums";

export function StatusCell({
  hypothesisId,
  hypothesisName,
  status,
  archived,
}: {
  hypothesisId: string;
  hypothesisName: string;
  status: HypothesisStatus;
  archived: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [showArchivePrompt, setShowArchivePrompt] = useState(false);
  const { showToast } = useToast();

  function handleChange(next: HypothesisStatus) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await updateHypothesisStatus(hypothesisId, next);
      if (result?.error) {
        setCurrent(previous);
        showToast(result.error, "error");
        return;
      }
      router.refresh();
      if (next === previous) return;
      if (shouldPromptArchiveHypothesis(next, archived)) {
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
