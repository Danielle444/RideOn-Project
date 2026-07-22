// Read-time income projection for the secretary's financial view (Smart Element Phase 8).
// Pure functions only -- nothing here is stored, every number is recomputed on read, exactly
// as the entry-prediction band (predicted +/- RMSE) already is. The analogue of
// classSchedule.utils.js for money.
//
// The chain, consumed top to bottom:
//
//   predicted entries -> per-day horses -> horse-days -> unique competition horses
//                     -> stalls (+ tack) -> shavings bags -> income
//
// THREE SEPARATE, INDEPENDENTLY-LABELLED RANGES -- entry income, stall income, shavings income
// -- each with its own assumption and its own width. A tight entry band beside a wide stall
// band is the honesty, not a defect. They degrade independently: entry income is
// ranch-independent (costs live on the class) and always renders; stall and shavings need the
// ranch's config and degrade to a "set your prices" prompt when it is absent.
//
// TWO PRICING WORLDS, never conflated:
//   * Entry income  = classincompetition.organizercost + federationcost (per class).
//   * Stall/shavings = pricecatalog, per product, per ranch (via the financial-config proc).
//   * Prize money is paid OUT and is never counted here.
//
// ABSENCE != ZERO: a missing active price arrives as null and renders the prompt, never a 0;
// a price that is present but 0 renders as a real 0.

