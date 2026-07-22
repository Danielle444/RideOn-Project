import { describe, it, expect } from "vitest";
import {
  getEntryBandForClass,
  getClassCost,
  getClassCostParts,
  deriveUniqueHorses,
  clampHorseStalls,
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

// DK config (ranch 11) as the financial-config proc returns it, tack ratio 4-5.
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
  tackHorsesPerUnitMin: 4,
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
  tackHorsesPerUnitMin: 4,
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

describe("getClassCostParts / getClassCost", () => {
  it("splits organizer and federation cost", () => {
    expect(getClassCostParts(classRow(1, "d", 100, 50))).toMatchObject({
      organizer: 100,
      federation: 50,
      missing: false,
    });
  });

  it("treats a present 0 as a real cost, not missing", () => {
    expect(getClassCostParts(classRow(1, "d", 0, 0)).missing).toBe(false);
  });

  it("is missing only when BOTH costs are absent", () => {
    expect(getClassCostParts(classRow(1, "d", null, null)).missing).toBe(true);
    expect(getClassCostParts(classRow(1, "d", 120, null)).missing).toBe(false);
  });

  it("getClassCost returns the combined total, or null when both absent", () => {
    expect(getClassCost(classRow(1, "d", 100, 50))).toBe(150);
    expect(getClassCost(classRow(1, "d", null, null))).toBeNull();
  });
});

describe("deriveHorseDays (entries -> per-day horses)", () => {
  it("reining N=1: a day of 10 entries is 10 horses", () => {
    expect(deriveHorseDays([{ day: "d1", lo: 10, hi: 10 }], 1)).toEqual({
      horseDaysLo: 10,
      horseDaysHi: 10,
    });
  });

  it("cutting N=3: a day of 10 entries is ceil(10/3)=4 horses", () => {
    expect(deriveHorseDays([{ day: "d1", lo: 10, hi: 10 }], 3)).toEqual({
      horseDaysLo: 4,
      horseDaysHi: 4,
    });
  });

  it("sums ceil per day, not to the total", () => {
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
});

describe("clampHorseStalls (capacity clamp)", () => {
  it("clamps at total supply and raises atCapacity when demand exceeds it", () => {
    expect(clampHorseStalls(50, 250, 189)).toEqual({
      stallsLo: 50,
      stallsHi: 189,
      atCapacity: true,
    });
  });

  it("does not flag atCapacity within supply", () => {
    expect(clampHorseStalls(10, 20, 189)).toEqual({
      stallsLo: 10,
      stallsHi: 20,
      atCapacity: false,
    });
  });

  it("zero supply (ranch 49) does not clamp and never flags atCapacity", () => {
    expect(clampHorseStalls(10, 20, 0)).toEqual({
      stallsLo: 10,
      stallsHi: 20,
      atCapacity: false,
    });
  });
});

describe("deriveTackStalls (ratio 4-5)", () => {
  it("12 horses at ratio 4-5: [floor(12/5)=2, ceil(12/4)=3]", () => {
    expect(deriveTackStalls(12, 12, 4, 5)).toEqual({ tackLo: 2, tackHi: 3 });
  });

  it("defaults to 4/5 when the ratio config is absent", () => {
    expect(deriveTackStalls(12, 12, null, null)).toEqual({ tackLo: 2, tackHi: 3 });
  });
});

describe("deriveFinancialProjection (integration)", () => {
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

  var allPredicted = predictor({
    1: prediction(10, 2),
    2: prediction(10, 2),
    3: prediction(10, 2),
    4: prediction(10, 2),
  });

  it("entry income is split into organizer and federation bands", () => {
    var result = deriveFinancialProjection(dkReiningClasses(), allPredicted, DK_CONFIG);

    // lo entries 8*4=32, hi 12*4=48. org cost 100 -> [3200, 4800]; fed cost 50 -> [1600, 2400].
    expect(result.entry.organizerLo).toBe(3200);
    expect(result.entry.organizerHi).toBe(4800);
    expect(result.entry.federationLo).toBe(1600);
    expect(result.entry.federationHi).toBe(2400);
    expect(result.entry.unpredictedCount).toBe(0);
    expect(result.entry.pricesMissingCount).toBe(0);
  });

  it("derives unique horses and clamped stalls (zero real entries case)", () => {
    var result = deriveFinancialProjection(dkReiningClasses(), predictor({
      1: prediction(10),
      2: prediction(10),
      3: prediction(10),
      4: prediction(10),
    }), DK_CONFIG);

    // N=1 -> 10 horses/day; 4 days -> 40 horse-days. D=4: uniqueLo=10, uniqueHi=14.
    expect(result.horses.uniqueLo).toBe(10);
    expect(result.horses.uniqueHi).toBe(14);
    expect(result.stall.available).toBe(true);
  });

  it("stall income prices every stall at the average of regular and VIP (+ tack at regular)", () => {
    var result = deriveFinancialProjection(dkReiningClasses(), allPredicted, DK_CONFIG);

    // uniqueLo=8, uniqueHi=16 (bands 8..12/day, HD 32..48, /4 and /3).
    // avg stall price (150+200)/2 = 175. tack: floor(8/5)=1, ceil(16/4)=4.
    // lo = 8*175 + 1*150 = 1550 ; hi = 16*175 + 4*150 = 3400.
    expect(result.stall.stallsLo).toBe(8);
    expect(result.stall.stallsHi).toBe(16);
    expect(result.stall.tackLo).toBe(1);
    expect(result.stall.tackHi).toBe(4);
    expect(result.stall.lo).toBe(1550);
    expect(result.stall.hi).toBe(3400);
  });

  it("bags use an average 2.5 per stall; shavings income uses the average price (45)", () => {
    var result = deriveFinancialProjection(dkReiningClasses(), allPredicted, DK_CONFIG);

    // stalls 8..16, bags 2.5/stall -> 20..40. avg shavings price (40+50)/2 = 45.
    expect(result.shavings.bagsLo).toBe(20);
    expect(result.shavings.bagsHi).toBe(40);
    expect(result.shavings.ambiguous).toBe(true); // 2 active products still flagged
    expect(result.shavings.lo).toBe(900);
    expect(result.shavings.hi).toBe(1800);
  });

  it("one active shavings product -> average equals that single price", () => {
    var config = Object.assign({}, DK_CONFIG, {
      shavingsPriceMin: 45,
      shavingsPriceMax: 45,
      shavingsActiveCount: 1,
    });
    var result = deriveFinancialProjection(dkReiningClasses(), allPredicted, config);

    expect(result.shavings.ambiguous).toBe(false);
    expect(result.shavings.lo).toBe(result.shavings.bagsLo * 45);
    expect(result.shavings.hi).toBe(result.shavings.bagsHi * 45);
  });

  it("counts unpredicted classes and omits them", () => {
    var result = deriveFinancialProjection(
      dkReiningClasses(),
      predictor({ 1: prediction(10), 2: prediction(10) }),
      DK_CONFIG,
    );

    expect(result.entry.unpredictedCount).toBe(2);
    expect(result.entry.predictedClassCount).toBe(2);
  });

  it("NULL-cost class contributes 0 and raises pricesMissingCount", () => {
    var classes = [
      classRow(1, "2026-07-28", 100, 50),
      classRow(2, "2026-07-28", null, null),
    ];
    var result = deriveFinancialProjection(
      classes,
      predictor({ 1: prediction(10, 0), 2: prediction(10, 0) }),
      DK_CONFIG,
    );

    expect(result.entry.pricesMissingCount).toBe(1);
    expect(result.entry.organizerLo).toBe(1000); // only class 1: 10*100
    expect(result.entry.federationLo).toBe(500); // 10*50
  });

  it("ranch 49: stall + shavings income show the prompt (never 0), entry bands render", () => {
    var result = deriveFinancialProjection(dkReiningClasses(), allPredicted, RANCH49_CONFIG);

    expect(result.entry.available).toBe(true);
    expect(result.entry.organizerLo).toBe(3200);

    expect(result.stall.available).toBe(false);
    expect(result.stall.reason).toBe("noPrice");
    expect(result.stall.lo).toBeUndefined();

    expect(result.shavings.incomeAvailable).toBe(false);
    expect(result.shavings.reason).toBe("noPrice");
    expect(result.shavings.lo).toBeUndefined();

    expect(result.shavings.bagsAvailable).toBe(true);
  });

  it("present-but-zero stall price renders a real 0, not the prompt", () => {
    var config = Object.assign({}, DK_CONFIG, {
      stallRegularPrice: 0,
      stallUpgradedPrice: 0,
    });
    var result = deriveFinancialProjection(dkReiningClasses(), allPredicted, config);

    expect(result.stall.available).toBe(true);
    expect(result.stall.lo).toBe(0);
    expect(result.stall.hi).toBe(0);
  });

  it("no financial config yet -> entry bands render, stall/shavings unavailable", () => {
    var result = deriveFinancialProjection(dkReiningClasses(), allPredicted, null);

    expect(result.entry.organizerLo).toBe(3200);
    expect(result.stall.available).toBe(false);
    expect(result.shavings.incomeAvailable).toBe(false);
  });
});
