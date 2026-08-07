import { describe, it, expect } from "vitest";
import {
  buildPhysicalRunKey,
  groupEntriesIntoPhysicalRuns,
  expandRunsToEntryDrawOrders,
  formatDuplicateEntriesMessage,
  buildDisplayRunRows,
} from "./physicalRunGrouping.utils.js";

function makeEntry(overrides) {
  return Object.assign(
    {
      entryId: 1,
      classInCompId: 100,
      className: "Class 100",
      riderFederationMemberId: 2307,
      riderName: "Rider",
      horseId: 360,
      horseName: "Horse",
      classDate: "2026-09-15",
      orderInDay: 6,
      entryStatus: "Active",
      createdAt: "2026-01-01T00:00:00Z",
    },
    overrides,
  );
}

describe("groupEntriesIntoPhysicalRuns", () => {
  it("groups same rider/horse/date/orderInDay across two classes into one run", () => {
    var entries = [
      makeEntry({ entryId: 10293, classInCompId: 1574, className: "Open NRHA" }),
      makeEntry({
        entryId: 10294,
        classInCompId: 1576,
        className: "Novice Horse Open Level 1 NRHA",
      }),
    ];

    var result = groupEntriesIntoPhysicalRuns(entries);

    expect(result.duplicates).toHaveLength(0);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].entryIds.sort()).toEqual([10293, 10294]);
    expect(result.runs[0].classInCompIds.sort()).toEqual([1574, 1576]);
    expect(result.runs[0].className).toBe("Open NRHA + Novice Horse Open Level 1 NRHA");
  });

  it("groups three different classes into one run", () => {
    var entries = [
      makeEntry({ entryId: 1, classInCompId: 100 }),
      makeEntry({ entryId: 2, classInCompId: 101 }),
      makeEntry({ entryId: 3, classInCompId: 102 }),
    ];

    var result = groupEntriesIntoPhysicalRuns(entries);

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].entryIds).toHaveLength(3);
  });

  it("keeps a different rider as a separate run", () => {
    var entries = [
      makeEntry({ entryId: 1, riderFederationMemberId: 2307 }),
      makeEntry({ entryId: 2, riderFederationMemberId: 4001 }),
    ];

    expect(groupEntriesIntoPhysicalRuns(entries).runs).toHaveLength(2);
  });

  it("keeps a different horse as a separate run", () => {
    var entries = [
      makeEntry({ entryId: 1, horseId: 360 }),
      makeEntry({ entryId: 2, horseId: 999 }),
    ];

    expect(groupEntriesIntoPhysicalRuns(entries).runs).toHaveLength(2);
  });

  it("keeps a different date as a separate run", () => {
    // ClassInCompId also differs -- a single class instance has exactly one
    // classDate, so two different dates always mean two different classes.
    var entries = [
      makeEntry({ entryId: 1, classInCompId: 100, classDate: "2026-09-15" }),
      makeEntry({ entryId: 2, classInCompId: 101, classDate: "2026-09-16" }),
    ];

    expect(groupEntriesIntoPhysicalRuns(entries).runs).toHaveLength(2);
  });

  it("keeps a different orderInDay as a separate run", () => {
    var entries = [
      makeEntry({ entryId: 1, classInCompId: 100, orderInDay: 6 }),
      makeEntry({ entryId: 2, classInCompId: 101, orderInDay: 7 }),
    ];

    expect(groupEntriesIntoPhysicalRuns(entries).runs).toHaveLength(2);
  });

  it("keeps the run with only its active classification when one is cancelled", () => {
    var entries = [
      makeEntry({ entryId: 1, classInCompId: 100, entryStatus: "Active" }),
      makeEntry({ entryId: 2, classInCompId: 101, entryStatus: "Cancelled" }),
    ];

    var result = groupEntriesIntoPhysicalRuns(entries);

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].entryIds).toEqual([1]);
    expect(result.runs[0].classInCompIds).toEqual([100]);
  });

  it("produces no run when every classification is cancelled", () => {
    var entries = [
      makeEntry({ entryId: 1, entryStatus: "Cancelled" }),
      makeEntry({ entryId: 2, entryStatus: "CancelledAfterStart" }),
    ];

    var result = groupEntriesIntoPhysicalRuns(entries);

    expect(result.runs).toHaveLength(0);
    expect(result.duplicates).toHaveLength(0);
  });

  it("detects a same-class Active duplicate and returns its entry ids, excluded from runs", () => {
    var entries = [
      makeEntry({ entryId: 10487, classInCompId: 1480 }),
      makeEntry({ entryId: 10488, classInCompId: 1480 }),
      makeEntry({ entryId: 10489, classInCompId: 1480 }),
    ];

    var result = groupEntriesIntoPhysicalRuns(entries);

    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].entryIds.sort()).toEqual([10487, 10488, 10489]);
    expect(result.runs).toHaveLength(0);
  });

  it("does not flag a cancelled duplicate -- only Active duplicates count", () => {
    var entries = [
      makeEntry({ entryId: 1, classInCompId: 100, entryStatus: "Active" }),
      makeEntry({ entryId: 2, classInCompId: 100, entryStatus: "Cancelled" }),
    ];

    var result = groupEntriesIntoPhysicalRuns(entries);

    expect(result.duplicates).toHaveLength(0);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].entryIds).toEqual([1]);
  });

  it("resolves the fixture-equivalent entries 10293/10294 to one physical run", () => {
    var entries = [
      makeEntry({
        entryId: 10293,
        classInCompId: 1574,
        riderFederationMemberId: 2307,
        horseId: 360,
        classDate: "2026-09-15",
        orderInDay: 6,
        className: "Open NRHA",
      }),
      makeEntry({
        entryId: 10294,
        classInCompId: 1576,
        riderFederationMemberId: 2307,
        horseId: 360,
        classDate: "2026-09-15",
        orderInDay: 6,
        className: "Novice Horse Open Level 1 NRHA",
      }),
    ];

    var result = groupEntriesIntoPhysicalRuns(entries);

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].riderFederationMemberId).toBe(2307);
    expect(result.runs[0].horseId).toBe(360);
  });

  it("supports PascalCase field fallback (server dual-casing convention)", () => {
    var entries = [
      {
        EntryId: 1,
        ClassInCompId: 100,
        ClassName: "Class 100",
        RiderFederationMemberId: 2307,
        HorseId: 360,
        ClassDate: "2026-09-15",
        OrderInDay: 6,
        EntryStatus: "Active",
      },
      {
        EntryId: 2,
        ClassInCompId: 101,
        ClassName: "Class 101",
        RiderFederationMemberId: 2307,
        HorseId: 360,
        ClassDate: "2026-09-15",
        OrderInDay: 6,
        EntryStatus: "Active",
      },
    ];

    expect(groupEntriesIntoPhysicalRuns(entries).runs).toHaveLength(1);
  });
});

