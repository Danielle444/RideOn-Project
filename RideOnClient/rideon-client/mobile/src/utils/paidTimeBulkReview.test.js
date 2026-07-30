import { describe, it, expect } from "vitest";
import {
  buildBulkReviewModel,
  buildSelectionSummary,
  orderSelectedHorses,
  findCatalogItemById,
  formatDurationLabel,
  formatPriceLabel,
  formatHorseLabel,
  getStepTitle,
} from "./paidTimeBulkReview.js";

var SHORT = {
  priceCatalogId: 101,
  productName: "פייד טיים קצר",
  durationMinutes: 7,
  itemPrice: 100,
};

var LONG = {
  priceCatalogId: 102,
  productName: "פייד טיים ארוך",
  durationMinutes: 10,
  itemPrice: 150,
};

function context(overrides) {
  var base = {
    coachesWithHorses: [
      {
        coachFederationMemberId: 7,
        coachName: "יואב כהן",
        horses: [
          { horseId: 1, horseName: "ברק", barnName: "אורווה א" },
          { horseId: 2, horseName: "סופה", barnName: "" },
          { horseId: 3, horseName: "רוח", barnName: "" },
        ],
      },
      {
        coachFederationMemberId: 8,
        coachName: "דנה לוי",
        horses: [{ horseId: 4, horseName: "אביב", barnName: "" }],
      },
    ],
    entryLookup: {
      "7-1": {
        riderFederationMemberId: 51,
        riderName: "נועה",
        paidByPersonId: 91,
        payerName: "רונית",
      },
      "7-2": {
        riderFederationMemberId: 52,
        riderName: "עומר",
        paidByPersonId: 92,
        payerName: "אבי",
      },
      "7-3": {
        riderFederationMemberId: null,
        riderName: "",
        paidByPersonId: null,
        payerName: "",
      },
      "8-4": {
        riderFederationMemberId: 54,
        riderName: "תמר",
        paidByPersonId: 94,
        payerName: "גיל",
      },
    },
    arenas: [{ key: "1-5", arenaName: "מגרש ראשי" }],
    slotsByDay: { "2026-08-14": [{ paidTimeSlotInCompId: 900 }] },
    priceCatalog: { short: SHORT, long: LONG, all: [SHORT, LONG] },
  };

  return Object.assign(base, overrides || {});
}

function answers(overrides) {
  var base = {
    selectedCoachIds: [7],
    day: "2026-08-14",
    arenaKey: "1-5",
    horsesPerCoach: { 7: [1, 2] },
    shortLong: { 1: "short", 2: "long" },
    trainingOrder: {},
    riderPerHorse: {},
    payerPerHorse: {},
    notesPerHorse: {},
  };

  return Object.assign(base, overrides || {});
}

function item(coachId, horseId, priceCatalogId) {
  return {
    horseId: horseId,
    riderFederationMemberId: 51,
    coachFederationMemberId: coachId,
    paidByPersonId: 91,
    priceCatalogId: priceCatalogId,
    requestedCompSlotId: 900,
    notes: null,
  };
}

describe("one coach with several horses", () => {
  it("keeps every selected horse under the single chosen coach", () => {
    var model = buildBulkReviewModel({
      answers: answers({ horsesPerCoach: { 7: [1, 2, 3] } }),
      context: context(),
      items: [item(7, 1, 101), item(7, 2, 102), item(7, 3, 101)],
    });

    expect(model.coaches).toHaveLength(1);
    expect(model.coaches[0].coachName).toBe("יואב כהן");
    expect(model.coaches[0].horses.map((h) => h.horseId)).toEqual([1, 2, 3]);
    expect(model.coaches[0].selectedCount).toBe(3);
  });

  it("removing one horse preserves the others", () => {
    var full = answers({ horsesPerCoach: { 7: [1, 2, 3] } });
    var afterRemoval = answers({ horsesPerCoach: { 7: [1, 3] } });

    var model = buildBulkReviewModel({
      answers: afterRemoval,
      context: context(),
      items: [item(7, 1, 101), item(7, 3, 101)],
    });

    expect(full.horsesPerCoach[7]).toEqual([1, 2, 3]);
    expect(model.coaches[0].horses.map((h) => h.horseId)).toEqual([1, 3]);
    expect(model.requestCount).toBe(2);
  });

  it("supports several coaches each holding their own horses", () => {
    var model = buildBulkReviewModel({
      answers: answers({
        selectedCoachIds: [7, 8],
        horsesPerCoach: { 7: [1, 2], 8: [4] },
      }),
      context: context(),
      items: [item(7, 1, 101), item(7, 2, 102), item(8, 4, 101)],
    });

    expect(model.coaches).toHaveLength(2);
    expect(model.coaches[0].includedCount).toBe(2);
    expect(model.coaches[1].includedCount).toBe(1);
    expect(model.requestCount).toBe(3);
  });
});

