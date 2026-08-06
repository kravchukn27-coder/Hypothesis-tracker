"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const experimentFormSchema = z.object({
  name: z.string().trim().min(1, "Название обязательно"),
  hypothesisId: z.string().trim().min(1, "Выбери гипотезу"),
  author: z.string().trim().optional(),
  targeting: z.string().trim().optional(),
  segment: z.string().trim().optional(),
  stage: z.enum(["DISCOVERY", "DESIGN", "DEVELOPMENT", "EXPERIMENTATION", "ANALYSIS", "DONE"]),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export type ExperimentFormState = {
  error?: string;
};

function toDate(value: string | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return experimentFormSchema.safeParse(raw);
}

export async function createExperiment(
  _prevState: ExperimentFormState,
  formData: FormData,
): Promise<ExperimentFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверь поля формы" };
  }
  const data = parsed.data;

  const experiment = await prisma.experiment.create({
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
  const parsed = parseForm(formData);
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