describe("buildPhysicalRunKey", () => {
  it("falls back to a per-entry key when classDate or orderInDay is missing", () => {
    var noDate = makeEntry({ entryId: 1, classDate: null });
    var noOrder = makeEntry({ entryId: 2, orderInDay: null });

    expect(buildPhysicalRunKey(noDate)).toBe("entry:1");
    expect(buildPhysicalRunKey(noOrder)).toBe("entry:2");
  });
});

describe("expandRunsToEntryDrawOrders", () => {
  it("expands one run into all its linked entryIds with the same drawOrder", () => {
    var runs = [
      { entryIds: [10293, 10294], drawOrder: 7 },
      { entryIds: [50], drawOrder: 8 },
    ];

    expect(expandRunsToEntryDrawOrders(runs)).toEqual([
      { entryId: 10293, drawOrder: 7 },
      { entryId: 10294, drawOrder: 7 },
      { entryId: 50, drawOrder: 8 },
    ]);
  });

  it("falls back to entryId when entryIds is absent (plain entry items)", () => {
    var items = [{ entryId: 5, drawOrder: 1 }];

    expect(expandRunsToEntryDrawOrders(items)).toEqual([{ entryId: 5, drawOrder: 1 }]);
  });
});

describe("buildDisplayRunRows", () => {
  // Live reproduction: competition 78 "ריינינג 7+8", rider 1744 (ירדן כנעני),
  // horse 265, classes 1581 "Limited Non Pro NRHA" (entry 10364) and 1583
  // "Youth 13 & Under NRHA" (entry 10366), classDate 2026-09-16, orderInDay 4,
  // arena 2 -- confirmed live via Supabase 2026-08-07, undrawn at read time.
  function liveFixtureEntries(overrides1, overrides2) {
    return [
      makeEntry(
        Object.assign(
          {
            entryId: 10364,
            classInCompId: 1581,
            className: "Limited Non Pro NRHA",
            riderFederationMemberId: 1744,
            riderName: "ירדן כנעני",
            horseId: 265,
            horseName: "מגנטו (מארלי)",
            classDate: "2026-09-16",
            orderInDay: 4,
          },
          overrides1,
        ),
      ),
      makeEntry(
        Object.assign(
          {
            entryId: 10366,
            classInCompId: 1583,
            className: "Youth 13 & Under NRHA",
            riderFederationMemberId: 1744,
            riderName: "ירדן כנעני",
            horseId: 265,
            horseName: "מגנטו (מארלי)",
            classDate: "2026-09-16",
            orderInDay: 4,
          },
          overrides2,
        ),
      ),
    ];
  }

  it("before/after: collapses the live-reproduction pair into one displayed row with one draw number", () => {
    // Before the generation-layer fix, an independent per-entry generator
    // would have assigned draw 12/13. After it, both entries persist the same
    // DrawOrder -- this proves the read-only display screen shows ONE row/
    // number for the live reproduction pair, not two.
    var entries = liveFixtureEntries({ drawOrder: 12 }, { drawOrder: 12 });

    var rows = buildDisplayRunRows(entries);

    expect(rows).toHaveLength(1);
    expect(rows[0].drawOrder).toBe(12);
    expect(rows[0].entryIds.sort()).toEqual([10364, 10366]);
    expect(rows[0].classNames).toEqual([
      "Limited Non Pro NRHA",
      "Youth 13 & Under NRHA",
    ]);
    expect(rows[0].hasInconsistentDrawOrder).toBe(false);
  });

  it("shows the lowest value and flags stale pre-fix data where the two entries still disagree", () => {
    // Reproduces a draw generated by the OLD per-entry generator before this
    // grouping existed: entries 10364/10366 persisted 12 and 13 independently.
    // The display must not silently pick one as if nothing were wrong -- it
    // shows the lower number AND flags the row so the secretary knows to
    // redraw, without touching either persisted value.
    var entries = liveFixtureEntries({ drawOrder: 12 }, { drawOrder: 13 });

    var rows = buildDisplayRunRows(entries);

    expect(rows).toHaveLength(1);
    expect(rows[0].drawOrder).toBe(12);
    expect(rows[0].hasInconsistentDrawOrder).toBe(true);
  });

  it("shows an undrawn run with an empty draw number, not a fabricated one", () => {
    var entries = liveFixtureEntries({ drawOrder: null }, { drawOrder: null });

    var rows = buildDisplayRunRows(entries);

    expect(rows).toHaveLength(1);
    expect(rows[0].drawOrder).toBeNull();
  });

  it("leaves a same-day, different-orderInDay pair as two separate rows (not configured to run together)", () => {
    var entries = liveFixtureEntries({}, { orderInDay: 6 });

    var rows = buildDisplayRunRows(entries);

    expect(rows).toHaveLength(2);
  });

  it("leaves a cancelled classification as its own ungrouped row alongside the active run", () => {
    var entries = [
      makeEntry({
        entryId: 1,
        classInCompId: 100,
        riderFederationMemberId: 2307,
        horseId: 360,
        entryStatus: "Active",
      }),
      makeEntry({
        entryId: 2,
        classInCompId: 101,
        riderFederationMemberId: 2307,
        horseId: 360,
        entryStatus: "Active",
      }),
      makeEntry({
        entryId: 3,
        classInCompId: 102,
        riderFederationMemberId: 9999,
        horseId: 111,
        entryStatus: "Cancelled",
      }),
    ];

    var rows = buildDisplayRunRows(entries);

    expect(rows).toHaveLength(2);
    var run = rows.find(function (row) {
      return Array.isArray(row.entryIds);
    });
    var cancelledRow = rows.find(function (row) {
      return !Array.isArray(row.entryIds);
    });

    expect(run.entryIds.sort()).toEqual([1, 2]);
    expect(cancelledRow.entryId).toBe(3);
  });

  it("shows an invalid same-class duplicate as ungrouped rows, not silently merged", () => {
    var entries = [
      makeEntry({ entryId: 10487, classInCompId: 1480 }),
      makeEntry({ entryId: 10488, classInCompId: 1480 }),
    ];

    var rows = buildDisplayRunRows(entries);

    expect(rows).toHaveLength(2);
    rows.forEach(function (row) {
      expect(row.isInvalidDuplicate).toBe(true);
    });
  });
});

describe("formatDuplicateEntriesMessage", () => {
  it("returns an empty string when there are no duplicates", () => {
    expect(formatDuplicateEntriesMessage([])).toBe("");
  });

  it("mentions the duplicate entry ids", () => {
    var message = formatDuplicateEntriesMessage([
      { riderName: "Rider", horseName: "Horse", className: "Class", entryIds: [1, 2] },
    ]);

    expect(message).toContain("1");
    expect(message).toContain("2");
  });
});
