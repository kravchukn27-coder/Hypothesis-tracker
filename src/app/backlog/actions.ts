"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { shouldPromptExperimentConversion } from "@/lib/hypothesis";

const hypothesisFormSchema = z.object({
  name: z.string().trim().min(1, "Название обязательно"),
  text: z.string().trim().min(1, "Текст гипотезы обязателен"),
  funnelLevel: z.string().trim().optional(),
  conversion: z.enum(["CR", "LTV", "CR_LTV"]),
  impact: z.coerce.number().int().min(1).max(5),
  effort: z.coerce.number().int().min(1).max(5),
  reach: z.coerce.number().min(0).max(100),
  confidence: z.coerce.number().min(0).max(100),
  status: z.enum(["NEW", "PLANNED", "IN_PROGRESS", "ACCEPTED", "HOLD", "DONE"]),
  result: z.string().trim().optional(),
  comment: z.string().trim().optional(),
  modeling: z.string().trim().optional(),
  sampleSize: z.string().trim().optional(),
  taskUrl: z.string().trim().optional(),
});

export type HypothesisFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function resolveFunnelLevelId(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const level = await prisma.funnelLevel.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed, isCustom: true },
  });
  return level.id;
}

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  // reach/confidence are entered as 0-100 in the UI, stored as 0-1 fractions.
  const parsed = hypothesisFormSchema.safeParse(raw);
  return parsed;
}

export async function createHypothesis(
  _prevState: HypothesisFormState,
  formData: FormData,
): Promise<HypothesisFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Проверь поля формы", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string> };
  }
  const data = parsed.data;
  const funnelLevelId = await resolveFunnelLevelId(data.funnelLevel);

  await prisma.hypothesis.create({
    data: {
      name: data.name,
      text: data.text,
      funnelLevelId,
      conversion: data.conversion,
      impact: data.impact,
      effort: data.effort,
      reach: data.reach / 100,
      confidence: data.confidence / 100,
      status: data.status,
      result: data.result || null,
      comment: data.comment || null,
      modeling: data.modeling || null,
      sampleSize: data.sampleSize || null,
      taskUrl: data.taskUrl || null,
    },
  });

  revalidatePath("/backlog");
  redirect("/backlog?saved=1");
}

export async function updateHypothesis(
  id: string,
  _prevState: HypothesisFormState,
  formData: FormData,
): Promise<HypothesisFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Проверь поля формы", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string> };
  }
  const data = parsed.data;
  const funnelLevelId = await resolveFunnelLevelId(data.funnelLevel);

  const before = await prisma.hypothesis.findUnique({
    where: { id },
    select: { status: true, _count: { select: { experiments: true } } },
  });

  await prisma.hypothesis.update({
    where: { id },
    data: {
      name: data.name,
      text: data.text,
      funnelLevelId,
      conversion: data.conversion,
      impact: data.impact,
      effort: data.effort,
      reach: data.reach / 100,
      confidence: data.confidence / 100,
      status: data.status,
      result: data.result || null,
      comment: data.comment || null,
      modeling: data.modeling || null,
      sampleSize: data.sampleSize || null,
      taskUrl: data.taskUrl || null,
    },
  });

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);

  const statusChanged = before !== null && before.status !== data.status;
  const shouldPrompt =
    statusChanged &&
    before !== null &&
    shouldPromptExperimentConversion(data.status, before._count.experiments > 0);

  redirect(shouldPrompt ? `/backlog/${id}?promptExperiment=1&saved=1` : `/backlog/${id}?saved=1`);
}

export async function getFunnelLevels() {
  return prisma.funnelLevel.findMany({ orderBy: { name: "asc" } });
}

const HYPOTHESIS_STATUSES = ["NEW", "PLANNED", "IN_PROGRESS", "ACCEPTED", "HOLD", "DONE"] as const;
const statusSchema = z.enum(HYPOTHESIS_STATUSES);

export async function updateHypothesisStatus(id: string, status: string) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return;

  await prisma.hypothesis.update({
    where: { id },
    data: { status: parsed.data },
  });

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);
}

export async function deleteHypothesis(id: string): Promise<{ error?: string }> {
  const hypothesis = await prisma.hypothesis.findUnique({
    where: { id },
    select: { name: true, _count: { select: { experiments: true } } },
  });
  if (!hypothesis) return {};

  if (hypothesis._count.experiments > 0) {
    return {
      error: `Нельзя удалить «${hypothesis.name}» — с ней связан${hypothesis._count.experiments === 1 ? "" : "о"} экспериментов: ${hypothesis._count.experiments}. Сначала удали эти эксперименты.`,
    };
  }

  await prisma.hypothesis.delete({ where: { id } });
  revalidatePath("/backlog");
  redirect("/backlog");
}
