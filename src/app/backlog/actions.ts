"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { shouldPromptArchiveHypothesis } from "@/lib/hypothesis";
import { resolveFunnelLevelId } from "@/lib/funnelLevel";
import { syncExperimentFunnelLevelsForHypothesis } from "../experiments/actions";

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
    select: { status: true, archived: true },
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
  // PROD-033: Funnel Level isn't independently editable on an
  // experiment — keep every experiment under this hypothesis in sync
  // whenever the hypothesis's own Funnel Level changes.
  await syncExperimentFunnelLevelsForHypothesis(id);

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);

  const statusChanged = before !== null && before.status !== data.status;
  const shouldPromptArchive =
    statusChanged && before !== null && shouldPromptArchiveHypothesis(data.status, before.archived);

  if (shouldPromptArchive) redirect(`/backlog/${id}?promptArchive=1&saved=1`);
  redirect("/backlog?saved=1");
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

/** Starts the experiment workflow from an Accepted backlog row. */
export async function takeHypothesisIntoWork(id: string): Promise<string> {
  const hypothesis = await prisma.hypothesis.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
  if (!hypothesis || hypothesis.status !== "ACCEPTED") return "/backlog";
  // PROD-034: a hypothesis has at most one experiment ever, not just
  // one active at a time — so this checks for any experiment, archived
  // or Done included, not only "still active" ones like before.
  const existing = await prisma.experiment.findFirst({
    where: { hypothesisId: id },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (!existing) {
    await prisma.experiment.create({ data: { name: hypothesis.name, hypothesisId: id } });
    // PROD-033: seed the new experiment's Funnel Level from the hypothesis.
    await syncExperimentFunnelLevelsForHypothesis(id);
  }
  await prisma.hypothesis.update({ where: { id }, data: { status: "IN_PROGRESS" } });
  revalidatePath("/backlog"); revalidatePath("/calendar");
  return "/calendar";
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

export async function archiveHypothesis(id: string) {
  await prisma.hypothesis.update({
    where: { id },
    data: { archived: true, archivedAt: new Date() },
  });
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);
}

export async function unarchiveHypothesis(id: string) {
  await prisma.hypothesis.update({
    where: { id },
    data: { archived: false, archivedAt: null },
  });
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);
}

export async function archiveHypotheses(ids: string[]): Promise<{ error?: string } | void> {
  if (ids.length === 0) return;
  await prisma.hypothesis.updateMany({
    where: { id: { in: ids } },
    data: { archived: true, archivedAt: new Date() },
  });
  revalidatePath("/backlog");
}

/**
 * Bulk delete mirrors `deleteHypothesis`'s guard (can't delete a
 * hypothesis that still has experiments) — skips those and deletes
 * the rest, reporting the skip count instead of failing the batch.
 */
export async function deleteHypotheses(ids: string[]): Promise<{ error?: string } | void> {
  if (ids.length === 0) return;
  const hypotheses = await prisma.hypothesis.findMany({
    where: { id: { in: ids } },
    select: { id: true, _count: { select: { experiments: true } } },
  });
  const deletable = hypotheses.filter((h) => h._count.experiments === 0);
  const blocked = hypotheses.length - deletable.length;

  if (deletable.length > 0) {
    await prisma.hypothesis.deleteMany({ where: { id: { in: deletable.map((h) => h.id) } } });
    revalidatePath("/backlog");
  }

  if (blocked > 0) {
    return {
      error: `Удален${deletable.length === 1 ? "а" : deletable.length === 0 ? "" : "о"} ${deletable.length}. Пропущен${blocked === 1 ? "а" : "о"} ${blocked} — с ${blocked === 1 ? "ней" : "ними"} связаны эксперименты, сначала удали их.`,
    };
  }
}
