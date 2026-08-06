import { describe, it, expect } from "vitest";
import {
  buildPhysicalRunContexts,
  buildRunDisplayItems,
  buildPhysicalRunKey,
} from "./entriesPhysicalRunGrouping.js";

function entry(overrides) {
  return Object.assign(
    {
      entryId: 1,
      classInCompId: 100,
      className: "Class 100",
      riderFederationMemberId: 2307,
      riderName: "Rider",
      horseId: 360,
      horseName: "Horse",
      barnName: null,
      coachName: null,
      horseRanchId: 11,
      classDate: "2026-09-15T00:00:00",
      orderInDay: 6,
      drawOrder: null,
    },
    overrides,
  );
}

describe("buildRunDisplayItems (legitimate runs)", () => {
  it("merges same rider/horse/date/orderInDay across two classes into one row", () => {
    var items = [
      entry({ entryId: 10293, classInCompId: 1574, className: "Open NRHA" }),
      entry({
        entryId: 10294,
        classInCompId: 1576,
        className: "Novice Horse Open Level 1 NRHA",
      }),
    ];

    var displayItems = buildRunDisplayItems(items);

    expect(displayItems).toHaveLength(1);
    expect(displayItems[0].entryId).toBe(10293); // primary = smallest classInCompId's entry
    expect(displayItems[0].classNames).toEqual([
      "Open NRHA",
      "Novice Horse Open Level 1 NRHA",
    ]);
    expect(displayItems[0].entryIds.slice().sort()).toEqual([10293, 10294]);
  });

  it("merges three different classes into one row", () => {
    var items = [
      entry({ entryId: 1, classInCompId: 100 }),
      entry({ entryId: 2, classInCompId: 101 }),
      entry({ entryId: 3, classInCompId: 102 }),
    ];

    expect(buildRunDisplayItems(items)[0].entryIds).toHaveLength(3);
  });

  it("keeps a different rider as a separate run", () => {
    var items = [
      entry({ entryId: 1, riderFederationMemberId: 2307 }),
      entry({ entryId: 2, riderFederationMemberId: 4001 }),
    ];

    expect(buildRunDisplayItems(items)).toHaveLength(2);
  });

  it("keeps a different horse as a separate run", () => {
    var items = [
      entry({ entryId: 1, horseId: 360 }),
      entry({ entryId: 2, horseId: 999 }),
    ];

    expect(buildRunDisplayItems(items)).toHaveLength(2);
  });

  it("keeps a different date as a separate run", () => {
    var items = [
      entry({ entryId: 1, classInCompId: 100, classDate: "2026-09-15T00:00:00" }),
      entry({ entryId: 2, classInCompId: 101, classDate: "2026-09-16T00:00:00" }),
    ];

    expect(buildRunDisplayItems(items)).toHaveLength(2);
  });

  it("keeps a different orderInDay as a separate run", () => {
    var items = [
      entry({ entryId: 1, classInCompId: 100, orderInDay: 6 }),
      entry({ entryId: 2, classInCompId: 101, orderInDay: 7 }),
    ];

    expect(buildRunDisplayItems(items)).toHaveLength(2);
  });

  it("shares one drawOrder across every merged classification", () => {
    var items = [
      entry({ entryId: 1, classInCompId: 100, drawOrder: 7 }),
      entry({ entryId: 2, classInCompId: 101, drawOrder: 7 }),
    ];

    expect(buildRunDisplayItems(items)[0].drawOrder).toBe(7);
  });

  it("resolves the fixture-equivalent entries 10293/10294 to one physical run row", () => {
    var items = [
      entry({
        entryId: 10293,
        classInCompId: 1574,
        riderFederationMemberId: 2307,
        horseId: 360,
        classDate: "2026-09-15T00:00:00",
        orderInDay: 6,
        className: "Open NRHA",
      }),
      entry({
        entryId: 10294,
        classInCompId: 1576,
        riderFederationMemberId: 2307,
        horseId: 360,
        classDate: "2026-09-15T00:00:00",
        orderInDay: 6,
        className: "Novice Horse Open Level 1 NRHA",
      }),
    ];

    var displayItems = buildRunDisplayItems(items);

    expect(displayItems).toHaveLength(1);
    expect(displayItems[0].riderFederationMemberId).toBe(2307);
    expect(displayItems[0].horseId).toBe(360);
  });

  it("returns an empty array for a non-array input", () => {
    expect(buildRunDisplayItems(null)).toEqual([]);
  });
});

