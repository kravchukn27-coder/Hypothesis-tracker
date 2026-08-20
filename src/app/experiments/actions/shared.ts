import { requireActionUser } from "@/lib/auth/page-guards";
import { auditEvent } from "@/lib/audit-log";
import { captureServerError } from "@/lib/log";
import { actionFailure, type ActionResult } from "@/lib/action-result";

const ACTION_ROUTE = "src/app/experiments/actions.ts";

export { requireActionUser as requireExperimentActionUser };

export async function experimentMutationFailure<T extends object = Record<string, never>>(
  event: string,
  error: unknown,
  userId: string,
): Promise<ActionResult<T>> {
  await captureServerError({ event, route: ACTION_ROUTE, error, userId });
  return actionFailure<T>("Не удалось сохранить изменения. Попробуйте ещё раз.");
}

export const auditExperimentEvent = auditEvent(ACTION_ROUTE);

export { ACTION_ROUTE };
