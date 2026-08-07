import Link from "next/link";

export function Breadcrumb({
  listLabel,
  listHref,
  current,
}: {
  listLabel: string;
  listHref: string;
  current: string;
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-zinc-500">
      <Link href={listHref} className="hover:text-zinc-900">
        {listLabel}
      </Link>
      <span aria-hidden>/</span>
      <span className="max-w-xs truncate text-zinc-900">{current}</span>
    </nav>
  );
}
