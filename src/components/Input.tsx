// Shared visual treatment for plain text/textarea/select form controls
// (UI-009) — consistent height, border-radius, spacing, and focus state
// across the Hypothesis and Experiment forms. Not used for bespoke
// value-specific widgets (ScaleButtons, SegmentedControl) or the
// color-coded Status/Stage pill-selects (UI-011's Badge system) — those
// stay distinct on purpose.
export const FIELD_CLASSES =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_CLASSES} ${className}`} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_CLASSES} ${className}`} {...props} />;
}

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${FIELD_CLASSES} ${className}`} {...props} />;
}
