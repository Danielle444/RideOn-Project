import { describe, it, expect } from "vitest";
import {
  getEntryBandForClass,
  getClassCost,
  deriveUniqueHorses,
  deriveStallTiers,
  deriveTackStalls,
  deriveHorseDays,
  deriveFinancialProjection,
} from "./financialProjection.utils.js";

// A prediction as the Phase 6 /predictions endpoint returns it: point + band of +/- RMSE, the
// low endpoint already clamped at 0 server-side.
function prediction(predicted, rmse) {
  var spread = rmse === undefined ? 0 : rmse;

  return {
    predictedEntries: predicted,
    minPredictedEntries: Math.max(predicted - spread, 0),
    maxPredictedEntries: predicted + spread,
  };
}

function classRow(id, day, organizerCost, federationCost) {
  return {
    classInCompId: id,
    classDateTime: day + "T00:00:00Z",
    organizerCost: organizerCost,
    federationCost: federationCost,
  };
}

// DK config (ranch 11) as the financial-config proc returns it.
var DK_CONFIG = {
  ranchId: 11,
  competitionDays: 4,
  fieldId: 1,
  maxHorseClassesPerDay: 1,
  stallRegularPrice: 150,
  stallUpgradedPrice: 200,
  stallRegularSupply: 128,
  stallUpgradedSupply: 61,
  shavingsPriceMin: 40,
  shavingsPriceMax: 50,
  shavingsActiveCount: 2,
  shavingsBagsMin: 2,
  shavingsBagsMax: 3,
  tackHorsesPerUnitMin: 3,
  tackHorsesPerUnitMax: 5,
};

// Ranch 49 (Green Fields): zero pricecatalog rows, zero stalls.
var RANCH49_CONFIG = {
  ranchId: 49,
  competitionDays: 4,
  fieldId: 1,
  maxHorseClassesPerDay: 1,
  stallRegularPrice: null,
  stallUpgradedPrice: null,
  stallRegularSupply: 0,
  stallUpgradedSupply: 0,
  shavingsPriceMin: null,
  shavingsPriceMax: null,
  shavingsActiveCount: 0,
  shavingsBagsMin: 2,
  shavingsBagsMax: 3,
  tackHorsesPerUnitMin: 3,
  tackHorsesPerUnitMax: 5,
};

describe("getEntryBandForClass", () => {
  it("reuses the prediction band verbatim", () => {
    expect(getEntryBandForClass(prediction(10, 3))).toEqual({ lo: 7, hi: 13 });
  });

  it("clamps the low endpoint at 0 (matches server clamp)", () => {
    expect(getEntryBandForClass(prediction(2, 3))).toEqual({ lo: 0, hi: 5 });
  });

  it("collapses to the point when the prediction carries no band", () => {
    expect(getEntryBandForClass({ predictedEntries: 8 })).toEqual({ lo: 8, hi: 8 });
  });

  it("returns null when there is no prediction row (class is unpredicted, not zero)", () => {
    expect(getEntryBandForClass(null)).toBeNull();
  });
});

describe("getClassCost", () => {
  it("sums organizer and federation cost", () => {
    expect(getClassCost(classRow(1, "2026-07-28", 100, 50))).toBe(150);
  });

  it("treats a present 0 as a real cost, not missing", () => {
    expect(getClassCost(classRow(1, "2026-07-28", 0, 0))).toBe(0);
  });

  it("returns null only when BOTH costs are absent", () => {
    expect(getClassCost(classRow(1, "2026-07-28", null, null))).toBeNull();
  });

  it("uses the present side when only one cost is absent", () => {
    expect(getClassCost(classRow(1, "2026-07-28", 120, null))).toBe(120);
  });
});

describe("deriveHorseDays (entries -> per-day horses)", () => {
  it("reining N=1: a day of 10 entries is 10 horses", () => {
    var bands = [{ day: "d1", lo: 10, hi: 10 }];
    expect(deriveHorseDays(bands, 1)).toEqual({ horseDaysLo: 10, horseDaysHi: 10 });
  });

  it("cutting N=3: a day of 10 entries is ceil(10/3)=4 horses", () => {
    var bands = [{ day: "d1", lo: 10, hi: 10 }];
    expect(deriveHorseDays(bands, 3)).toEqual({ horseDaysLo: 4, horseDaysHi: 4 });
  });

  it("sums ceil per day across days (ceil is applied per day, not to the total)", () => {
    // Two days of 10 entries each at N=3: ceil(10/3)+ceil(10/3) = 4+4 = 8, not ceil(20/3)=7.
    var bands = [
      { day: "d1", lo: 10, hi: 10 },
      { day: "d2", lo: 10, hi: 10 },
    ];
    expect(deriveHorseDays(bands, 3)).toEqual({ horseDaysLo: 8, horseDaysHi: 8 });
  });

  it("returns null when the field has no horse cap", () => {
    expect(deriveHorseDays([{ day: "d1", lo: 5, hi: 5 }], null)).toBeNull();
  });
});

