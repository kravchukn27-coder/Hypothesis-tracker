"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function HeaderMultiFilter({ name, label, options }: { name: string; label: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = new Set(searchParams.getAll(name));

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
    <details className="relative inline-block normal-case tracking-normal">
      <summary className={`cursor-pointer list-none rounded px-1 py-0.5 text-xs font-medium hover:bg-zinc-200 ${selected.size ? "text-zinc-900" : ""}`}>
        {label}{selected.size ? ` · ${selected.size}` : ""}
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-52 rounded-lg border border-zinc-200 bg-white p-2 text-sm font-normal text-zinc-700 shadow-lg">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50">
            <input type="checkbox" checked={selected.has(option.value)} onChange={() => toggle(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
