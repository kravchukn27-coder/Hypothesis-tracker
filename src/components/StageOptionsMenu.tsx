"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import type { ExperimentStage } from "@/generated/prisma/enums";

/**
 * Floating list of the 6 stage options (PROD-019) — used both by the
 * Calendar's week-cell click and the detail card's per-week editor, so
 * "pick a stage" always looks and behaves the same.
 */
export function StageOptionsMenu({
  onSelect,
  onClose,
}: {
  onSelect: (stage: ExperimentStage) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const dismissTimer = useRef<number | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);

  const close = useCallback((afterClose?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const finish = () => {
      afterClose?.();
      onClose();
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    setClosing(true);
    dismissTimer.current = window.setTimeout(finish, 120);
  }, [onClose]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    };
  }, [close]);

  return (
    <div
      ref={menuRef}
      onMouseLeave={() => close()}
      className={`motion-popover-enter absolute left-0 top-full z-20 mt-1 w-36 rounded-md border border-white/70 bg-white/92 p-1 shadow-lg backdrop-blur-md ${
        closing ? "motion-popover-exit" : ""
      }`}
    >
      {STAGE_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => close(() => onSelect(s))}
          className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
        >
          {STAGE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
