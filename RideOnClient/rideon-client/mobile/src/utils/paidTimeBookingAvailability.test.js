import { describe, it, expect } from "vitest";
import {
  evaluatePaidTimeBookingAvailability,
  evaluateBulkCandidatesAvailability,
  MESSAGE_NO_SLOTS,
  MESSAGE_NO_PRICES,
  MESSAGE_NO_SLOTS_AND_PRICES,
  MESSAGE_NO_CANDIDATES,
} from "./paidTimeBookingAvailability.js";

var SLOT = { paidTimeSlotInCompId: 900, slotDate: "2026-08-14" };
var PRICE = { priceCatalogId: 101, productName: "קצר", itemPrice: 100 };

describe("booking is allowed only with slots and prices", () => {
  it("allows both flows when slots and prices exist", () => {
    var result = evaluatePaidTimeBookingAvailability({
      requestableSlots: [SLOT],
      priceCatalogItems: [PRICE],
    });

    expect(result.isAvailable).toBe(true);
    expect(result.canBookBulk).toBe(true);
    expect(result.canBookSingle).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.message).toBe("");
    expect(result.hint).toBe("");
  });

  it("blocks both flows when slots are missing", () => {
    var result = evaluatePaidTimeBookingAvailability({
      requestableSlots: [],
      priceCatalogItems: [PRICE],
    });

    expect(result.canBookBulk).toBe(false);
    expect(result.canBookSingle).toBe(false);
    expect(result.missing).toEqual(["slots"]);
    expect(result.message).toBe(MESSAGE_NO_SLOTS);
  });

  it("blocks both flows when price items are missing", () => {
    var result = evaluatePaidTimeBookingAvailability({
      requestableSlots: [SLOT],
      priceCatalogItems: [],
    });

    expect(result.canBookBulk).toBe(false);
    expect(result.canBookSingle).toBe(false);
    expect(result.missing).toEqual(["prices"]);
    expect(result.message).toBe(MESSAGE_NO_PRICES);
  });

  it("names both prerequisites when both are missing", () => {
    var result = evaluatePaidTimeBookingAvailability({
      requestableSlots: [],
      priceCatalogItems: [],
    });

    expect(result.missing).toEqual(["slots", "prices"]);
    expect(result.message).toBe(MESSAGE_NO_SLOTS_AND_PRICES);
    expect(result.hint).not.toBe("");
  });

  it("single and bulk always agree - their prerequisites are identical", () => {
    var cases = [
      { requestableSlots: [SLOT], priceCatalogItems: [PRICE] },
      { requestableSlots: [], priceCatalogItems: [PRICE] },
      { requestableSlots: [SLOT], priceCatalogItems: [] },
      { requestableSlots: [], priceCatalogItems: [] },
    ];

    cases.forEach(function (input) {
      var result = evaluatePaidTimeBookingAvailability(input);
      expect(result.canBookSingle).toBe(result.canBookBulk);
    });
  });

  it("treats missing or malformed input as unavailable rather than throwing", () => {
    expect(evaluatePaidTimeBookingAvailability().isAvailable).toBe(false);
    expect(evaluatePaidTimeBookingAvailability({}).isAvailable).toBe(false);
    expect(
      evaluatePaidTimeBookingAvailability({
        requestableSlots: null,
        priceCatalogItems: undefined,
      }).isAvailable,
    ).toBe(false);
  });

  it("never invents a slot or a price to unblock the flow", () => {
    var result = evaluatePaidTimeBookingAvailability({
      requestableSlots: [],
      priceCatalogItems: [],
    });

    expect(result).not.toHaveProperty("defaultSlot");
    expect(result).not.toHaveProperty("defaultPriceCatalogItem");
    expect(Object.keys(result).sort()).toEqual([
      "canBookBulk",
      "canBookSingle",
      "hasPriceItems",
      "hasSlots",
      "hint",
      "isAvailable",
      "message",
      "missing",
    ]);
  });
});

describe("bulk also needs coach/horse candidates", () => {
  it("allows the bulk flow when a coach has at least one horse", () => {
    var result = evaluateBulkCandidatesAvailability({
      coachesWithHorses: [
        { coachFederationMemberId: 7, horses: [{ horseId: 1 }] },
      ],
    });

    expect(result.hasCandidates).toBe(true);
    expect(result.message).toBe("");
  });

  it("blocks when there are no candidates at all", () => {
    var result = evaluateBulkCandidatesAvailability({ coachesWithHorses: [] });

    expect(result.hasCandidates).toBe(false);
    expect(result.message).toBe(MESSAGE_NO_CANDIDATES);
  });

  it("blocks when every coach has an empty horse list", () => {
    var result = evaluateBulkCandidatesAvailability({
      coachesWithHorses: [
        { coachFederationMemberId: 7, horses: [] },
        { coachFederationMemberId: 8, horses: [] },
      ],
    });

    expect(result.hasCandidates).toBe(false);
  });

  it("is safe with no context yet", () => {
    expect(evaluateBulkCandidatesAvailability(null).hasCandidates).toBe(false);
    expect(evaluateBulkCandidatesAvailability({}).hasCandidates).toBe(false);
  });
});

describe("messages", () => {
  it("are specific about what is missing", () => {
    expect(MESSAGE_NO_SLOTS).toContain("סלוטים");
    expect(MESSAGE_NO_SLOTS).not.toContain("מחיר");

    expect(MESSAGE_NO_PRICES).toContain("מחירי");
    expect(MESSAGE_NO_PRICES).not.toContain("סלוטים");

    expect(MESSAGE_NO_SLOTS_AND_PRICES).toContain("סלוטים");
    expect(MESSAGE_NO_SLOTS_AND_PRICES).toContain("מחירים");
  });
});
