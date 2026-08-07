import { describe, it, expect } from "vitest";

import {
  getCompoundId,
  readAssignmentFields,
  resolveIsMine,
  buildAssignmentsByCompoundAndStall,
  buildMineCountByCompoundId,
  resolveInitialCompoundId,
} from "./stallMapViewer";

// Mobile stall-map slice 1, corrected (2026-08-07). Real behavioral coverage
// for the pure viewer logic behind the shared StallMapModal grid: assignment
// indexing (CompoundId + StallNumber, never StallNumber alone), the two
// viewer modes for "isMine" (RanchAdmin by BookingRanchId - unchanged; Payer
// by TRUSTING the server-computed IsMine field returned by the redacted
// usp_GetStallAssignmentsForCompetitionPayer projection, never re-derived
// client-side), per-compound mine counts, and the default compound-selection
// priority.

function ranchAssignment(overrides) {
  // Shape of the full-detail GetAssignments row (Admin/HostSecretary only).
  return Object.assign(
    {
      assignmentId: 1,
      stallBookingId: 100,
      compoundId: 1,
      stallId: 1,
      stallNumber: "1",
      bookingRanchId: 11,
      bookingRanchName: "Double K",
      horseId: 1,
      horseName: "Horse",
      barnName: "Barn",
      isForTack: false,
      productName: "Stall",
    },
    overrides,
  );
}

function payerAssignment(overrides) {
  // Shape of the redacted payer-map row (usp_GetStallAssignmentsForCompetitionPayer):
  // no StallBookingId/BookingRanchId/BookingRanchName/ProductName/HorseId -
  // only IsMine plus HorseName/BarnName gated on it server-side.
  return Object.assign(
    {
      assignmentId: 1,
      compoundId: 1,
      stallId: 1,
      stallNumber: "1",
      isOccupied: true,
      isMine: false,
      isForTack: false,
      horseName: null,
      barnName: null,
    },
    overrides,
  );
}

describe("resolveIsMine - RanchAdmin ranch mode (default, trustServerIsMine falsy)", () => {
  it("host RanchAdmin: highlights assignments booked by the host's own ranch", () => {
    var hostAssignment = ranchAssignment({ bookingRanchId: 11 });
    var viewer = { ranchId: 11 };

    expect(resolveIsMine(hostAssignment, viewer)).toBe(true);
  });

  it("guest RanchAdmin opening the host map: only the guest's own ranch assignments highlight", () => {
    var guestOwnAssignment = ranchAssignment({ bookingRanchId: 49 });
    var hostOwnAssignment = ranchAssignment({ bookingRanchId: 11, stallBookingId: 101 });
    var viewer = { ranchId: 49 };

    expect(resolveIsMine(guestOwnAssignment, viewer)).toBe(true);
    expect(resolveIsMine(hostOwnAssignment, viewer)).toBe(false);
  });

  it("ignores any isMine field that happened to be present, staying ranch-based", () => {
    var withStrayIsMine = ranchAssignment({ bookingRanchId: 49, isMine: false });
    var viewer = { ranchId: 49 };

    expect(resolveIsMine(withStrayIsMine, viewer)).toBe(true);
  });
});

describe("resolveIsMine - Payer mode (trustServerIsMine: true)", () => {
  it("trusts the server's own IsMine field for the caller's stall", () => {
    var myStall = payerAssignment({ isMine: true, horseName: "MyHorse", barnName: "MyBarn" });
    var viewer = { trustServerIsMine: true };

    expect(resolveIsMine(myStall, viewer)).toBe(true);
  });

  it("trusts the server's own IsMine=false for another participant's stall", () => {
    var othersStall = payerAssignment({ isMine: false });
    var viewer = { trustServerIsMine: true };

    expect(resolveIsMine(othersStall, viewer)).toBe(false);
  });

  it("never falls back to ranch-based matching in payer mode, even if bookingRanchId were somehow present", () => {
    var rowWithStrayRanchId = payerAssignment({ isMine: false, bookingRanchId: 11 });
    var viewer = { trustServerIsMine: true, ranchId: 11 };

    expect(resolveIsMine(rowWithStrayRanchId, viewer)).toBe(false);
  });

  it("reads IsMine across camelCase/PascalCase wire shapes, including a real false (not coerced to absent)", () => {
    var pascalCaseMine = { IsMine: true, CompoundId: 1, StallNumber: "3" };
    var pascalCaseNotMine = { IsMine: false, CompoundId: 1, StallNumber: "4" };
    var viewer = { trustServerIsMine: true };

    expect(resolveIsMine(pascalCaseMine, viewer)).toBe(true);
    expect(resolveIsMine(pascalCaseNotMine, viewer)).toBe(false);
  });

  it("treats a missing IsMine field as not mine rather than throwing", () => {
    var rowWithoutIsMine = { compoundId: 1, stallNumber: "5" };
    var viewer = { trustServerIsMine: true };

    expect(resolveIsMine(rowWithoutIsMine, viewer)).toBe(false);
  });
});

