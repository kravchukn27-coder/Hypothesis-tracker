"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentWeekStage, shouldPromptArchiveExperiment } from "@/lib/experiment";
import { compareByManualOrder, MS_PER_DAY, startOfWeek } from "@/lib/calendar";
import { resolveFunnelLevelId } from "@/lib/funnelLevel";
import { getCurrentUser } from "@/lib/auth/session";
import { safeWriteAuditLog } from "@/lib/audit-log";
import { captureServerError } from "@/lib/log";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";

async function auditExperimentEvent(event: string, metadata: Record<string, unknown>) {
  const user = await getCurrentUser();
  await safeWriteAuditLog({ event, userId: user?.id ?? null, metadata, route: "src/app/experiments/actions.ts" });
}

async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function mutationFailure<T extends object = Record<string, never>>(event: string, error: unknown, userId: string): Promise<ActionResult<T>> {
  await captureServerError({ event, route: "src/app/experiments/actions.ts", error, userId });
  return actionFailure<T>("Не удалось сохранить изменения. Попробуйте ещё раз.");
}

// TECH-005: "no status" (the Status field's "—" option) submits the
// "NONE" sentinel from StageField — normalized to `undefined` here so
// an unset stage means the field is simply absent, not a seventh enum
// value living in the database.
const stageValues = ["DISCOVERY", "DESIGN", "DEVELOPMENT", "EXPERIMENTATION", "ANALYSIS", "DONE"] as const;
const optionalStageSchema = z.preprocess(
  (v) => (v === "NONE" ? undefined : v),
  z.enum(stageValues).optional(),
);

const baseExperimentFields = {
  hypothesisId: z.string().trim().min(1, "Выбери гипотезу"),
  author: z.string().trim().optional(),
  rollout: z.string().trim().optional(),
  stage: optionalStageSchema,
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  // PROD-033: Funnel Level is a single value shared by a hypothesis and
  // every one of its experiments — editing it here also updates the
  // hypothesis and every sibling experiment (syncExperimentFunnelLevelsForHypothesis).
  funnelLevel: z.string().trim().optional(),
  // TECH-003: multi-select tag categories, each submitted as a pair of
  // comma-joined hidden fields (see TagMultiSelect) — existing tag ids
  // to connect, and new tag names to create-then-connect. Platform/
  // Channel/Market were removed (PROD-035) — unused in practice.
  productIds: z.string().trim().optional(),
  productNew: z.string().trim().optional(),
  segmentIds: z.string().trim().optional(),
  segmentNew: z.string().trim().optional(),
};

// Create: name is auto-generated server-side (PROD-006), never
// submitted. `startWeek` (TECH-004 follow-up) replaces the old
// startDate/endDate pair for creation specifically — picks the
// experiment's first ExperimentWeekStage entry instead of the legacy
// scalar dates; scoped to this schema only so `baseExperimentFields`'
// startDate/endDate keep working unchanged for updateExperimentSchema
// (still the live fields when editing an existing, not-yet-week-
// tracked experiment).
const createExperimentSchema = z.object({
  ...baseExperimentFields,
  startWeek: z.string().trim().optional(),
});

// Update: name is user-editable (confirmed by user 2026-08-06) once the
// experiment exists.
const updateExperimentSchema = z.object({
  ...baseExperimentFields,
  name: z.string().trim().min(1, "Название обязательно"),
});

export type ExperimentFormState = {
  error?: string;
};

function toDate(value: string | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * PROD-019: recomputes Experiment.stage/startDate/endDate from its
 * ExperimentWeekStage rows (latest week's stage; earliest/latest week
 * as the date span) — the denormalized cache that keeps every
 * existing query/filter/sort/badge across the app working unchanged.
 * With no week entries, restores the experiment's undated baseline —
 * TECH-005: that baseline is "no status" (`null`), not a fake
 * `DISCOVERY` default; the user can still hand-pick a real stage via
 * the Status field while it's unlocked.
 */
async function recomputeExperimentDerivedFields(experimentId: string) {
  const weeks = await prisma.experimentWeekStage.findMany({
    where: { experimentId },
    orderBy: { weekStart: "asc" },
  });
  if (weeks.length === 0) {
    await prisma.experiment.update({
      where: { id: experimentId },
      data: { stage: null, startDate: null, endDate: null, calendarHiddenOnDone: null },
    });
    return;
  }

  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      stage: last.stage,
      startDate: first.weekStart,
      endDate: new Date(last.weekStart.getTime() + 6 * MS_PER_DAY),
    },
  });
}

