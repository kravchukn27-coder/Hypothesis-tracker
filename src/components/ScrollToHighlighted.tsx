"use client";

import { useEffect } from "react";

/** Scrolls the first `[data-highlighted="true"]` row into view on mount. */
export function ScrollToHighlighted() {
  useEffect(() => {
    const el = document.querySelector('[data-highlighted="true"]');
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return null;
}
