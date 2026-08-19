import type { Prisma } from "@/generated/prisma/client";

export const SENSITIVE_AUDIT_METADATA_KEY_RE = /password|token|secret|cookie|authorization|session/i;

export type AuditJsonValue = Prisma.JsonValue;

export function redactSensitiveAuditMetadata(value: AuditJsonValue): AuditJsonValue {
  if (Array.isArray(value)) return value.map((item) => redactSensitiveAuditMetadata(item));
  if (value && typeof value === "object") {
    const result: Record<string, AuditJsonValue> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = SENSITIVE_AUDIT_METADATA_KEY_RE.test(key)
        ? "[REDACTED]"
        : redactSensitiveAuditMetadata(nested as AuditJsonValue);
    }
    return result;
  }
  return value;
}
