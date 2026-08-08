"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArchiveHypothesisModal } from "./ArchiveHypothesisModal";

/**
 * Shows the "archive this?" prompt on the hypothesis detail page after
 * a status-changing save reaches Done (PROD-018, mirrors BUG-001's
 * ExperimentPromptGate). `updateHypothesis` redirects here with
 * `?promptArchive=1` when `shouldPromptArchiveHypothesis` says to.
 */
export function ArchivePromptGate({
  hypothesisId,
  hypothesisName,
}: {
  hypothesisId: string;
  hypothesisName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldShow = searchParams.get("promptArchive") === "1";
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
    <ArchiveHypothesisModal
      hypothesisId={hypothesisId}
      hypothesisName={hypothesisName}
      onDismiss={() => setOpen(false)}
    />
  );
}