describe("deriveUniqueHorses (horse-days -> unique competition horses)", () => {
  it("3-day: uniqueLo=ceil(30/3)=10, uniqueHi=ceil(45/2)=23", () => {
    expect(deriveUniqueHorses(30, 45, 3)).toEqual({ uniqueLo: 10, uniqueHi: 23 });
  });

  it("single-day: band collapses to the day's horse band, no division by D-1", () => {
    expect(deriveUniqueHorses(12, 18, 1)).toEqual({ uniqueLo: 12, uniqueHi: 18 });
  });

  it("2-day: uniqueHi divides by D-1=1, so equals horse-days high", () => {
    expect(deriveUniqueHorses(20, 30, 2)).toEqual({ uniqueLo: 10, uniqueHi: 30 });
  });
});

describe("deriveStallTiers (tier split + capacity clamp)", () => {
  it("fills regular-first for the low endpoint, upgraded-first for the high", () => {
    // uniqueLo=140: reg 128 + upg 12. uniqueHi=140: upg 61 + reg 79.
    var tiers = deriveStallTiers(140, 140, 128, 61);
    expect(tiers.regLo).toBe(128);
    expect(tiers.upgLo).toBe(12);
    expect(tiers.upgHi).toBe(61);
    expect(tiers.regHi).toBe(79);
  });

  it("clamps at total supply and raises atCapacity when demand exceeds it", () => {
    var tiers = deriveStallTiers(50, 250, 128, 61);
    expect(tiers.upgHi).toBe(61);
    expect(tiers.regHi).toBe(128); // 250-61=189 clamped to 128
    expect(tiers.atCapacity).toBe(true);
  });

  it("does not flag atCapacity within supply", () => {
    expect(deriveStallTiers(10, 20, 128, 61).atCapacity).toBe(false);
  });

  it("zero supply (ranch 49) yields zero stalls in both tiers, no false atCapacity", () => {
    var tiers = deriveStallTiers(10, 20, 0, 0);
    expect(tiers).toMatchObject({ regLo: 0, upgLo: 0, regHi: 0, upgHi: 0, atCapacity: false });
  });
});

describe("deriveTackStalls", () => {
  it("12 horses at ratio 3-5: [floor(12/5)=2, ceil(12/3)=4]", () => {
    expect(deriveTackStalls(12, 12, 3, 5)).toEqual({ tackLo: 2, tackHi: 4 });
  });

  it("defaults to 3/5 when the ratio config is absent", () => {
    expect(deriveTackStalls(12, 12, null, null)).toEqual({ tackLo: 2, tackHi: 4 });
  });
});

