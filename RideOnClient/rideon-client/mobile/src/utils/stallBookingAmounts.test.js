import { describe, it, expect } from "vitest";
import {
  extractServerStallTotal,
  resolveStallAmount,
} from "./stallBookingAmounts.js";

describe("extractServerStallTotal", () => {
  it("reads camelCase totalAmount", () => {
    expect(extractServerStallTotal({ totalAmount: 900 })).toBe(900);
  });

  it("reads PascalCase TotalAmount", () => {
    expect(extractServerStallTotal({ TotalAmount: 450 })).toBe(450);
  });

  it("reads lowercase totalamount (verified wire example: itemprice 150 x 6 days)", () => {
    expect(extractServerStallTotal({ totalamount: 900 })).toBe(900);
  });

  it("returns 0 (not null) for a legitimate zero total", () => {
    expect(extractServerStallTotal({ totalamount: 0 })).toBe(0);
  });

  it("returns null when the field is absent entirely", () => {
    expect(extractServerStallTotal({ itemPrice: 150 })).toBeNull();
  });

  it("returns null for a null item", () => {
    expect(extractServerStallTotal(null)).toBeNull();
  });
});

describe("resolveStallAmount", () => {
  it("prefers a populated server total over the recomputed value", () => {
    var result = resolveStallAmount({
      serverStallAmount: 900,
      numberOfDays: 5,
      effectivePerDayPrice: 150,
    });

    expect(result).toBe(900);
  });

  it("keeps a zero server total as zero, not the recompute", () => {
    var result = resolveStallAmount({
      serverStallAmount: 0,
      numberOfDays: 5,
      effectivePerDayPrice: 150,
    });

    expect(result).toBe(0);
  });

  it("falls back to numberOfDays × price only when the server total is absent", () => {
    var result = resolveStallAmount({
      serverStallAmount: null,
      numberOfDays: 3,
      effectivePerDayPrice: 150,
    });

    expect(result).toBe(450);
  });

  it("falls back the same way for an undefined server total", () => {
    var result = resolveStallAmount({
      serverStallAmount: undefined,
      numberOfDays: 6,
      effectivePerDayPrice: 150,
    });

    expect(result).toBe(900);
  });
});
