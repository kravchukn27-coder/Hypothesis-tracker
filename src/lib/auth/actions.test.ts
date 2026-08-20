import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureServerError: vi.fn(),
  clearLoginFailures: vi.fn(),
  cookies: vi.fn(),
  findFirst: vi.fn(),
  getCurrentUser: vi.fn(),
  getLoginClientIp: vi.fn(),
  getSessionSecret: vi.fn(),
  isLoginRateLimited: vi.fn(),
  recordLoginFailure: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
  safeWriteAuditLog: vi.fn(),
  signSessionToken: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: mocks.findFirst } } }));
vi.mock("./config", () => ({
  getSessionSecret: mocks.getSessionSecret,
  SESSION_COOKIE_NAME: "session",
  SESSION_MAX_AGE_SEC: 60,
}));
vi.mock("./login-rate-limit", () => ({
  clearLoginFailures: mocks.clearLoginFailures,
  getLoginClientIp: mocks.getLoginClientIp,
  isLoginRateLimited: mocks.isLoginRateLimited,
  normalizeLoginEmail: (email: string) => email.trim().toLowerCase(),
  recordLoginFailure: mocks.recordLoginFailure,
}));
vi.mock("./password", () => ({ verifyPassword: mocks.verifyPassword }));
vi.mock("./session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("./token", () => ({ signSessionToken: mocks.signSessionToken }));
vi.mock("@/lib/audit-log", () => ({ safeWriteAuditLog: mocks.safeWriteAuditLog, writeAuditLog: vi.fn() }));
vi.mock("@/lib/log", () => ({
  captureServerError: mocks.captureServerError,
  runWithOperationCorrelation: <T>(fn: () => Promise<T>) => fn(),
}));

import { loginAsUser, logout } from "./actions";

function loginForm(): FormData {
  const formData = new FormData();
  formData.set("email", "person@example.com");
  formData.set("password", "correct-password");
  formData.set("from", "/backlog");
  return formData;
}

describe("loginAsUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLoginClientIp.mockResolvedValue("127.0.0.1");
    mocks.isLoginRateLimited.mockResolvedValue(false);
    mocks.findFirst.mockResolvedValue({ id: "user-1", passwordHash: "hash", sessionVersion: 1, isActive: true });
    mocks.verifyPassword.mockReturnValue(true);
    mocks.clearLoginFailures.mockResolvedValue(undefined);
    mocks.getSessionSecret.mockReturnValue("test-session-secret-that-is-long-enough");
    mocks.signSessionToken.mockResolvedValue("signed-token");
    mocks.safeWriteAuditLog.mockResolvedValue(undefined);
    mocks.captureServerError.mockResolvedValue(undefined);
    mocks.cookies.mockResolvedValue({ set: vi.fn() });
  });

  it("redirects successful logins to the requested safe return path", async () => {
    await expect(loginAsUser(loginForm())).rejects.toThrow("REDIRECT:/backlog");

    expect(mocks.clearLoginFailures).toHaveBeenCalledWith("127.0.0.1", "person@example.com");
    expect(mocks.captureServerError).not.toHaveBeenCalled();
  });

  it("keeps wrong credentials on the existing credentials error path", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.recordLoginFailure.mockResolvedValue(false);

    await expect(loginAsUser(loginForm())).rejects.toThrow("REDIRECT:/login?error=credentials");

    expect(mocks.recordLoginFailure).toHaveBeenCalledWith("127.0.0.1", "person@example.com");
    expect(mocks.captureServerError).not.toHaveBeenCalled();
  });

  it("keeps already rate-limited logins on the existing rate-limit path", async () => {
    mocks.isLoginRateLimited.mockResolvedValue(true);

    await expect(loginAsUser(loginForm())).rejects.toThrow("REDIRECT:/login?error=ratelimit");

    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.captureServerError).not.toHaveBeenCalled();
  });

  it("logs a database failure and redirects to a generic login error", async () => {
    const databaseError = new Error("database unavailable");
    mocks.findFirst.mockRejectedValue(databaseError);

    await expect(loginAsUser(loginForm())).rejects.toThrow("REDIRECT:/login?error=unavailable");

    expect(mocks.captureServerError).toHaveBeenCalledWith({
      event: "auth.login.failed",
      route: "src/lib/auth/actions.ts#loginAsUser",
      error: databaseError,
      metadata: { email: "person@example.com" },
    });
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeWriteAuditLog.mockResolvedValue(undefined);
    mocks.cookies.mockResolvedValue({ set: vi.fn() });
  });

  it("writes the LOGOUT event via safeWriteAuditLog, clears the cookie, and redirects to /login", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    const setCookie = vi.fn();
    mocks.cookies.mockResolvedValue({ set: setCookie });

    await expect(logout()).rejects.toThrow("REDIRECT:/login");

    expect(mocks.safeWriteAuditLog).toHaveBeenCalledWith({ event: "LOGOUT", userId: "user-1", route: "src/lib/auth/actions.ts" });
    expect(setCookie).toHaveBeenCalledWith("session", "", expect.objectContaining({ maxAge: 0 }));
  });

  it("skips the audit write and still redirects when there is no current session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(logout()).rejects.toThrow("REDIRECT:/login");

    expect(mocks.safeWriteAuditLog).not.toHaveBeenCalled();
  });
});
