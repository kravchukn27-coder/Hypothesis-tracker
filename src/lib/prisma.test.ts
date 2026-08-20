import { describe, expect, it } from "vitest";
import { getPrismaLogDefinitions } from "./prisma";

describe("getPrismaLogDefinitions", () => {
  it("routes warnings and errors to event listeners by default", () => {
    expect(getPrismaLogDefinitions(false)).toEqual([
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" },
    ]);
  });

  it("adds query events only when explicitly enabled", () => {
    expect(getPrismaLogDefinitions(true)).toContainEqual({ emit: "event", level: "query" });
  });
});
