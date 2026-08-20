"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionSuccess, type ActionResult } from "@/lib/action-result";
import { runWithOperationCorrelation } from "@/lib/log";
import { auditExperimentEvent, experimentMutationFailure, requireExperimentActionUser } from "./shared";

export async function getProductsAction() {
  return prisma.product.findMany({ orderBy: { name: "asc" } });
}

export async function getSegmentsAction() {
  return prisma.segment.findMany({ orderBy: { name: "asc" } });
}

export async function getAuthorsAction(): Promise<string[]> {
  const rows = await prisma.experiment.findMany({
    where: { author: { not: null } },
    select: { author: true },
    distinct: ["author"],
    orderBy: { author: "asc" },
  });
  return rows.map((row) => row.author).filter((author): author is string => Boolean(author));
}

async function resetEmptyHypotheses(hypothesisIds: string[]) {
  const ids = [...new Set(hypothesisIds)];
  if (ids.length === 0) return;
  const hypotheses = await prisma.hypothesis.findMany({
    where: { id: { in: ids } },
    select: { id: true, _count: { select: { experiments: true } } },
  });
  const emptyIds = hypotheses.filter((hypothesis) => hypothesis._count.experiments === 0).map((hypothesis) => hypothesis.id);
  if (emptyIds.length === 0) return;
  await prisma.hypothesis.updateMany({ where: { id: { in: emptyIds } }, data: { status: "NEW" } });
}

export async function deleteExperimentAction(id: string): Promise<ActionResult> {
  return runWithOperationCorrelation(async () => {
  const user = await requireExperimentActionUser();
  try {
    const experiment = await prisma.experiment.findUnique({ where: { id }, select: { hypothesisId: true } });
    if (!experiment) return actionSuccess();
    await prisma.experiment.delete({ where: { id } });
    await resetEmptyHypotheses([experiment.hypothesisId]);
    revalidatePath("/backlog");
    revalidatePath(`/backlog/${experiment.hypothesisId}`);
  } catch (error) {
    return experimentMutationFailure("experiments.experiment.delete.failed", error, user.id);
  }
  revalidatePath("/calendar");
  redirect("/calendar");
  });
}

export async function archiveExperimentAction(id: string): Promise<ActionResult> {
  return runWithOperationCorrelation(async () => {
  const user = await requireExperimentActionUser();
  try {
    await prisma.experiment.update({ where: { id }, data: { archived: true, archivedAt: new Date() } });
    await auditExperimentEvent("EXPERIMENT_ARCHIVED", { experimentId: id });
  } catch (error) {
    return experimentMutationFailure("experiments.experiment.archive.failed", error, user.id);
  }
  revalidatePath(`/experiments/${id}`);
  revalidatePath("/calendar");
  return actionSuccess();
  });
}

export async function unarchiveExperimentAction(id: string): Promise<ActionResult> {
  return runWithOperationCorrelation(async () => {
  const user = await requireExperimentActionUser();
  try {
    await prisma.experiment.update({ where: { id }, data: { archived: false, archivedAt: null } });
    await auditExperimentEvent("EXPERIMENT_UNARCHIVED", { experimentId: id });
  } catch (error) {
    return experimentMutationFailure("experiments.experiment.unarchive.failed", error, user.id);
  }
  revalidatePath(`/experiments/${id}`);
  revalidatePath("/calendar");
  return actionSuccess();
  });
}

export async function archiveExperimentsAction(ids: string[]): Promise<ActionResult> {
  return runWithOperationCorrelation(async () => {
  const user = await requireExperimentActionUser();
  if (ids.length === 0) return actionSuccess();
  try {
    await prisma.experiment.updateMany({ where: { id: { in: ids } }, data: { archived: true, archivedAt: new Date() } });
  } catch (error) {
    return experimentMutationFailure("experiments.experiments.archive.failed", error, user.id);
  }
  revalidatePath("/calendar");
  return actionSuccess();
  });
}

export async function deleteExperimentsAction(ids: string[]): Promise<ActionResult> {
  return runWithOperationCorrelation(async () => {
  const user = await requireExperimentActionUser();
  if (ids.length === 0) return actionSuccess();
  try {
    const experiments = await prisma.experiment.findMany({ where: { id: { in: ids } }, select: { hypothesisId: true } });
    await prisma.experiment.deleteMany({ where: { id: { in: ids } } });
    const hypothesisIds = experiments.map((experiment) => experiment.hypothesisId);
    await resetEmptyHypotheses(hypothesisIds);
    revalidatePath("/backlog");
    revalidatePath("/calendar");
    for (const hypothesisId of new Set(hypothesisIds)) revalidatePath(`/backlog/${hypothesisId}`);
  } catch (error) {
    return experimentMutationFailure("experiments.experiments.delete.failed", error, user.id);
  }
  return actionSuccess();
  });
}
