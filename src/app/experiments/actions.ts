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

  await prisma.experiment.update({
    where: { id },
    data: {
      name: data.name,
      hypothesisId: data.hypothesisId,
      author: data.author || null,
      stage: data.stage,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
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

export async function updateExperimentStage(id: string, stage: string) {
  const parsed = stageSchema.safeParse(stage);
  if (!parsed.success) return;

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
  await prisma.experiment.update({
    where: { id },
    data: { startDate: toDate(startDate ?? undefined), endDate: toDate(endDate ?? undefined) },
  });

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${id}`);
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
