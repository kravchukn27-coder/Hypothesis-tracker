"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  EXPERIMENT_STATUS_LABELS,
  EXPERIMENT_STATUS_ORDER,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/experiment";
import type { ExperimentFormState } from "./actions";
import type { ExperimentStage, ExperimentStatus } from "@/generated/prisma/enums";

type HypothesisOption = { id: string; name: string };

type Initial = {
  name: string;
  hypothesisId: string;
  status: ExperimentStatus;
  author: string;
  targeting: string;
  segment: string;
  stage: ExperimentStage | "";
  startDate: string; // yyyy-mm-dd
  endDate: string;
};

const emptyInitial: Initial = {
  name: "",
  hypothesisId: "",
  status: "DEV",
  author: "",
  targeting: "",
  segment: "",
  stage: "",
  startDate: "",
  endDate: "",
};

export function ExperimentForm({
  action,
  hypotheses,
  initial,
  submitLabel,
}: {
  action: (state: ExperimentFormState, formData: FormData) => Promise<ExperimentFormState>;
  hypotheses: HypothesisOption[];
  initial?: Partial<Initial>;
  submitLabel: string;
}) {
  const values = { ...emptyInitial, ...initial };
  const [state, formAction, pending] = useActionState(action, {});
  const [status, setStatus] = useState<ExperimentStatus>(values.status);

  if (hypotheses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 px-5 py-10 text-center">
        <p className="text-sm text-zinc-500">
          Сначала нужна хотя бы одна гипотеза — эксперимент не может существовать
          без гипотезы, которую он проверяет.
        </p>
        <Link
          href="/backlog/new"
          className="mt-3 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
        >
          Создать гипотезу
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/20">
          {state.error}
        </p>
      )}

      <Field label="Название эксперимента" htmlFor="name">
        <input
          id="name"
          name="name"
          defaultValue={values.name}
          required
          placeholder="web-funnel-v4_2"
          className={inputClass}
        />
      </Field>

      <Field label="Гипотеза" htmlFor="hypothesisId">
        <select
          id="hypothesisId"
          name="hypothesisId"
          defaultValue={values.hypothesisId}
          required
          className={inputClass}
        >
          <option value="" disabled>
            Выбери гипотезу...
          </option>
          {hypotheses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Status">
        <SegmentedControl
          name="status"
          value={status}
          onChange={setStatus}
          options={EXPERIMENT_STATUS_ORDER}
          labels={EXPERIMENT_STATUS_LABELS}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Автор" htmlFor="author">
          <input id="author" name="author" defaultValue={values.author} className={inputClass} />
        </Field>
        <Field label="Segment" htmlFor="segment">
          <input id="segment" name="segment" defaultValue={values.segment} className={inputClass} />
        </Field>
      </div>

      <Field label="Таргетинг" htmlFor="targeting">
        <input
          id="targeting"
          name="targeting"
          defaultValue={values.targeting}
          placeholder="GW, квиз"
          className={inputClass}
        />
      </Field>

      <Field label="Stage" htmlFor="stage">
        <select id="stage" name="stage" defaultValue={values.stage} className={inputClass}>
          <option value="">—</option>
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Дата начала" htmlFor="startDate">
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={values.startDate}
            className={inputClass}
          />
        </Field>
        <Field label="Дата окончания" htmlFor="endDate">
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={values.endDate}
            className={inputClass}
          />
        </Field>
      </div>

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

function SegmentedControl<T extends string>({
  name,
  value,
  onChange,
  options,
  labels,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: T[];
  labels: Record<T, string>;
}) {
  return (
    <div className="inline-flex w-fit rounded-lg border border-zinc-300 p-1">
      {options.map((opt) => (
        <label key={opt}>
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="peer sr-only"
          />
          <div className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors peer-checked:bg-zinc-900 peer-checked:text-white">
            {labels[opt]}
          </div>
        </label>
      ))}
    </div>
  );
}
