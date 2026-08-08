"use client";

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
  return (
    <div
      onMouseLeave={onClose}
      className="absolute left-0 top-full z-20 mt-1 w-36 rounded-md border border-zinc-200 bg-white p-1 shadow-lg"
    >
      {STAGE_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
        >
          {STAGE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
