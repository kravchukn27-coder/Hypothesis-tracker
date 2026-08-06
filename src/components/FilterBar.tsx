"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type FilterField = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  /** Value treated as "unset" — no empty/"Все" option shown, not counted as an active filter. */
  defaultValue?: string;
};

export function FilterBar({ fields }: { fields: FilterField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasActiveFilters = fields.some(
    (f) => (searchParams.get(f.name) ?? f.defaultValue ?? "") !== (f.defaultValue ?? ""),
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {fields.map((field) => (
        <select
          key={field.name}
          value={searchParams.get(field.name) ?? field.defaultValue ?? ""}
          onChange={(e) => updateParam(field.name, e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none transition-colors focus:border-zinc-900"
        >
          {!field.defaultValue && <option value="">{field.label}: все</option>}
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {field.defaultValue ? `${field.label}: ${opt.label}` : opt.label}
            </option>
          ))}
        </select>
      ))}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
