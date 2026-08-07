import { describe, it, expect } from "vitest";
import {
  emptyFilters,
  toSafeFilters,
  toggleValueInArray,
} from "./competitionsFilterSheetState.js";

describe("emptyFilters", () => {
  it("returns empty arrays/strings for every facet", () => {
    expect(emptyFilters()).toEqual({
      searchText: "",
      hostRanchIds: [],
      fieldIds: [],
      statusValues: [],
      dateFrom: "",
      dateTo: "",
    });
  });
});

describe("toSafeFilters", () => {
  it("returns emptyFilters() for a missing/null input", () => {
    expect(toSafeFilters(null)).toEqual(emptyFilters());
    expect(toSafeFilters(undefined)).toEqual(emptyFilters());
  });

  it("passes through valid arrays and strings", () => {
    var input = {
      searchText: "אביב",
      hostRanchIds: [10, 11],
      fieldIds: [20],
      statusValues: ["פתוח"],
      dateFrom: "2026-08-01",
      dateTo: "2026-08-05",
    };

    expect(toSafeFilters(input)).toEqual(input);
  });

  it("coerces a non-array facet to an empty array instead of throwing", () => {
    var result = toSafeFilters({ hostRanchIds: "not-an-array" });

    expect(result.hostRanchIds).toEqual([]);
  });
});

describe("toggleValueInArray", () => {
  it("adds a value that is not yet selected", () => {
    expect(toggleValueInArray([10], 20)).toEqual([10, 20]);
  });

  it("removes a value that is already selected", () => {
    expect(toggleValueInArray([10, 20], 10)).toEqual([20]);
  });

  it("compares by string so numeric/string ids toggle the same entry", () => {
    expect(toggleValueInArray([10], "10")).toEqual([]);
    expect(toggleValueInArray(["10"], 10)).toEqual([]);
  });

  it("starting from an empty list, toggling once selects exactly that value", () => {
    expect(toggleValueInArray([], 30)).toEqual([30]);
  });

  it("treats a non-array list as empty instead of throwing", () => {
    expect(toggleValueInArray(null, 5)).toEqual([5]);
  });
});
