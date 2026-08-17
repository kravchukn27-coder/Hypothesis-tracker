"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CalendarStageFilter({ value, options }: { value?: string; options: { value: string; label: string }[] }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  return <select aria-label="Фильтр по этапу" value={value ?? ""} onChange={(event) => { const params = new URLSearchParams(searchParams.toString()); if (event.target.value) params.set("stage", event.target.value); else params.delete("stage"); const q = params.toString(); router.push(q ? `${pathname}?${q}` : pathname); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700">
    <option value="">Все этапы</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}
