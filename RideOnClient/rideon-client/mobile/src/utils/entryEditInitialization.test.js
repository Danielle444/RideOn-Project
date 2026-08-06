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

// CAP-5 (Phase 2, payer-account-cohesion): documents the exact, verified
// current behavior when editItem originates from
// usp_getpayercompetitionaccount's classes[] array (opened via "ערוך" from
// AdminCompetitionPayerAccountScreen.jsx's מקצים tab), rather than from the
// richer usp_getsecretarycompetitionentries-shaped item other edit entry
// points use. Read live during Phase 0 (2026-08-06) and re-confirmed
// unchanged in Phase 2: that proc's classes[] objects carry only entryId,
// billId, className, classDateTime, startTime, orderInDay, horseId,
// horseName, barnName, riderName, coachName, organizerCost, federationCost,
// totalAmount, isPaid - none of classInCompId, riderFederationMemberId,
// coachFederationMemberId, paidByPersonId, or prizeRecipientName exist on
// it. These tests exist to lock in and document that gap, not to fix it -
// fixing it means proc 212 gaining those ids, which is CAP-8 work, out of
// scope here. No production code changed for this describe block.
describe("resolveEntryEditInitialization - payer-account classes[] item shape (CAP-5 boundary)", () => {
  function buildPayerAccountClassItem(overrides) {
    return Object.assign(
      {
        entryId: 42,
        className: "Open NRHA",
        classDateTime: "2026-09-15T00:00:00Z",
        startTime: "09:00:00",
        orderInDay: 6,
        horseId: 360,
        horseName: "SPECIAL ROYAL GUN",
        barnName: "ספשייל רויאל גאן",
        riderName: "דור ברבר",
        coachName: "מאמן",
        organizerCost: 100,
        federationCost: 20,
        totalAmount: 120,
        isPaid: false,
      },
      overrides,
    );
  }

  it("does not block/return null - a payer-account class item has none of the ids that would block it", () => {
    var result = resolveEntryEditInitialization(
      buildPayerAccountClassItem(),
      buildFullLists(),
    );

    expect(result).not.toBeNull();
  });

  it("selectedClass, selectedRider, and selectedTrainer resolve to null - never a guessed/name-matched selection", () => {
    var result = resolveEntryEditInitialization(
      buildPayerAccountClassItem(),
      buildFullLists(),
    );

    expect(result.selectedClass).toBeNull();
    expect(result.selectedRider).toBeNull();
    expect(result.selectedTrainer).toBeNull();
  });

  it("selectedHorse still resolves correctly - horseId/horseName/barnName ARE present on this shape", () => {
    var result = resolveEntryEditInitialization(
      buildPayerAccountClassItem(),
      buildFullLists(),
    );

    expect(result.selectedHorse).toEqual({
      horseId: 360,
      horseName: "SPECIAL ROYAL GUN",
      barnName: "ספשייל רויאל גאן",
      federationNumber: "",
    });
  });

  it("this remains true even when riders/trainers/classes lists loaded with an exact display-name match present - no name-based fallback is ever used", () => {
    var lists = {
      classes: [{ classInCompId: 999, className: "Open NRHA" }],
      riders: [{ federationMemberId: 999, fullName: "דור ברבר" }],
      trainers: [{ federationMemberId: 999, fullName: "מאמן" }],
      payers: [],
    };

    var result = resolveEntryEditInitialization(
      buildPayerAccountClassItem(),
      lists,
    );

    // Same className/riderName/coachName text exists in the lists above,
    // but with no classInCompId/riderFederationMemberId/
    // coachFederationMemberId on the item to match by, none of them may be
    // inferred from the matching display text.
    expect(result.selectedClass).toBeNull();
    expect(result.selectedRider).toBeNull();
    expect(result.selectedTrainer).toBeNull();
  });

  it("prizeRecipientName defaults to empty - this shape has no such field", () => {
    var result = resolveEntryEditInitialization(
      buildPayerAccountClassItem(),
      buildFullLists(),
    );

    expect(result.prizeRecipientName).toBe("");
  });
});
