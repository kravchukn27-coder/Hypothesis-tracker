"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { captureServerError, runWithOperationCorrelation } from "@/lib/log";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";

export async function createHypothesisComment(
  hypothesisId: string,
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runWithOperationCorrelation(async () => {
  const user = await getCurrentUser();
  if (!user) return actionFailure("Сессия истекла. Войдите снова.");

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return actionFailure("Комментарий не может быть пустым.");
  if (message.length > 4000) return actionFailure("Комментарий не должен превышать 4000 символов.");

  try {
    const hypothesis = await prisma.hypothesis.findUnique({ where: { id: hypothesisId }, select: { id: true } });
    if (!hypothesis) return actionFailure("Гипотеза не найдена.");
    await prisma.hypothesisComment.create({ data: { hypothesisId, authorUserId: user.id, message } });
  } catch (error) {
    await captureServerError({ event: "backlog.comment.create.failed", route: "src/app/backlog/[id]/comments-actions.ts#createHypothesisComment", error, userId: user.id });
    return actionFailure("Не удалось добавить комментарий. Попробуйте ещё раз.");
  }
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${hypothesisId}`);
  return actionSuccess();
  });
}

export async function deleteHypothesisComment(commentId: string): Promise<ActionResult> {
  return runWithOperationCorrelation(async () => {
  const user = await getCurrentUser();
  if (!user) return actionFailure("Сессия истекла. Войдите снова.");

  let comment: { hypothesisId: string; authorUserId: string } | null;
  try {
    comment = await prisma.hypothesisComment.findUnique({
      where: { id: commentId },
      select: { hypothesisId: true, authorUserId: true },
    });
    if (!comment || comment.authorUserId !== user.id) return actionFailure("Удалить можно только свой комментарий.");
    await prisma.hypothesisComment.delete({ where: { id: commentId } });
  } catch (error) {
    await captureServerError({ event: "backlog.comment.delete.failed", route: "src/app/backlog/[id]/comments-actions.ts#deleteHypothesisComment", error, userId: user.id });
    return actionFailure("Не удалось удалить комментарий. Попробуйте ещё раз.");
  }
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${comment.hypothesisId}`);
  return actionSuccess();
  });
}
