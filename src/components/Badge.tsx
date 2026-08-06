// Shared shape/padding/typography for every status/stage/funnel-level
// tag in the app (UI-011). Per-value color logic stays where it already
// lived (STATUS_BADGE_CLASSES, STAGE_BADGE_CLASSES) — this only unifies
// how those colors get applied.
// Shape without horizontal padding, for callers that need a different
// left/right padding (e.g. an icon-prefixed select) without fighting
// BADGE_BASE_CLASSES's own px-2.5 over the same CSS property.
export const BADGE_SHAPE_CLASSES =
  "inline-flex items-center rounded-full py-0.5 text-xs font-medium ring-1 ring-inset";

export const BADGE_BASE_CLASSES = `${BADGE_SHAPE_CLASSES} px-2.5`;

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