describe("per-horse completion status", () => {
  it("marks a horse included when an item exists for it", () => {
    var model = buildBulkReviewModel({
      answers: answers(),
      context: context(),
      items: [item(7, 1, 101), item(7, 2, 102)],
    });

    var horses = model.coaches[0].horses;
    expect(horses[0].isIncluded).toBe(true);
    expect(horses[0].missingReasons).toEqual([]);
    expect(model.excludedCount).toBe(0);
  });

  it("explains why a selected horse produces no request", () => {
    // סוס 3 נבחר אבל אין לו רוכב/משלם ב-entryLookup, ולכן buildItems מדלגת עליו.
    var model = buildBulkReviewModel({
      answers: answers({ horsesPerCoach: { 7: [1, 3] } }),
      context: context(),
      items: [item(7, 1, 101)],
    });

    var horses = model.coaches[0].horses;
    var excluded = horses.find((h) => h.horseId === 3);

    expect(excluded.isIncluded).toBe(false);
    expect(excluded.missingReasons).toContain("רוכב");
    expect(excluded.missingReasons).toContain("משלם");
    expect(model.excludedCount).toBe(1);
    expect(model.requestCount).toBe(1);
  });

  it("surfaces rider and payer inherited from the entry lookup", () => {
    var model = buildBulkReviewModel({
      answers: answers(),
      context: context(),
      items: [item(7, 1, 101), item(7, 2, 102)],
    });

    expect(model.coaches[0].horses[0].riderName).toBe("נועה");
    expect(model.coaches[0].horses[0].payerName).toBe("רונית");
  });
});

describe("request count and totals", () => {
  it("request count always equals the number of items actually sent", () => {
    var items = [item(7, 1, 101), item(7, 2, 102)];

    var model = buildBulkReviewModel({
      answers: answers({ horsesPerCoach: { 7: [1, 2, 3] } }),
      context: context(),
      items: items,
    });

    expect(model.requestCount).toBe(items.length);
  });

  it("totals the price from the existing catalog only", () => {
    var model = buildBulkReviewModel({
      answers: answers(),
      context: context(),
      items: [item(7, 1, 101), item(7, 2, 102)],
    });

    expect(model.totalPrice).toBe(250);
    expect(model.totalPriceLabel).toBe("250 ₪");
    expect(model.coaches[0].horses[0].priceLabel).toBe("100 ₪");
    expect(model.coaches[0].horses[1].priceLabel).toBe("150 ₪");
  });

  it("reports no total when a price is missing rather than inventing one", () => {
    var noPrice = { priceCatalogId: 103, productName: "ללא מחיר", durationMinutes: 7, itemPrice: null };

    var model = buildBulkReviewModel({
      answers: answers(),
      context: context({ priceCatalog: { short: noPrice, long: LONG, all: [noPrice, LONG] } }),
      items: [item(7, 1, 103)],
    });

    expect(model.totalPrice).toBeNull();
    expect(model.totalPriceLabel).toBe("");
  });

  it("uses the price catalog id that the item actually carries", () => {
    var model = buildBulkReviewModel({
      answers: answers({ shortLong: { 1: "short" } }),
      context: context(),
      items: [item(7, 1, 102)],
    });

    expect(model.coaches[0].horses[0].priceLabel).toBe("150 ₪");
    expect(model.coaches[0].horses[0].durationLabel).toBe("10 דק׳");
  });

  it("renders a missing duration as empty rather than as text", () => {
    var noDuration = { priceCatalogId: 104, productName: "בלי משך", durationMinutes: null, itemPrice: 90 };

    var model = buildBulkReviewModel({
      answers: answers({ horsesPerCoach: { 7: [1] } }),
      context: context({ priceCatalog: { short: noDuration, long: LONG, all: [noDuration, LONG] } }),
      items: [item(7, 1, 104)],
    });

    expect(model.coaches[0].horses[0].durationLabel).toBe("");
    expect(JSON.stringify(model)).not.toContain("null דק");
  });
});

