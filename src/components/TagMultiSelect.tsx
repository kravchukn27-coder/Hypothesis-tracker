"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { BADGE_BASE_CLASSES } from "./Badge";
import { FIELD_CLASSES, Select } from "./Input";

type Option = { id: string; name: string };

const NEW_OPTION = "__new__";

/**
 * Multi-select + add-new tag field (TECH-003). Selected tags render as
 * removable colored chips. Submits two hidden inputs so the server
 * action can tell existing selections apart from brand-new names to
 * create: `${name}Ids` (comma-joined existing tag ids) and `${name}New`
 * (comma-joined new tag names).
 */
export function TagMultiSelect({
  name,
  options,
  initialSelected,
  color,
}: {
  name: string;
  options: Option[];
  initialSelected: Option[];
  color: string;
}) {
  const [selected, setSelected] = useState<Option[]>(initialSelected);
  const [newNames, setNewNames] = useState<string[]>([]);
  const [mode, setMode] = useState<"idle" | "select" | "new">("idle");
  const [newValue, setNewValue] = useState("");

  const selectedIds = new Set(selected.map((o) => o.id));
  const remaining = options.filter((o) => !selectedIds.has(o.id));

  function addExisting(id: string) {
    const opt = options.find((o) => o.id === id);
    if (opt) setSelected((prev) => [...prev, opt]);
    setMode("idle");
  }

  function commitNew() {
    const trimmed = newValue.trim();
    if (trimmed && !newNames.includes(trimmed)) {
      setNewNames((prev) => [...prev, trimmed]);
    }
    setNewValue("");
    setMode("idle");
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={`${name}Ids`} value={selected.map((o) => o.id).join(",")} />
      <input type="hidden" name={`${name}New`} value={newNames.join(",")} />

      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((o) => (
          <span key={o.id} className={`${BADGE_BASE_CLASSES} ${color} gap-1`}>
            {o.name}
            <button
              type="button"
              onClick={() => setSelected((prev) => prev.filter((s) => s.id !== o.id))}
              className="hover:opacity-70"
              aria-label={`Убрать ${o.name}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {newNames.map((n) => (
          <span key={n} className={`${BADGE_BASE_CLASSES} ${color} gap-1`}>
            {n}
            <button
              type="button"
              onClick={() => setNewNames((prev) => prev.filter((x) => x !== n))}
              className="hover:opacity-70"
              aria-label={`Убрать ${n}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        {mode === "idle" && (
          <button
            type="button"
            onClick={() => setMode("select")}
            className="rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
          >
            + Добавить
          </button>
        )}
      </div>

      {mode === "select" && (
        <div className="flex gap-2">
          <Select
            autoFocus
            defaultValue=""
            onChange={(e) => {
              if (e.target.value === NEW_OPTION) setMode("new");
              else addExisting(e.target.value);
            }}
          >
            <option value="" disabled>
              Выбрать...
            </option>
            {remaining.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
            <option value={NEW_OPTION}>+ Добавить новый...</option>
          </Select>
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900"
          >
            Отмена
          </button>
        </div>
      )}

      {mode === "new" && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitNew();
              }
            }}
            placeholder="Новое значение"
            className={FIELD_CLASSES}
          />
          <button
            type="button"
            onClick={commitNew}
            className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900"
          >
            Добавить
          </button>
        </div>
      )}
    </div>
  );
}
