import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
      <Link
        href={listHref}
        aria-label={`Вернуться к ${listLabel}`}
        title={`Вернуться к ${listLabel}`}
        className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <Link href={listHref} className="hover:text-zinc-900">
        {listLabel}
      </Link>
      <span aria-hidden>/</span>
      <span className="max-w-xs truncate text-zinc-900">{current}</span>
    </nav>
  );
}
