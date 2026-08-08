"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SelectionContextValue = {
  active: boolean;
  toggleActive: () => void;
  selected: Set<string>;
  toggleRow: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  allIds: string[];
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleActive() {
    setActive((a) => !a);
    setSelected(new Set());
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }

  function clear() {
    setSelected(new Set());
  }

  const value = { active, toggleActive, selected, toggleRow, toggleAll, clear, allIds: ids };

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within a SelectionProvider");
  return ctx;
}

export function SelectModeToggle({ className }: { className?: string }) {
  const { active, toggleActive } = useSelection();
  return (
    <button
      type="button"
      onClick={toggleActive}
      className={
        className ??
        "rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      }
    >
      {active ? "Отменить" : "Изменить"}
    </button>
  );
}

export function SelectAllCheckbox() {
  const { active, selected, toggleAll, allIds } = useSelection();
  if (!active) return null;
  return (
    <input
      type="checkbox"
      aria-label="Выбрать все"
      checked={selected.size > 0 && selected.size === allIds.length}
      onChange={toggleAll}
      className="size-4 rounded border-zinc-300"
    />
  );
}

export function RowCheckbox({ id }: { id: string }) {
  const { active, selected, toggleRow } = useSelection();
  if (!active) return null;
  return (
    <input
      type="checkbox"
      aria-label="Выбрать строку"
      checked={selected.has(id)}
      onChange={(e) => {
        e.stopPropagation();
        toggleRow(id);
      }}
      onClick={(e) => e.stopPropagation()}
      className="size-4 rounded border-zinc-300"
    />
  );
}
