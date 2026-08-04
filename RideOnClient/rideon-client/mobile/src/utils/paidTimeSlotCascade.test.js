import { describe, it, expect } from "vitest";
import { getUniqueOrderedValues, getBucketLabel } from "./paidTimeSlotCascade";

describe("getUniqueOrderedValues", () => {
  it("dedupes and preserves first-seen order", () => {
    var items = [{ v: "2026-08-05" }, { v: "2026-08-06" }, { v: "2026-08-05" }];

    expect(
      getUniqueOrderedValues(items, function (item) {
        return item.v;
      }),
    ).toEqual(["2026-08-05", "2026-08-06"]);
  });

  it("keeps a single blank bucket when every item is blank - this is what lets CAP-10 skip the time-of-day step", () => {
    var items = [{ v: "" }, { v: null }, { v: undefined }];

    expect(
      getUniqueOrderedValues(items, function (item) {
        return item.v;
      }),
    ).toEqual([""]);
  });

  it("keeps the blank bucket alongside real values when they are mixed", () => {
    var items = [{ v: "בוקר" }, { v: "" }, { v: "בוקר" }, { v: "ערב" }];

    expect(
      getUniqueOrderedValues(items, function (item) {
        return item.v;
      }),
    ).toEqual(["בוקר", "", "ערב"]);
  });

  it("returns an empty list for an empty input", () => {
    expect(
      getUniqueOrderedValues([], function (item) {
        return item.v;
      }),
    ).toEqual([]);
  });
});

describe("getBucketLabel", () => {
  it("returns the trimmed value when present", () => {
    expect(getBucketLabel("  מגרש 1  ", "ללא מגרש מוגדר")).toBe("מגרש 1");
  });

  it("falls back for an empty string - never renders a blank option", () => {
    expect(getBucketLabel("", "ללא מגרש מוגדר")).toBe("ללא מגרש מוגדר");
  });

  it("falls back for null/undefined", () => {
    expect(getBucketLabel(null, "ללא מגרש מוגדר")).toBe("ללא מגרש מוגדר");
    expect(getBucketLabel(undefined, "ללא מגרש מוגדר")).toBe("ללא מגרש מוגדר");
  });
});
