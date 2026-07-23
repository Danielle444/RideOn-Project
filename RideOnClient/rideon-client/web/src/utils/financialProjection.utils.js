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
// FOUR income figures, each an independently-labelled RANGE: organizer entry income, federation
// entry income, stall income, shavings income -- plus the shavings bag-order quantity. They
// degrade independently: the two entry figures are ranch-independent (costs live on the class)
// and always render; stall and shavings need the ranch's config and degrade to a "set your
// prices" prompt when it is absent.
//
// TWO PRICING WORLDS, never conflated:
//   * Entry income  = classincompetition.organizercost (organizer) + federationcost (federation).
//   * Stall/shavings = pricecatalog, per product, per ranch (via the financial-config proc).
//   * Prize money is paid OUT and is never counted here.
//
// RANGES ARE NARROWED WITH AVERAGES (Oren, 2026-07-23): stall income prices every stall at the
// average of the regular and VIP price (not a tier-fill spread); shavings uses the average bag
// price and an average 2.5 bags per stall; tack is 1 per 4-5 horses. The remaining width comes
// almost entirely from the predicted-entries band itself, which is the honest source of it.
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
// point estimate when a class carries a prediction without a band. Returns null only when the
// class has NO prediction row at all -- that class is omitted and counted as unpredicted, never
// treated as zero entries.
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

// Organizer and federation cost of a class, kept separate (the two entry-income streams). Both
// are mandatory-may-be-0 fields, so a real 0 is a genuine cost, NOT missing. `missing` is true
// only when BOTH are absent -- the ~3 NULL-cost classes in the live data -- so the caller can
// advise (pricesMissingCount) instead of silently understating entry income.
function getClassCostParts(item) {
  var organizer = readNumber(item, "organizerCost", "OrganizerCost");
  var federation = readNumber(item, "federationCost", "FederationCost");

  return {
    organizer: organizer || 0,
    federation: federation || 0,
    missing: organizer === null && federation === null,
  };
}

// Combined entry cost (organizer + federation). Kept for callers that want the single number --
// e.g. the actual/comparison tabs, which compare a total. Returns null when both are absent.
function getClassCost(item) {
  var parts = getClassCostParts(item);

  return parts.missing ? null : parts.organizer + parts.federation;
}

// Unique competition horses from horse-days -- the cross-day dedup, and the ONLY place
// competition duration enters the math. A stall is one horse for the whole event, so summing
// per-day horse counts would double-count every returning horse. Dividing horse-days by D
// assumes every horse attends all D days (maximum reuse -> fewest horses -> low band);
// dividing by D-1 assumes each attends D-1 days (more horses -> high band). D=1 admits no
// cross-day reuse, so the band is the single day's horse band unchanged.
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

// The horse-stall demand band, clamped to the ranch's real total stall supply. A demand above
// capacity flags atCapacity rather than inventing stalls that do not exist. With average pricing
// the two tiers no longer need to be split out for income; only the total placeable count and
// the capacity flag matter.
function clampHorseStalls(uniqueLo, uniqueHi, totalSupply) {
  var supply = Number(totalSupply) || 0;

  if (supply <= 0) {
    return { stallsLo: uniqueLo, stallsHi: uniqueHi, atCapacity: false };
  }

  return {
    stallsLo: Math.min(uniqueLo, supply),
    stallsHi: Math.min(uniqueHi, supply),
    atCapacity: uniqueHi > supply,
  };
}

// Tack (equipment) stalls: one per `perUnitMin`..`perUnitMax` horses (default 4..5). The FEWER
// tack stalls (low endpoint) come from the fewest horses over the widest ratio
// (floor(uniqueLo / max)); the MOST from the most horses over the tightest ratio
// (ceil(uniqueHi / min)). Tack stalls hold no horse, bill at the regular stall price, and
// receive no shavings -- all handled by the caller. The ratio is config-sourced (smartconfig)
// so it can be retuned without a code change.
function deriveTackStalls(uniqueLo, uniqueHi, perUnitMin, perUnitMax) {
  var min = Number(perUnitMin) || 4;
  var max = Number(perUnitMax) || 5;

  return {
    tackLo: Math.floor(uniqueLo / max),
    tackHi: Math.ceil(uniqueHi / min),
  };
}

// Groups the predicted classes by day and rolls each day's entry band up to a horse band, then
// sums to horse-days across the whole competition. N = maxhorseclassesperday: a horse absorbs
// up to N classes of this field per day, so ceil(entries / N) is the fewest horses that produce
// that day's entries. Returns null when there is no usable horse cap.
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

function average(a, b) {
  return (a + b) / 2;
}

/**
 * The whole read-time projection for one competition. Every income figure is a labelled range;
 * each carries its own availability so the view can show real numbers beside a prompt without
 * faking a total.
 *
 * @param {Array<object>} classes full class list for the competition
 * @param {(item: object) => object|null} getPredictionForClass
 * @param {object|null} financialConfig the financial-config proc response (null while loading)
 */
