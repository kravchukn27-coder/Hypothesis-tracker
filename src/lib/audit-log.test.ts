import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  captureServerError: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { auditLog: { create: mocks.auditCreate } } }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/log", () => ({
  captureServerError: mocks.captureServerError,
  getCurrentOperationCorrelationId: () => undefined,
  withOperationCorrelation: (_correlationId: string, metadata: Record<string, unknown>) => metadata,
}));

import { auditEvent } from "./audit-log";

describe("auditEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("binds the route while preserving the event, actor, and metadata", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    const logBacklogEvent = auditEvent("src/app/backlog/actions.ts");

    await logBacklogEvent("HYPOTHESIS_UPDATED", { hypothesisId: "hypothesis-1" });

    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: {
        event: "HYPOTHESIS_UPDATED",
        userId: "user-1",
        metadata: { hypothesisId: "hypothesis-1" },
      },
    });
  });

  it("uses the bound route when an audit write fails", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.auditCreate.mockRejectedValueOnce(new Error("database unavailable"));

    await auditEvent("src/app/experiments/actions.ts")("CALENDAR_EXPERIMENTS_REORDERED", { experimentIds: ["experiment-1"] });

    expect(mocks.captureServerError).toHaveBeenCalledWith(expect.objectContaining({
      event: "audit_log.write_failed",
      route: "src/app/experiments/actions.ts",
      userId: null,
      metadata: { auditEvent: "CALENDAR_EXPERIMENTS_REORDERED" },
    }));
  });
});
