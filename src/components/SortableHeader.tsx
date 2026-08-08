import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type SortDir = "asc" | "desc";

/**
 * Click-to-sort table header. Server-renderable (plain links, no JS) —
 * clicking toggles direction if this column is already active, or
 * applies `defaultDir` if switching to it from another column.
 */
export function SortableHeader({
  label,
  active,
  dir,
  defaultDir = "asc",
  href,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  defaultDir?: SortDir;
  href: (nextDir: SortDir) => string;
}) {
  const nextDir: SortDir = active ? (dir === "asc" ? "desc" : "asc") : defaultDir;
  return (
    <Link
      href={href(nextDir)}
      className={`inline-flex items-center gap-1 hover:text-zinc-900 ${active ? "text-zinc-900" : ""}`}
    >
      {label}
      {active && <span aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>}
    </Link>
  );
}

/**
 * Icon-only click-to-sort affordance for a secondary sort dimension that
 * shares a header cell with a `SortableHeader` (e.g. "Created" piggybacking
 * on the Name column) instead of getting its own table column.
 */
export function SortIcon({
  icon: Icon,
  label,
  active,
  dir,
  defaultDir = "desc",
  href,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  dir: SortDir;
  defaultDir?: SortDir;
  href: (nextDir: SortDir) => string;
}) {
  const nextDir: SortDir = active ? (dir === "asc" ? "desc" : "asc") : defaultDir;
  return (
    <Link
      href={href(nextDir)}
      title={`Sort by ${label}`}
      aria-label={`Sort by ${label}`}
      className={`inline-flex items-center gap-0.5 hover:text-zinc-900 ${active ? "text-zinc-900" : "text-zinc-400"}`}
    >
      <Icon className="size-3.5" />
      {active && (
        <span aria-hidden className="text-[10px]">
          {dir === "asc" ? "↑" : "↓"}
        </span>
      )}
    </Link>
  );
}
