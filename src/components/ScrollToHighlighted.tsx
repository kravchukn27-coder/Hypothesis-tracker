"use client";

import { useEffect } from "react";

export const HIGHLIGHT_DURATION_MS = 35_000;

/** Scrolls a highlighted row into view, then clears only its visual marker. */
export function ScrollToHighlighted() {
  useEffect(() => {
    const el = document.querySelector('[data-highlighted="true"]');
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!el) return;

    const timer = window.setTimeout(() => {
      el.removeAttribute("data-highlighted");
    }, HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
