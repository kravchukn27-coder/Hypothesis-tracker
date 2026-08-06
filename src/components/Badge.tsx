// Shared shape/padding/typography for every status/stage/funnel-level
// tag in the app (UI-011). Per-value color logic stays where it already
// lived (STATUS_BADGE_CLASSES, STAGE_BADGE_CLASSES) — this only unifies
// how those colors get applied.
export const BADGE_BASE_CLASSES =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

// Default color for tags with no per-value color mapping (e.g. Funnel
// Level, a free-form table with no fixed palette).
export const NEUTRAL_BADGE_COLOR = "bg-zinc-100 text-zinc-600 ring-zinc-500/20";

export function Badge({
  color = NEUTRAL_BADGE_COLOR,
  className = "",
  children,
}: {
  color?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={`${BADGE_BASE_CLASSES} ${color} ${className}`}>{children}</span>;
}
