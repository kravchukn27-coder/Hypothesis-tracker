"use client";

import { useActionState, useState } from "react";
import { computeScore, CONVERSION_LABELS, SCALE_VALUES, STATUS_LABELS, STATUS_ORDER } from "@/lib/hypothesis";
import type { HypothesisFormState } from "./actions";
import type { ConversionMetric, HypothesisStatus } from "@/generated/prisma/enums";
import type { FunnelLevel } from "@/generated/prisma/client";

type Initial = {
  name: string;
  text: string;
  funnelLevelName: string;
  conversion: ConversionMetric;
  impact: number;
  effort: number;
  reach: number; // 0-1
  confidence: number; // 0-1
  status: HypothesisStatus;
  result: string;
  comment: string;
  modeling: string;
  sampleSize: string;
  taskUrl: string;
};

const emptyInitial: Initial = {
  name: "",
  text: "",
  funnelLevelName: "",
  conversion: "CR",
  impact: 3,
  effort: 3,
  reach: 0.2,
  confidence: 0.8,
  status: "NEW",
  result: "",
  comment: "",
  modeling: "",
  sampleSize: "",
  taskUrl: "",
};

export function HypothesisForm({
  action,
  funnelLevels,
  initial,
  submitLabel,
}: {
  action: (state: HypothesisFormState, formData: FormData) => Promise<HypothesisFormState>;
  funnelLevels: FunnelLevel[];
  initial?: Partial<Initial>;
  submitLabel: string;
}) {
  const values = { ...emptyInitial, ...initial };
  const [state, formAction, pending] = useActionState(action, {});

  const [impact, setImpact] = useState(values.impact);
  const [effort, setEffort] = useState(values.effort);
  const [reachPct, setReachPct] = useState(Math.round(values.reach * 100));
  const [confidencePct, setConfidencePct] = useState(Math.round(values.confidence * 100));
  const [status, setStatus] = useState<HypothesisStatus>(values.status);

  const score = computeScore({
    impact,
    effort,
    reach: reachPct / 100,
    confidence: confidencePct / 100,
  });

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <div>
          <p className="text-sm font-medium text-zinc-500">Score</p>
          <p className="text-4xl font-semibold tabular-nums text-zinc-900">
            {score.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Impact × Confidence × Reach ÷ Effort — считается автоматически
          </p>
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/20">
          {state.error}
        </p>
      )}

      <Field label="Название" htmlFor="name">
        <input
          id="name"
          name="name"
          defaultValue={values.name}
          required
          placeholder="Короткое название гипотезы"
          className={inputClass}
        />
      </Field>

      <Field label="Гипотеза" htmlFor="text">
        <textarea
          id="text"
          name="text"
          defaultValue={values.text}
          required
          rows={6}
          placeholder="Если мы сделаем X, то метрика Y вырастет, потому что..."
          className={inputClass}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Funnel Level" htmlFor="funnelLevel">
          <input
            id="funnelLevel"
            name="funnelLevel"
            list="funnel-level-options"
            defaultValue={values.funnelLevelName}
            placeholder="Выбери или впиши новый"
            className={inputClass}
          />
          <datalist id="funnel-level-options">
            {funnelLevels.map((level) => (
              <option key={level.id} value={level.name} />
            ))}
          </datalist>
        </Field>

        <Field label="Status" htmlFor="status">
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as HypothesisStatus)}
            className={inputClass}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Conversion">
        <SegmentedControl name="conversion" defaultValue={values.conversion} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Impact">
          <ScaleButtons name="impact" value={impact} onChange={setImpact} />
        </Field>
        <Field label="Effort">
          <ScaleButtons name="effort" value={effort} onChange={setEffort} />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="% Traffic (Reach)" htmlFor="reach">
          <PercentInput
            id="reach"
            name="reach"
            value={reachPct}
            onChange={setReachPct}
          />
        </Field>
        <Field label="Confidence" htmlFor="confidence">
          <PercentInput
            id="confidence"
            name="confidence"
            value={confidencePct}
            onChange={setConfidencePct}
          />
        </Field>
      </div>

      {status === "DONE" && (
        <Field label="Result" htmlFor="result">
          <textarea
            id="result"
            name="result"
            defaultValue={values.result}
            rows={3}
            placeholder="Что получилось по факту"
            className={inputClass}
          />
        </Field>
      )}

      <Field label="Comment" htmlFor="comment">
        <textarea
          id="comment"
          name="comment"
          defaultValue={values.comment}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Моделирование" htmlFor="modeling">
          <textarea
            id="modeling"
            name="modeling"
            defaultValue={values.modeling}
            rows={3}
            className={inputClass}
          />
        </Field>
        <Field label="Выборка (users)" htmlFor="sampleSize">
          <input
            id="sampleSize"
            name="sampleSize"
            defaultValue={values.sampleSize}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Task (ссылка)" htmlFor="taskUrl">
        <input
          id="taskUrl"
          name="taskUrl"
          type="url"
          defaultValue={values.taskUrl}
          placeholder="https://linear.app/..."
          className={inputClass}
        />
      </Field>

      <div className="flex justify-end gap-3 border-t border-zinc-200 pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Сохраняем..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function ScaleButtons({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {SCALE_VALUES.map((n) => (
        <label key={n} className="flex-1">
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            className="peer sr-only"
          />
          <div className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium text-zinc-600 transition-colors peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white hover:border-zinc-400">
            {n}
          </div>
        </label>
      ))}
    </div>
  );
}

const CONVERSION_OPTIONS: ConversionMetric[] = ["CR", "LTV", "CR_LTV"];

function SegmentedControl({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: ConversionMetric;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="inline-flex w-fit rounded-lg border border-zinc-300 p-1">
      {CONVERSION_OPTIONS.map((opt) => (
        <label key={opt}>
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => setValue(opt)}
            className="peer sr-only"
          />
          <div className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors peer-checked:bg-zinc-900 peer-checked:text-white">
            {CONVERSION_LABELS[opt]}
          </div>
        </label>
      ))}
    </div>
  );
}

function PercentInput({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${inputClass} pr-8`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400">
        %
      </span>
    </div>
  );
}
