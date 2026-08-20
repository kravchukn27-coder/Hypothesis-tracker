import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { loginRateLimitBucket: { findUnique: mocks.findUnique, upsert: mocks.upsert, deleteMany: mocks.deleteMany } },
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

import { LOGIN_RATE_LIMIT_MAX_FAILURES, isLoginRateLimited, recordLoginFailure } from "./login-rate-limit";

describe("isLoginRateLimited", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows an attempt when there is no existing bucket", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(isLoginRateLimited("127.0.0.1", "person@example.com")).resolves.toBe(false);
  });

  it("locks out while an existing cooldown is still active", async () => {
    mocks.findUnique.mockResolvedValue({ failuresAt: [], cooldownUntil: new Date(Date.now() + 5 * 60 * 1000) });
    await expect(isLoginRateLimited("127.0.0.1", "person@example.com")).resolves.toBe(true);
  });

  it("boundary: clears the lockout once the cooldown window has passed", async () => {
    mocks.findUnique.mockResolvedValue({ failuresAt: [], cooldownUntil: new Date(Date.now() - 1000) });
    await expect(isLoginRateLimited("127.0.0.1", "person@example.com")).resolves.toBe(false);
  });
});

describe("recordLoginFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue(undefined);
  });

  function bucketWithFailures(count: number) {
    return { failuresAt: Array.from({ length: count }, () => new Date().toISOString()), cooldownUntil: null };
  }

  it("stays allowed for an attempt count under the lockout threshold", async () => {
    mocks.findUnique.mockResolvedValue(bucketWithFailures(LOGIN_RATE_LIMIT_MAX_FAILURES - 2));
    await expect(recordLoginFailure("127.0.0.1", "person@example.com")).resolves.toBe(false);
  });

  it("boundary: locks out once the failure count reaches the threshold", async () => {
    mocks.findUnique.mockResolvedValue(bucketWithFailures(LOGIN_RATE_LIMIT_MAX_FAILURES - 1));
    await expect(recordLoginFailure("127.0.0.1", "person@example.com")).resolves.toBe(true);
    expect(mocks.upsert).toHaveBeenCalled();
  });
});
