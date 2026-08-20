"use client";

import { useEffect, useState } from "react";

const EXIT_DURATION_MS = 160;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Shared dialog shell that preserves a short exit phase before unmounting. */
export function MotionDialog({
  children,
  onDismiss,
  pending = false,
  labelledBy,
  describedBy,
}: {
  children: (controls: { dismiss: (force?: boolean) => void; closing: boolean }) => React.ReactNode;
  onDismiss: () => void;
  pending?: boolean;
  labelledBy: string;
  describedBy?: string;
}) {
  const [closing, setClosing] = useState(false);

  function dismiss(force = false) {
    if ((!force && pending) || closing) return;
    if (prefersReducedMotion()) {
      onDismiss();
      return;
    }
    setClosing(true);
    window.setTimeout(onDismiss, EXIT_DURATION_MS);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  return (
    <div
      className={`motion-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[3px] ${
        closing ? "motion-dialog-backdrop-exit" : "motion-dialog-backdrop-enter"
      }`}
      onClick={() => dismiss()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={`motion-dialog-panel w-full max-w-sm rounded-xl border border-white/70 bg-white/92 p-6 shadow-[0_18px_45px_rgba(24,24,27,0.18)] backdrop-blur-md ${
          closing ? "motion-dialog-panel-exit" : "motion-dialog-panel-enter"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {children({ dismiss, closing })}
      </div>
    </div>
  );
}
