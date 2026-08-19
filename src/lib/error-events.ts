import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { redactSensitiveAuditMetadata } from "@/lib/audit-metadata-redaction";
import { prisma } from "@/lib/prisma";

const RATE_ALERT_THRESHOLD = 10;
const RATE_ALERT_WINDOW_MS = 5 * 60 * 1000;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

function normalizeMessage(message?: string): string {
  return (message ?? "").replace(/[0-9a-f-]{8,}|\d+/gi, "#").slice(0, 300);
}

export function computeErrorSignature(errorName: string | undefined, route: string, errorMessage: string | undefined): string {
  return createHash("sha1").update(`${errorName ?? ""}|${route}|${normalizeMessage(errorMessage)}`).digest("hex");
}

export type RecordErrorEventInput = {
  event: string;
  route: string;
  errorName?: string;
  errorMessage?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

export type RecordErrorEventResult = { isNewSignature: boolean; shouldAlertRate: boolean; count: number };

function sanitizeMetadata(metadata?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  const cloned = JSON.parse(JSON.stringify(metadata)) as Prisma.JsonValue;
  return redactSensitiveAuditMetadata(cloned) as Prisma.InputJsonValue;
}

export async function recordErrorEvent(input: RecordErrorEventInput): Promise<RecordErrorEventResult | null> {
  const signature = computeErrorSignature(input.errorName, input.route, input.errorMessage);
  const now = new Date();

  try {
    const existing = await prisma.errorEvent.findUnique({ where: { signature } });
    if (!existing) {
      await prisma.errorEvent.create({
        data: {
          signature,
          errorName: input.errorName ?? null,
          errorMessage: input.errorMessage?.slice(0, 500) ?? null,
          route: input.route,
          event: input.event,
          count: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          lastAlertedAt: now,
          lastUserId: input.userId ?? null,
          lastMetadata: sanitizeMetadata(input.metadata),
        },
      });
      return { isNewSignature: true, shouldAlertRate: false, count: 1 };
    }

    const nextCount = now.getTime() - existing.lastSeenAt.getTime() <= RATE_ALERT_WINDOW_MS ? existing.count + 1 : 1;
    const withinCooldown = existing.lastAlertedAt !== null && now.getTime() - existing.lastAlertedAt.getTime() < ALERT_COOLDOWN_MS;
    const shouldAlertRate = nextCount >= RATE_ALERT_THRESHOLD && !withinCooldown;
    await prisma.errorEvent.update({
      where: { signature },
      data: {
        count: nextCount,
        lastSeenAt: now,
        lastAlertedAt: shouldAlertRate ? now : undefined,
        lastUserId: input.userId ?? existing.lastUserId,
        lastMetadata: sanitizeMetadata(input.metadata) ?? existing.lastMetadata ?? undefined,
      },
    });
    return { isNewSignature: false, shouldAlertRate, count: nextCount };
  } catch {
    return null;
  }
}
