"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/backlog", label: "Backlog" },
  { href: "/calendar", label: "Calendar" },
  { href: "/users", label: "Пользователи" },
  { href: "/activity", label: "События" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    // Same pill-toggle language as FilterBar's quickFilters (Experiments'
    // "Активные"/"Завершённые") — reused here instead of inventing a new
    // button style for top-level nav.
    <nav className="flex gap-2">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
              active
                ? "bg-zinc-900 text-white ring-zinc-900"
                : "bg-white text-zinc-600 ring-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
