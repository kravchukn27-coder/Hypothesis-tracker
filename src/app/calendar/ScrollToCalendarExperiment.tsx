"use client";

import { useEffect } from "react";

/** Brings the experiment requested from its detail card into view after Calendar renders. */
export function ScrollToCalendarExperiment({ experimentId }: { experimentId: string }) {
  useEffect(() => {
    const row = document.querySelector<HTMLElement>(`[data-experiment-id="${experimentId}"]`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [experimentId]);

  return null;
}
