"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/backlog", label: "Backlog" },
  { href: "/experiments", label: "Experiments" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 text-sm">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "font-medium text-zinc-900" : "text-zinc-500 hover:text-zinc-900"}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
