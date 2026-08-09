"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { STAGE_BADGE_CLASSES, STAGE_ICONS, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import {
  CHANNEL_BADGE_COLOR,
  FUNNEL_LEVEL_BADGE_COLOR,
  MARKET_BADGE_COLOR,
  PLATFORM_BADGE_COLOR,
  PRODUCT_BADGE_COLOR,
  SEGMENT_BADGE_COLOR,
} from "@/lib/tags";
import { Field } from "@/components/Field";
import { FormSection } from "@/components/FormSection";
import { IconSelect } from "@/components/IconSelect";
import { Input, Select } from "@/components/Input";
import { StickyFormSubmit } from "@/components/StickyFormSubmit";
import { TagMultiSelect } from "@/components/TagMultiSelect";
import { useToast } from "@/components/toast/ToastProvider";
import { ExperimentWeekStagesEditor } from "./ExperimentWeekStagesEditor";
import type { ExperimentFormState } from "./actions";
import type { ExperimentStage } from "@/generated/prisma/enums";

type Hypothesis = { id: string; name: string };
type Tag = { id: string; name: string };
type WeekEntry = { weekStartISO: string; stage: ExperimentStage };

type Initial = {
  name: string;
  author: string;
  stage: ExperimentStage;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  funnelLevels: Tag[];
  platforms: Tag[];
  channels: Tag[];
  markets: Tag[];
  products: Tag[];
  segments: Tag[];
  weekStages: WeekEntry[];
};

const emptyInitial: Initial = {
  name: "",
  author: "",
  stage: "DISCOVERY",
  startDate: "",
  endDate: "",
  funnelLevels: [],
  platforms: [],
  channels: [],
  markets: [],
  products: [],
  segments: [],
  weekStages: [],
};

export function ExperimentForm({
  action,
  experimentId,
  hypothesis,
  authors,
  funnelLevels,
  platforms,
  channels,
  markets,
  products,
  segments,
  initial,
  submitLabel,
}: {
  action: (state: ExperimentFormState, formData: FormData) => Promise<ExperimentFormState>;
  /** Only present when editing an existing experiment (needed for the per-week editor). */
  experimentId?: string;
  hypothesis: Hypothesis;
  authors: string[];
  funnelLevels: Tag[];
  platforms: Tag[];
  channels: Tag[];
  markets: Tag[];
  products: Tag[];
  segments: Tag[];
  initial?: Partial<Initial>;
  submitLabel: string;
}) {
  const values = { ...emptyInitial, ...initial };
  const [state, formAction, pending] = useActionState(action, {});
  const { showToast } = useToast();
  // PROD-019: once week entries exist, stage/dates are derived — the
  // manual Status/date fields below become read-only, edit via the
  // per-week editor (or the Calendar's week-cells) instead.
  const weekLocked = values.weekStages.length > 0;

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

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Status" htmlFor="stage">
            <StageField defaultValue={values.stage} locked={weekLocked} />
          </Field>
          <Field label="Автор">
            <AuthorField authors={authors} defaultValue={values.author} />
          </Field>
        </div>
      </FormSection>

      {experimentId && (
        <FormSection title="По неделям">
          <p className="text-sm text-zinc-500">
            Стадия и даты эксперимента теперь определяются по неделям — тот же
            редактор, что и клик по квадратику на Calendar.
          </p>
          <ExperimentWeekStagesEditor
            experimentId={experimentId}
            experimentName={values.name}
            weeks={values.weekStages}
          />
        </FormSection>
      )}

      <FormSection title="Таргетинг">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Funnel Level">
            <TagMultiSelect
              name="funnelLevel"
              options={funnelLevels}
              initialSelected={values.funnelLevels}
              color={FUNNEL_LEVEL_BADGE_COLOR}
            />
          </Field>
          <Field label="Platform">
            <TagMultiSelect
              name="platform"
              options={platforms}
              initialSelected={values.platforms}
              color={PLATFORM_BADGE_COLOR}
            />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Channel">
            <TagMultiSelect
              name="channel"
              options={channels}
              initialSelected={values.channels}
              color={CHANNEL_BADGE_COLOR}
            />
          </Field>
          <Field label="Market">
            <TagMultiSelect
              name="market"
              options={markets}
              initialSelected={values.markets}
              color={MARKET_BADGE_COLOR}
            />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Product">
            <TagMultiSelect
              name="product"
              options={products}
              initialSelected={values.products}
              color={PRODUCT_BADGE_COLOR}
            />
          </Field>
          <Field label="Segment">
            <TagMultiSelect
              name="segment"
              options={segments}
              initialSelected={values.segments}
              color={SEGMENT_BADGE_COLOR}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Расписание">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Дата начала" htmlFor="startDate">
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={values.startDate}
              disabled={weekLocked}
              title={weekLocked ? "Управляется по неделям — редактируй выше" : undefined}
            />
          </Field>
          <Field label="Дата окончания" htmlFor="endDate">
            <Input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={values.endDate}
              disabled={weekLocked}
              title={weekLocked ? "Управляется по неделям — редактируй выше" : undefined}
            />
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

function StageField({ defaultValue, locked }: { defaultValue: ExperimentStage; locked?: boolean }) {
  const [stage, setStage] = useState(defaultValue);
  return (
    <>
      {/* Disabled <select>s aren't submitted with the form — a hidden
          input keeps `stage` in the payload (required by the schema)
          when locked, since the visible control below is disabled. */}
      {locked && <input type="hidden" name="stage" value={stage} />}
      <IconSelect
        id="stage"
        name={locked ? undefined : "stage"}
        value={stage}
        options={STAGE_ORDER}
        labels={STAGE_LABELS}
        icon={STAGE_ICONS[stage]}
        colorClasses={STAGE_BADGE_CLASSES[stage]}
        disabled={locked}
        locked={locked}
        title={locked ? "Управляется по неделям — редактируй ниже" : undefined}
        onChange={setStage}
      />
    </>
  );
}
