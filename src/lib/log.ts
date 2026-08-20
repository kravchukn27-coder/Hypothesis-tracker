import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { redactSensitiveAuditMetadata, type AuditJsonValue } from "@/lib/audit-metadata-redaction";
import { recordErrorEvent } from "@/lib/error-events";
import { sendTelegramAlert } from "@/lib/telegram-alert";

type LogMeta = Record<string, unknown>;
type LogLevel = "info" | "warn" | "error";

export function createOperationCorrelationId(): string {
  return randomUUID();
}

export function withOperationCorrelation(correlationId: string, meta: LogMeta = {}): LogMeta {
  return { correlationId, ...meta };
}

// TECH-034: one correlation ID per server action invocation, threaded
// automatically through every log/audit call made during it via
// AsyncLocalStorage — logInfo/logWarn/logError and writeAuditLog all
// read the current id (if any) instead of every call site having to
// pass it through by hand.
const correlationStorage = new AsyncLocalStorage<string>();

export function getCurrentOperationCorrelationId(): string | undefined {
  return correlationStorage.getStore();
}

/**
 * Idempotent: an action that internally calls another already-wrapped
 * action (e.g. createExperiment → syncExperimentFunnelLevelsForHypothesis)
 * reuses the outer correlation id instead of starting a fresh nested one,
 * so every log/audit line from one logical request still joins.
 */
export function runWithOperationCorrelation<T>(fn: () => Promise<T>): Promise<T> {
  const existing = correlationStorage.getStore();
  if (existing) return fn();
  return correlationStorage.run(createOperationCorrelationId(), fn);
}

export type LogPayload = {
  level: LogLevel;
  event: string;
  ts: string;
  metadata: LogMeta;
  errorMessage?: string;
  errorName?: string;
  errorStack?: string;
};

function normalizeError(error: unknown): Pick<LogPayload, "errorMessage" | "errorName" | "errorStack"> {
  if (!error) return {};
  if (error instanceof Error) return { errorMessage: error.message, errorName: error.name, errorStack: error.stack };
  if (typeof error === "string") return { errorMessage: error };
  if (typeof error === "object") {
    const candidate = error as { message?: unknown; name?: unknown; stack?: unknown };
    return {
      errorMessage: typeof candidate.message === "string" ? candidate.message : String(error),
      errorName: typeof candidate.name === "string" ? candidate.name : undefined,
      errorStack: typeof candidate.stack === "string" ? candidate.stack : undefined,
    };
  }
  return { errorMessage: String(error) };
}

function sanitizeLogMetadata(meta?: LogMeta): LogMeta {
  if (!meta) return {};
  return redactSensitiveAuditMetadata(JSON.parse(JSON.stringify(meta)) as AuditJsonValue) as LogMeta;
}

function withCurrentCorrelation(meta: LogMeta): LogMeta {
  if (meta.correlationId) return meta;
  const correlationId = getCurrentOperationCorrelationId();
  return correlationId ? withOperationCorrelation(correlationId, meta) : meta;
}

export function buildLogPayload(level: LogLevel, event: string, meta?: LogMeta, error?: unknown): LogPayload {
  return {
    level,
    event,
    ts: new Date().toISOString(),
    metadata: withCurrentCorrelation(sanitizeLogMetadata(meta)),
    ...normalizeError(error),
  };
}

export function logInfo(event: string, meta?: LogMeta): void {
  console.info(JSON.stringify(buildLogPayload("info", event, meta)));
}

export function logWarn(event: string, meta?: LogMeta): void {
  console.warn(JSON.stringify(buildLogPayload("warn", event, meta)));
}

export async function logError(event: string, error?: unknown, meta?: LogMeta): Promise<void> {
  const payload = buildLogPayload("error", event, meta, error);
  console.error(JSON.stringify(payload));
  const route = typeof meta?.route === "string" ? meta.route : "unknown";
  const userId = typeof meta?.userId === "string" ? meta.userId : null;
  const result = await recordErrorEvent({ event, route, errorName: payload.errorName, errorMessage: payload.errorMessage, userId, metadata: meta });
  if (!result) return;
  if (result.isNewSignature) {
    void sendTelegramAlert(`🆕 New error signature\nroute: ${route}\nevent: ${event}\n${payload.errorName ?? ""}: ${payload.errorMessage ?? ""}`.slice(0, 1000));
  } else if (result.shouldAlertRate) {
    void sendTelegramAlert(`⚠️ Error rate spike\nroute: ${route}\nevent: ${event}\ncount: ${result.count} (recent window)`);
  }
}

export function captureServerError(options: { event: string; route: string; error: unknown; userId?: string | null; metadata?: LogMeta }): Promise<void> {
  const { event, route, error, userId, metadata } = options;
  return logError(event, error, { route, ...(userId ? { userId } : {}), ...(metadata ?? {}) });
}
