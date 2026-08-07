import { describe, it, expect } from "vitest";
import {
  buildHostRanchOptions,
  buildFieldOptions,
  buildStatusOptions,
  matchesMultiSelect,
  filterCompetitionsForBoard,
} from "./competitionsBoardFilters.js";

function buildCompetition(overrides) {
  return Object.assign(
    {
      competitionId: 1,
      competitionName: "אליפות קיץ",
      competitionStatus: "פתוח",
      hostRanchId: 10,
      hostRanchName: "חוות הצפון",
      fieldId: 20,
      fieldName: "קפיצות",
      competitionStartDate: "2026-08-01",
      competitionEndDate: "2026-08-02",
    },
    overrides,
  );
}

describe("matchesMultiSelect", () => {
  it("an empty selection set matches everything (no filtering)", () => {
    expect(matchesMultiSelect(10, [])).toBe(true);
    expect(matchesMultiSelect(10, undefined)).toBe(true);
    expect(matchesMultiSelect(10, null)).toBe(true);
  });

  it("a non-empty selection set matches only contained values", () => {
    expect(matchesMultiSelect(10, [10, 20])).toBe(true);
    expect(matchesMultiSelect(30, [10, 20])).toBe(false);
  });

  it("compares by string so numeric/string ids from different sources still match", () => {
    expect(matchesMultiSelect("10", [10])).toBe(true);
    expect(matchesMultiSelect(10, ["10"])).toBe(true);
  });
});

describe("filterCompetitionsForBoard - multi-select facets", () => {
  it("empty status/hostRanch/field selections do not filter at all", () => {
    var items = [
      buildCompetition({ competitionId: 1, hostRanchId: 10, fieldId: 20 }),
      buildCompetition({ competitionId: 2, hostRanchId: 11, fieldId: 21 }),
    ];

    var result = filterCompetitionsForBoard(items, {
      hostRanchFilter: [],
      fieldFilter: [],
      statusFilter: [],
    });

    expect(result.length).toBe(2);
  });

  it("a non-empty status selection keeps only matching rows", () => {
    var items = [
      buildCompetition({ competitionId: 1, competitionStatus: "פתוח" }),
      buildCompetition({ competitionId: 2, competitionStatus: "סגור" }),
    ];

    var result = filterCompetitionsForBoard(items, {
      statusFilter: ["פתוח"],
    });

    expect(result.map((item) => item.competitionId)).toEqual([1]);
  });

  it("a multi-value host-ranch selection keeps rows matching ANY selected ranch", () => {
    var items = [
      buildCompetition({ competitionId: 1, hostRanchId: 10 }),
      buildCompetition({ competitionId: 2, hostRanchId: 11 }),
      buildCompetition({ competitionId: 3, hostRanchId: 12 }),
    ];

    var result = filterCompetitionsForBoard(items, {
      hostRanchFilter: [10, 12],
    });

    expect(result.map((item) => item.competitionId)).toEqual([1, 3]);
  });

  it("a multi-value field/discipline selection keeps rows matching ANY selected field", () => {
    var items = [
      buildCompetition({ competitionId: 1, fieldId: 20 }),
      buildCompetition({ competitionId: 2, fieldId: 21 }),
    ];

    var result = filterCompetitionsForBoard(items, {
      fieldFilter: [21],
    });

    expect(result.map((item) => item.competitionId)).toEqual([2]);
  });

  it("combines multi-select facets with search and date range", () => {
    var items = [
      buildCompetition({
        competitionId: 1,
        competitionName: "אביב",
        hostRanchId: 10,
        competitionStartDate: "2026-08-01",
      }),
      buildCompetition({
        competitionId: 2,
        competitionName: "אביב",
        hostRanchId: 11,
        competitionStartDate: "2026-08-01",
      }),
      buildCompetition({
        competitionId: 3,
        competitionName: "סתיו",
        hostRanchId: 10,
        competitionStartDate: "2026-08-01",
      }),
    ];

    var result = filterCompetitionsForBoard(items, {
      searchText: "אביב",
      hostRanchFilter: [10, 11],
      dateFrom: "2026-07-01",
      dateTo: "2026-09-01",
    });

    expect(result.map((item) => item.competitionId)).toEqual([1, 2]);
  });

  it("still excludes draft competitions regardless of filters", () => {
    var items = [
      buildCompetition({ competitionId: 1, competitionStatus: "טיוטה" }),
      buildCompetition({ competitionId: 2, competitionStatus: "פתוח" }),
    ];

    var result = filterCompetitionsForBoard(items, {});

    expect(result.map((item) => item.competitionId)).toEqual([2]);
  });
});

describe("option builders are unchanged by the multi-select rework", () => {
  it("buildHostRanchOptions dedupes by hostRanchId", () => {
    var items = [
      buildCompetition({ hostRanchId: 10, hostRanchName: "חוות הצפון" }),
      buildCompetition({ hostRanchId: 10, hostRanchName: "חוות הצפון" }),
      buildCompetition({ hostRanchId: 11, hostRanchName: "חוות הדרום" }),
    ];

    expect(buildHostRanchOptions(items)).toEqual([
      { value: 10, label: "חוות הצפון" },
      { value: 11, label: "חוות הדרום" },
    ]);
  });

  it("buildFieldOptions dedupes by fieldId", () => {
    var items = [
      buildCompetition({ fieldId: 20, fieldName: "קפיצות" }),
      buildCompetition({ fieldId: 21, fieldName: "אילוף" }),
      buildCompetition({ fieldId: 21, fieldName: "אילוף" }),
    ];

    expect(buildFieldOptions(items)).toEqual([
      { value: 20, label: "קפיצות" },
      { value: 21, label: "אילוף" },
    ]);
  });

  it("buildStatusOptions never offers draft as an option", () => {
    var items = [
      buildCompetition({ competitionStatus: "פתוח" }),
      buildCompetition({ competitionStatus: "טיוטה" }),
    ];

    var options = buildStatusOptions(items, ["פתוח", "טיוטה", "סגור"]);

    expect(options.some((option) => option.value === "טיוטה")).toBe(false);
  });
});
