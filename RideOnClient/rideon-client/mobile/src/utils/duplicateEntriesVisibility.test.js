import { describe, it, expect } from "vitest";
import {
  getVisibleDuplicateEntries,
  isDuplicateEntryEligible,
  getDuplicateEntryCounts,
} from "./duplicateEntriesVisibility.js";

function duplicateItem(overrides) {
  return Object.assign(
    {
      sourceEntryId: 1,
      targetClassInCompId: 100,
      alreadyExists: false,
    },
    overrides,
  );
}

describe("getVisibleDuplicateEntries", () => {
  it("hides rows with no targetClassInCompId", () => {
    var entries = [
      duplicateItem({ sourceEntryId: 1, targetClassInCompId: null }),
      duplicateItem({ sourceEntryId: 2, targetClassInCompId: 200 }),
    ];

    var visible = getVisibleDuplicateEntries(entries);

    expect(visible.length).toBe(1);
    expect(visible[0].sourceEntryId).toBe(2);
  });

  it("keeps alreadyExists rows visible", () => {
    var entries = [
      duplicateItem({ sourceEntryId: 1, alreadyExists: true }),
    ];

    var visible = getVisibleDuplicateEntries(entries);

    expect(visible.length).toBe(1);
  });

  it("returns an empty array for a non-array input", () => {
    expect(getVisibleDuplicateEntries(undefined)).toEqual([]);
  });
});

describe("isDuplicateEntryEligible", () => {
  it("is false for an alreadyExists row even with a target class", () => {
    expect(
      isDuplicateEntryEligible(
        duplicateItem({ targetClassInCompId: 100, alreadyExists: true }),
      ),
    ).toBe(false);
  });

  it("is true for a row with a target class and not alreadyExists", () => {
    expect(
      isDuplicateEntryEligible(
        duplicateItem({ targetClassInCompId: 100, alreadyExists: false }),
      ),
    ).toBe(true);
  });
});

describe("getDuplicateEntryCounts", () => {
  it("computes total/eligible from the visible set only", () => {
    var raw = [
      duplicateItem({ sourceEntryId: 1, targetClassInCompId: null }), // hidden
      duplicateItem({
        sourceEntryId: 2,
        targetClassInCompId: 200,
        alreadyExists: true,
      }), // visible, ineligible
      duplicateItem({ sourceEntryId: 3, targetClassInCompId: 300 }), // visible, eligible
    ];

    var visible = getVisibleDuplicateEntries(raw);
    var counts = getDuplicateEntryCounts(visible);

    expect(visible.length).toBe(2);
    expect(counts.total).toBe(2);
    expect(counts.eligible).toBe(1);
  });

  it("both total and eligible are zero when nothing is visible", () => {
    var visible = getVisibleDuplicateEntries([
      duplicateItem({ targetClassInCompId: null }),
    ]);

    var counts = getDuplicateEntryCounts(visible);

    expect(counts.total).toBe(0);
    expect(counts.eligible).toBe(0);
  });
});
