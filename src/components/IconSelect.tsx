"use client";

import { ChevronDown, Lock, type LucideIcon } from "lucide-react";
import { BADGE_SHAPE_CLASSES } from "./Badge";

// Shared inline-edit pill-select with a leading status/stage icon
// (BUG-002 fix). Native <select> chrome (internal text padding, the
// browser's own dropdown arrow) varies enough across browsers/devices
// that a hand-tuned pl-N number can look fine in one renderer and
// clip the icon into the text in another — appearance-none removes
// that native chrome entirely so our own padding/icon math is the
// only thing determining layout, everywhere.
// UI-017: full-size variant for detail-form use, sized to match its
// row neighbor (`FIELD_CLASSES` in src/components/Input.tsx — same
// w-full/rounded-lg/py-2/text-sm/shadow-sm box) instead of the compact
// pill. `border-transparent` (not `border-0`) keeps the same 1px
// border-box height as a real bordered `<select>` while staying
// invisible — the color/ring still comes from `colorClasses`.
const FIELD_VARIANT_CLASSES =
  "w-full rounded-lg border border-transparent py-2 pr-9 pl-9 text-sm font-medium shadow-sm";

export function IconSelect<T extends string>({
  id,
  name,
  value,
  options,
  labels,
  icon: Icon,
  colorClasses,
  disabled,
  locked,
  title,
  variant = "pill",
  onChange,
}: {
  /** Set when used as a native form field (e.g. in a detail form) so the
   * value submits with the surrounding `<form>`; omit for list-row usage
   * that saves via its own onChange handler instead. */
  id?: string;
  name?: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  icon: LucideIcon;
  colorClasses: string;
  disabled?: boolean;
  /** BUG-005: true when disabled because editing happens elsewhere
   * (e.g. PROD-019's week-tracked experiments) rather than a transient
   * save-in-progress `disabled` — swaps the chevron for a lock icon so
   * that's obvious at a glance, not just on hover via `title`. */
  locked?: boolean;
  title?: string;
  /** UI-017: "pill" (default) is the compact list-row shape
   * (`StatusCell`/`StageCell`); "field" fills its container and matches
   * a full-size form field's box for use next to one (e.g. Status next
   * to Funnel Level/Автор in the detail forms). */
  variant?: "pill" | "field";
  onChange: (next: T) => void;
}) {
  const isField = variant === "field";
  return (
    <span className={`relative ${isField ? "block w-full" : "inline-block"}`} title={title}>
      <Icon
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${colorClasses} ${
          isField ? "left-3 size-4" : "left-2.5 size-3.5"
        }`}
      />
      {locked ? (
        <Lock
          aria-hidden
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${colorClasses} ${
            isField ? "right-3 size-3.5" : "right-2 size-3"
          }`}
        />
      ) : (
        <ChevronDown
          aria-hidden
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${colorClasses} ${
            isField ? "right-3 size-3.5" : "right-2 size-3"
          }`}
        />
      )}
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        onClick={(e) => e.stopPropagation()}
        className={`${
          isField ? FIELD_VARIANT_CLASSES : `${BADGE_SHAPE_CLASSES} border-0 py-1 pr-7 pl-8`
        } cursor-pointer appearance-none outline-none disabled:cursor-default disabled:opacity-60 [-webkit-appearance:none] ${colorClasses}`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
    </span>
  );
}