function deriveFinancialProjection(classes, getPredictionForClass, financialConfig) {
  var items = Array.isArray(classes) ? classes : [];

  // --- Entry income, split organizer vs federation (both ranch-independent, always available) ---
  var organizerLo = 0;
  var organizerHi = 0;
  var federationLo = 0;
  var federationHi = 0;
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

    var parts = getClassCostParts(item);

    if (parts.missing) {
      pricesMissingCount += 1;
      return;
    }

    organizerLo += band.lo * parts.organizer;
    organizerHi += band.hi * parts.organizer;
    federationLo += band.lo * parts.federation;
    federationHi += band.hi * parts.federation;
  });

  var entry = {
    available: true,
    organizerLo: organizerLo,
    organizerHi: organizerHi,
    federationLo: federationLo,
    federationHi: federationHi,
    pricesMissingCount: pricesMissingCount,
    unpredictedCount: unpredictedCount,
    predictedClassCount: predictedBands.length,
  };

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

  var regularSupply = readNumber(config, "stallRegularSupply", "StallRegularSupply") || 0;
  var upgradedSupply = readNumber(config, "stallUpgradedSupply", "StallUpgradedSupply") || 0;
  var stalls = clampHorseStalls(unique.uniqueLo, unique.uniqueHi, regularSupply + upgradedSupply);

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
    atCapacity: stalls.atCapacity,
  };

  // --- Stall income: every stall priced at the AVERAGE of regular and VIP; tack at regular. ---
  // Duration was already consumed in the horse-days divisor, so it is NOT re-applied here.
  var stallRegularPrice = readNumber(config, "stallRegularPrice", "StallRegularPrice");
  var stallUpgradedPrice = readNumber(config, "stallUpgradedPrice", "StallUpgradedPrice");
  var stall;

  // Absence -> prompt (never 0). A present 0 price would pass this guard and render a real 0.
  if (stallRegularPrice === null) {
    stall = {
      available: false,
      reason: "noPrice",
      stallsLo: stalls.stallsLo,
      stallsHi: stalls.stallsHi,
      tackLo: tack.tackLo,
      tackHi: tack.tackHi,
      atCapacity: stalls.atCapacity,
    };
  } else {
    var avgStallPrice =
      stallUpgradedPrice === null
        ? stallRegularPrice
        : average(stallRegularPrice, stallUpgradedPrice);

    stall = {
      available: true,
      lo: stalls.stallsLo * avgStallPrice + tack.tackLo * stallRegularPrice,
      hi: stalls.stallsHi * avgStallPrice + tack.tackHi * stallRegularPrice,
      stallsLo: stalls.stallsLo,
      stallsHi: stalls.stallsHi,
      tackLo: tack.tackLo,
      tackHi: tack.tackHi,
      atCapacity: stalls.atCapacity,
    };
  }

  // --- Shavings: bag-order quantity (always) + income (needs a price) ---
  // Bags are for HORSE stalls only, at the AVERAGE bags-per-stall (2.5) -- never tack.
  var avgBagsPerStall = average(
    readNumber(config, "shavingsBagsMin", "ShavingsBagsMin") || 0,
    readNumber(config, "shavingsBagsMax", "ShavingsBagsMax") || 0,
  );

  var bagsLo = stalls.stallsLo * avgBagsPerStall;
  var bagsHi = stalls.stallsHi * avgBagsPerStall;

  var shavingsPriceMin = readNumber(config, "shavingsPriceMin", "ShavingsPriceMin");
  var shavingsPriceMax = readNumber(config, "shavingsPriceMax", "ShavingsPriceMax");
  var shavingsActiveCount = readNumber(config, "shavingsActiveCount", "ShavingsActiveCount") || 0;

  var shavings = {
    // The bag-order quantity always shows -- ordering does not need a price.
    bagsAvailable: true,
    bagsLo: bagsLo,
    bagsHi: bagsHi,
    // More than one active bag product is still flagged (a data issue), but the income now uses
    // the AVERAGE of the active prices rather than widening the band.
    ambiguous: shavingsActiveCount > 1,
    activeCount: shavingsActiveCount,
  };

  if (shavingsPriceMin === null) {
    shavings.incomeAvailable = false;
    shavings.reason = "noPrice";
  } else {
    var avgShavingsPrice =
      shavingsPriceMax === null
        ? shavingsPriceMin
        : average(shavingsPriceMin, shavingsPriceMax);

    shavings.incomeAvailable = true;
    shavings.lo = bagsLo * avgShavingsPrice;
    shavings.hi = bagsHi * avgShavingsPrice;
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
  getClassCostParts,
  deriveUniqueHorses,
  clampHorseStalls,
  deriveTackStalls,
  deriveHorseDays,
  deriveFinancialProjection,
};
