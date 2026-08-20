import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const LOGIN_RATE_LIMIT_MAX_FAILURES = 10;
export const LOGIN_RATE_LIMIT_ENABLED = true;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;

type RateLimitScope = "ip" | "email";

type FailureBucket = {
  failures: number[];
  cooldownUntil: number | null;
};

function normalizeScopeKey(value: string): string {
  return value.trim() || "unknown";
}

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toFailures(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => new Date(item).getTime())
    .filter(Number.isFinite);
}

function refreshBucket(bucket: FailureBucket, now: number): FailureBucket {
  if (bucket.cooldownUntil && bucket.cooldownUntil <= now) {
    return { failures: [], cooldownUntil: null };
  }

  return {
    ...bucket,
    failures: bucket.failures.filter((failureAt) => failureAt > now - LOGIN_RATE_LIMIT_WINDOW_MS),
  };
}

async function getBucket(scope: RateLimitScope, scopeKey: string, now: number): Promise<FailureBucket> {
  const row = await prisma.loginRateLimitBucket.findUnique({
    where: { scope_scopeKey: { scope, scopeKey } },
    select: { failuresAt: true, cooldownUntil: true },
  });

  return refreshBucket(
    {
      failures: toFailures(row?.failuresAt),
      cooldownUntil: row?.cooldownUntil?.getTime() ?? null,
    },
    now,
  );
}

async function saveBucket(scope: RateLimitScope, scopeKey: string, bucket: FailureBucket): Promise<void> {
  await prisma.loginRateLimitBucket.upsert({
    where: { scope_scopeKey: { scope, scopeKey } },
    create: {
      scope,
      scopeKey,
      failuresAt: bucket.failures.map((failureAt) => new Date(failureAt).toISOString()),
      cooldownUntil: bucket.cooldownUntil ? new Date(bucket.cooldownUntil) : null,
    },
    update: {
      failuresAt: bucket.failures.map((failureAt) => new Date(failureAt).toISOString()),
      cooldownUntil: bucket.cooldownUntil ? new Date(bucket.cooldownUntil) : null,
    },
  });
}

export async function getLoginClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

export async function isLoginRateLimited(ip: string, email: string): Promise<boolean> {
  if (!LOGIN_RATE_LIMIT_ENABLED) return false;

  const now = Date.now();
  const [ipBucket, emailBucket] = await Promise.all([
    getBucket("ip", normalizeScopeKey(ip), now),
    getBucket("email", normalizeScopeKey(normalizeLoginEmail(email)), now),
  ]);

  return Boolean(
    (ipBucket.cooldownUntil && ipBucket.cooldownUntil > now) ||
      (emailBucket.cooldownUntil && emailBucket.cooldownUntil > now),
  );
}

export async function recordLoginFailure(ip: string, email: string): Promise<boolean> {
  if (!LOGIN_RATE_LIMIT_ENABLED) return false;

  const now = Date.now();
  const scopes: Array<[RateLimitScope, string]> = [
    ["ip", normalizeScopeKey(ip)],
    ["email", normalizeScopeKey(normalizeLoginEmail(email))],
  ];
  const buckets = await Promise.all(scopes.map(([scope, scopeKey]) => getBucket(scope, scopeKey, now)));

  for (const bucket of buckets) {
    if (!bucket.cooldownUntil || bucket.cooldownUntil <= now) {
      bucket.failures.push(now);
      if (bucket.failures.length >= LOGIN_RATE_LIMIT_MAX_FAILURES) {
        bucket.failures = [];
        bucket.cooldownUntil = now + LOGIN_RATE_LIMIT_COOLDOWN_MS;
      }
    }
  }

  await Promise.all(scopes.map(([scope, scopeKey], index) => saveBucket(scope, scopeKey, buckets[index]!)));
  return buckets.some((bucket) => Boolean(bucket.cooldownUntil && bucket.cooldownUntil > now));
}

export async function clearLoginFailures(ip: string, email: string): Promise<void> {
  await prisma.loginRateLimitBucket.deleteMany({
    where: {
      OR: [
        { scope: "ip", scopeKey: normalizeScopeKey(ip) },
        { scope: "email", scopeKey: normalizeScopeKey(normalizeLoginEmail(email)) },
      ],
    },
  });
}
