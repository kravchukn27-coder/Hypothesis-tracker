"use client";

import { useActionState, useEffect, useState } from "react";
import {
  computeScore,
  SCALE_VALUES,
  STATUS_BADGE_CLASSES,
  STATUS_ICONS,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/lib/hypothesis";
import { Field } from "@/components/Field";
import { FormSection } from "@/components/FormSection";
import { FIELD_CLASSES, Input, Select, Textarea } from "@/components/Input";
import { FunnelLevelField } from "@/components/FunnelLevelField";
import { IconSelect } from "@/components/IconSelect";
import { StickyFormSubmit } from "@/components/StickyFormSubmit";
import { useToast } from "@/components/toast/ToastProvider";
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
  const { showToast } = useToast();

  useEffect(() => {
    if (state.error) showToast(state.error, "error");
  }, [state.error, showToast]);

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
    <form action={formAction} className="flex flex-col gap-8 rounded-xl border border-zinc-200 bg-white p-5 pb-24 sm:p-7 sm:pb-24">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/20">
          {state.error}
        </p>
      )}

      <FormSection title="Основное">
        <Field label="Название" htmlFor="name" required>
          <Input
            id="name"
            name="name"
            defaultValue={values.name}
            required
            placeholder="Короткое название гипотезы"
          />
        </Field>

        <Field label="Описание" htmlFor="text" required>
          <Textarea
            id="text"
            name="text"
            defaultValue={values.text}
            required
            rows={6}
            placeholder="Если мы сделаем X, то метрика Y вырастет, потому что..."
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Funnel Level">
            <FunnelLevelField funnelLevels={funnelLevels} defaultValue={values.funnelLevelName} />
          </Field>
          <Field label="Status" htmlFor="status">
            <IconSelect
              id="status"
              name="status"
              value={status}
              options={STATUS_ORDER}
              labels={STATUS_LABELS}
              icon={STATUS_ICONS[status]}
              colorClasses={STATUS_BADGE_CLASSES[status]}
              variant="field"
              onChange={setStatus}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Оценка">
        <input type="hidden" name="conversion" value={values.conversion} />
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2.5 font-medium">
                  Impact<span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
                </th>
                <th className="px-3 py-2.5 font-medium">
                  Effort<span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
                </th>
                <th className="px-3 py-2.5 font-medium">
                  Трафик (Reach)<span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
                </th>
                <th className="px-3 py-2.5 font-medium">
                  Confidence<span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
                </th>
                <th className="px-3 py-2.5 text-center font-medium">
                  <span className="sr-only">Score</span>
                  <span aria-hidden="true">=</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 align-middle">
                  <ScaleSelect aria-label="Impact" name="impact" value={impact} onChange={setImpact} />
                </td>
                <td className="px-3 py-2 align-middle">
                  <ScaleSelect aria-label="Effort" name="effort" value={effort} onChange={setEffort} />
                </td>
                <td className="px-3 py-2 align-middle">
                  <PercentInput aria-label="Трафик (Reach)" name="reach" value={reachPct} onChange={setReachPct} />
                </td>
                <td className="px-3 py-2 align-middle">
                  <PercentInput
                    aria-label="Confidence"
                    name="confidence"
                    value={confidencePct}
                    onChange={setConfidencePct}
                  />
                </td>
                <td className="border-l border-zinc-200 bg-zinc-100/70 py-2 pl-4 pr-3 align-middle">
                  <div className="inline-flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-lg bg-zinc-900 px-3 py-1.5 shadow-sm">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Score</span>
                    <output
                      aria-label="Score"
                      title="Impact × Confidence × Reach ÷ Effort"
                      className="text-xl font-bold leading-none tabular-nums text-white"
                    >
                      {score.toFixed(2)}
                    </output>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </FormSection>

      <FormSection title="Дополнительно">
        {status === "DONE" && (
          <Field label="Result" htmlFor="result">
            <Textarea
              id="result"
              name="result"
              defaultValue={values.result}
              rows={3}
              placeholder="Что получилось по факту"
            />
          </Field>
        )}

        <Field label="Comment" htmlFor="comment">
          <Textarea id="comment" name="comment" defaultValue={values.comment} rows={3} />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Моделирование" htmlFor="modeling">
            <Textarea id="modeling" name="modeling" defaultValue={values.modeling} rows={3} />
          </Field>
          <Field label="Выборка (users)" htmlFor="sampleSize">
            <Textarea id="sampleSize" name="sampleSize" defaultValue={values.sampleSize} rows={3} />
          </Field>
        </div>

        <Field label="Task (ссылка)" htmlFor="taskUrl">
          <Input
            id="taskUrl"
            name="taskUrl"
            type="url"
            defaultValue={values.taskUrl}
            placeholder="https://linear.app/..."
          />
        </Field>
      </FormSection>

      <StickyFormSubmit pending={pending} label={submitLabel} />
    </form>
  );
}

// UI-024: Impact/Effort moved from a 5-button picker to a compact
// dropdown so the whole scoring row fits as one table row in the
// form's max-w-2xl width — still constrained to SCALE_VALUES (1-5).
function ScaleSelect({
  name,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  "aria-label": string;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      name={name}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-16"
    >
      {SCALE_VALUES.map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </Select>
  );
}

function PercentInput({
  name,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  "aria-label": string;
}) {
  return (
    <div className="relative w-20">
      <input
        aria-label={ariaLabel}
        name={name}
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${FIELD_CLASSES} pr-6`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-zinc-400">
        %
      </span>
    </div>
  );
}
