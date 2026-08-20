import { describe, expect, it } from "vitest";
import { compareByManualOrder, getISOWeekNumber, startOfWeek, type ManualOrderSortable } from "./calendar";

describe("startOfWeek", () => {
  it("returns the same date when already a Monday", () => {
    const monday = new Date(2026, 7, 17); // 2026-08-17 is a Monday
    expect(startOfWeek(monday)).toEqual(new Date(2026, 7, 17));
  });

  it("returns the preceding Monday for a mid-week date", () => {
    const wednesday = new Date(2026, 7, 19); // 2026-08-19
    expect(startOfWeek(wednesday)).toEqual(new Date(2026, 7, 17));
  });

  it("rolls a Sunday back six days to the same week's Monday (boundary: getDay() === 0)", () => {
    const sunday = new Date(2026, 7, 23); // 2026-08-23
    expect(startOfWeek(sunday)).toEqual(new Date(2026, 7, 17));
  });

  it("crosses a month/year boundary correctly", () => {
    const newYearsDay = new Date(2026, 0, 1); // 2026-01-01 is a Thursday
    expect(startOfWeek(newYearsDay)).toEqual(new Date(2025, 11, 29)); // Monday 2025-12-29
  });
});

describe("getISOWeekNumber", () => {
  it("returns week 1 for a plain Monday-anchored start of year", () => {
    expect(getISOWeekNumber(new Date(2007, 0, 1))).toBe(1); // 2007-01-01 is a Monday
  });

  it("boundary: a date in early January can belong to the previous year's last week", () => {
    expect(getISOWeekNumber(new Date(2021, 0, 1))).toBe(53); // Friday, ISO week 53 of 2020
  });

  it("boundary: a date in late December can belong to the next year's week 1", () => {
    expect(getISOWeekNumber(new Date(2018, 11, 31))).toBe(1); // Monday, its Thursday falls in 2019
  });
});

describe("compareByManualOrder", () => {
  function row(overrides: Partial<ManualOrderSortable>): ManualOrderSortable {
    return { manualOrder: null, startDate: null, createdAt: new Date(2026, 0, 1), ...overrides };
  }

  it("orders by manualOrder ascending when both are set", () => {
    const first = row({ manualOrder: 0 });
    const second = row({ manualOrder: 1 });
    expect(compareByManualOrder(first, second)).toBeLessThan(0);
    expect(compareByManualOrder(second, first)).toBeGreaterThan(0);
  });

  it("boundary: ties on manualOrder compare equal", () => {
    const a = row({ manualOrder: 5 });
    const b = row({ manualOrder: 5 });
    expect(compareByManualOrder(a, b)).toBe(0);
  });

  it("puts a null manualOrder after a set one, regardless of argument order", () => {
    const withOrder = row({ manualOrder: 0 });
    const withoutOrder = row({ manualOrder: null });
    expect(compareByManualOrder(withOrder, withoutOrder)).toBeLessThan(0);
    expect(compareByManualOrder(withoutOrder, withOrder)).toBeGreaterThan(0);
  });

  it("falls back to startDate (earlier first) when both manualOrder are null", () => {
    const earlier = row({ startDate: new Date(2026, 0, 1) });
    const later = row({ startDate: new Date(2026, 0, 8) });
    expect(compareByManualOrder(earlier, later)).toBeLessThan(0);
  });

  it("falls back to createdAt (most recent first) when manualOrder and startDate both tie", () => {
    const olderRow = row({ createdAt: new Date(2026, 0, 1) });
    const newerRow = row({ createdAt: new Date(2026, 0, 10) });
    expect(compareByManualOrder(newerRow, olderRow)).toBeLessThan(0);
  });
});