describe("buildPhysicalRunContexts (invalid duplicates -- correction round)", () => {
  it("does not render a duplicated class as two valid runs", () => {
    var items = [
      entry({ entryId: 1, classInCompId: 100 }),
      entry({ entryId: 2, classInCompId: 100 }), // same rider/horse/class as entry 1
    ];

    var result = buildPhysicalRunContexts(items);

    expect(result.displayItems).toHaveLength(0);
    expect(result.duplicateWarnings).toHaveLength(1);
  });

  it("keeps valid neighboring runs rendering while a duplicate elsewhere is blocked", () => {
    var items = [
      // Invalid duplicate: rider 2307 / horse 360, class 100 twice.
      entry({ entryId: 1, classInCompId: 100, riderFederationMemberId: 2307, horseId: 360 }),
      entry({ entryId: 2, classInCompId: 100, riderFederationMemberId: 2307, horseId: 360 }),
      // Unrelated, perfectly valid run: different rider/horse.
      entry({ entryId: 3, classInCompId: 200, riderFederationMemberId: 9999, horseId: 111 }),
    ];

    var result = buildPhysicalRunContexts(items);

    expect(result.duplicateWarnings).toHaveLength(1);
    expect(result.displayItems).toHaveLength(1);
    expect(result.displayItems[0].entryId).toBe(3);
  });

  it("includes the exact duplicate entryIds in the warning", () => {
    var items = [
      entry({ entryId: 10487, classInCompId: 1480 }),
      entry({ entryId: 10488, classInCompId: 1480 }),
      entry({ entryId: 10489, classInCompId: 1480 }),
    ];

    var result = buildPhysicalRunContexts(items);

    expect(result.duplicateWarnings).toHaveLength(1);
    var warning = result.duplicateWarnings[0];
    expect(warning.duplicates).toHaveLength(1);
    expect(warning.duplicates[0].entryIds.slice().sort()).toEqual([10487, 10488, 10489]);
    expect(warning.blockedEntryIds.slice().sort()).toEqual([10487, 10488, 10489]);
  });

  // Required correction-round case: class A entered twice plus class B once,
  // all sharing the same rider+horse+date+orderInDay, must be flagged as ONE
  // invalid grouping context -- never silently reduced to a valid A+B run
  // built from one arbitrary A row plus B.
  it("flags a bucket with class A twice and class B once as one invalid context, not a valid A+B run", () => {
    var items = [
      entry({ entryId: 1, classInCompId: 100, className: "Class A" }), // A (dup 1)
      entry({ entryId: 2, classInCompId: 100, className: "Class A" }), // A (dup 2)
      entry({ entryId: 3, classInCompId: 101, className: "Class B" }), // B (would-be legit sibling)
    ];

    var result = buildPhysicalRunContexts(items);

    // Never a merged A+B run using one of the A duplicates.
    expect(result.displayItems).toHaveLength(0);

    expect(result.duplicateWarnings).toHaveLength(1);
    var warning = result.duplicateWarnings[0];

    // The duplicate collision is precisely class A's two entries...
    expect(warning.duplicates).toEqual([
      { classInCompId: 100, className: "Class A", entryIds: [1, 2] },
    ]);

    // ...but the WHOLE context (including B's entry) is held back, since B
    // cannot be confidently merged or shown alone from a contaminated bucket.
    expect(warning.blockedEntryIds.slice().sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("does not flag a cancelled-then-excluded duplicate (caller already filtered to Active)", () => {
    // buildPhysicalRunContexts trusts its caller's Active-only filter -- this
    // just documents that a single Active row for a class never trips the
    // duplicate check on its own.
    var items = [entry({ entryId: 1, classInCompId: 100 })];

    var result = buildPhysicalRunContexts(items);

    expect(result.duplicateWarnings).toHaveLength(0);
    expect(result.displayItems).toHaveLength(1);
  });
});

describe("buildPhysicalRunKey", () => {
  it("falls back to a per-entry key when classDate or orderInDay is missing", () => {
    expect(buildPhysicalRunKey(entry({ entryId: 1, classDate: null }))).toBe("entry:1");
    expect(buildPhysicalRunKey(entry({ entryId: 2, orderInDay: null }))).toBe("entry:2");
  });
});
