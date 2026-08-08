"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const baseExperimentFields = {
  hypothesisId: z.string().trim().min(1, "Выбери гипотезу"),
  author: z.string().trim().optional(),
  stage: z.enum(["DISCOVERY", "DESIGN", "DEVELOPMENT", "EXPERIMENTATION", "ANALYSIS", "DONE"]),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  // TECH-003: 6 multi-select tag categories (5 original + Segment,
  // folded in the same way), each submitted as a pair of comma-joined
  // hidden fields (see TagMultiSelect) — existing tag ids to connect,
  // and new tag names to create-then-connect.
  funnelLevelIds: z.string().trim().optional(),
  funnelLevelNew: z.string().trim().optional(),
  platformIds: z.string().trim().optional(),
  platformNew: z.string().trim().optional(),
  channelIds: z.string().trim().optional(),
  channelNew: z.string().trim().optional(),
  marketIds: z.string().trim().optional(),
  marketNew: z.string().trim().optional(),
  productIds: z.string().trim().optional(),
  productNew: z.string().trim().optional(),
  segmentIds: z.string().trim().optional(),
  segmentNew: z.string().trim().optional(),
};

// Create: name is auto-generated server-side (PROD-006), never submitted.
const createExperimentSchema = z.object(baseExperimentFields);

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Monday 00:00 of the week containing `date`, in local time. */
function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

/**
 * PROD-019: recomputes Experiment.stage/startDate/endDate from its
 * ExperimentWeekStage rows (latest week's stage; earliest/latest week
 * as the date span) — the denormalized cache that keeps every
 * existing query/filter/sort/badge across the app working unchanged.
 * No-op if there are no week entries (nothing to derive from yet).
 */
async function recomputeExperimentDerivedFields(experimentId: string) {
  const weeks = await prisma.experimentWeekStage.findMany({
    where: { experimentId },
    orderBy: { weekStart: "asc" },
  });
  if (weeks.length === 0) return;

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
  funnelLevelIds?: string;
  funnelLevelNew?: string;
  platformIds?: string;
  platformNew?: string;
  channelIds?: string;
  channelNew?: string;
  marketIds?: string;
  marketNew?: string;
  productIds?: string;
  productNew?: string;
  segmentIds?: string;
  segmentNew?: string;
}) {
  const [funnelLevels, platforms, channels, markets, products, segments] = await Promise.all([
    resolveTagIds(prisma.funnelLevel, data.funnelLevelIds, data.funnelLevelNew),
    resolveTagIds(prisma.platform, data.platformIds, data.platformNew),
    resolveTagIds(prisma.channel, data.channelIds, data.channelNew),
    resolveTagIds(prisma.market, data.marketIds, data.marketNew),
    resolveTagIds(prisma.product, data.productIds, data.productNew),
    resolveTagIds(prisma.segment, data.segmentIds, data.segmentNew),
  ]);
  return { funnelLevels, platforms, channels, markets, products, segments };
}

/**
 * PROD-006: an experiment created from a hypothesis is named exactly
 * after it. If the hypothesis already has experiments, the name gets
 * a " N" suffix (N = existing count + 1) so multiple experiments off
 * the same hypothesis stay distinguishable.
 */
async function computeExperimentName(hypothesisId: string): Promise<string> {
  const [hypothesis, existingCount] = await Promise.all([
    prisma.hypothesis.findUnique({ where: { id: hypothesisId }, select: { name: true } }),
    prisma.experiment.count({ where: { hypothesisId } }),
  ]);
  if (!hypothesis) throw new Error("Hypothesis not found");
  return existingCount === 0 ? hypothesis.name : `${hypothesis.name} ${existingCount + 1}`;
}

export async function createExperiment(
  _prevState: ExperimentFormState,
  formData: FormData,
): Promise<ExperimentFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createExperimentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверь поля формы" };
  }
  const data = parsed.data;
  const name = await computeExperimentName(data.hypothesisId);
  const tagIds = await resolveExperimentTagIds(data);

  await prisma.experiment.create({
    data: {
      name,
      hypothesisId: data.hypothesisId,
      author: data.author || null,
      stage: data.stage,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
      funnelLevels: { connect: tagIds.funnelLevels.map((id) => ({ id })) },
      platforms: { connect: tagIds.platforms.map((id) => ({ id })) },
      channels: { connect: tagIds.channels.map((id) => ({ id })) },
      markets: { connect: tagIds.markets.map((id) => ({ id })) },
      products: { connect: tagIds.products.map((id) => ({ id })) },
      segments: { connect: tagIds.segments.map((id) => ({ id })) },
    },
  });

  // Converting a hypothesis into an experiment means testing has started.
  await prisma.hypothesis.update({
    where: { id: data.hypothesisId },
    data: { status: "IN_PROGRESS" },
  });

  revalidatePath("/experiments");
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${data.hypothesisId}`);
  redirect("/experiments?saved=1");
}

export async function updateExperiment(
  id: string,
  _prevState: ExperimentFormState,
  formData: FormData,
): Promise<ExperimentFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateExperimentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверь поля формы" };
  }
  const data = parsed.data;
  const tagIds = await resolveExperimentTagIds(data);
  // PROD-019: once week entries exist, stage/dates are derived from
  // them — the form's now-disabled Status/date fields still submit
  // their last-known values, but must not overwrite the derived cache.
  const locked = await hasWeekStages(id);

  await prisma.experiment.update({
    where: { id },
    data: {
      name: data.name,
      hypothesisId: data.hypothesisId,
      author: data.author || null,
      ...(locked ? {} : { stage: data.stage, startDate: toDate(data.startDate), endDate: toDate(data.endDate) }),
      funnelLevels: { set: tagIds.funnelLevels.map((id) => ({ id })) },
      platforms: { set: tagIds.platforms.map((id) => ({ id })) },
      channels: { set: tagIds.channels.map((id) => ({ id })) },
      markets: { set: tagIds.markets.map((id) => ({ id })) },
      products: { set: tagIds.products.map((id) => ({ id })) },
      segments: { set: tagIds.segments.map((id) => ({ id })) },
    },
  });

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${id}`);
  redirect("/experiments?saved=1");
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

