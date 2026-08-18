"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function WeekStageFilter({
  weekStartISO,
  value,
  options,
}: {
  weekStartISO: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function change(stage: string) {
    const params = new URLSearchParams(searchParams.toString());
    const entries = params.getAll("weekStage").filter((entry) => !entry.startsWith(`${weekStartISO}:`));
    params.delete("weekStage");
    entries.forEach((entry) => params.append("weekStage", entry));
    if (stage) params.append("weekStage", `${weekStartISO}:${stage}`);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <select
      aria-label={`Фильтр этапа на неделю ${weekStartISO}`}
      value={value ?? ""}
      onChange={(event) => change(event.target.value)}
      className="mt-1 w-full min-w-0 bg-transparent text-[10px] font-medium normal-case tracking-normal text-zinc-500 outline-none"
    >
      <option value="">Все</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}
