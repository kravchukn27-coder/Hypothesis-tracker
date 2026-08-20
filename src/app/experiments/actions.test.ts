import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  audit: vi.fn(),
  failure: vi.fn(async () => ({ ok: false, error: "Не удалось сохранить изменения. Попробуйте ещё раз." })),
  transaction: vi.fn(),
  sync: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/log", () => ({ runWithOperationCorrelation: <T>(fn: () => Promise<T>) => fn() }));
vi.mock("./actions/shared", () => ({
  auditExperimentEvent: mocks.audit,
  experimentMutationFailure: mocks.failure,
  requireExperimentActionUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("./actions/week-stages", () => ({
  clearHiddenFlagIfNoLongerDone: vi.fn(),
  hasWeekStages: vi.fn(),
  recomputeExperimentDerivedFields: vi.fn(),
  syncHypothesisStatusForExperiment: mocks.sync,
}));
vi.mock("./actions/tags", () => ({ resolveExperimentTagIds: vi.fn() }));
vi.mock("./actions/crud", () => ({}));

import { setExperimentWeekStage } from "./actions";

describe("setExperimentWeekStage transaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rolls back the week-stage sequence when a derived-state step fails", async () => {
    const committed = { weekStages: 0, stage: "DISCOVERY" };
    mocks.sync.mockImplementationOnce(async () => { throw new Error("forced sync failure"); });
    mocks.transaction.mockImplementationOnce(async (callback) => {
      const pending = { ...committed };
      const tx = {
        experiment: {
          findUnique: vi.fn()
            .mockResolvedValueOnce({ stage: committed.stage })
            .mockResolvedValueOnce({ stage: "DESIGN", hypothesisId: "hypothesis-1" }),
        },
        experimentWeekStage: { upsert: vi.fn(async () => { pending.weekStages += 1; }) },
      };
      try {
        const result = await callback(tx);
        Object.assign(committed, pending);
        return result;
      } catch (error) {
        throw error;
      }
    });

    const result = await setExperimentWeekStage("experiment-1", "2026-08-17", "DESIGN");

    expect(result.ok).toBe(false);
    expect(committed).toEqual({ weekStages: 0, stage: "DISCOVERY" });
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
