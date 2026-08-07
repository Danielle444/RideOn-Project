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

// CAP-5 (Phase 2, payer-account-cohesion): documents the PRE-CAP-8 shape of
// usp_getpayercompetitionaccount's classes[] array (opened via "ערוך" from
// AdminCompetitionPayerAccountScreen.jsx's מקצים tab), as read live during
// Phase 0 (2026-08-06) and re-confirmed unchanged in Phase 2 - at that time
// classes[] objects carried only entryId, billId, className, classDateTime,
// startTime, orderInDay, horseId, horseName, barnName, riderName, coachName,
// organizerCost, federationCost, totalAmount, isPaid, with none of
// classInCompId, riderFederationMemberId, coachFederationMemberId,
// paidByPersonId, or prizeRecipientName present.
//
// CAP-8/proc 212 has since shipped and deployed those five fields (Phase
// 3E Slice C, 2026-08-06) - see the "post-CAP-8" describe block below for
// the current, real payer-account item shape. This block no longer
// describes what a live payer-account item looks like; it is kept as a
// regression guard on resolveEntryEditInitialization's fallback contract
// for ANY editItem missing these fields (malformed data, a future screen,
// etc.) - proving it still resolves gracefully with null selections and
// never guesses from a display-name match. No production code changed for
// this describe block, then or now.
describe("resolveEntryEditInitialization - editItem missing the five stable fields (fallback contract, formerly the live CAP-5 payer-account shape)", () => {
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

// Phase 3E Slice C (payer-account-cohesion): CAP-8/proc 212 has shipped and
// deployed - usp_getpayercompetitionaccount's classes[] items now carry
// classInCompId, riderFederationMemberId, coachFederationMemberId,
// paidByPersonId, and prizeRecipientName alongside every field the block
// above already knew about (verified against the deployed proc-212
// function body; confirmed live, 2026-08-06). No production code changed
// for this describe block either - resolveEntryEditInitialization already
// read these five field names generically, without assuming which screen
// editItem came from, so it needed no update to consume them; these tests
// exist to prove and lock in that the boundary above is now closed for the
// real deployed shape.
describe("resolveEntryEditInitialization - payer-account classes[] item shape (post-CAP-8, deployed proc 212)", () => {
  function buildDeployedPayerAccountClassItem(overrides) {
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
        classInCompId: 100,
        riderFederationMemberId: 300,
        coachFederationMemberId: 400,
        paidByPersonId: 500,
        prizeRecipientName: "דור ברבר",
      },
      overrides,
    );
  }

  it("resolves selectedClass, selectedRider, selectedTrainer, selectedPayer, and prizeRecipientName directly from the deployed proc-212 fields", () => {
    var result = resolveEntryEditInitialization(
      buildDeployedPayerAccountClassItem(),
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
    expect(result.prizeRecipientName).toBe("דור ברבר");
  });

  it("selectedClass resolves to null, without blocking, when classInCompId is missing", () => {
    var result = resolveEntryEditInitialization(
      buildDeployedPayerAccountClassItem({ classInCompId: undefined }),
      buildFullLists(),
    );

    expect(result).not.toBeNull();
    expect(result.selectedClass).toBeNull();
  });

  it("selectedRider resolves to null, without blocking, when riderFederationMemberId is missing", () => {
    var result = resolveEntryEditInitialization(
      buildDeployedPayerAccountClassItem({
        riderFederationMemberId: undefined,
      }),
      buildFullLists(),
    );

    expect(result).not.toBeNull();
    expect(result.selectedRider).toBeNull();
  });

  it("selectedTrainer resolves to null, without blocking, when coachFederationMemberId is missing", () => {
    var result = resolveEntryEditInitialization(
      buildDeployedPayerAccountClassItem({
        coachFederationMemberId: undefined,
      }),
      buildFullLists(),
    );

    expect(result).not.toBeNull();
    expect(result.selectedTrainer).toBeNull();
  });

  it("selectedPayer resolves to null, without blocking, when paidByPersonId is missing", () => {
    var result = resolveEntryEditInitialization(
      buildDeployedPayerAccountClassItem({ paidByPersonId: undefined }),
      buildFullLists(),
    );

    expect(result).not.toBeNull();
    expect(result.selectedPayer).toBeNull();
  });

  it("all four stable ids and prizeRecipientName fall back to null/empty when explicitly null, without blocking", () => {
    var result = resolveEntryEditInitialization(
      buildDeployedPayerAccountClassItem({
        classInCompId: null,
        riderFederationMemberId: null,
        coachFederationMemberId: null,
        paidByPersonId: null,
        prizeRecipientName: null,
      }),
      buildFullLists(),
    );

    expect(result).not.toBeNull();
    expect(result.selectedClass).toBeNull();
    expect(result.selectedRider).toBeNull();
    expect(result.selectedTrainer).toBeNull();
    expect(result.selectedPayer).toBeNull();
    expect(result.prizeRecipientName).toBe("");
  });

  it("does not mutate the source payer-account class item", () => {
    var item = buildDeployedPayerAccountClassItem();
    var itemCopy = Object.assign({}, item);

    resolveEntryEditInitialization(item, buildFullLists());

    expect(item).toEqual(itemCopy);
  });
});
