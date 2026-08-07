"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { STAGE_BADGE_CLASSES, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { BADGE_BASE_CLASSES } from "@/components/Badge";
import { Field } from "@/components/Field";
import { FormSection } from "@/components/FormSection";
import { Input, Select } from "@/components/Input";
import { StickyFormSubmit } from "@/components/StickyFormSubmit";
import { useToast } from "@/components/toast/ToastProvider";
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
  authors,
  initial,
  submitLabel,
}: {
  action: (state: ExperimentFormState, formData: FormData) => Promise<ExperimentFormState>;
  hypothesis: Hypothesis;
  authors: string[];
  initial?: Partial<Initial>;
  submitLabel: string;
}) {
  const values = { ...emptyInitial, ...initial };
  const [state, formAction, pending] = useActionState(action, {});
  const { showToast } = useToast();

  useEffect(() => {
    if (state.error) showToast(state.error, "error");
  }, [state.error, showToast]);

  return (
    <form action={formAction} className="flex flex-col gap-8 pb-20">
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
          <Field label="Автор">
            <AuthorField authors={authors} defaultValue={values.author} />
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

      <StickyFormSubmit pending={pending} label={submitLabel} />
    </form>
  );
}

const NEW_AUTHOR_OPTION = "__new__";

function AuthorField({ authors, defaultValue }: { authors: string[]; defaultValue: string }) {
  const startsAsNew = defaultValue !== "" && !authors.includes(defaultValue);

  const [mode, setMode] = useState<"select" | "new">(startsAsNew ? "new" : "select");
  const [selected, setSelected] = useState(authors.includes(defaultValue) ? defaultValue : "");
  const [newName, setNewName] = useState(startsAsNew ? defaultValue : "");

  if (mode === "new") {
    return (
      <div className="flex gap-2">
        <Input
          name="author"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Новый автор"
          autoFocus
        />
        {authors.length > 0 && (
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
      name="author"
      value={selected}
      onChange={(e) => {
        if (e.target.value === NEW_AUTHOR_OPTION) {
          setMode("new");
        } else {
          setSelected(e.target.value);
        }
      }}
    >
      <option value="">—</option>
      {authors.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      <option value={NEW_AUTHOR_OPTION}>+ Добавить нового...</option>
    </Select>
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
