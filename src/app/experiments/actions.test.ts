import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  audit: vi.fn(),
  failure: vi.fn(async () => ({ ok: false, error: "Не удалось сохранить изменения. Попробуйте ещё раз." })),
  findMany: vi.fn(),
  getCurrentUser: vi.fn(),
  transaction: vi.fn(),
  sync: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    experiment: { findMany: mocks.findMany, update: mocks.update },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/log", () => ({ runWithOperationCorrelation: <T>(fn: () => Promise<T>) => fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
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

import { reorderCalendarExperiments, setExperimentWeekStage } from "./actions";

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

  it("puts an experiment scheduled from the undated panel first in Calendar order", async () => {
    const update = vi.fn();
    mocks.transaction.mockImplementationOnce(async (callback) => callback({
      experiment: {
        aggregate: vi.fn(async () => ({ _min: { manualOrder: -4 } })),
        findUnique: vi.fn()
          .mockResolvedValueOnce({ stage: "DISCOVERY" })
          .mockResolvedValueOnce({ stage: "DISCOVERY", hypothesisId: "hypothesis-1" }),
        update,
      },
      experimentWeekStage: { upsert: vi.fn() },
    }));

    const result = await setExperimentWeekStage("experiment-1", "2026-08-17", "DISCOVERY", true);

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({ where: { id: "experiment-1" }, data: { manualOrder: -5 } });
  });

  it("writes only the rows whose order changes while preserving the merged global order", async () => {
    const experiments = ["a", "b", "c", "d", "e"].map((id, manualOrder) => ({
      id,
      manualOrder,
      startDate: null,
      createdAt: new Date(`2026-01-0${manualOrder + 1}T00:00:00Z`),
    }));
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.findMany.mockResolvedValue(experiments);
    mocks.update.mockImplementation(({ where, data }) => {
      const experiment = experiments.find((item) => item.id === where.id)!;
      experiment.manualOrder = data.manualOrder;
      return Promise.resolve(experiment);
    });
    mocks.transaction.mockImplementation(async (operations) => Promise.all(operations));

    const result = await reorderCalendarExperiments(["d", "b", "c"]);

    expect(result.ok).toBe(true);
    expect(mocks.update).toHaveBeenCalledTimes(3);
    expect(mocks.update).toHaveBeenNthCalledWith(1, { where: { id: "d" }, data: { manualOrder: 1 } });
    expect(mocks.update).toHaveBeenNthCalledWith(2, { where: { id: "b" }, data: { manualOrder: 2 } });
    expect(mocks.update).toHaveBeenNthCalledWith(3, { where: { id: "c" }, data: { manualOrder: 3 } });
    expect(experiments.sort((a, b) => a.manualOrder - b.manualOrder).map((item) => item.id)).toEqual(["a", "d", "b", "c", "e"]);
  });
});