describe("buildAssignmentsByCompoundAndStall - CompoundId + StallNumber keying", () => {
  it("keeps two compounds with the same StallNumber independent (no collision)", () => {
    var compoundOneStallOne = payerAssignment({
      compoundId: 1,
      stallNumber: "7",
      isMine: true,
      horseName: "Compound1Horse",
    });
    var compoundTwoStallOne = payerAssignment({
      compoundId: 2,
      stallNumber: "7",
      isMine: true,
      horseName: "Compound2Horse",
    });

    var viewer = { trustServerIsMine: true };
    var map = buildAssignmentsByCompoundAndStall(
      [compoundOneStallOne, compoundTwoStallOne],
      viewer,
    );

    expect(Object.keys(map)).toHaveLength(2);
    expect(map["1::7"].horseName).toBe("Compound1Horse");
    expect(map["2::7"].horseName).toBe("Compound2Horse");
  });

  it("no assignment falls into the wrong compound's lookup key", () => {
    var compoundOneStallFive = ranchAssignment({ compoundId: 1, stallNumber: "5" });
    var viewer = { ranchId: 11 };
    var map = buildAssignmentsByCompoundAndStall([compoundOneStallFive], viewer);

    expect(map["1::5"]).toBeTruthy();
    expect(map["2::5"]).toBeUndefined();
  });

  it("skips rows with no stallNumber or no compoundId rather than mis-keying them", () => {
    var noStallNumber = ranchAssignment({ stallNumber: null });
    var noCompoundId = ranchAssignment({ compoundId: null, stallNumber: "9" });
    var viewer = { ranchId: 11 };

    var map = buildAssignmentsByCompoundAndStall([noStallNumber, noCompoundId], viewer);

    expect(Object.keys(map)).toHaveLength(0);
  });

  it("never surfaces a bookingRanchId in payer mode (the redacted endpoint never sends one)", () => {
    var myStall = payerAssignment({ isMine: true });
    var viewer = { trustServerIsMine: true };
    var map = buildAssignmentsByCompoundAndStall([myStall], viewer);

    expect(map["1::1"].bookingRanchId).toBeNull();
  });

  it("forwards isForTack:true through to the map entry (ranch mode)", () => {
    var tackStall = ranchAssignment({
      isForTack: true,
      horseName: null,
      barnName: null,
    });
    var viewer = { ranchId: 11 };
    var map = buildAssignmentsByCompoundAndStall([tackStall], viewer);

    expect(map["1::1"].isForTack).toBe(true);
  });

  it("forwards isForTack:true through to the map entry (payer mode)", () => {
    var tackStall = payerAssignment({ isForTack: true, isMine: true });
    var viewer = { trustServerIsMine: true };
    var map = buildAssignmentsByCompoundAndStall([tackStall], viewer);

    expect(map["1::1"].isForTack).toBe(true);
  });

  it("keeps isForTack:false for an ordinary horse stall", () => {
    var horseStall = ranchAssignment({ isForTack: false });
    var viewer = { ranchId: 11 };
    var map = buildAssignmentsByCompoundAndStall([horseStall], viewer);

    expect(map["1::1"].isForTack).toBe(false);
  });
});

describe("buildMineCountByCompoundId - compound tab counts", () => {
  it("produces a count entry for every compound the viewer has a stall in", () => {
    var mineInCompoundOne = payerAssignment({ compoundId: 1, stallNumber: "1", isMine: true });
    var mineInCompoundTwo = payerAssignment({ compoundId: 2, stallNumber: "1", isMine: true });
    var notMineInCompoundTwo = payerAssignment({ compoundId: 2, stallNumber: "2", isMine: false });

    var viewer = { trustServerIsMine: true };
    var map = buildAssignmentsByCompoundAndStall(
      [mineInCompoundOne, mineInCompoundTwo, notMineInCompoundTwo],
      viewer,
    );
    var counts = buildMineCountByCompoundId(map);

    expect(counts["1"]).toBe(1);
    expect(counts["2"]).toBe(1);
  });

  it("never counts a non-mine assignment", () => {
    var notMine = payerAssignment({ compoundId: 1, stallNumber: "1", isMine: false });
    var viewer = { trustServerIsMine: true };
    var map = buildAssignmentsByCompoundAndStall([notMine], viewer);
    var counts = buildMineCountByCompoundId(map);

    expect(counts["1"]).toBeUndefined();
  });
});

