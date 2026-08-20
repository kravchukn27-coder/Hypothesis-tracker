"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { shouldPromptArchiveHypothesis } from "@/lib/hypothesis";
import { resolveFunnelLevelId } from "@/lib/funnelLevel";
import { syncExperimentFunnelLevelsForHypothesis } from "../experiments/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { safeWriteAuditLog } from "@/lib/audit-log";
import { captureServerError } from "@/lib/log";

async function auditBacklogEvent(event: string, metadata: Record<string, unknown>) {
  const user = await getCurrentUser();
  await safeWriteAuditLog({ event, userId: user?.id ?? null, metadata, route: "src/app/backlog/actions.ts" });
}

async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function mutationFailure(event: string, error: unknown, userId: string) {
  await captureServerError({ event, route: "src/app/backlog/actions.ts", error, userId });
  return { error: "Не удалось сохранить изменения. Попробуйте ещё раз." };
}

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
  const user = await requireAuthenticatedUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Проверь поля формы", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string> };
  }
  const data = parsed.data;
  let created: { id: string };
  try {
    const funnelLevelId = await resolveFunnelLevelId(data.funnelLevel);
    created = await prisma.hypothesis.create({
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
      modeling: data.modeling || null,
      sampleSize: data.sampleSize || null,
      taskUrl: data.taskUrl || null,
    },
    });
    await auditBacklogEvent("HYPOTHESIS_CREATED", { hypothesisId: created.id });
  } catch (error) {
    return mutationFailure("backlog.hypothesis.create.failed", error, user.id);
  }

  revalidatePath("/backlog");
  redirect(`/backlog?saved=1&hypothesisId=${created.id}`);
}

export async function updateHypothesis(
  id: string,
  _prevState: HypothesisFormState,
  formData: FormData,
): Promise<HypothesisFormState> {
  const user = await requireAuthenticatedUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Проверь поля формы", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string> };
  }
  const data = parsed.data;
  let before: { status: typeof data.status; archived: boolean } | null;
  try {
    const funnelLevelId = await resolveFunnelLevelId(data.funnelLevel);
    before = await prisma.hypothesis.findUnique({
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
      modeling: data.modeling || null,
      sampleSize: data.sampleSize || null,
      taskUrl: data.taskUrl || null,
    },
    });
    await auditBacklogEvent("HYPOTHESIS_UPDATED", { hypothesisId: id });
  // PROD-033: Funnel Level isn't independently editable on an
  // experiment — keep every experiment under this hypothesis in sync
  // whenever the hypothesis's own Funnel Level changes.
    const syncResult = await syncExperimentFunnelLevelsForHypothesis(id);
    if (syncResult?.error) return syncResult;
  } catch (error) {
    return mutationFailure("backlog.hypothesis.update.failed", error, user.id);
  }

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
  const user = await requireAuthenticatedUser();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return;

  try {
    const before = await prisma.hypothesis.findUnique({ where: { id }, select: { status: true } });
    await prisma.hypothesis.update({
    where: { id },
    data: { status: parsed.data },
    });
    await auditBacklogEvent("HYPOTHESIS_STATUS_CHANGED", { hypothesisId: id, before: before?.status ?? null, after: parsed.data });
  } catch (error) {
    return mutationFailure("backlog.hypothesis.status.update.failed", error, user.id);
  }

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);
}

/** Starts the experiment workflow from an Accepted backlog row. */
export async function takeHypothesisIntoWork(id: string): Promise<{ href: string; error?: string }> {
  const user = await requireAuthenticatedUser();
  try {
  const hypothesis = await prisma.hypothesis.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
  if (!hypothesis || hypothesis.status !== "ACCEPTED") return { href: "/backlog" };
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
    const syncResult = await syncExperimentFunnelLevelsForHypothesis(id);
    if (syncResult?.error) return { href: "/backlog", error: syncResult.error };
  }
    await prisma.hypothesis.update({ where: { id }, data: { status: "IN_PROGRESS" } });
  } catch (error) {
    await mutationFailure("backlog.hypothesis.take_into_work.failed", error, user.id);
    return { href: "/backlog", error: "Не удалось сохранить изменения. Попробуйте ещё раз." };
  }
  revalidatePath("/backlog"); revalidatePath("/calendar");
  return { href: "/calendar" };
}

export async function deleteHypothesis(id: string): Promise<{ error?: string }> {
  const user = await requireAuthenticatedUser();
  let hypothesis: { name: string; _count: { experiments: number } } | null;
  try {
    hypothesis = await prisma.hypothesis.findUnique({
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
    await auditBacklogEvent("HYPOTHESIS_DELETED", { hypothesisId: id });
  } catch (error) {
    return mutationFailure("backlog.hypothesis.delete.failed", error, user.id);
  }
  revalidatePath("/backlog");
  redirect("/backlog");
}

export async function archiveHypothesis(id: string) {
  const user = await requireAuthenticatedUser();
  try {
    await prisma.hypothesis.update({ where: { id }, data: { archived: true, archivedAt: new Date() } });
    await auditBacklogEvent("HYPOTHESIS_ARCHIVED", { hypothesisId: id });
  } catch (error) { return mutationFailure("backlog.hypothesis.archive.failed", error, user.id); }
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);
}

export async function unarchiveHypothesis(id: string) {
  const user = await requireAuthenticatedUser();
  try {
    await prisma.hypothesis.update({ where: { id }, data: { archived: false, archivedAt: null } });
    await auditBacklogEvent("HYPOTHESIS_UNARCHIVED", { hypothesisId: id });
  } catch (error) { return mutationFailure("backlog.hypothesis.unarchive.failed", error, user.id); }
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);
}

export async function archiveHypotheses(ids: string[]): Promise<{ error?: string } | void> {
  const user = await requireAuthenticatedUser();
  if (ids.length === 0) return;
  try { await prisma.hypothesis.updateMany({ where: { id: { in: ids } }, data: { archived: true, archivedAt: new Date() } }); }
  catch (error) { return mutationFailure("backlog.hypotheses.archive.failed", error, user.id); }
  revalidatePath("/backlog");
}

/**
 * Bulk delete mirrors `deleteHypothesis`'s guard (can't delete a
 * hypothesis that still has experiments) — skips those and deletes
 * the rest, reporting the skip count instead of failing the batch.
 */
export async function deleteHypotheses(ids: string[]): Promise<{ error?: string } | void> {
  const user = await requireAuthenticatedUser();
  if (ids.length === 0) return;
  try {
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
  } catch (error) { return mutationFailure("backlog.hypotheses.delete.failed", error, user.id); }
}
