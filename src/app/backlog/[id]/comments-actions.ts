"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { captureServerError, runWithOperationCorrelation } from "@/lib/log";

export type CommentActionState = { error?: string; success?: boolean };

export async function createHypothesisComment(
  hypothesisId: string,
  _previousState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  return runWithOperationCorrelation(async () => {
  const user = await getCurrentUser();
  if (!user) return { error: "Сессия истекла. Войдите снова." };

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Комментарий не может быть пустым." };
  if (message.length > 4000) return { error: "Комментарий не должен превышать 4000 символов." };

  try {
    const hypothesis = await prisma.hypothesis.findUnique({ where: { id: hypothesisId }, select: { id: true } });
    if (!hypothesis) return { error: "Гипотеза не найдена." };
    await prisma.hypothesisComment.create({ data: { hypothesisId, authorUserId: user.id, message } });
  } catch (error) {
    await captureServerError({ event: "backlog.comment.create.failed", route: "src/app/backlog/[id]/comments-actions.ts#createHypothesisComment", error, userId: user.id });
    return { error: "Не удалось добавить комментарий. Попробуйте ещё раз." };
  }
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${hypothesisId}`);
  return { success: true };
  });
}

export async function deleteHypothesisComment(commentId: string): Promise<CommentActionState> {
  return runWithOperationCorrelation(async () => {
  const user = await getCurrentUser();
  if (!user) return { error: "Сессия истекла. Войдите снова." };

  let comment: { hypothesisId: string; authorUserId: string } | null;
  try {
    comment = await prisma.hypothesisComment.findUnique({
      where: { id: commentId },
      select: { hypothesisId: true, authorUserId: true },
    });
    if (!comment || comment.authorUserId !== user.id) return { error: "Удалить можно только свой комментарий." };
    await prisma.hypothesisComment.delete({ where: { id: commentId } });
  } catch (error) {
    await captureServerError({ event: "backlog.comment.delete.failed", route: "src/app/backlog/[id]/comments-actions.ts#deleteHypothesisComment", error, userId: user.id });
    return { error: "Не удалось удалить комментарий. Попробуйте ещё раз." };
  }
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${comment.hypothesisId}`);
  return { success: true };
  });
}
