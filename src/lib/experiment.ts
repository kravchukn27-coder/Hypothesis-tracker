import { ExperimentStage, ExperimentStatus } from "@/generated/prisma/enums";

export const EXPERIMENT_STATUS_LABELS: Record<ExperimentStatus, string> = {
  DEV: "Dev",
  EXPERIMENT: "Experiment",
  DONE: "Done",
};

export const EXPERIMENT_STATUS_ORDER: ExperimentStatus[] = ["DEV", "EXPERIMENT", "DONE"];

export const EXPERIMENT_STATUS_BADGE_CLASSES: Record<ExperimentStatus, string> = {
  DEV: "bg-amber-50 text-amber-700 ring-amber-600/20",
  EXPERIMENT: "bg-blue-50 text-blue-700 ring-blue-600/20",
  DONE: "bg-zinc-900 text-white ring-zinc-900/10",
};

export const STAGE_LABELS: Record<ExperimentStage, string> = {
  DISCOVERY: "Discovery",
  DESIGN: "Design",
  DEVELOPMENT: "Development",
  EXPERIMENTATION: "Experimentation",
  ANALYSIS: "Analysis",
};

export const STAGE_ORDER: ExperimentStage[] = [
  "DISCOVERY",
  "DESIGN",
  "DEVELOPMENT",
  "EXPERIMENTATION",
  "ANALYSIS",
];

export const STAGE_BADGE_CLASSES: Record<ExperimentStage, string> = {
  DISCOVERY: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  DESIGN: "bg-violet-50 text-violet-700 ring-violet-600/20",
  DEVELOPMENT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  EXPERIMENTATION: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ANALYSIS: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const STAGE_BAR_CLASSES: Record<ExperimentStage, string> = {
  DISCOVERY: "bg-zinc-400",
  DESIGN: "bg-violet-500",
  DEVELOPMENT: "bg-amber-500",
  EXPERIMENTATION: "bg-blue-500",
  ANALYSIS: "bg-emerald-500",
};

export const NO_STAGE_BAR_CLASS = "bg-zinc-300";

export function formatDateRange(start: Date | null, end: Date | null): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `с ${fmt(start)}`;
  if (end) return `до ${fmt(end)}`;
  return "—";
}
