"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { STAGE_BADGE_CLASSES, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { BADGE_BASE_CLASSES } from "@/components/Badge";
import { Field } from "@/components/Field";
import { FormSection } from "@/components/FormSection";
import { Input } from "@/components/Input";
import type { ExperimentFormState } from "./actions";
import type { ExperimentStage } from "@/generated/prisma/enums";

type Hypothesis = { id: string; name: string };

type Initial = {
  name: string;
  author: string;
  targeting: string;
  segment: string;
  stage: ExperimentStage;
  startDate: string; // yyyy-mm-dd
  endDate: string;
};

const emptyInitial: Initial = {
  name: "",
  author: "",
  targeting: "",
  segment: "",
  stage: "DISCOVERY",
  startDate: "",
  endDate: "",
};

export function ExperimentForm({
  action,
  hypothesis,
  initial,
  submitLabel,
}: {
  action: (state: ExperimentFormState, formData: FormData) => Promise<ExperimentFormState>;
  hypothesis: Hypothesis;
  initial?: Partial<Initial>;
  submitLabel: string;
}) {
  const values = { ...emptyInitial, ...initial };
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/20">
          {state.error}
        </p>
      )}

      <FormSection title="Основное">
        {initial ? (
          <Field label="Название эксперимента" htmlFor="name">
            <Input id="name" name="name" defaultValue={values.name} required />
          </Field>
        ) : (
          <p className="text-sm text-zinc-500">
            Название будет таким же, как у гипотезы (с номером, если у неё уже есть
            эксперименты) — задать его можно будет позже, на карточке эксперимента.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Гипотеза</span>
          <input type="hidden" name="hypothesisId" value={hypothesis.id} />
          <Link
            href={`/backlog/${hypothesis.id}`}
            className="w-fit text-sm text-zinc-900 underline underline-offset-4"
          >
            {hypothesis.name}
          </Link>
        </div>

        <Field label="Status" htmlFor="stage">
          <StageField defaultValue={values.stage} />
        </Field>
      </FormSection>

      <FormSection title="Таргетинг">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Автор" htmlFor="author">
            <Input id="author" name="author" defaultValue={values.author} />
          </Field>
          <Field label="Segment" htmlFor="segment">
            <Input id="segment" name="segment" defaultValue={values.segment} />
          </Field>
        </div>

        <Field label="Таргетинг" htmlFor="targeting">
          <Input
            id="targeting"
            name="targeting"
            defaultValue={values.targeting}
            placeholder="GW, квиз"
          />
        </Field>
      </FormSection>

      <FormSection title="Расписание">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Дата начала" htmlFor="startDate">
            <Input id="startDate" name="startDate" type="date" defaultValue={values.startDate} />
          </Field>
          <Field label="Дата окончания" htmlFor="endDate">
            <Input id="endDate" name="endDate" type="date" defaultValue={values.endDate} />
          </Field>
        </div>
      </FormSection>

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

function StageField({ defaultValue }: { defaultValue: ExperimentStage }) {
  const [stage, setStage] = useState(defaultValue);
  return (
    <select
      id="stage"
      name="stage"
      value={stage}
      onChange={(e) => setStage(e.target.value as ExperimentStage)}
      className={`${BADGE_BASE_CLASSES} w-fit cursor-pointer border-0 outline-none ${STAGE_BADGE_CLASSES[stage]}`}
    >
      {STAGE_ORDER.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