async function syncHypothesisStatusForExperiment(experimentId: string) {
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId }, select: { hypothesisId: true } });
  if (!experiment) return;
  const experiments = await prisma.experiment.findMany({
    where: { hypothesisId: experiment.hypothesisId },
    select: { stage: true, weekStages: { select: { weekStart: true, stage: true } } },
  });
  if (experiments.length === 0) return;
  const hasActive = experiments.some((item) =>
    (item.weekStages.length > 0 ? getCurrentWeekStage(item.weekStages) : item.stage) !== "DONE",
  );
  await prisma.hypothesis.update({
    where: { id: experiment.hypothesisId },
    data: { status: hasActive ? "IN_PROGRESS" : "DONE" },
  });
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${experiment.hypothesisId}`);
}

function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * TECH-003: resolves a tag category's submitted ids + new names into
 * the full set of ids to connect, upserting the new names first
 * (isCustom: true, matching FunnelLevel's existing convention).
 */
async function resolveTagIds(
  delegate: { upsert: (args: { where: { name: string }; update: object; create: { name: string; isCustom: boolean } }) => Promise<{ id: string }> },
  idsCsv: string | undefined,
  namesCsv: string | undefined,
): Promise<string[]> {
  const ids = splitCsv(idsCsv);
  const newNames = splitCsv(namesCsv);
  const created = await Promise.all(
    newNames.map((name) => delegate.upsert({ where: { name }, update: {}, create: { name, isCustom: true } })),
  );
  return [...ids, ...created.map((c) => c.id)];
}

async function resolveExperimentTagIds(data: {
  productIds?: string;
  productNew?: string;
  segmentIds?: string;
  segmentNew?: string;
}) {
  const [products, segments] = await Promise.all([
    resolveTagIds(prisma.product, data.productIds, data.productNew),
    resolveTagIds(prisma.segment, data.segmentIds, data.segmentNew),
  ]);
  return { products, segments };
}

/**
 * PROD-033: Funnel Level is one shared value between a hypothesis and
 * every one of its experiments, editable from either side — the
 * hypothesis form and every sibling experiment's form. Call after a
 * hypothesis's Funnel Level changes so every experiment under it
 * stays in sync (single-value "set", not additive — an experiment
 * never accumulates more than the one level its hypothesis currently
 * has).
 */
export async function syncExperimentFunnelLevelsForHypothesis(hypothesisId: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try {
  const [hypothesis, experiments] = await Promise.all([
    prisma.hypothesis.findUnique({ where: { id: hypothesisId }, select: { funnelLevelId: true } }),
    prisma.experiment.findMany({ where: { hypothesisId }, select: { id: true } }),
  ]);
  const funnelLevelId = hypothesis?.funnelLevelId ?? null;
  await Promise.all(
    experiments.map((experiment) =>
      prisma.experiment.update({
        where: { id: experiment.id },
        data: { funnelLevels: { set: funnelLevelId ? [{ id: funnelLevelId }] : [] } },
      }),
    ),
  );
  revalidatePath("/backlog");
  experiments.forEach((experiment) => revalidatePath(`/experiments/${experiment.id}`));
  return actionSuccess();
  } catch (error) { return mutationFailure("experiments.funnel_levels.sync.failed", error, user.id); }
}

/**
 * PROD-033: applies a Funnel Level submitted from an experiment's own
 * form back onto the parent hypothesis (the canonical source), then
 * fans that change out to every sibling experiment.
 */
async function applyFunnelLevelFromExperimentForm(hypothesisId: string, funnelLevelName: string | undefined) {
  const funnelLevelId = await resolveFunnelLevelId(funnelLevelName);
  await prisma.hypothesis.update({ where: { id: hypothesisId }, data: { funnelLevelId } });
  await syncExperimentFunnelLevelsForHypothesis(hypothesisId);
}

/**
 * PROD-006: an experiment created from a hypothesis is named exactly
 * after it. No numbering suffix needed (PROD-034 dropped that) — the
 * caller already guarantees a hypothesis has no other experiment yet.
 */
async function computeExperimentName(hypothesisId: string): Promise<string> {
  const hypothesis = await prisma.hypothesis.findUnique({ where: { id: hypothesisId }, select: { name: true } });
  if (!hypothesis) throw new Error("Hypothesis not found");
  return hypothesis.name;
}

export async function createExperiment(
  _prevState: ExperimentFormState,
  formData: FormData,
): Promise<ExperimentFormState> {
  const user = await requireAuthenticatedUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = createExperimentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверь поля формы" };
  }
  const data = parsed.data;
  let experiment: { id: string };
  try {
  // PROD-034: a hypothesis has at most one experiment — a submit that
  // races another creation (or resubmits a stale form) lands on the
  // existing one instead of creating a second.
  const existingExperiment = await prisma.experiment.findFirst({
    where: { hypothesisId: data.hypothesisId },
    select: { id: true },
  });
  if (existingExperiment) redirect(`/experiments/${existingExperiment.id}`);

  const name = await computeExperimentName(data.hypothesisId);
  const tagIds = await resolveExperimentTagIds(data);

  experiment = await prisma.experiment.create({
    data: {
      name,
      hypothesisId: data.hypothesisId,
      author: data.author || null,
      rollout: data.rollout || null,
      stage: data.stage ?? null,
      products: { connect: tagIds.products.map((id) => ({ id })) },
      segments: { connect: tagIds.segments.map((id) => ({ id })) },
    },
  });
  await applyFunnelLevelFromExperimentForm(data.hypothesisId, data.funnelLevel);

  // TECH-004 follow-up: creation picks a starting week instead of raw
  // start/end dates — one ExperimentWeekStage entry at the chosen
  // week, stage mirrors the Status field above (no separate picker
  // for it), then the same recompute every other week-mutating action
  // runs so Experiment.stage/startDate/endDate reflect it immediately.
  // No week picked (still-undated experiment) is a no-op here, same
  // as today. TECH-005: a week entry always needs a concrete stage
  // even if Status was left at "—" — defaults that one week to
  // DISCOVERY rather than blocking creation.
  if (data.startWeek) {
    const weekStart = startOfWeek(new Date(`${data.startWeek}T00:00:00`));
    await prisma.experimentWeekStage.create({
      data: { experimentId: experiment.id, weekStart, stage: data.stage ?? "DISCOVERY" },
    });
    await recomputeExperimentDerivedFields(experiment.id);
  }

  await syncHypothesisStatusForExperiment(experiment.id);
  await auditExperimentEvent("EXPERIMENT_CREATED", { experimentId: experiment.id, hypothesisId: data.hypothesisId });

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${data.hypothesisId}`);
  revalidatePath("/calendar");
  } catch (error) { return mutationFailure("experiments.experiment.create.failed", error, user.id); }
  redirect(`/experiments/${experiment.id}?saved=1`);
}

