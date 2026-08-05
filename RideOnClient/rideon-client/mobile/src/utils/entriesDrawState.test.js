import { describe, it, expect } from "vitest";
import {
  isCancelledAfterStartRow,
  isActiveEntryForDraw,
  computeClassDrawState,
} from "./entriesDrawState.js";

function entry(overrides) {
  return Object.assign(
    {
      entryId: 1,
      entryStatus: "Active",
      isCancelledAfterStart: false,
      drawOrder: null,
    },
    overrides,
  );
}

describe("computeClassDrawState", () => {
  it("is drawn when every Active row has a drawOrder number", () => {
    var items = [
      entry({ entryId: 1, drawOrder: 1 }),
      entry({ entryId: 2, drawOrder: 2 }),
    ];

    var result = computeClassDrawState(items);

    expect(result.isDrawn).toBe(true);
    expect(result.activeRows.length).toBe(2);
  });

  it("is not drawn when one Active row has no drawOrder", () => {
    var items = [
      entry({ entryId: 1, drawOrder: 1 }),
      entry({ entryId: 2, drawOrder: null }),
    ];

    var result = computeClassDrawState(items);

    expect(result.isDrawn).toBe(false);
  });

  it("a CancelledAfterStart row with null drawOrder does not block drawn state", () => {
    var items = [
      entry({ entryId: 1, drawOrder: 1 }),
      entry({
        entryId: 2,
        drawOrder: null,
        isCancelledAfterStart: true,
        entryStatus: "Active",
      }),
    ];

    var result = computeClassDrawState(items);

    expect(result.isDrawn).toBe(true);
    expect(result.activeRows.length).toBe(1);
  });

  it("a CancelledAfterStart row identified only by entryStatus string is also excluded", () => {
    var items = [
      entry({ entryId: 1, drawOrder: 1 }),
      entry({
        entryId: 2,
        drawOrder: null,
        isCancelledAfterStart: false,
        entryStatus: "CancelledAfterStart",
      }),
    ];

    var result = computeClassDrawState(items);

    expect(result.isDrawn).toBe(true);
    expect(result.activeRows.length).toBe(1);
  });

  it("is not drawn when there are no Active rows", () => {
    var items = [
      entry({ entryId: 1, entryStatus: "Cancelled", drawOrder: 1 }),
      entry({ entryId: 2, isCancelledAfterStart: true, drawOrder: 2 }),
    ];

    var result = computeClassDrawState(items);

    expect(result.isDrawn).toBe(false);
    expect(result.activeRows.length).toBe(0);
  });

  it("is not drawn for an empty roster", () => {
    var result = computeClassDrawState([]);

    expect(result.isDrawn).toBe(false);
    expect(result.activeRows.length).toBe(0);
  });

  it("treats drawOrder 0 as numbered, not missing", () => {
    var items = [entry({ entryId: 1, drawOrder: 0 })];

    var result = computeClassDrawState(items);

    expect(result.isDrawn).toBe(true);
  });
});

describe("isCancelledAfterStartRow", () => {
  it("is true when isCancelledAfterStart is true", () => {
    expect(isCancelledAfterStartRow(entry({ isCancelledAfterStart: true }))).toBe(
      true,
    );
  });

  it("is true when entryStatus is the literal string CancelledAfterStart", () => {
    expect(
      isCancelledAfterStartRow(entry({ entryStatus: "CancelledAfterStart" })),
    ).toBe(true);
  });

  it("is false for a plain Active row", () => {
    expect(isCancelledAfterStartRow(entry({ entryStatus: "Active" }))).toBe(
      false,
    );
  });
});

describe("isActiveEntryForDraw", () => {
  it("treats a missing entryStatus as Active (matches the DTO default)", () => {
    expect(isActiveEntryForDraw(entry({ entryStatus: undefined }))).toBe(true);
  });

  it("excludes plain Cancelled rows", () => {
    expect(isActiveEntryForDraw(entry({ entryStatus: "Cancelled" }))).toBe(
      false,
    );
  });
});
