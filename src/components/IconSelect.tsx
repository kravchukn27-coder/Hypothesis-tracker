"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { BADGE_SHAPE_CLASSES } from "./Badge";

// Shared inline-edit pill-select with a leading status/stage icon
// (BUG-002 fix). Native <select> chrome (internal text padding, the
// browser's own dropdown arrow) varies enough across browsers/devices
// that a hand-tuned pl-N number can look fine in one renderer and
// clip the icon into the text in another — appearance-none removes
// that native chrome entirely so our own padding/icon math is the
// only thing determining layout, everywhere.
export function IconSelect<T extends string>({
  id,
  name,
  value,
  options,
  labels,
  icon: Icon,
  colorClasses,
  disabled,
  title,
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
  title?: string;
  onChange: (next: T) => void;
}) {
  return (
    <span className="relative inline-block" title={title}>
      <Icon
        aria-hidden
        className={`pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 ${colorClasses}`}
      />
      <ChevronDown
        aria-hidden
        className={`pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 ${colorClasses}`}
      />
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        onClick={(e) => e.stopPropagation()}
        className={`${BADGE_SHAPE_CLASSES} cursor-pointer appearance-none border-0 py-1 pr-7 pl-8 outline-none disabled:cursor-default disabled:opacity-60 [-webkit-appearance:none] ${colorClasses}`}
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
