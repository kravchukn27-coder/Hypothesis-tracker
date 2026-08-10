"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type FilterField = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  /** Value treated as "unset" — no empty/"Все" option shown, not counted as an active filter. */
  defaultValue?: string;
};

export type QuickFilter = {
  value: string;
  label: string;
};

export function FilterBar({
  fields,
  search,
  quickFilters,
}: {
  fields: FilterField[];
  search?: { name: string; placeholder: string; ariaLabel: string };
  quickFilters?: { name: string; options: QuickFilter[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // This is only the in-progress text. The list itself is always derived
  // from the URL after the debounced navigation completes.
  const [searchValue, setSearchValue] = useState(search ? searchParams.get(search.name) ?? "" : "");

  function updateParam(name: string, value: string, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    if (replace) router.replace(href);
    else router.push(href);
  }

  function resetFilters() {
    const params = new URLSearchParams(searchParams.toString());
    fields.forEach((field) => params.delete(field.name));
    if (search) {
      params.delete(search.name);
      setSearchValue("");
    }
    if (quickFilters) params.delete(quickFilters.name);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function scheduleSearch(value: string) {
    setSearchValue(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => updateParam(search!.name, value.trim(), true), 250);
  }

  const hasActiveFilters = fields.some(
    (f) => (searchParams.get(f.name) ?? f.defaultValue ?? "") !== (f.defaultValue ?? ""),
  ) || Boolean(search && searchParams.get(search.name)) || Boolean(quickFilters && searchParams.get(quickFilters.name));

  return (
    <div className="flex flex-wrap items-center gap-3">
      {search && (
        <label className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => scheduleSearch(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.ariaLabel}
            className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pr-3 pl-9 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
        </label>
      )}
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
      {quickFilters && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Быстрые срезы">
          {quickFilters.options.map((option) => {
            const active = searchParams.get(quickFilters.name) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => updateParam(quickFilters.name, active ? "" : option.value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${active ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-600 ring-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