export async function updateExperiment(
  id: string,
  _prevState: ExperimentFormState,
  formData: FormData,
): Promise<ExperimentFormState> {
  const user = await requireAuthenticatedUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateExperimentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверь поля формы" };
  }
  const data = parsed.data;
  let shouldPromptArchive = false;
  try {
  const normalizedStage = data.stage ?? null;
  const tagIds = await resolveExperimentTagIds(data);
  // PROD-019: once week entries exist, stage/dates are derived from
  // them — the form's now-disabled Status/date fields still submit
  // their last-known values, but must not overwrite the derived cache.
  const locked = await hasWeekStages(id);
  const before = await prisma.experiment.findUnique({
    where: { id },
    select: { stage: true, archived: true },
  });

  await prisma.experiment.update({
    where: { id },
    data: {
      name: data.name,
      hypothesisId: data.hypothesisId,
      author: data.author || null,
      rollout: data.rollout || null,
      ...(locked ? {} : { stage: normalizedStage, startDate: toDate(data.startDate), endDate: toDate(data.endDate) }),
      products: { set: tagIds.products.map((id) => ({ id })) },
      segments: { set: tagIds.segments.map((id) => ({ id })) },
    },
  });
  await auditExperimentEvent("EXPERIMENT_UPDATED", { experimentId: id, hypothesisId: data.hypothesisId });
  await applyFunnelLevelFromExperimentForm(data.hypothesisId, data.funnelLevel);
  await syncHypothesisStatusForExperiment(id);

  revalidatePath(`/experiments/${id}`);
  revalidatePath("/calendar");

  const stageChanged = !locked && before !== null && before.stage !== normalizedStage;
  shouldPromptArchive =
    stageChanged && before !== null && shouldPromptArchiveExperiment(normalizedStage, before.archived);

  } catch (error) { return mutationFailure("experiments.experiment.update.failed", error, user.id); }
  if (shouldPromptArchive) redirect(`/experiments/${id}?promptArchive=1&saved=1`);
  redirect(`/experiments/${id}?saved=1`);
}

const stageSchema = z.enum([
  "DISCOVERY",
  "DESIGN",
  "DEVELOPMENT",
  "EXPERIMENTATION",
  "ANALYSIS",
  "DONE",
]);

/**
 * PROD-019: once an experiment has week-stage entries, stage/dates are
 * derived from them — direct edits here would immediately be
 * overwritten by the next recompute and desync from the week grid, so
 * both of these become no-ops for experiments that have weeks (the UI
 * hides the manual controls in that case; this is the server-side
 * backstop).
 */
