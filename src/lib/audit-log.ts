import type { Prisma } from "@/generated/prisma/client";
import { redactSensitiveAuditMetadata } from "@/lib/audit-metadata-redaction";
import { captureServerError, getCurrentOperationCorrelationId, withOperationCorrelation } from "@/lib/log";
import { prisma } from "@/lib/prisma";

type AuditTarget = {
  auditLog: { create: (args: { data: { event: string; userId: string | null; metadata?: Prisma.InputJsonValue } }) => Promise<unknown> };
};

type AuditLogInput = { event: string; userId: string | null; metadata?: Record<string, unknown> };

function sanitizeMetadata(metadata?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
  // TECH-034: audit rows carry the same correlation id as any log lines
  // from the same server action invocation, so they can be joined.
  const correlationId = getCurrentOperationCorrelationId();
  const withCorrelation = correlationId
    ? withOperationCorrelation(correlationId, metadata ?? {})
    : metadata;
  if (!withCorrelation) return undefined;
  return redactSensitiveAuditMetadata(JSON.parse(JSON.stringify(withCorrelation)) as Prisma.JsonValue) as Prisma.InputJsonValue;
}

export async function writeAuditLog(input: AuditLogInput, target: AuditTarget = prisma): Promise<void> {
  await target.auditLog.create({ data: { event: input.event, userId: input.userId, metadata: sanitizeMetadata(input.metadata) } });
}

export async function safeWriteAuditLog(input: AuditLogInput & { route: string }, target: AuditTarget = prisma): Promise<void> {
  try {
    await writeAuditLog(input, target);
  } catch (error) {
    await captureServerError({
      event: "audit_log.write_failed",
      route: input.route,
      error,
      userId: input.userId,
      metadata: { auditEvent: input.event },
    });
  }
}
