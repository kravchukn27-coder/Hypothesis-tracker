"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const baseExperimentFields = {
  hypothesisId: z.string().trim().min(1, "Выбери гипотезу"),
  author: z.string().trim().optional(),
  targeting: z.string().trim().optional(),
  segment: z.string().trim().optional(),
  stage: z.enum(["DISCOVERY", "DESIGN", "DEVELOPMENT", "EXPERIMENTATION", "ANALYSIS", "DONE"]),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
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

  const experiment = await prisma.experiment.create({
    data: {
      name,
      hypothesisId: data.hypothesisId,
      author: data.author || null,
      targeting: data.targeting || null,
      segment: data.segment || null,
      stage: data.stage,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
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
  redirect(`/experiments/${experiment.id}`);
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

  await prisma.experiment.update({
    where: { id },
    data: {
      name: data.name,
      hypothesisId: data.hypothesisId,
      author: data.author || null,
      targeting: data.targeting || null,
      segment: data.segment || null,
      stage: data.stage,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
    },
  });

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${id}`);
  redirect(`/experiments/${id}`);
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
