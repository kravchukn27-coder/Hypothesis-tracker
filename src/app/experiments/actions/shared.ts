import { getCurrentUser } from "@/lib/auth/session";
import { safeWriteAuditLog } from "@/lib/audit-log";
import { captureServerError } from "@/lib/log";
import { actionFailure, type ActionResult } from "@/lib/action-result";
import { redirect } from "next/navigation";

const ACTION_ROUTE = "src/app/experiments/actions.ts";

export async function requireExperimentActionUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function experimentMutationFailure<T extends object = Record<string, never>>(
  event: string,
  error: unknown,
  userId: string,
): Promise<ActionResult<T>> {
  await captureServerError({ event, route: ACTION_ROUTE, error, userId });
  return actionFailure<T>("Не удалось сохранить изменения. Попробуйте ещё раз.");
}

export async function auditExperimentEvent(event: string, metadata: Record<string, unknown>) {
  const user = await getCurrentUser();
  await safeWriteAuditLog({ event, userId: user?.id ?? null, metadata, route: ACTION_ROUTE });
}

export { ACTION_ROUTE };
