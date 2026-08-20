import { describe, expect, it } from "vitest";
import { buildLogPayload, getCurrentOperationCorrelationId, runWithOperationCorrelation } from "./log";

// TECH-034: correlation IDs are threaded via AsyncLocalStorage, not by
// passing a param through every call site — these tests pin down the
// two guarantees the backlog card asked for.
describe("runWithOperationCorrelation", () => {
  it("gives two separate invocations different correlation ids", async () => {
    const first = await runWithOperationCorrelation(async () => getCurrentOperationCorrelationId());
    const second = await runWithOperationCorrelation(async () => getCurrentOperationCorrelationId());
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
  });

  it("reuses the outer id for a nested call instead of starting a new one", async () => {
    const ids = await runWithOperationCorrelation(async () => {
      const outer = getCurrentOperationCorrelationId();
      const inner = await runWithOperationCorrelation(async () => getCurrentOperationCorrelationId());
      return { outer, inner };
    });
    expect(ids.inner).toBe(ids.outer);
  });

  it("has no correlation id outside of a run", () => {
    expect(getCurrentOperationCorrelationId()).toBeUndefined();
  });

  it("auto-injects the current correlation id into log metadata", async () => {
    const { payload, correlationId } = await runWithOperationCorrelation(async () => ({
      payload: buildLogPayload("info", "test.event", { foo: "bar" }),
      correlationId: getCurrentOperationCorrelationId(),
    }));
    expect(payload.metadata.correlationId).toBe(correlationId);
    expect(payload.metadata.foo).toBe("bar");
  });

  it("two log lines from the same run share a correlationId; a third from a different run does not", async () => {
    const [lineA, lineB] = await runWithOperationCorrelation(async () => [
      buildLogPayload("info", "test.event.a", {}),
      buildLogPayload("info", "test.event.b", {}),
    ]);
    const lineC = await runWithOperationCorrelation(async () => buildLogPayload("info", "test.event.c", {}));

    expect(lineA.metadata.correlationId).toBe(lineB.metadata.correlationId);
    expect(lineA.metadata.correlationId).not.toBe(lineC.metadata.correlationId);
  });

  it("does not add a correlationId to metadata outside of a run", () => {
    const payload = buildLogPayload("info", "test.event", { foo: "bar" });
    expect(payload.metadata.correlationId).toBeUndefined();
  });
});
