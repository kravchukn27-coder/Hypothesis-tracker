"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConvertToExperimentModal } from "./ConvertToExperimentModal";
import type { HypothesisStatus } from "@/generated/prisma/enums";

/**
 * Shows the "convert to experiment?" prompt on the hypothesis detail
 * page after a status-changing save (see BUG-001). `updateHypothesis`
 * redirects here with `?promptExperiment=1` when the rule in
 * `shouldPromptExperimentConversion` says to; this component shows the
 * modal on mount and strips the flag from the URL so a page refresh
 * doesn't re-show it.
 */
export function ExperimentPromptGate({
  hypothesisId,
  hypothesisName,
  status,
}: {
  hypothesisId: string;
  hypothesisName: string;
  status: HypothesisStatus;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldShow = searchParams.get("promptExperiment") === "1";
  const [open, setOpen] = useState(shouldShow);

  useEffect(() => {
    if (shouldShow) {
      router.replace(`/backlog/${hypothesisId}`, { scroll: false });
    }
    // Only strip the URL once, on mount for this navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <ConvertToExperimentModal
      hypothesisId={hypothesisId}
      hypothesisName={hypothesisName}
      status={status}
      onDismiss={() => setOpen(false)}
    />
  );
}