function readNumber(item, camelKey, pascalKey) {
  if (!item) {
    return null;
  }

  var value = item[camelKey];

  if (value === null || value === undefined) {
    value = item[pascalKey];
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  var parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function getClassDate(item) {
  return String(item.classDateTime || item.ClassDateTime || "").substring(0, 10);
}

// The per-class entry band, reused verbatim from the prediction response (predicted +/- RMSE,
// low endpoint already clamped at 0 server-side in ClassEntryPrediction). Falls back to the
// point estimate when a class carries a prediction without a band, so a bandless prediction
// collapses to a zero-width range rather than vanishing. Returns null only when the class has
// NO prediction row at all -- that class is omitted from the projection and counted as
// unpredicted, never treated as zero entries.
function getEntryBandForClass(prediction) {
  var predicted = readNumber(prediction, "predictedEntries", "PredictedEntries");

  if (predicted === null) {
    return null;
  }

  var min = readNumber(prediction, "minPredictedEntries", "MinPredictedEntries");
  var max = readNumber(prediction, "maxPredictedEntries", "MaxPredictedEntries");

  return {
    lo: min === null ? Math.max(0, predicted) : min,
    hi: max === null ? predicted : max,
  };
}

// A class's entry cost = organizercost + federationcost. Both are mandatory-may-be-0 fields, so
// a real 0 is a genuine cost, NOT missing. Returns null only when BOTH are absent -- the ~3
// NULL-cost classes in the live data -- so the caller can advise (pricesMissingCount) instead
// of silently understating entry income.
function getClassCost(item) {
  var organizer = readNumber(item, "organizerCost", "OrganizerCost");
  var federation = readNumber(item, "federationCost", "FederationCost");

  if (organizer === null && federation === null) {
    return null;
  }

  return (organizer || 0) + (federation || 0);
}

// Unique competition horses from horse-days -- the cross-day dedup, and the ONLY place
// competition duration enters the math. A stall is one horse for the whole event, so summing
// per-day horse counts would double-count every returning horse. Dividing horse-days by D
// assumes every horse attends all D days (maximum reuse -> fewest horses -> low band);
// dividing by D-1 assumes each attends D-1 days (more horses -> high band). D=1 admits no
// cross-day reuse, so the band is the single day's horse band unchanged. Duration is consumed
// EXACTLY here -- it must never reappear as a per-night stall price multiplier.
function deriveUniqueHorses(horseDaysLo, horseDaysHi, competitionDays) {
  var days = Number(competitionDays);

  if (!days || days <= 1) {
    return { uniqueLo: horseDaysLo, uniqueHi: horseDaysHi };
  }

  return {
    uniqueLo: Math.ceil(horseDaysLo / days),
    uniqueHi: Math.ceil(horseDaysHi / (days - 1)),
  };
}

// Splits a horse-stalls band across the two real stall tiers, bounded by the ranch's actual
// supply. The LOW income endpoint fills regular first (cheapest -> lowest income); the HIGH
// endpoint fills upgraded first (dearest -> highest income). Both are clamped to supply, so a
// demand above total capacity flags atCapacity rather than inventing stalls that do not exist.
function deriveStallTiers(uniqueLo, uniqueHi, regularSupply, upgradedSupply) {
  var reg = Number(regularSupply) || 0;
  var upg = Number(upgradedSupply) || 0;
  var totalSupply = reg + upg;

  var regLo = Math.min(uniqueLo, reg);
  var upgLo = Math.min(Math.max(uniqueLo - reg, 0), upg);

  var upgHi = Math.min(uniqueHi, upg);
  var regHi = Math.min(Math.max(uniqueHi - upg, 0), reg);

  return {
    regLo: regLo,
    upgLo: upgLo,
    regHi: regHi,
    upgHi: upgHi,
    atCapacity: totalSupply > 0 && uniqueHi > totalSupply,
  };
}

// Tack (equipment) stalls: one per `perUnitMin`..`perUnitMax` horses (default 3..5). The FEWER
// tack stalls (low endpoint) come from spreading the fewest horses over the widest ratio
// (floor(uniqueLo / max)); the MOST (high endpoint) from the most horses over the tightest
// ratio (ceil(uniqueHi / min)). Tack stalls hold no horse, bill at the regular stall price, and
// receive no shavings -- all handled by the caller. The ratio is deliberately its own
// low-confidence line (7/23 booking sample), sourced from smartconfig so it can be retuned
// without a code change.
function deriveTackStalls(uniqueLo, uniqueHi, perUnitMin, perUnitMax) {
  var min = Number(perUnitMin) || 3;
  var max = Number(perUnitMax) || 5;

  return {
    tackLo: Math.floor(uniqueLo / max),
    tackHi: Math.ceil(uniqueHi / min),
  };
}

// Groups the predicted classes by day and rolls each day's entry band up to a horse band, then
// sums to horse-days across the whole competition. N = maxhorseclassesperday: a horse absorbs
// up to N classes of this field per day, so ceil(entries / N) is the fewest horses that produce
// that day's entries. Returns null when there is no usable horse cap (a field with no
// fieldconfig row) -- the caller then cannot derive stalls or shavings for that field.
function deriveHorseDays(entryBands, maxHorseClassesPerDay) {
  var n = Number(maxHorseClassesPerDay);

  if (!n || n <= 0) {
    return null;
  }

  var byDay = {};

  entryBands.forEach(function (band) {
    if (!byDay[band.day]) {
      byDay[band.day] = { eLo: 0, eHi: 0 };
    }

    byDay[band.day].eLo += band.lo;
    byDay[band.day].eHi += band.hi;
  });

  var horseDaysLo = 0;
  var horseDaysHi = 0;

  Object.keys(byDay).forEach(function (day) {
    horseDaysLo += Math.ceil(byDay[day].eLo / n);
    horseDaysHi += Math.ceil(byDay[day].eHi / n);
  });

  return { horseDaysLo: horseDaysLo, horseDaysHi: horseDaysHi };
}

/**
 * The whole read-time projection for one competition. Every band is a labelled range; each of
 * the three income bands carries its own availability so the view can show two real numbers
 * beside one prompt without faking a total.
 *
 * @param {Array<object>} classes full class list for the competition
 * @param {(item: object) => object|null} getPredictionForClass
 * @param {object|null} financialConfig the financial-config proc response (null while loading)
 */
function deriveFinancialProjection(classes, getPredictionForClass, financialConfig) {
  var items = Array.isArray(classes) ? classes : [];

  // --- Entry income (ranch-independent, always available) ---
  var entryIncomeLo = 0;
  var entryIncomeHi = 0;
  var pricesMissingCount = 0;
  var unpredictedCount = 0;
  var predictedBands = [];

  items.forEach(function (item) {
    var band = getEntryBandForClass(getPredictionForClass(item));

    if (!band) {
      unpredictedCount += 1;
      return;
    }

    predictedBands.push({ day: getClassDate(item), lo: band.lo, hi: band.hi });

    var cost = getClassCost(item);

    if (cost === null) {
      pricesMissingCount += 1;
      return;
    }

    entryIncomeLo += band.lo * cost;
    entryIncomeHi += band.hi * cost;
  });

  var entry = {
    available: true,
    lo: entryIncomeLo,
    hi: entryIncomeHi,
    pricesMissingCount: pricesMissingCount,
    unpredictedCount: unpredictedCount,
    predictedClassCount: predictedBands.length,
  };

  // Stall/shavings need the ranch config AND a field horse cap. Without either, the entry band
  // still stands on its own -- the projection tab remains useful.
  var config = financialConfig || {};

  var horseDays = deriveHorseDays(
    predictedBands,
    readNumber(config, "maxHorseClassesPerDay", "MaxHorseClassesPerDay"),
  );

  if (!financialConfig || !horseDays) {
    return {
      hasConfig: !!financialConfig,
      entry: entry,
      horses: null,
      stall: { available: false, reason: "noConfig" },
      shavings: { incomeAvailable: false, bagsAvailable: false, reason: "noConfig" },
    };
  }

  var competitionDays = readNumber(config, "competitionDays", "CompetitionDays");
  var unique = deriveUniqueHorses(
    horseDays.horseDaysLo,
    horseDays.horseDaysHi,
    competitionDays,
  );

  var tiers = deriveStallTiers(
    unique.uniqueLo,
    unique.uniqueHi,
    readNumber(config, "stallRegularSupply", "StallRegularSupply"),
    readNumber(config, "stallUpgradedSupply", "StallUpgradedSupply"),
  );

  var tack = deriveTackStalls(
    unique.uniqueLo,
    unique.uniqueHi,
    readNumber(config, "tackHorsesPerUnitMin", "TackHorsesPerUnitMin"),
    readNumber(config, "tackHorsesPerUnitMax", "TackHorsesPerUnitMax"),
  );

  var horses = {
    horseDaysLo: horseDays.horseDaysLo,
    horseDaysHi: horseDays.horseDaysHi,
    uniqueLo: unique.uniqueLo,
    uniqueHi: unique.uniqueHi,
    competitionDays: competitionDays,
    atCapacity: tiers.atCapacity,
  };

  // --- Stall income (regular + upgraded + tack, all at flat per-booking prices) ---
  // Duration was already consumed in the horse-days divisor, so it is NOT re-applied here.
  var stallRegularPrice = readNumber(config, "stallRegularPrice", "StallRegularPrice");
  var stallUpgradedPrice = readNumber(config, "stallUpgradedPrice", "StallUpgradedPrice");
  var stall;

  // Absence -> prompt (never 0). A present 0 price would pass this guard and render a real 0.
  if (stallRegularPrice === null) {
    stall = {
      available: false,
      reason: "noPrice",
      regLo: tiers.regLo,
      upgLo: tiers.upgLo,
      regHi: tiers.regHi,
      upgHi: tiers.upgHi,
      tackLo: tack.tackLo,
      tackHi: tack.tackHi,
      atCapacity: tiers.atCapacity,
    };
  } else {
    // Defensive: if only the upgraded price is missing, fall back to the regular price for the
    // upgraded tier rather than dropping the whole band. Live data always has both or neither.
    var upgradedPrice = stallUpgradedPrice === null ? stallRegularPrice : stallUpgradedPrice;

    stall = {
      available: true,
      lo:
        tiers.regLo * stallRegularPrice +
        tiers.upgLo * upgradedPrice +
        tack.tackLo * stallRegularPrice,
      hi:
        tiers.regHi * stallRegularPrice +
        tiers.upgHi * upgradedPrice +
        tack.tackHi * stallRegularPrice,
      regLo: tiers.regLo,
      upgLo: tiers.upgLo,
      regHi: tiers.regHi,
      upgHi: tiers.upgHi,
      tackLo: tack.tackLo,
      tackHi: tack.tackHi,
      atCapacity: tiers.atCapacity,
    };
  }

  // --- Shavings: bag-order quantity (always) + income (needs a price) ---
  // Bags are for HORSE stalls only (regular + upgraded), never tack.
  var bagsPerStallMin = readNumber(config, "shavingsBagsMin", "ShavingsBagsMin") || 0;
  var bagsPerStallMax = readNumber(config, "shavingsBagsMax", "ShavingsBagsMax") || 0;

  var bagsLo = (tiers.regLo + tiers.upgLo) * bagsPerStallMin;
  var bagsHi = (tiers.regHi + tiers.upgHi) * bagsPerStallMax;

  var shavingsPriceMin = readNumber(config, "shavingsPriceMin", "ShavingsPriceMin");
  var shavingsPriceMax = readNumber(config, "shavingsPriceMax", "ShavingsPriceMax");
  var shavingsActiveCount = readNumber(config, "shavingsActiveCount", "ShavingsActiveCount") || 0;

  var shavings = {
    // The bag-order quantity always shows -- ordering does not need a price. Even at a ranch
    // with no shavings price, the secretary still needs to know how many bags to buy.
    bagsAvailable: true,
    bagsLo: bagsLo,
    bagsHi: bagsHi,
    // More than one active bag product -> the price is ambiguous (the live DK bug: bags 5 @40
    // and 10 @50 both active). The band widens to [min, max] and the view says so. Exactly one
    // active product -> min = max and the band comes from the bag count alone.
    ambiguous: shavingsActiveCount > 1,
    activeCount: shavingsActiveCount,
  };

  if (shavingsPriceMin === null) {
    shavings.incomeAvailable = false;
    shavings.reason = "noPrice";
  } else {
    shavings.incomeAvailable = true;
    shavings.lo = bagsLo * shavingsPriceMin;
    shavings.hi = bagsHi * (shavingsPriceMax === null ? shavingsPriceMin : shavingsPriceMax);
  }

  return {
    hasConfig: true,
    ranchId: readNumber(config, "ranchId", "RanchId"),
    fieldId: readNumber(config, "fieldId", "FieldId"),
    entry: entry,
    horses: horses,
    stall: stall,
    shavings: shavings,
  };
}

export {
  getEntryBandForClass,
  getClassCost,
  deriveUniqueHorses,
  deriveStallTiers,
  deriveTackStalls,
  deriveHorseDays,
  deriveFinancialProjection,
};
