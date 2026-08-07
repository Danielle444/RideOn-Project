import { describe, it, expect } from "vitest";
import {
  getEntryId,
  getEntryDrawOrder,
  normalizeDraftEntries,
  moveItemInArray,
  buildRunDraft,
} from "./useSecretaryCompetitionClassesPage.js";
import {
  groupEntriesIntoPhysicalRuns,
  expandRunsToEntryDrawOrders,
} from "../../utils/physicalRunGrouping.utils.js";

// Correction round: proves the web draw draft's "representative entryId"
// trick (each run's draft item reuses its smallest linked entryId as a drag
// id, so the existing entryId-keyed move/drag wiring needed zero changes)
// never loses track of the OTHER entryIds a merged run carries -- the
// representative id is UI identity only, never the save source of truth.
//
// moveDrawOrderEntryToEntry (drag/drop) and updateDraftDrawOrder (manual
// numbering) in useSecretaryCompetitionClassesPage.js both bottom out in the
// exact same pair of primitives exercised directly here: moveItemInArray
// (an array splice-based reorder) followed by normalizeDraftEntries (spreads
// `...entry`, only overwrites drawOrder/DrawOrder). Proving those two
// primitives never touch `entryIds` proves both interaction paths do not,
// without needing to mount the hook itself.

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

describe("representative entryId is UI identity only", () => {
  it("is the smallest linked entryId and is itself a member of entryIds", () => {
    var entries = [
      makeEntry({ entryId: 10294, classInCompId: 1576 }),
      makeEntry({ entryId: 10293, classInCompId: 1574 }),
    ];

    var run = groupEntriesIntoPhysicalRuns(entries).runs[0];

    expect(run.entryId).toBe(10293);
    expect(run.entryIds).toContain(run.entryId);
    expect(run.entryIds.slice().sort()).toEqual([10293, 10294]);
  });

  it("expandRunsToEntryDrawOrders ignores a stale/wrong entryId when entryIds is present", () => {
    // A deliberately corrupted representative id -- if the save path ever
    // read `entryId` instead of `entryIds` for a merged run, this would leak
    // the bogus id and/or drop the real ones.
    var corruptedRun = {
      entryId: 999999,
      entryIds: [10293, 10294],
      drawOrder: 7,
    };

    var expanded = expandRunsToEntryDrawOrders([corruptedRun]);

    expect(expanded).toEqual([
      { entryId: 10293, drawOrder: 7 },
      { entryId: 10294, drawOrder: 7 },
    ]);
    expect(expanded.some((row) => row.entryId === 999999)).toBe(false);
  });
});

describe("expandRunsToEntryDrawOrders emits every linked active entryId", () => {
  it("emits exactly one row per linked entryId, never fewer", () => {
    var run = { entryIds: [1, 2, 3], drawOrder: 4 };

    expect(expandRunsToEntryDrawOrders([run])).toEqual([
      { entryId: 1, drawOrder: 4 },
      { entryId: 2, drawOrder: 4 },
      { entryId: 3, drawOrder: 4 },
    ]);
  });
});

describe("drag/drop and manual numbering preserve the complete entryIds array", () => {
  function draft() {
    return normalizeDraftEntries([
      { runKey: "a", entryId: 1, entryIds: [1, 2, 3] },
      { runKey: "b", entryId: 10, entryIds: [10] },
      { runKey: "c", entryId: 20, entryIds: [20, 21] },
    ]);
  }

  it("a drag-to-reorder move (moveItemInArray) never drops or mutates entryIds", () => {
    var before = draft();
    var beforeByRunKey = {};
    before.forEach(function (item) {
      beforeByRunKey[item.runKey] = item.entryIds;
    });

    // Simulates moveDrawOrderEntryToEntry: splice-move then renormalize.
    var moved = normalizeDraftEntries(moveItemInArray(before, 0, 2));

    expect(moved).toHaveLength(3);
    moved.forEach(function (item) {
      expect(item.entryIds).toEqual(beforeByRunKey[item.runKey]);
    });

    // Only drawOrder changed -- run "a" moved from position 1 to position 3.
    var runA = moved.find(function (item) {
      return item.runKey === "a";
    });
    expect(getEntryDrawOrder(runA)).toBe(3);
    expect(runA.entryIds).toEqual([1, 2, 3]);
  });

  it("a manual-number jump (same moveItemInArray+normalizeDraftEntries pair) never drops or mutates entryIds", () => {
    var before = draft();
    var beforeByRunKey = {};
    before.forEach(function (item) {
      beforeByRunKey[item.runKey] = item.entryIds;
    });

    // Simulates updateDraftDrawOrder(entryId=10, value=1): moves run "b"
    // (currently at index 1) to index 0.
    var renumbered = normalizeDraftEntries(moveItemInArray(before, 1, 0));

    renumbered.forEach(function (item) {
      expect(item.entryIds).toEqual(beforeByRunKey[item.runKey]);
    });

    var runB = renumbered.find(function (item) {
      return item.runKey === "b";
    });
    expect(getEntryDrawOrder(runB)).toBe(1);
    expect(runB.entryIds).toEqual([10]);
  });
});

describe("two different physical runs never receive the same draggable id", () => {
  it("every run's representative entryId (used as the drag id) is unique across the group", () => {
    var entries = [
      makeEntry({ entryId: 1, classInCompId: 100, riderFederationMemberId: 1, horseId: 1 }),
      makeEntry({ entryId: 2, classInCompId: 101, riderFederationMemberId: 1, horseId: 1 }), // same run as 1
      makeEntry({ entryId: 3, classInCompId: 100, riderFederationMemberId: 2, horseId: 2 }),
      makeEntry({ entryId: 4, classInCompId: 100, riderFederationMemberId: 3, horseId: 3 }),
      makeEntry({ entryId: 5, classInCompId: 101, riderFederationMemberId: 3, horseId: 3 }), // same run as 4
    ];

    var runs = groupEntriesIntoPhysicalRuns(entries).runs;
    var ids = runs.map(function (run) {
      return run.entryId;
    });

    expect(new Set(ids).size).toBe(ids.length);
    expect(runs).toHaveLength(3);
  });
});

describe("save never sends only the representative row for a merged run", () => {
  it("a full draft's expanded save payload row count equals the sum of every run's linked entryIds, not the draft length", () => {
    var draftItems = [
      { entryId: 1, entryIds: [1, 2, 3], drawOrder: 1 }, // 3-classification run
      { entryId: 10, entryIds: [10], drawOrder: 2 }, // single-classification run
    ];

    var expanded = expandRunsToEntryDrawOrders(draftItems);

    expect(draftItems).toHaveLength(2);
    expect(expanded).toHaveLength(4); // 3 + 1, not 2
    expect(expanded.filter((row) => row.drawOrder === 1)).toHaveLength(3);
    expect(expanded.some((row) => row.entryId === 2)).toBe(true);
    expect(expanded.some((row) => row.entryId === 3)).toBe(true);
  });

  it("buildRunDraft's output, once expanded, still carries every active entryId end to end", () => {
    var entries = [
      makeEntry({ entryId: 10293, classInCompId: 1574 }),
      makeEntry({ entryId: 10294, classInCompId: 1576 }),
    ];

    var result = buildRunDraft(entries);
    expect(result.error).toBe("");
    expect(result.draft).toHaveLength(1); // one row in the draft/UI

    var expanded = expandRunsToEntryDrawOrders(result.draft);
    expect(expanded.map((row) => row.entryId).sort()).toEqual([10293, 10294]); // both saved
    expect(getEntryId(result.draft[0])).not.toBe(undefined); // representative id still present for UI/drag use
  });
});
