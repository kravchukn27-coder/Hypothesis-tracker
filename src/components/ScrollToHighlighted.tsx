"use client";

import { useEffect } from "react";

export const HIGHLIGHT_DURATION_MS = 5_000;
export const HIGHLIGHT_ARRIVAL_DURATION_MS = 620;

/** Scrolls a focused row into view and plays its arrival signal only once per tab. */
export function ScrollToHighlighted() {
  useEffect(() => {
    const el = document.querySelector('[data-highlighted="true"]');
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });

    const key = `context-highlight:${window.location.pathname}:${window.location.search}`;
    let arrivalTimer: number | undefined;
    let clearTimer: number | undefined;
    try {
      if (!reducedMotion && !window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, "1");
        el.setAttribute("data-highlight-arrival", "true");
        arrivalTimer = window.setTimeout(() => el.removeAttribute("data-highlight-arrival"), HIGHLIGHT_ARRIVAL_DURATION_MS);
      }
    } catch {
      if (!reducedMotion) el.setAttribute("data-highlight-arrival", "true");
    }

    if (!reducedMotion) {
      clearTimer = window.setTimeout(() => el.removeAttribute("data-highlighted"), HIGHLIGHT_DURATION_MS);
    }

    return () => {
      if (arrivalTimer) window.clearTimeout(arrivalTimer);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, []);

  return null;
}
