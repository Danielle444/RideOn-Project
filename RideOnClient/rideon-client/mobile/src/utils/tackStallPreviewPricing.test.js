import { describe, it, expect } from "vitest";
import {
  calculateInclusiveDayCount,
  calculateTackPreviewTotal,
} from "./tackStallPreviewPricing.js";

describe("calculateInclusiveDayCount", () => {
  it("same start/end date is 1 day", () => {
    expect(calculateInclusiveDayCount("2026-08-01", "2026-08-01")).toBe(1);
  });

  it("Aug 1 through Aug 3 is 3 days (inclusive)", () => {
    expect(calculateInclusiveDayCount("2026-08-01", "2026-08-03")).toBe(3);
  });

  it("returns null for a missing start date", () => {
    expect(calculateInclusiveDayCount("", "2026-08-03")).toBeNull();
    expect(calculateInclusiveDayCount(null, "2026-08-03")).toBeNull();
  });

  it("returns null for a missing end date", () => {
    expect(calculateInclusiveDayCount("2026-08-01", "")).toBeNull();
  });

  it("returns null for a reversed range", () => {
    expect(calculateInclusiveDayCount("2026-08-03", "2026-08-01")).toBeNull();
  });

  it("returns null for an unparsable date string", () => {
    expect(calculateInclusiveDayCount("not-a-date", "2026-08-03")).toBeNull();
  });

  it("does not shift by a day across a month/year boundary (no UTC drift)", () => {
    expect(calculateInclusiveDayCount("2026-12-30", "2027-01-02")).toBe(4);
  });
});

describe("calculateTackPreviewTotal", () => {
  it("quantity × unitPrice × inclusive day count", () => {
    var result = calculateTackPreviewTotal({
      quantity: 2,
      unitPrice: 100,
      startDate: "2026-08-01",
      endDate: "2026-08-03",
    });

    expect(result.dayCount).toBe(3);
    expect(result.totalPrice).toBe(600);
  });

  it("same-day range counts as one day", () => {
    var result = calculateTackPreviewTotal({
      quantity: 3,
      unitPrice: 50,
      startDate: "2026-08-01",
      endDate: "2026-08-01",
    });

    expect(result.dayCount).toBe(1);
    expect(result.totalPrice).toBe(150);
  });

  it("falls back to 1 day (not NaN) when dates are missing", () => {
    var result = calculateTackPreviewTotal({
      quantity: 2,
      unitPrice: 100,
      startDate: "",
      endDate: "",
    });

    expect(result.dayCount).toBe(1);
    expect(result.totalPrice).toBe(200);
    expect(Number.isNaN(result.totalPrice)).toBe(false);
  });

  it("falls back to 1 day (not NaN) when the range is reversed", () => {
    var result = calculateTackPreviewTotal({
      quantity: 2,
      unitPrice: 100,
      startDate: "2026-08-03",
      endDate: "2026-08-01",
    });

    expect(result.dayCount).toBe(1);
    expect(result.totalPrice).toBe(200);
  });

  it("missing quantity/price never produces NaN", () => {
    var result = calculateTackPreviewTotal({
      quantity: null,
      unitPrice: undefined,
      startDate: "2026-08-01",
      endDate: "2026-08-03",
    });

    expect(result.totalPrice).toBe(0);
    expect(Number.isNaN(result.totalPrice)).toBe(false);
  });
});