export async function updateExperimentStage(id: string, stage: string) {
  const parsed = stageSchema.safeParse(stage);
  if (!parsed.success) return;
  if (await hasWeekStages(id)) return;

  await prisma.experiment.update({
    where: { id },
    data: { stage: parsed.data },
  });

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${id}`);
}

export async function updateExperimentDates(
  id: string,
  startDate: string | null,
  endDate: string | null,
) {
  if (await hasWeekStages(id)) return;

  await prisma.experiment.update({
    where: { id },
    data: { startDate: toDate(startDate ?? undefined), endDate: toDate(endDate ?? undefined) },
  });

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${id}`);
}

/**
 * PROD-019: sets (creates or updates) one week's stage for an
 * experiment, then recomputes the denormalized stage/startDate/endDate
 * cache. Used by both the Calendar's week-cell click and the detail
 * card's per-week editor.
 */
export async function setExperimentWeekStage(experimentId: string, weekStartISO: string, stage: string) {
  const parsedStage = stageSchema.safeParse(stage);
  if (!parsedStage.success) return;
  const weekStart = startOfWeek(new Date(`${weekStartISO}T00:00:00`));

  await prisma.experimentWeekStage.upsert({
    where: { experimentId_weekStart: { experimentId, weekStart } },
    update: { stage: parsedStage.data },
    create: { experimentId, weekStart, stage: parsedStage.data },
  });
  await recomputeExperimentDerivedFields(experimentId);

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
}

/**
 * PROD-019: appends the next week after an experiment's last week
 * entry (or the current week if it has none yet), defaulting to the
 * last entry's stage — the detail card's "+ Добавить неделю" button.
 */
export async function addNextExperimentWeek(experimentId: string) {
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

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
}

/**
 * PROD-019: drag-to-move a whole block of weeks (Calendar). Shifts
 * every existing week entry by `deltaWeeks`. Deletes and recreates
 * rather than updating in place, since shifting could otherwise
 * transiently collide with the `[experimentId, weekStart]` unique
 * constraint mid-update.
 */
export async function shiftExperimentWeeks(experimentId: string, deltaWeeks: number) {
  if (!Number.isInteger(deltaWeeks) || deltaWeeks === 0) return;

  const entries = await prisma.experimentWeekStage.findMany({ where: { experimentId } });
  if (entries.length === 0) return;

  await prisma.$transaction([
    prisma.experimentWeekStage.deleteMany({ where: { experimentId } }),
    ...entries.map((e) =>
      prisma.experimentWeekStage.create({
        data: {
          experimentId,
          stage: e.stage,
          weekStart: new Date(e.weekStart.getTime() + deltaWeeks * 7 * MS_PER_DAY),
        },
      }),
    ),
  ]);
  await recomputeExperimentDerivedFields(experimentId);

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
}

/**
 * PROD-019: drag-to-resize the end of a block of weeks (Calendar).
 * `deltaWeeks > 0` appends that many weeks (repeating the last stage);
 * `deltaWeeks < 0` removes that many trailing weeks, keeping at least
 * one.
 */
export async function resizeExperimentWeeks(experimentId: string, deltaWeeks: number) {
  if (!Number.isInteger(deltaWeeks) || deltaWeeks === 0) return;

  const entries = await prisma.experimentWeekStage.findMany({
    where: { experimentId },
    orderBy: { weekStart: "asc" },
  });
  if (entries.length === 0) return;

  if (deltaWeeks > 0) {
    const last = entries[entries.length - 1];
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

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath("/calendar");
}

export async function getFunnelLevels() {
  return prisma.funnelLevel.findMany({ orderBy: { name: "asc" } });
}

export async function getPlatforms() {
  return prisma.platform.findMany({ orderBy: { name: "asc" } });
}

export async function getChannels() {
  return prisma.channel.findMany({ orderBy: { name: "asc" } });
}

export async function getMarkets() {
  return prisma.market.findMany({ orderBy: { name: "asc" } });
}

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

export async function deleteExperiment(id: string): Promise<{ error?: string }> {
  const experiment = await prisma.experiment.findUnique({
    where: { id },
    select: { hypothesisId: true },
  });
  if (!experiment) return {};

  await prisma.experiment.delete({ where: { id } });

  revalidatePath("/experiments");
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${experiment.hypothesisId}`);
  redirect("/experiments");
}
