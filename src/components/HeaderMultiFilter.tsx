"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

export function HeaderMultiFilter({ name, label, options }: { name: string; label: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = new Set(searchParams.getAll(name));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggle(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const next = new Set(params.getAll(name));
    if (next.has(value)) next.delete(value); else next.add(value);
    params.delete(name);
    [...next].forEach((item) => params.append(name, item));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    // UI: `normal-case tracking-normal` lives only on the dropdown panel
    // now, not this wrapper — the trigger button needs to keep inheriting
    // the table header's uppercase/tracking styling so it reads as the
    // same kind of header as the plain SortableHeader sort links next to
    // it; only the popup's own option labels should stay sentence-case.
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label ? undefined : "Фильтр"}
        title={label ? undefined : "Фильтр"}
        className={`inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-zinc-200 ${selected.size ? "text-zinc-900" : ""}`}
      >
        <Filter aria-hidden className="size-3" strokeWidth={2} />
        {label}{selected.size ? ` · ${selected.size}` : ""}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-52 rounded-lg border border-zinc-200 bg-white p-2 text-sm font-normal normal-case tracking-normal text-zinc-700 shadow-lg">
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50">
              <input type="checkbox" checked={selected.has(option.value)} onChange={() => toggle(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
