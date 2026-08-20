import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { hasCurrentSessionVersion } from "./session-version";
import { signSessionToken, verifySessionToken } from "./token";

// Ported from scripts/verify-auth-core.ts (TECH-025) — same boundary
// cases, run as part of `npm test` instead of a separate manual script.
const secret = "test-session-secret-that-is-long-enough";

describe("password hashing", () => {
  it("verifies the correct password and rejects a wrong one", () => {
    const passwordHash = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", passwordHash)).toBe(true);
    expect(verifyPassword("wrong password", passwordHash)).toBe(false);
  });
});

describe("session tokens", () => {
  it("verifies a freshly signed token and exposes its subject", async () => {
    const token = await signSessionToken("user-1", 3, "session-1", secret, 60);
    const payload = await verifySessionToken(token, secret);
    expect(payload?.sub).toBe("user-1");
  });

  it("accepts a matching session version and rejects a changed one", async () => {
    const token = await signSessionToken("user-1", 3, "session-1", secret, 60);
    const payload = await verifySessionToken(token, secret);
    expect(payload).not.toBeNull();
    expect(hasCurrentSessionVersion(payload!, 3)).toBe(true);
    expect(hasCurrentSessionVersion(payload!, 4)).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken("user-1", 3, "session-1", secret, 60);
    expect(await verifySessionToken(`${token}x`, secret)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expiredToken = await signSessionToken("user-1", 3, "session-1", secret, -1);
    expect(await verifySessionToken(expiredToken, secret)).toBeNull();
  });
});