describe("orderSelectedHorses", () => {
  var coach = context().coachesWithHorses[0];

  it("honours a complete training order", () => {
    var ordered = orderSelectedHorses(coach, { 7: [1, 2, 3] }, { 7: [3, 1, 2] });
    expect(ordered.map((h) => h.horseId)).toEqual([3, 1, 2]);
  });

  it("falls back to selection order when the order is incomplete", () => {
    var ordered = orderSelectedHorses(coach, { 7: [1, 2, 3] }, { 7: [3, 1] });
    expect(ordered.map((h) => h.horseId)).toEqual([1, 2, 3]);
  });

  it("returns an empty list when nothing is selected", () => {
    expect(orderSelectedHorses(coach, {}, {})).toEqual([]);
  });
});

describe("buildSelectionSummary", () => {
  it("names a single coach and counts its horses", () => {
    var summary = buildSelectionSummary({
      answers: answers({ horsesPerCoach: { 7: [1, 2, 3] } }),
      context: context(),
      requestCount: 3,
    });

    expect(summary.coachLabel).toBe("יואב כהן");
    expect(summary.coachCount).toBe(1);
    expect(summary.horseCount).toBe(3);
    expect(summary.requestCount).toBe(3);
    expect(summary.arenaName).toBe("מגרש ראשי");
  });

  it("summarises several coaches by count", () => {
    var summary = buildSelectionSummary({
      answers: answers({ selectedCoachIds: [7, 8], horsesPerCoach: { 7: [1], 8: [4] } }),
      context: context(),
      requestCount: 2,
    });

    expect(summary.coachLabel).toBe("2 מאמנים");
    expect(summary.horseCount).toBe(2);
  });

  it("ignores horses belonging to a coach that was deselected", () => {
    var summary = buildSelectionSummary({
      answers: answers({ selectedCoachIds: [7], horsesPerCoach: { 7: [1], 8: [4] } }),
      context: context(),
      requestCount: 1,
    });

    expect(summary.horseCount).toBe(1);
  });

  it("is safe with nothing selected yet", () => {
    var summary = buildSelectionSummary({});
    expect(summary.coachLabel).toBe("");
    expect(summary.horseCount).toBe(0);
  });
});

describe("formatters and lookups", () => {
  it("formats horse labels with and without a barn", () => {
    expect(formatHorseLabel({ horseName: "ברק", barnName: "אורווה א" })).toBe("ברק (אורווה א)");
    expect(formatHorseLabel({ horseName: "סופה", barnName: "" })).toBe("סופה");
    expect(formatHorseLabel(null)).toBe("");
  });

  it("never renders null duration or price as text", () => {
    expect(formatDurationLabel(null)).toBe("");
    expect(formatDurationLabel(0)).toBe("");
    expect(formatPriceLabel(null)).toBe("");
    expect(formatPriceLabel(undefined)).toBe("");
  });

  it("finds a catalog item by the id carried on the item", () => {
    expect(findCatalogItemById(context(), 102).productName).toBe("פייד טיים ארוך");
    expect(findCatalogItemById(context(), 999)).toBeNull();
    expect(findCatalogItemById({}, 101)).toBeNull();
  });

  it("names every step in the flow", () => {
    expect(getStepTitle("coaches")).toBe("בחירת מאמנים");
    expect(getStepTitle("horses")).toBe("בחירת סוסים");
    expect(getStepTitle("summary")).toBe("סיכום ושליחה");
    expect(getStepTitle("nope")).toBe("");
  });
});

describe("model is defensive", () => {
  it("does not throw on an empty context", () => {
    var model = buildBulkReviewModel({});
    expect(model.coaches).toEqual([]);
    expect(model.requestCount).toBe(0);
  });
});