async function hasWeekStages(experimentId: string): Promise<boolean> {
  const count = await prisma.experimentWeekStage.count({ where: { experimentId } });
  return count > 0;
}

/**
 * BUG-005 follow-up #3: PROD-023's `calendarHiddenOnDone` answer only
 * makes sense while the experiment currently *is* Done — once its
 * current week moves off Done, a stale `true` would otherwise keep it
 * hidden forever even though Calendar's visibility check now looks at
 * the *current* week (see `/calendar`'s `getCurrentWeekStage` filter),
 * and skip re-prompting the next time it actually becomes Done again.
 * No-op if there's nothing to reset.
 */
async function clearHiddenFlagIfNoLongerDone(experimentId: string) {
  const weeks = await prisma.experimentWeekStage.findMany({
    where: { experimentId },
    select: { weekStart: true, stage: true },
  });
  if (weeks.length === 0) return;
  if (getCurrentWeekStage(weeks) === "DONE") return;

  await prisma.experiment.updateMany({
    where: { id: experimentId, calendarHiddenOnDone: true },
    data: { calendarHiddenOnDone: null },
  });
}

// TECH-005: "—" (no status) is only a valid pick for an experiment
// with no weeks yet — a specific week entry always needs a concrete
// stage, so this sentinel is accepted here but not by `stageSchema`
// (shared with the always-required per-week actions).
const stageOrNoneSchema = z.union([stageSchema, z.literal("NONE")]);

export async function updateExperimentStage(id: string, stage: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  const parsed = stageOrNoneSchema.safeParse(stage);
  if (!parsed.success) return actionFailure("Некорректный этап эксперимента.");
  try {

  // BUG-005 follow-up #2: confirmed with the user — the list's Status
  // pill shows/edits *this week's* status, not the plan's furthest-
  // future stage, so Calendar's current-week cell for this experiment
  // is what moves when it's edited here (same upsert-by-week shape as
  // `setExperimentWeekStage`, just anchored at "now" instead of a
  // week picked on the Calendar).
  const hasWeeks = await hasWeekStages(id);

  if (parsed.data === "NONE") {
    // Can't unset a specific week's stage from this cell — deleting
    // the week is the way to do that (Calendar/detail card).
    if (hasWeeks) return actionSuccess();
    await prisma.experiment.update({ where: { id }, data: { stage: null } });
    await auditExperimentEvent("EXPERIMENT_STAGE_CHANGED", { experimentId: id, after: null });
    revalidatePath(`/experiments/${id}`);
    revalidatePath("/calendar");
    await syncHypothesisStatusForExperiment(id);
    return actionSuccess();
  }

  if (hasWeeks) {
    const currentWeekStart = startOfWeek(new Date());
    await prisma.experimentWeekStage.upsert({
      where: { experimentId_weekStart: { experimentId: id, weekStart: currentWeekStart } },
      update: { stage: parsed.data },
      create: { experimentId: id, weekStart: currentWeekStart, stage: parsed.data },
    });
    await recomputeExperimentDerivedFields(id);
    await clearHiddenFlagIfNoLongerDone(id);
  } else {
    await prisma.experiment.update({
      where: { id },
      data: { stage: parsed.data },
    });
  }

  revalidatePath(`/experiments/${id}`);
  revalidatePath("/calendar");
  await syncHypothesisStatusForExperiment(id);
  await auditExperimentEvent("EXPERIMENT_STAGE_CHANGED", { experimentId: id, after: parsed.data });
  return actionSuccess();
  } catch (error) { return mutationFailure("experiments.stage.update.failed", error, user.id); }
}

export async function updateExperimentDates(
  id: string,
  startDate: string | null,
  endDate: string | null,
): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try {
    if (await hasWeekStages(id)) return actionSuccess();
    await prisma.experiment.update({
    where: { id },
    data: { startDate: toDate(startDate ?? undefined), endDate: toDate(endDate ?? undefined) },
    });
  } catch (error) { return mutationFailure("experiments.dates.update.failed", error, user.id); }

  revalidatePath(`/experiments/${id}`);
  return actionSuccess();
}

export async function updateExperimentRollout(id: string, rollout: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try { await prisma.experiment.update({ where: { id }, data: { rollout: rollout.trim() || null } }); }
  catch (error) { return mutationFailure("experiments.rollout.update.failed", error, user.id); }
  revalidatePath("/calendar");
  revalidatePath(`/experiments/${id}`);
  return actionSuccess();
}

export async function updateExperimentAuthor(id: string, author: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try { await prisma.experiment.update({ where: { id }, data: { author: author.trim() || null } }); }
  catch (error) { return mutationFailure("experiments.author.update.failed", error, user.id); }
  revalidatePath("/calendar");
  revalidatePath(`/experiments/${id}`);
  return actionSuccess();
}

