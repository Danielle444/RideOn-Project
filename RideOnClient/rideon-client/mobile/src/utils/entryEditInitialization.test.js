import { describe, it, expect } from "vitest";
import { resolveEntryEditInitialization } from "./entryEditInitialization.js";

function buildEditItem(overrides) {
  return Object.assign(
    {
      entryId: 1,
      classInCompId: 100,
      horseId: 200,
      horseName: "סוס",
      barnName: "אורווה",
      federationNumber: "F-1",
      riderFederationMemberId: 300,
      coachFederationMemberId: 400,
      paidByPersonId: 500,
      prizeRecipientName: "רוכב",
    },
    overrides,
  );
}

function buildFullLists() {
  return {
    classes: [{ classInCompId: 100, className: "מקצה" }],
    riders: [{ federationMemberId: 300, fullName: "רוכב" }],
    trainers: [{ federationMemberId: 400, fullName: "מאמן" }],
    payers: [{ personId: 500, fullName: "משלם" }],
  };
}

describe("resolveEntryEditInitialization", () => {
  it("returns null when editItem is absent", () => {
    expect(resolveEntryEditInitialization(null, buildFullLists())).toBeNull();
  });

  it("waits (returns null) when the class has not resolved yet", () => {
    var lists = buildFullLists();
    lists.classes = [];

    expect(resolveEntryEditInitialization(buildEditItem(), lists)).toBeNull();
  });

  it("waits (returns null) when the rider has not resolved yet", () => {
    var lists = buildFullLists();
    lists.riders = [];

    expect(resolveEntryEditInitialization(buildEditItem(), lists)).toBeNull();
  });

  it("waits (returns null) when the payer has not resolved yet", () => {
    var lists = buildFullLists();
    lists.payers = [];

    expect(resolveEntryEditInitialization(buildEditItem(), lists)).toBeNull();
  });

  it("waits (returns null) when editItem carries a trainer id that has not resolved yet", () => {
    var lists = buildFullLists();
    lists.trainers = [];

    expect(resolveEntryEditInitialization(buildEditItem(), lists)).toBeNull();
  });

  it("resolves once every required lookup is available", () => {
    var result = resolveEntryEditInitialization(
      buildEditItem(),
      buildFullLists(),
    );

    expect(result).not.toBeNull();
    expect(result.selectedClass).toEqual({
      classInCompId: 100,
      className: "מקצה",
    });
    expect(result.selectedRider).toEqual({
      federationMemberId: 300,
      fullName: "רוכב",
    });
    expect(result.selectedTrainer).toEqual({
      federationMemberId: 400,
      fullName: "מאמן",
    });
    expect(result.selectedPayer).toEqual({
      personId: 500,
      fullName: "משלם",
    });
    expect(result.prizeRecipientName).toBe("רוכב");
  });

  it("optional trainer absence on editItem does not block initialization", () => {
    var editItem = buildEditItem({ coachFederationMemberId: null });
    var lists = buildFullLists();
    lists.trainers = []; // an empty list must not matter - no trainer id was requested

    var result = resolveEntryEditInitialization(editItem, lists);

    expect(result).not.toBeNull();
    expect(result.selectedTrainer).toBeNull();
  });

  it("horse always resolves from editItem fields alone, never from a list", () => {
    var editItem = buildEditItem();
    var lists = buildFullLists();
    // no `horses` key at all in lists - horse must not need one

    var result = resolveEntryEditInitialization(editItem, lists);

    expect(result.selectedHorse).toEqual({
      horseId: 200,
      horseName: "סוס",
      barnName: "אורווה",
      federationNumber: "F-1",
    });
  });

  it("horse resolves to null when editItem carries no horseId", () => {
    var editItem = buildEditItem({ horseId: null });

    var result = resolveEntryEditInitialization(editItem, buildFullLists());

    expect(result.selectedHorse).toBeNull();
  });

  it("prizeRecipientName defaults to an empty string when absent", () => {
    var editItem = buildEditItem({ prizeRecipientName: null });

    var result = resolveEntryEditInitialization(editItem, buildFullLists());

    expect(result.prizeRecipientName).toBe("");
  });
});