describe("deriveFinancialProjection (integration over the I/O matrix)", () => {
  // A DK reining competition: 4 days, one class per day, each predicted 10 +/- 0 for clean math.
  function dkReiningClasses() {
    return [
      classRow(1, "2026-07-28", 100, 50),
      classRow(2, "2026-07-29", 100, 50),
      classRow(3, "2026-07-30", 100, 50),
      classRow(4, "2026-07-31", 100, 50),
    ];
  }

  function predictor(map) {
    return function (item) {
      return map[item.classInCompId] || null;
    };
  }

  it("entry income band = sum of entry-band x cost", () => {
    var classes = dkReiningClasses();
    var preds = predictor({
      1: prediction(10, 2),
      2: prediction(10, 2),
      3: prediction(10, 2),
      4: prediction(10, 2),
    });

    var result = deriveFinancialProjection(classes, preds, DK_CONFIG);

    // cost = 150 each. lo entries 8*4=32 -> 32*150=4800; hi 12*4=48 -> 48*150=7200.
    expect(result.entry.lo).toBe(4800);
    expect(result.entry.hi).toBe(7200);
    expect(result.entry.unpredictedCount).toBe(0);
    expect(result.entry.pricesMissingCount).toBe(0);
  });

  it("zero real entries but predictions exist -> full projection still renders", () => {
    var classes = dkReiningClasses();
    var preds = predictor({
      1: prediction(10),
      2: prediction(10),
      3: prediction(10),
      4: prediction(10),
    });

    var result = deriveFinancialProjection(classes, preds, DK_CONFIG);

    // N=1 so each day = 10 horses; 4 days -> horse-days 40. D=4: uniqueLo=ceil(40/4)=10,
    // uniqueHi=ceil(40/3)=14.
    expect(result.horses.horseDaysLo).toBe(40);
    expect(result.horses.uniqueLo).toBe(10);
    expect(result.horses.uniqueHi).toBe(14);
    expect(result.stall.available).toBe(true);
    expect(result.shavings.bagsAvailable).toBe(true);
  });

  it("counts unpredicted classes and omits them from the projection", () => {
    var classes = dkReiningClasses();
    var preds = predictor({ 1: prediction(10), 2: prediction(10) }); // 3 and 4 unpredicted

    var result = deriveFinancialProjection(classes, preds, DK_CONFIG);

    expect(result.entry.unpredictedCount).toBe(2);
    expect(result.entry.predictedClassCount).toBe(2);
  });

  it("NULL-cost class contributes 0 to entry income and raises pricesMissingCount", () => {
    var classes = [
      classRow(1, "2026-07-28", 100, 50),
      classRow(2, "2026-07-28", null, null),
    ];
    var preds = predictor({ 1: prediction(10, 0), 2: prediction(10, 0) });

    var result = deriveFinancialProjection(classes, preds, DK_CONFIG);

    expect(result.entry.pricesMissingCount).toBe(1);
    expect(result.entry.lo).toBe(1500); // only class 1: 10*150
  });

  it("stall income uses cheapest-first fill at the low endpoint", () => {
    // Force uniqueLo=uniqueHi=140 via a single-day competition with 140 predicted entries, N=1.
    var config = Object.assign({}, DK_CONFIG, { competitionDays: 1 });
    var classes = [classRow(1, "2026-07-28", 0, 0)];
    var preds = predictor({ 1: prediction(140, 0) });

    var result = deriveFinancialProjection(classes, preds, config);

    expect(result.horses.uniqueLo).toBe(140);
    // reg 128 @150 + upg 12 @200 + tack floor(140/5)=28 @150 = 19200 + 2400 + 4200 = 25800.
    expect(result.stall.regLo).toBe(128);
    expect(result.stall.upgLo).toBe(12);
    expect(result.stall.tackLo).toBe(28);
    expect(result.stall.lo).toBe(25800);
    expect(result.stall.atCapacity).toBe(false);
  });

  it("two active shavings products -> band spans both prices and flags ambiguity", () => {
    var classes = dkReiningClasses();
    var preds = predictor({
      1: prediction(10),
      2: prediction(10),
      3: prediction(10),
      4: prediction(10),
    });

    var result = deriveFinancialProjection(classes, preds, DK_CONFIG);

    expect(result.shavings.ambiguous).toBe(true);
    expect(result.shavings.incomeAvailable).toBe(true);
    // uniqueLo=10 -> reg 10 @ bags 2 = 20 bags -> 20*40=800.
    // uniqueHi=14 -> reg 14 @ bags 3 = 42 bags -> 42*50=2100.
    expect(result.shavings.bagsLo).toBe(20);
    expect(result.shavings.bagsHi).toBe(42);
    expect(result.shavings.lo).toBe(800);
    expect(result.shavings.hi).toBe(2100);
  });

  it("one active shavings product -> band from bag count alone (min=max)", () => {
    var config = Object.assign({}, DK_CONFIG, {
      shavingsPriceMin: 45,
      shavingsPriceMax: 45,
      shavingsActiveCount: 1,
    });
    var classes = dkReiningClasses();
    var preds = predictor({
      1: prediction(10),
      2: prediction(10),
      3: prediction(10),
      4: prediction(10),
    });

    var result = deriveFinancialProjection(classes, preds, config);

    expect(result.shavings.ambiguous).toBe(false);
    expect(result.shavings.lo).toBe(result.shavings.bagsLo * 45);
    expect(result.shavings.hi).toBe(result.shavings.bagsHi * 45);
  });

  it("ranch 49: stall + shavings income show the prompt (never 0), entry band renders", () => {
    var classes = dkReiningClasses();
    var preds = predictor({
      1: prediction(10, 2),
      2: prediction(10, 2),
      3: prediction(10, 2),
      4: prediction(10, 2),
    });

    var result = deriveFinancialProjection(classes, preds, RANCH49_CONFIG);

    // Entry income is ranch-independent and still renders.
    expect(result.entry.available).toBe(true);
    expect(result.entry.lo).toBe(4800);

    // No active price -> prompt, and crucially no `lo`/`hi` money value of 0.
    expect(result.stall.available).toBe(false);
    expect(result.stall.reason).toBe("noPrice");
    expect(result.stall.lo).toBeUndefined();

    expect(result.shavings.incomeAvailable).toBe(false);
    expect(result.shavings.reason).toBe("noPrice");
    expect(result.shavings.lo).toBeUndefined();

    // The bag-order quantity still shows (ordering does not need a price). Ranch 49 has 0
    // stalls, so the placeable-stall count is 0 -> 0 bags, consistent with "no stalls set up".
    expect(result.shavings.bagsAvailable).toBe(true);
  });

  it("present-but-zero stall price renders a real 0, not the prompt", () => {
    var config = Object.assign({}, DK_CONFIG, {
      stallRegularPrice: 0,
      stallUpgradedPrice: 0,
    });
    var classes = dkReiningClasses();
    var preds = predictor({
      1: prediction(10),
      2: prediction(10),
      3: prediction(10),
      4: prediction(10),
    });

    var result = deriveFinancialProjection(classes, preds, config);

    expect(result.stall.available).toBe(true);
    expect(result.stall.lo).toBe(0);
    expect(result.stall.hi).toBe(0);
  });

  it("no financial config yet -> entry band renders, stall/shavings marked unavailable", () => {
    var classes = dkReiningClasses();
    var preds = predictor({
      1: prediction(10, 2),
      2: prediction(10, 2),
      3: prediction(10, 2),
      4: prediction(10, 2),
    });

    var result = deriveFinancialProjection(classes, preds, null);

    expect(result.entry.lo).toBe(4800);
    expect(result.stall.available).toBe(false);
    expect(result.shavings.incomeAvailable).toBe(false);
  });
});
