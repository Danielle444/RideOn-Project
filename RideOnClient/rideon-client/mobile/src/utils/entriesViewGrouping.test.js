import { describe, it, expect } from "vitest";
import { getDayKey, groupClassesByDay } from "./entriesViewGrouping.js";

function classGroup(overrides) {
  return Object.assign(
    {
      classInCompId: 1,
      className: "מקצה",
      classDate: "2026-08-12T00:00:00",
      startTime: "09:00",
      orderInDay: 1,
      items: [],
    },
    overrides,
  );
}

describe("groupClassesByDay", () => {
  it("puts two classes on the same day into one day group", () => {
    var groups = [
      classGroup({ classInCompId: 1, classDate: "2026-08-12T00:00:00" }),
      classGroup({ classInCompId: 2, classDate: "2026-08-12T00:00:00" }),
    ];

    var days = groupClassesByDay(groups);

    expect(days.length).toBe(1);
    expect(days[0].classes.length).toBe(2);
    expect(days[0].classes[0].classInCompId).toBe(1);
    expect(days[0].classes[1].classInCompId).toBe(2);
  });

  it("puts classes on different days into separate day groups", () => {
    var groups = [
      classGroup({ classInCompId: 1, classDate: "2026-08-12T00:00:00" }),
      classGroup({ classInCompId: 2, classDate: "2026-08-13T00:00:00" }),
    ];

    var days = groupClassesByDay(groups);

    expect(days.length).toBe(2);
    expect(days[0].classes.length).toBe(1);
    expect(days[1].classes.length).toBe(1);
  });

  it("preserves the incoming (already-sorted) order, never re-sorting", () => {
    var groups = [
      classGroup({ classInCompId: 5, classDate: "2026-08-13T00:00:00" }),
      classGroup({ classInCompId: 6, classDate: "2026-08-13T00:00:00" }),
      classGroup({ classInCompId: 7, classDate: "2026-08-12T00:00:00" }),
    ];

    var days = groupClassesByDay(groups);

    expect(days.length).toBe(2);
    expect(days[0].classes.map((g) => g.classInCompId)).toEqual([5, 6]);
    expect(days[1].classes.map((g) => g.classInCompId)).toEqual([7]);
  });

  it("groups missing/invalid dates together under one key", () => {
    var groups = [
      classGroup({ classInCompId: 1, classDate: null }),
      classGroup({ classInCompId: 2, classDate: undefined }),
    ];

    var days = groupClassesByDay(groups);

    expect(days.length).toBe(1);
    expect(days[0].dayKey).toBe("no-date");
  });

  it("returns an empty array for a non-array input", () => {
    expect(groupClassesByDay(null)).toEqual([]);
  });
});

describe("getDayKey", () => {
  it("returns the same key for two timestamps on the same local day", () => {
    expect(getDayKey("2026-08-12T00:00:00")).toBe(
      getDayKey("2026-08-12T08:30:00"),
    );
  });

  it("returns different keys for different days", () => {
    expect(getDayKey("2026-08-12T00:00:00")).not.toBe(
      getDayKey("2026-08-13T00:00:00"),
    );
  });
});
