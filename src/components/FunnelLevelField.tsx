"use client";

import { useState } from "react";
import { Input, Select } from "./Input";

const NEW_FUNNEL_LEVEL_OPTION = "__new__";

/**
 * Select-existing-or-add-new Funnel Level field (PROD-033). Shared by
 * the hypothesis form and the experiment form — Funnel Level is a
 * single value that always mirrors between a hypothesis and every one
 * of its experiments, so both forms edit it the same way and submit
 * the same plain-text `funnelLevel` field for the server to resolve
 * (existing name or newly created one).
 */
export function FunnelLevelField({
  funnelLevels,
  defaultValue,
}: {
  funnelLevels: { name: string }[];
  defaultValue: string;
}) {
  const names = funnelLevels.map((f) => f.name);
  const startsAsNew = defaultValue !== "" && !names.includes(defaultValue);

  const [mode, setMode] = useState<"select" | "new">(startsAsNew ? "new" : "select");
  const [selected, setSelected] = useState(names.includes(defaultValue) ? defaultValue : "");
  const [newName, setNewName] = useState(startsAsNew ? defaultValue : "");

  if (mode === "new") {
    return (
      <div className="flex gap-2">
        <Input
          name="funnelLevel"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Новый Funnel Level"
          autoFocus
        />
        {names.length > 0 && (
          <button
            type="button"
            onClick={() => setMode("select")}
            className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900"
          >
            Отмена
          </button>
        )}
      </div>
    );
  }

  return (
    <Select
      name="funnelLevel"
      value={selected}
      onChange={(e) => {
        if (e.target.value === NEW_FUNNEL_LEVEL_OPTION) {
          setMode("new");
        } else {
          setSelected(e.target.value);
        }
      }}
    >
      <option value="">—</option>
      {names.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      <option value={NEW_FUNNEL_LEVEL_OPTION}>+ Добавить новый...</option>
    </Select>
  );
}
