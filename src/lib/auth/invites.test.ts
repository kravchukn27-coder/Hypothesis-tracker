import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureServerError: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { passwordSetupToken: { findUnique: mocks.findUnique } } }));
vi.mock("@/lib/audit-log", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/log", () => ({ captureServerError: mocks.captureServerError }));

import { getInvite } from "./invites";

describe("getInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.captureServerError.mockResolvedValue(undefined);
  });

  it("keeps a valid invite on its existing path", async () => {
    mocks.findUnique.mockResolvedValue({
      invalidatedAt: null,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { email: "ada@example.com", isActive: true },
    });

    await expect(getInvite("invite-token")).resolves.toEqual({ email: "ada@example.com" });
    expect(mocks.captureServerError).not.toHaveBeenCalled();
  });

  it("logs a database failure and returns the safe invalid result", async () => {
    const databaseError = new Error("database unavailable");
    mocks.findUnique.mockRejectedValue(databaseError);

    await expect(getInvite("invite-token")).resolves.toEqual({ error: "invalid" });
    expect(mocks.captureServerError).toHaveBeenCalledWith({
      event: "auth.invite.get.failed",
      route: "src/lib/auth/invites.ts#getInvite",
      error: databaseError,
    });
  });
});
