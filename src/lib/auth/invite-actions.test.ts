import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureServerError: vi.fn(),
  consumeInvite: vi.fn(),
  getCurrentUser: vi.fn(),
  getRequestOrigin: vi.fn(),
  hashPassword: vi.fn(),
  issueInvite: vi.fn(),
}));

vi.mock("./session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("./password", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("./invites", () => ({ consumeInvite: mocks.consumeInvite, issueInvite: mocks.issueInvite }));
vi.mock("./base-url", () => ({ getRequestOrigin: mocks.getRequestOrigin }));
vi.mock("@/lib/log", () => ({ captureServerError: mocks.captureServerError }));

import { setPasswordFromInvite } from "./invite-actions";

function passwordForm(): FormData {
  const formData = new FormData();
  formData.set("token", "invite-token");
  formData.set("name", "Ada Lovelace");
  formData.set("password", "correct-password");
  formData.set("passwordConfirm", "correct-password");
  return formData;
}

describe("setPasswordFromInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashPassword.mockReturnValue("password-hash");
    mocks.captureServerError.mockResolvedValue(undefined);
  });

  it("keeps successful password setup unchanged", async () => {
    mocks.consumeInvite.mockResolvedValue({ ok: true });

    await expect(setPasswordFromInvite({}, passwordForm())).resolves.toEqual({ success: true });
    expect(mocks.captureServerError).not.toHaveBeenCalled();
  });

  it("keeps an invalid token on its existing error path", async () => {
    mocks.consumeInvite.mockResolvedValue({ error: "invalid" });

    await expect(setPasswordFromInvite({}, passwordForm())).resolves.toEqual({ error: "Ссылка недействительна." });
    expect(mocks.captureServerError).not.toHaveBeenCalled();
  });

  it("logs a database failure and returns a safe action state", async () => {
    const databaseError = new Error("database unavailable");
    mocks.consumeInvite.mockRejectedValue(databaseError);

    await expect(setPasswordFromInvite({}, passwordForm())).resolves.toEqual({ error: "Не удалось установить пароль. Попробуйте ещё раз." });
    expect(mocks.captureServerError).toHaveBeenCalledWith({
      event: "auth.invite.consume.failed",
      route: "src/lib/auth/invite-actions.ts#setPasswordFromInvite",
      error: databaseError,
    });
  });
});
