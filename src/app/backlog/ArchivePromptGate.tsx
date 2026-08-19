"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArchiveHypothesisModal } from "./ArchiveHypothesisModal";

/**
 * Shows the "archive this?" prompt on the hypothesis detail page after
 * a status-changing save reaches Done (PROD-018, mirrors BUG-001's
 * ExperimentPromptGate). Two triggers: `updateHypothesis` redirects
 * here with `?promptArchive=1` when a direct status edit reaches Done
 * (`shouldPromptArchiveHypothesis`); `alreadyDone` covers the case
 * where the status instead synced to Done from an experiment-side
 * action (Calendar/experiment card/list — none of which redirect
 * here), so the prompt still surfaces the next time this page loads
 * (PROD-026 follow-up).
 */
export function ArchivePromptGate({
  hypothesisId,
  hypothesisName,
  alreadyDone = false,
}: {
  hypothesisId: string;
  hypothesisName: string;
  alreadyDone?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRedirect = searchParams.get("promptArchive") === "1";
  const [open, setOpen] = useState(fromRedirect || alreadyDone);

  useEffect(() => {
    if (fromRedirect) {
      router.replace(`/backlog/${hypothesisId}`, { scroll: false });
    }
    // Only strip the URL once, on mount for this navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <ArchiveHypothesisModal
      hypothesisId={hypothesisId}
      hypothesisName={hypothesisName}
      onDismiss={() => setOpen(false)}
    />
  );
}
