"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

export function HeaderMultiFilter({
  name,
  label,
  options,
  iconPosition = "start",
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  iconPosition?: "start" | "end";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = new Set(searchParams.getAll(name));
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function updateAnchor() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const panelWidth = 208;
    const gutter = 8;
    setAnchor({
      top: rect.bottom + gutter,
      left: Math.min(Math.max(rect.left, gutter), window.innerWidth - panelWidth - gutter),
    });
  }

  function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    updateAnchor();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("scroll", updateAnchor, true);
    window.addEventListener("resize", updateAnchor);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", updateAnchor, true);
      window.removeEventListener("resize", updateAnchor);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, selected.size]);

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
    <div className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-label={label ? undefined : "Фильтр"}
        title={label ? undefined : "Фильтр"}
        className={`inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-zinc-200 ${selected.size ? "text-zinc-900" : ""}`}
      >
        {iconPosition === "start" && <Filter aria-hidden className="size-3" strokeWidth={2} />}
        {label}{selected.size ? ` · ${selected.size}` : ""}
        {iconPosition === "end" && <Filter aria-hidden className="size-3" strokeWidth={2} />}
      </button>
      {open && anchor && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: anchor.top, left: anchor.left }}
          className="z-40 w-52 rounded-lg border border-zinc-200 bg-white p-2 text-sm font-normal normal-case tracking-normal text-zinc-700 shadow-lg"
        >
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50">
              <input type="checkbox" checked={selected.has(option.value)} onChange={() => toggle(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
