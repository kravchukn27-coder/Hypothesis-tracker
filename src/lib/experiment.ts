import {
  BarChart3,
  CheckCheck,
  Code2,
  FlaskConical,
  PenTool,
  Search,
  type LucideIcon,
} from "lucide-react";
import { ExperimentStage } from "@/generated/prisma/enums";

// Single merged field (TECH-002): status and stage used to be two
// separate enums that meant the same thing. Labeled "Status" in the
// Experiments list/form, "Stage" in the Calendar — same field, same
// values, same colors everywhere.
export const STAGE_LABELS: Record<ExperimentStage, string> = {
  DISCOVERY: "Discovery",
  DESIGN: "Design",
  DEVELOPMENT: "Development",
  EXPERIMENTATION: "Experimentation",
  ANALYSIS: "Analysis",
  DONE: "Done",
};

export const STAGE_ORDER: ExperimentStage[] = [
  "DISCOVERY",
  "DESIGN",
  "DEVELOPMENT",
  "EXPERIMENTATION",
  "ANALYSIS",
  "DONE",
];

export const STAGE_BADGE_CLASSES: Record<ExperimentStage, string> = {
  DISCOVERY: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  DESIGN: "bg-violet-50 text-violet-700 ring-violet-600/20",
  DEVELOPMENT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  EXPERIMENTATION: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ANALYSIS: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DONE: "bg-zinc-900 text-white ring-zinc-900/10",
};

export const STAGE_BAR_CLASSES: Record<ExperimentStage, string> = {
  DISCOVERY: "bg-zinc-400",
  DESIGN: "bg-violet-500",
  DEVELOPMENT: "bg-amber-500",
  EXPERIMENTATION: "bg-blue-500",
  ANALYSIS: "bg-emerald-500",
  DONE: "bg-zinc-900",
};

// Left-border row accent (UI-008) — same color families as
// STAGE_BADGE_CLASSES, just as a solid border color instead of a
// bg/text/ring triplet.
export const STAGE_BORDER_CLASSES: Record<ExperimentStage, string> = {
  DISCOVERY: "border-zinc-300",
  DESIGN: "border-violet-400",
  DEVELOPMENT: "border-amber-400",
  EXPERIMENTATION: "border-blue-400",
  ANALYSIS: "border-emerald-400",
  DONE: "border-zinc-900",
};

export const STAGE_ICONS: Record<ExperimentStage, LucideIcon> = {
  DISCOVERY: Search,
  DESIGN: PenTool,
  DEVELOPMENT: Code2,
  EXPERIMENTATION: FlaskConical,
  ANALYSIS: BarChart3,
  DONE: CheckCheck,
};

/**
 * PROD-018: prompts to archive once an experiment reaches Done, unless
 * it's already archived. Used from both the Experiments list's inline
 * stage editor and the experiment detail form.
 */
export function shouldPromptArchiveExperiment(stage: ExperimentStage, archived: boolean): boolean {
  return !archived && stage === "DONE";
}

export function formatDateRange(start: Date | null, end: Date | null): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `с ${fmt(start)}`;
  if (end) return `до ${fmt(end)}`;
  return "—";
}
