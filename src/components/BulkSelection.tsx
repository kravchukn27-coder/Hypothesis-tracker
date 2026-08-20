"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

type Listener = () => void;

/**
 * TECH-017: selected-row membership lives outside React state, in a
 * small external store. `toggleRow` used to live in a `useState<Set>`
 * whose new reference flowed through Context on every toggle — Context
 * re-renders *every* consumer on a new value regardless of which field
 * it actually reads, so one checkbox click re-rendered every row.
 * `RowCheckbox` now subscribes to just its own id's boolean membership
 * via `useSyncExternalStore`, which React compares by value (not
 * reference) — only the row whose membership actually flipped
 * re-renders.
 */
class SelectionStore {
  private selected = new Set<string>();
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    for (const listener of this.listeners) listener();
  }

  has = (id: string): boolean => this.selected.has(id);

  getSelected = (): Set<string> => this.selected;

  toggleRow = (id: string): void => {
    const next = new Set(this.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected = next;
    this.notify();
  };

  toggleAll = (allIds: string[]): void => {
    this.selected = this.selected.size === allIds.length ? new Set() : new Set(allIds);
    this.notify();
  };

  clear = (): void => {
    this.selected = new Set();
    this.notify();
  };
}

type SelectionContextValue = {
  active: boolean;
  toggleActive: () => void;
  toggleRow: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  allIds: string[];
  store: SelectionStore;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [store] = useState(() => new SelectionStore());

  const toggleActive = useCallback(() => {
    setActive((a) => !a);
    store.clear();
  }, [store]);

  const toggleRow = useCallback((id: string) => store.toggleRow(id), [store]);
  const toggleAll = useCallback(() => store.toggleAll(ids), [store, ids]);
  const clear = useCallback(() => store.clear(), [store]);

  const value = useMemo<SelectionContextValue>(
    () => ({ active, toggleActive, toggleRow, toggleAll, clear, allIds: ids, store }),
    [active, toggleActive, toggleRow, toggleAll, clear, ids, store],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

function useSelectionContext() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within a SelectionProvider");
  return ctx;
}

/** Public hook — same shape as before the TECH-017 refactor. */
export function useSelection() {
  const { active, toggleActive, toggleRow, toggleAll, clear, allIds, store } = useSelectionContext();
  const selected = useSyncExternalStore(store.subscribe, store.getSelected, store.getSelected);
  return { active, toggleActive, selected, toggleRow, toggleAll, clear, allIds };
}

export function SelectModeToggle({ className }: { className?: string }) {
  const { active, toggleActive } = useSelectionContext();
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
  const { active, toggleRow, store } = useSelectionContext();
  const isSelected = useSyncExternalStore(
    store.subscribe,
    () => store.has(id),
    () => store.has(id),
  );
  if (!active) return null;
  return (
    <input
      type="checkbox"
      aria-label="Выбрать строку"
      checked={isSelected}
      onChange={(e) => {
        e.stopPropagation();
        toggleRow(id);
      }}
      onClick={(e) => e.stopPropagation()}
      className="size-4 rounded border-zinc-300"
    />
  );
}
