"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArchiveExperimentModal } from "./ArchiveExperimentModal";

/**
 * Shows the "archive this?" prompt on the experiment detail page after
 * a stage-changing save reaches Done (PROD-018, mirrors backlog's
 * ArchivePromptGate / BUG-001's ExperimentPromptGate). `updateExperiment`
 * redirects here with `?promptArchive=1` when
 * `shouldPromptArchiveExperiment` says to.
 */
export function ArchivePromptGate({
  experimentId,
  experimentName,
}: {
  experimentId: string;
  experimentName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldShow = searchParams.get("promptArchive") === "1";
  const [open, setOpen] = useState(shouldShow);

  useEffect(() => {
    if (shouldShow) {
      router.replace(`/experiments/${experimentId}`, { scroll: false });
    }
    // Only strip the URL once, on mount for this navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <ArchiveExperimentModal
      experimentId={experimentId}
      experimentName={experimentName}
      onDismiss={() => setOpen(false)}
    />
  );
}
