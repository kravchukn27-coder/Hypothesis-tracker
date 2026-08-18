"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { startOfWeek, toDateParam } from "@/lib/calendar";
import { STAGE_BADGE_CLASSES, STAGE_ICONS, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { PRODUCT_BADGE_COLOR, SEGMENT_BADGE_COLOR } from "@/lib/tags";
import { Field } from "@/components/Field";
import { FormSection } from "@/components/FormSection";
import { FunnelLevelField } from "@/components/FunnelLevelField";
import { IconSelect } from "@/components/IconSelect";
import { Input, Select } from "@/components/Input";
import { StickyFormSubmit } from "@/components/StickyFormSubmit";
import { TagMultiSelect } from "@/components/TagMultiSelect";
import { useToast } from "@/components/toast/ToastProvider";
import { ExperimentWeekStagesEditor } from "./ExperimentWeekStagesEditor";
import type { ExperimentFormState } from "./actions";
import type { ExperimentStage } from "@/generated/prisma/enums";

type Hypothesis = { id: string; name: string; funnelLevel: { name: string } | null };
type Tag = { id: string; name: string };
type WeekEntry = { weekStartISO: string; stage: ExperimentStage };

type Initial = {
  name: string;
  author: string;
  rollout: string;
  stage: ExperimentStage;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  products: Tag[];
  segments: Tag[];
  weekStages: WeekEntry[];
};

const emptyInitial: Initial = {
  name: "",
  author: "",
  rollout: "",
  stage: "DISCOVERY",
  startDate: "",
  endDate: "",
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

  // TECH-004 follow-up: creation picks a starting week (snapped to
  // that week's Monday) instead of raw start/end dates — reuses the
  // same startOfWeek/toDateParam the Calendar and week editors use,
  // rather than a second date-math implementation.
  const [startWeek, setStartWeek] = useState("");

  function handleStartWeekChange(raw: string) {
    if (!raw) {
      setStartWeek("");
      return;
    }
    setStartWeek(toDateParam(startOfWeek(new Date(`${raw}T00:00:00`))));
  }

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
            aria-label={`Открыть гипотезу: ${hypothesis.name}`}
            className="group flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <span className="min-w-0 text-base font-semibold leading-snug break-words">{hypothesis.name}</span>
            <ArrowRight className="size-5 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-900" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Status" htmlFor="stage">
            <StageField defaultValue={values.stage} locked={weekLocked} />
          </Field>
          <Field label="Автор">
            <AuthorField authors={authors} defaultValue={values.author} />
          </Field>
          <Field label="Раскатка" htmlFor="rollout">
            <Input id="rollout" name="rollout" defaultValue={values.rollout} placeholder="Добавить…" />
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
        {/* PROD-033: Funnel Level is one shared value between the
            hypothesis and every one of its experiments — changing it
            here also updates the hypothesis and any sibling experiments. */}
        <Field label="Funnel Level">
          <FunnelLevelField funnelLevels={funnelLevels} defaultValue={hypothesis.funnelLevel?.name ?? ""} />
        </Field>

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

      {experimentId ? (
        // TECH-004: once week entries exist, startDate/endDate are a
        // derived cache from them (see `updateExperiment`'s `locked`
        // guard below) — this section just duplicated "По неделям" as
        // two disabled inputs, so it's dropped entirely rather than
        // shown read-only. Still the live way to set dates for an
        // existing experiment that has no week entries yet.
        !weekLocked && (
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
        )
      ) : (
        // TECH-004 follow-up: a brand-new experiment picks a starting
        // week instead — creates its first ExperimentWeekStage entry
        // (stage from Status above) rather than the legacy scalar
        // dates. Leave empty for a still-undated experiment, same as
        // today.
        <FormSection title="Расписание">
          <Field label="Неделя начала" htmlFor="startWeek">
            <Input
              id="startWeek"
              name="startWeek"
              type="date"
              value={startWeek}
              onChange={(e) => handleStartWeekChange(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Дата округляется до понедельника этой недели; стадия — как в Status
              выше. Оставь пустым, если пока без даты.
            </p>
          </Field>
        </FormSection>
      )}

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
        variant="field"
        onChange={setStage}
      />
    </>
  );
}