describe("resolveInitialCompoundId - default selection priority", () => {
  var compoundA = { compoundId: 1, compoundName: "A" };
  var compoundB = { compoundId: 2, compoundName: "B" };
  var compoundC = { compoundId: 3, compoundName: "C" };

  it("(a) focusCompoundId wins when supplied and it exists among the loaded compounds", () => {
    var mineInC = payerAssignment({ compoundId: 3, stallNumber: "1", isMine: true });
    var viewer = { trustServerIsMine: true };

    var result = resolveInitialCompoundId([compoundA, compoundB, compoundC], [mineInC], 2, viewer);

    expect(result).toBe(2);
  });

  it("focusCompoundId that does not exist among the loaded compounds is ignored, falling through", () => {
    var viewer = { trustServerIsMine: true };

    var result = resolveInitialCompoundId([compoundA, compoundB], [], 999, viewer);

    expect(result).toBe(getCompoundId(compoundA));
  });

  it("(b) without a valid focusCompoundId, the first compound containing a viewer-owned stall wins", () => {
    var mineInB = payerAssignment({ compoundId: 2, stallNumber: "4", isMine: true });
    var viewer = { trustServerIsMine: true };

    var result = resolveInitialCompoundId(
      [compoundA, compoundB, compoundC],
      [mineInB],
      null,
      viewer,
    );

    expect(result).toBe(2);
  });

  it("when the viewer owns stalls in two compounds, the LOWER compoundId wins", () => {
    var mineInC = payerAssignment({ compoundId: 3, stallNumber: "1", isMine: true });
    var mineInB = payerAssignment({ compoundId: 2, stallNumber: "1", isMine: true });
    var viewer = { trustServerIsMine: true };

    var result = resolveInitialCompoundId(
      [compoundC, compoundA, compoundB],
      [mineInC, mineInB],
      null,
      viewer,
    );

    expect(result).toBe(2);
  });

  it("(c) with no focus and no viewer-owned stalls anywhere, falls back to the first compound by compoundId ascending", () => {
    var viewer = { trustServerIsMine: true };

    // Deliberately out-of-order input array -- proves the fallback sorts by
    // compoundId rather than trusting array/API order.
    var result = resolveInitialCompoundId([compoundC, compoundA, compoundB], [], null, viewer);

    expect(result).toBe(1);
  });

  it("returns null when there are no compounds at all", () => {
    var viewer = { trustServerIsMine: true };

    var result = resolveInitialCompoundId([], [], null, viewer);

    expect(result).toBeNull();
  });

  it("ranch mode (RanchAdmin) picks the compound containing the viewer's own ranch bookings, unchanged", () => {
    var mineInB = ranchAssignment({ compoundId: 2, stallNumber: "1", bookingRanchId: 11 });
    var viewer = { ranchId: 11 };

    var result = resolveInitialCompoundId([compoundA, compoundB, compoundC], [mineInB], null, viewer);

    expect(result).toBe(2);
  });
});

describe("readAssignmentFields - defensive wire-casing", () => {
  it("reads camelCase fields", () => {
    var fields = readAssignmentFields({
      stallNumber: "1",
      compoundId: 1,
      bookingRanchId: 11,
      isMine: true,
      isForTack: true,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        stallNumber: "1",
        compoundId: 1,
        bookingRanchId: 11,
        isMine: true,
        isForTack: true,
      }),
    );
  });

  it("reads PascalCase fields", () => {
    var fields = readAssignmentFields({
      StallNumber: "2",
      CompoundId: 2,
      BookingRanchId: 22,
      IsMine: false,
      IsForTack: true,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        stallNumber: "2",
        compoundId: 2,
        bookingRanchId: 22,
        isMine: false,
        isForTack: true,
      }),
    );
  });

  it("defaults isMine to null (not false) when the field is entirely absent", () => {
    var fields = readAssignmentFields({ stallNumber: "3", compoundId: 3 });

    expect(fields.isMine).toBeNull();
  });

  it("defaults isForTack to false when the field is entirely absent", () => {
    var fields = readAssignmentFields({ stallNumber: "3", compoundId: 3 });

    expect(fields.isForTack).toBe(false);
  });
});
