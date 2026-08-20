import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentWeekStage } from "@/lib/experiment";
import { MS_PER_DAY } from "@/lib/calendar";
import { revalidatePath } from "next/cache";

type WeekStageClient = Prisma.TransactionClient;

export async function recomputeExperimentDerivedFields(experimentId: string, db: WeekStageClient = prisma) {
  const weeks = await db.experimentWeekStage.findMany({
    where: { experimentId },
    orderBy: { weekStart: "asc" },
  });
  if (weeks.length === 0) {
    await db.experiment.update({
      where: { id: experimentId },
      data: { stage: null, startDate: null, endDate: null, calendarHiddenOnDone: null },
    });
    return;
  }

  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  await db.experiment.update({
    where: { id: experimentId },
    data: {
      stage: last.stage,
      startDate: first.weekStart,
      endDate: new Date(last.weekStart.getTime() + 6 * MS_PER_DAY),
    },
  });
}

export async function syncHypothesisStatusForExperiment(experimentId: string, db: WeekStageClient = prisma, revalidate = true) {
  const experiment = await db.experiment.findUnique({ where: { id: experimentId }, select: { hypothesisId: true } });
  if (!experiment) return;
  const experiments = await db.experiment.findMany({
    where: { hypothesisId: experiment.hypothesisId },
    select: { stage: true, weekStages: { select: { weekStart: true, stage: true } } },
  });
  if (experiments.length === 0) return;
  const hasActive = experiments.some((item) =>
    (item.weekStages.length > 0 ? getCurrentWeekStage(item.weekStages) : item.stage) !== "DONE",
  );
  await db.hypothesis.update({
    where: { id: experiment.hypothesisId },
    data: { status: hasActive ? "IN_PROGRESS" : "DONE" },
  });
  if (revalidate) {
    revalidatePath("/backlog");
    revalidatePath(`/backlog/${experiment.hypothesisId}`);
  }
}

export async function hasWeekStages(experimentId: string): Promise<boolean> {
  return (await prisma.experimentWeekStage.count({ where: { experimentId } })) > 0;
}

export async function clearHiddenFlagIfNoLongerDone(experimentId: string, db: WeekStageClient = prisma) {
  const weeks = await db.experimentWeekStage.findMany({
    where: { experimentId },
    select: { weekStart: true, stage: true },
  });
  if (weeks.length === 0 || getCurrentWeekStage(weeks) === "DONE") return;
  await db.experiment.updateMany({
    where: { id: experimentId, calendarHiddenOnDone: true },
    data: { calendarHiddenOnDone: null },
  });
}