/**
 * PROD-036: persists the Calendar timeline's explicit row order.
 *
 * `orderedExperimentIds` is only the subset of rows visible in the
 * dragging window/filter, not every active experiment (BUG-018) — the
 * caller (`CalendarRowReorderHandle`) can only see and reorder DOM rows
 * that are actually rendered, which excludes experiments outside the
 * current week window or filtered out by a stage filter. Writing
 * `manualOrder = 0..N-1` across just that subset used to stomp on
 * `manualOrder` values assigned by an earlier reorder in a different
 * window/filter, corrupting the global order. Instead, this merges the
 * subset's new relative order into the full active-experiment order
 * (`compareByManualOrder`, the same comparator the Calendar page sorts
 * by): everyone outside the subset keeps their relative position, and
 * the subset is reinserted as a contiguous block at the position its
 * first member used to occupy.
 */
export async function reorderCalendarExperiments(orderedExperimentIds: string[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return actionFailure("Сессия истекла. Обновите страницу и войдите снова.");
  const parsed = z.array(z.string().trim().min(1)).min(1).max(500).safeParse(orderedExperimentIds);
  if (!parsed.success || new Set(parsed.data).size !== parsed.data.length) {
    return actionFailure("Некорректный порядок экспериментов.");
  }

  try {
  const allActive = await prisma.experiment.findMany({
    where: { archived: false },
    select: { id: true, manualOrder: true, startDate: true, createdAt: true },
  });
  const activeIds = new Set(allActive.map((e) => e.id));
  if (!parsed.data.every((id) => activeIds.has(id))) {
    return actionFailure("Часть экспериментов больше недоступна. Обновите страницу.");
  }

  const subsetIds = new Set(parsed.data);
  const globalOrder = [...allActive].sort(compareByManualOrder);
  const remainder: typeof globalOrder = [];
  let insertionIndex = -1;
  for (const e of globalOrder) {
    if (subsetIds.has(e.id)) {
      if (insertionIndex === -1) insertionIndex = remainder.length;
    } else {
      remainder.push(e);
    }
  }
  const byId = new Map(allActive.map((e) => [e.id, e]));
  const reorderedSubset = parsed.data.map((id) => byId.get(id)!);
  const merged = [
    ...remainder.slice(0, insertionIndex),
    ...reorderedSubset,
    ...remainder.slice(insertionIndex),
  ];

  await prisma.$transaction(
    merged.map((e, manualOrder) => prisma.experiment.update({ where: { id: e.id }, data: { manualOrder } })),
  );
  await safeWriteAuditLog({
    event: "CALENDAR_EXPERIMENTS_REORDERED",
    userId: user.id,
    metadata: { experimentIds: parsed.data },
    route: "src/app/experiments/actions.ts",
  });
  return actionSuccess();
  } catch (error) { return mutationFailure("experiments.calendar.reorder.failed", error, user.id); }
}

/**
 * PROD-019: sets (creates or updates) one week's stage for an
 * experiment, then recomputes the denormalized stage/startDate/endDate
 * cache. Used by both the Calendar's week-cell click and the detail
 * card's per-week editor.
 */
export async function setExperimentWeekStage(
  experimentId: string,
  weekStartISO: string,
  stage: string,
): Promise<ActionResult<{ becameDone: boolean }>> {
  const user = await requireAuthenticatedUser();
  const parsedStage = stageSchema.safeParse(stage);
  if (!parsedStage.success) return actionFailure("Некорректный этап эксперимента.");
  try {
  const weekStart = startOfWeek(new Date(`${weekStartISO}T00:00:00`));

  const before = await prisma.experiment.findUnique({ where: { id: experimentId }, select: { stage: true } });

  await prisma.experimentWeekStage.upsert({
    where: { experimentId_weekStart: { experimentId, weekStart } },
    update: { stage: parsedStage.data },
    create: { experimentId, weekStart, stage: parsedStage.data },
  });
  await recomputeExperimentDerivedFields(experimentId);
  await clearHiddenFlagIfNoLongerDone(experimentId);
  await syncHypothesisStatusForExperiment(experimentId);
  await auditExperimentEvent("EXPERIMENT_WEEK_STAGE_CHANGED", { experimentId, weekStart: weekStart.toISOString(), after: parsedStage.data });

  const after = await prisma.experiment.findUnique({ where: { id: experimentId }, select: { stage: true } });
  const becameDone = before?.stage !== "DONE" && after?.stage === "DONE";

  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");

    return actionSuccess({ becameDone });
  } catch (error) {
    const result = await mutationFailure("experiments.week_stage.set.failed", error, user.id);
    return actionFailure<{ becameDone: boolean }>(result.error!);
  }
}

/** PROD-025: completes only the dangling weekly stage from the Calendar reminder. */
export async function completeExperimentWeek(experimentId: string, weekStartISO: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  const weekStart = startOfWeek(new Date(`${weekStartISO}T00:00:00`));
  try { await prisma.experimentWeekStage.updateMany({
    where: { experimentId, weekStart },
    data: { completed: true },
  }); } catch (error) { return mutationFailure("experiments.week.complete.failed", error, user.id); }

  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
  return actionSuccess();
}

/**
 * PROD-024: removes a single week entry outright (not just
 * re-assigning its stage) — the detail card's "По неделям" editor's
 * delete control. `ExperimentWeekRow`/Calendar reads the same rows
 * fresh on next load, so no separate sync is needed there. Leaves a
 * gap rather than shifting subsequent weeks, matching BUG-006's
 * existing gap-tolerant drag/resize behavior. No-ops if the week
 * doesn't exist (already deleted, e.g. a stale double-click).
 */
export async function deleteExperimentWeek(experimentId: string, weekStartISO: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  const weekStart = startOfWeek(new Date(`${weekStartISO}T00:00:00`));
  try {
    await prisma.experimentWeekStage.deleteMany({
    where: { experimentId, weekStart },
    });
    await recomputeExperimentDerivedFields(experimentId);
    await clearHiddenFlagIfNoLongerDone(experimentId);
    await syncHypothesisStatusForExperiment(experimentId);
  } catch (error) { return mutationFailure("experiments.week.delete.failed", error, user.id); }

  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
  return actionSuccess();
}

/**
 * PROD-023: the user's answer to the "убрать задачу из календаря?"
 * prompt shown when a week's stage newly makes the experiment's
 * derived stage Done (see `setExperimentWeekStage`'s `becameDone`).
 */
export async function hideExperimentFromCalendar(experimentId: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try { await prisma.experiment.update({ where: { id: experimentId }, data: { calendarHiddenOnDone: true } }); }
  catch (error) { return mutationFailure("experiments.calendar.hide.failed", error, user.id); }
  revalidatePath("/calendar");
  return actionSuccess();
}

export async function showExperimentOnCalendarWhenDone(experimentId: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try { await prisma.experiment.update({ where: { id: experimentId }, data: { calendarHiddenOnDone: false } }); }
  catch (error) { return mutationFailure("experiments.calendar.show.failed", error, user.id); }
  revalidatePath("/calendar");
  return actionSuccess();
}

/**
 * PROD-019: appends the next week after an experiment's last week
 * entry (or the current week if it has none yet), defaulting to the
 * last entry's stage — the detail card's "+ Добавить неделю" button.
 */
export async function addNextExperimentWeek(experimentId: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try {
    const last = await prisma.experimentWeekStage.findFirst({
    where: { experimentId },
    orderBy: { weekStart: "desc" },
  });
  const nextWeekStart = last
    ? new Date(last.weekStart.getTime() + 7 * MS_PER_DAY)
    : startOfWeek(new Date());
  const stage = last?.stage ?? "DISCOVERY";

    await prisma.experimentWeekStage.upsert({
    where: { experimentId_weekStart: { experimentId, weekStart: nextWeekStart } },
    update: {},
    create: { experimentId, weekStart: nextWeekStart, stage },
    });
    await recomputeExperimentDerivedFields(experimentId);
    await syncHypothesisStatusForExperiment(experimentId);
  } catch (error) { return mutationFailure("experiments.week.add.failed", error, user.id); }

  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
  return actionSuccess();
}

function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/**
 * BUG-006: an experiment can have several gapped blocks of weeks
 * (e.g. weeks of Aug 3 and Aug 24, nothing between); dragging one
 * block must only touch its own entries. `blockStartISO`/
 * `blockEndISO` scope every query/mutation below to
 * `weekStart` within that one block's range.
 */
async function getBlockEntries(experimentId: string, blockStartISO: string, blockEndISO: string) {
  return prisma.experimentWeekStage.findMany({
    where: {
      experimentId,
      weekStart: { gte: parseISODate(blockStartISO), lte: parseISODate(blockEndISO) },
    },
    orderBy: { weekStart: "asc" },
  });
}

/**
 * BUG-006: true if any of `experimentId`'s week entries fall within
 * `[start, end]` — used to reject a move/resize that would otherwise
 * land on top of a different block and hit the
 * `[experimentId, weekStart]` unique constraint.
 */
async function hasEntriesInRange(experimentId: string, start: Date, end: Date): Promise<boolean> {
  const count = await prisma.experimentWeekStage.count({
    where: { experimentId, weekStart: { gte: start, lte: end } },
  });
  return count > 0;
}

/**
 * PROD-019, scoped per-block by BUG-006: drag-to-move one contiguous
 * block of weeks (Calendar), identified by its own start/end rather
 * than every week entry the experiment has — gapped blocks on the
 * same experiment move independently. Deletes and recreates rather
 * than updating in place, since shifting could otherwise transiently
 * collide with the `[experimentId, weekStart]` unique constraint
 * mid-update.
 */
export async function shiftExperimentWeeks(
  experimentId: string,
  blockStartISO: string,
  blockEndISO: string,
  deltaWeeks: number,
) : Promise<ActionResult<{ changed: boolean }>> {
  const user = await requireAuthenticatedUser();
  if (!Number.isInteger(deltaWeeks) || deltaWeeks === 0) return actionSuccess({ changed: false });
  try {

  const entries = await getBlockEntries(experimentId, blockStartISO, blockEndISO);
  if (entries.length === 0) return actionSuccess({ changed: false });

  const newStart = new Date(parseISODate(blockStartISO).getTime() + deltaWeeks * 7 * MS_PER_DAY);
  const newEnd = new Date(parseISODate(blockEndISO).getTime() + deltaWeeks * 7 * MS_PER_DAY);
  // Exclude this block's own current range from the collision check —
  // shifting by e.g. 1 week naturally overlaps its own old range.
  const collisionEntries = await prisma.experimentWeekStage.findMany({
    where: {
      experimentId,
      weekStart: { gte: newStart, lte: newEnd },
      NOT: { weekStart: { gte: parseISODate(blockStartISO), lte: parseISODate(blockEndISO) } },
    },
    select: { id: true },
  });
  if (collisionEntries.length > 0) return actionSuccess({ changed: false }); // would land on another block — no-op

  await prisma.$transaction([
    prisma.experimentWeekStage.deleteMany({
      where: { id: { in: entries.map((e) => e.id) } },
    }),
    ...entries.map((e) =>
      prisma.experimentWeekStage.create({
        data: {
          experimentId,
          stage: e.stage,
          completed: e.completed,
          weekStart: new Date(e.weekStart.getTime() + deltaWeeks * 7 * MS_PER_DAY),
        },
      }),
    ),
  ]);
  await recomputeExperimentDerivedFields(experimentId);
  await clearHiddenFlagIfNoLongerDone(experimentId);
  await syncHypothesisStatusForExperiment(experimentId);

  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
  return actionSuccess({ changed: true });
  } catch (error) { return mutationFailure<{ changed: boolean }>("experiments.weeks.shift.failed", error, user.id); }
}

/**
 * PROD-019, scoped per-block by BUG-006: drag-to-resize the end of
 * one contiguous block of weeks (Calendar), identified by its own
 * start/end. `deltaWeeks > 0` appends that many weeks after the
 * block's own last entry (repeating its last stage); `deltaWeeks < 0`
 * removes that many trailing weeks from the block, keeping at least
 * one entry in it.
 */
export async function resizeExperimentWeeks(
  experimentId: string,
  blockStartISO: string,
  blockEndISO: string,
  deltaWeeks: number,
) : Promise<ActionResult<{ changed: boolean }>> {
  const user = await requireAuthenticatedUser();
  if (!Number.isInteger(deltaWeeks) || deltaWeeks === 0) return actionSuccess({ changed: false });
  try {

  const entries = await getBlockEntries(experimentId, blockStartISO, blockEndISO);
  if (entries.length === 0) return actionSuccess({ changed: false });

  if (deltaWeeks > 0) {
    const last = entries[entries.length - 1];
    const rangeStart = new Date(last.weekStart.getTime() + MS_PER_DAY * 7);
    const rangeEnd = new Date(last.weekStart.getTime() + deltaWeeks * 7 * MS_PER_DAY);
    if (await hasEntriesInRange(experimentId, rangeStart, rangeEnd)) return actionSuccess({ changed: false }); // would reach another block — no-op

    const additions = Array.from({ length: deltaWeeks }, (_, i) => ({
      experimentId,
      stage: last.stage,
      weekStart: new Date(last.weekStart.getTime() + (i + 1) * 7 * MS_PER_DAY),
    }));
    await prisma.experimentWeekStage.createMany({ data: additions });
  } else {
    const removeCount = Math.min(-deltaWeeks, entries.length - 1);
    const toRemove = entries.slice(entries.length - removeCount);
    if (toRemove.length > 0) {
      await prisma.experimentWeekStage.deleteMany({
        where: { id: { in: toRemove.map((e) => e.id) } },
      });
    }
  }
  await recomputeExperimentDerivedFields(experimentId);
  await clearHiddenFlagIfNoLongerDone(experimentId);
  await syncHypothesisStatusForExperiment(experimentId);

  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
  return actionSuccess({ changed: true });
  } catch (error) { return mutationFailure<{ changed: boolean }>("experiments.weeks.resize.failed", error, user.id); }
}

export { getFunnelLevels } from "@/lib/funnelLevel";

export async function getProducts() {
  return prisma.product.findMany({ orderBy: { name: "asc" } });
}

export async function getSegments() {
  return prisma.segment.findMany({ orderBy: { name: "asc" } });
}

export async function getAuthors(): Promise<string[]> {
  const rows = await prisma.experiment.findMany({
    where: { author: { not: null } },
    select: { author: true },
    distinct: ["author"],
    orderBy: { author: "asc" },
  });
  return rows.map((r) => r.author).filter((a): a is string => Boolean(a));
}

/**
 * PROD-029: creating an experiment moves its hypothesis to In progress;
 * after deletion, return only hypotheses with no remaining experiments
 * to their base New state. Shared by the detail and bulk delete paths.
 */
async function resetEmptyHypotheses(hypothesisIds: string[]) {
  const ids = [...new Set(hypothesisIds)];
  if (ids.length === 0) return;

  const hypotheses = await prisma.hypothesis.findMany({
    where: { id: { in: ids } },
    select: { id: true, _count: { select: { experiments: true } } },
  });
  const emptyIds = hypotheses.filter((hypothesis) => hypothesis._count.experiments === 0).map((hypothesis) => hypothesis.id);
  if (emptyIds.length === 0) return;

  await prisma.hypothesis.updateMany({
    where: { id: { in: emptyIds } },
    data: { status: "NEW" },
  });
}

export async function deleteExperiment(id: string): Promise<{ error?: string }> {
  const user = await requireAuthenticatedUser();
  try {
    const experiment = await prisma.experiment.findUnique({
    where: { id },
    select: { hypothesisId: true },
    });
    if (!experiment) return {};
    await prisma.experiment.delete({ where: { id } });
    await resetEmptyHypotheses([experiment.hypothesisId]);
    revalidatePath("/backlog");
    revalidatePath(`/backlog/${experiment.hypothesisId}`);
  } catch (error) { return mutationFailure("experiments.experiment.delete.failed", error, user.id); }

  revalidatePath("/calendar");
  redirect("/calendar");
}

export async function archiveExperiment(id: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try { await prisma.experiment.update({
    where: { id },
    data: { archived: true, archivedAt: new Date() },
  }); await auditExperimentEvent("EXPERIMENT_ARCHIVED", { experimentId: id }); }
  catch (error) { return mutationFailure("experiments.experiment.archive.failed", error, user.id); }
  revalidatePath(`/experiments/${id}`);
  revalidatePath("/calendar");
  return actionSuccess();
}

export async function unarchiveExperiment(id: string): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try { await prisma.experiment.update({
    where: { id },
    data: { archived: false, archivedAt: null },
  }); await auditExperimentEvent("EXPERIMENT_UNARCHIVED", { experimentId: id }); }
  catch (error) { return mutationFailure("experiments.experiment.unarchive.failed", error, user.id); }
  revalidatePath(`/experiments/${id}`);
  revalidatePath("/calendar");
  return actionSuccess();
}

export async function archiveExperiments(ids: string[]): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  if (ids.length === 0) return actionSuccess();
  try { await prisma.experiment.updateMany({
    where: { id: { in: ids } },
    data: { archived: true, archivedAt: new Date() },
  }); } catch (error) { return mutationFailure("experiments.experiments.archive.failed", error, user.id); }
  revalidatePath("/calendar");
  return actionSuccess();
}

export async function deleteExperiments(ids: string[]): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  if (ids.length === 0) return actionSuccess();
  try {
  const experiments = await prisma.experiment.findMany({
    where: { id: { in: ids } },
    select: { hypothesisId: true },
  });
  await prisma.experiment.deleteMany({ where: { id: { in: ids } } });
  const hypothesisIds = experiments.map((experiment) => experiment.hypothesisId);
  await resetEmptyHypotheses(hypothesisIds);
  revalidatePath("/backlog");
  revalidatePath("/calendar");
  for (const hypothesisId of new Set(hypothesisIds)) {
    revalidatePath(`/backlog/${hypothesisId}`);
  }
  } catch (error) { return mutationFailure("experiments.experiments.delete.failed", error, user.id); }
  return actionSuccess();
}
