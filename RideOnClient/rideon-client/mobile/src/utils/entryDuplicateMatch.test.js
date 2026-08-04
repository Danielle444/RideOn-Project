import { describe, it, expect } from "vitest";
import { findDuplicateActiveEntry } from "./entryDuplicateMatch.js";

function buildEntry(overrides) {
  return Object.assign(
    {
      entryId: 1,
      classInCompId: 100,
      horseId: 200,
      riderFederationMemberId: 300,
      entryStatus: "Active",
    },
    overrides,
  );
}

function criteria(overrides) {
  return Object.assign(
    {
      classInCompId: 100,
      horseId: 200,
      riderFederationMemberId: 300,
      excludeEntryId: null,
    },
    overrides,
  );
}

describe("findDuplicateActiveEntry", () => {
  it("finds an exact triple match (same class + horse + rider)", () => {
    var entries = [buildEntry({ entryId: 1 })];
    var result = findDuplicateActiveEntry(entries, criteria());

    expect(result).not.toBeNull();
    expect(result.entryId).toBe(1);
  });

  it("ignores a matching row that is not Active", () => {
    var entries = [buildEntry({ entryId: 1, entryStatus: "Cancelled" })];
    var result = findDuplicateActiveEntry(entries, criteria());

    expect(result).toBeNull();
  });

  it("does not flag the same horse/class with a different rider", () => {
    var entries = [buildEntry({ entryId: 1, riderFederationMemberId: 999 })];
    var result = findDuplicateActiveEntry(entries, criteria());

    expect(result).toBeNull();
  });

  it("does not flag the same rider/class with a different horse", () => {
    var entries = [buildEntry({ entryId: 1, horseId: 999 })];
    var result = findDuplicateActiveEntry(entries, criteria());

    expect(result).toBeNull();
  });

  it("excludes the entry being replaced in edit mode", () => {
    var entries = [buildEntry({ entryId: 1 })];
    var result = findDuplicateActiveEntry(
      entries,
      criteria({ excludeEntryId: 1 }),
    );

    expect(result).toBeNull();
  });

  it("still flags a different active duplicate while excluding the edited entry", () => {
    var entries = [
      buildEntry({ entryId: 1 }),
      buildEntry({ entryId: 2 }),
    ];
    var result = findDuplicateActiveEntry(
      entries,
      criteria({ excludeEntryId: 1 }),
    );

    expect(result).not.toBeNull();
    expect(result.entryId).toBe(2);
  });

  it("matches PascalCase-only payload shapes", () => {
    var entries = [
      {
        EntryId: 1,
        ClassInCompId: 100,
        HorseId: 200,
        RiderFederationMemberId: 300,
        EntryStatus: "Active",
      },
    ];
    var result = findDuplicateActiveEntry(entries, criteria());

    expect(result).not.toBeNull();
    expect(result.entryId).toBe(1);
  });

  it("returns null for an empty list", () => {
    var result = findDuplicateActiveEntry([], criteria());

    expect(result).toBeNull();
  });

  it("returns null for a non-array input", () => {
    var result = findDuplicateActiveEntry(null, criteria());

    expect(result).toBeNull();
  });
});
