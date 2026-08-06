import Link from "next/link";

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
