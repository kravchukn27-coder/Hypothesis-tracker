"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { issuePasswordReset } from "@/lib/auth/invites";
import { getRequestOrigin } from "@/lib/auth/base-url";
import { auditEvent } from "@/lib/audit-log";
import { captureServerError, runWithOperationCorrelation } from "@/lib/log";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";

const auditUsersEvent = auditEvent("src/app/users/actions.ts");

async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function deactivateUser(id: string): Promise<ActionResult> {
  return runWithOperationCorrelation(async () => {
    const actor = await requireAuthenticatedUser();
    try {
      const target = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: { id: true, email: true },
      });
      await auditUsersEvent("USER_DEACTIVATED", { deactivatedUserId: target.id, deactivatedUserEmail: target.email });
    } catch (error) {
      await captureServerError({ event: "users.deactivate.failed", route: "src/app/users/actions.ts", error, userId: actor.id });
      return actionFailure("Не удалось удалить пользователя. Попробуйте ещё раз.");
    }
    revalidatePath("/users");
    return actionSuccess();
  });
}

export async function resetUserPassword(id: string): Promise<ActionResult<{ link: string }>> {
  return runWithOperationCorrelation(async () => {
    const actor = await requireAuthenticatedUser();
    let rawToken: string;
    try {
      rawToken = await issuePasswordReset(actor.id, id);
    } catch (error) {
      await captureServerError({ event: "users.reset_password.failed", route: "src/app/users/actions.ts", error, userId: actor.id });
      return actionFailure("Не удалось выпустить ссылку для сброса пароля. Попробуйте ещё раз.");
    }
    const origin = await getRequestOrigin();
    return actionSuccess({ link: `${origin}/invite/${rawToken}` });
  });
}
