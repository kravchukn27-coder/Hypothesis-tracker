import { ConversionMetric, HypothesisStatus } from "@/generated/prisma/enums";

export function computeScore(input: {
  impact: number;
  confidence: number;
  reach: number;
  effort: number;
}): number {
  if (!input.effort) return 0;
  return (input.impact * input.confidence * input.reach) / input.effort;
}

export const STATUS_LABELS: Record<HypothesisStatus, string> = {
  NEW: "New",
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  ACCEPTED: "Accepted",
  HOLD: "Hold",
  DONE: "Done",
};

export const STATUS_ORDER: HypothesisStatus[] = [
  "NEW",
  "PLANNED",
  "IN_PROGRESS",
  "ACCEPTED",
  "HOLD",
  "DONE",
];

export const STATUS_BADGE_CLASSES: Record<HypothesisStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 ring-blue-600/20",
  PLANNED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-600/20",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  HOLD: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  DONE: "bg-zinc-900 text-white ring-zinc-900/10",
};

export const CONVERSION_LABELS: Record<ConversionMetric, string> = {
  CR: "CR",
  LTV: "LTV",
  CR_LTV: "CR + LTV",
};

export const SCALE_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Single source of truth for the "convert to experiment?" prompt rule
 * (BUG-001): only for the "moving forward" statuses, and only while the
 * hypothesis has no experiments yet. Used from both the Backlog list's
 * inline status editor and the hypothesis detail form.
 */
const PROMPT_WORTHY_STATUSES: HypothesisStatus[] = ["PLANNED", "IN_PROGRESS", "ACCEPTED"];

export function shouldPromptExperimentConversion(
  status: HypothesisStatus,
  hasExperiments: boolean,
): boolean {
  return !hasExperiments && PROMPT_WORTHY_STATUSES.includes(status);
}
