// Planned-vs-actual diagnosis for the secretary's actuals view.
//
// The point of this file is a distinction the numbers alone do not make: a class that drew
// fewer riders than forecast is EITHER a competition that underperformed OR a forecast that
// was too high, and those call for opposite responses. A scoreboard can only say "you are
// down 40%". A diagnostic has to be able to conclude THE PREDICTION WAS WRONG.
//
// The prediction arrives as a BAND (predicted +/- the model's RMSE), not a point, and the
// band is the whole basis of the judgement:
//
//   - actual inside the band          -> the forecast held. Nothing to explain.
//   - actual outside, mixed direction -> the forecast was noisy per class but not biased.
//                                        Individual classes are the story.
//   - actual outside, one direction,  -> the forecast itself was biased. The model was
//     across most classes                wrong about this competition, and reading the
//                                        shortfall as a marketing failure would be a
//                                        misdiagnosis.
//
// The last case is the one the view exists to surface, and it is only visible in aggregate:
// no single class can distinguish bad luck from a bad model.

var VERDICT_NO_DATA = "noData";
var VERDICT_ON_TARGET = "onTarget";
var VERDICT_MIXED = "mixed";
var VERDICT_FORECAST_HIGH = "forecastHigh";
var VERDICT_FORECAST_LOW = "forecastLow";

// A forecast is called biased only when a clear majority of the classes that missed did so
// in the SAME direction. Below this, the misses read as noise rather than a systematic
// error. Two thirds is a judgement call, not a derived constant.
var BIAS_MAJORITY_RATIO = 2 / 3;

// Below this many classes with predictions, the aggregate has no power to separate noise
// from bias, so no systematic claim is made at all.
var MIN_CLASSES_FOR_BIAS_VERDICT = 3;

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

/**
 * One class's comparison. Returns null when the class has no prediction to compare against --
 * absent predictions render as nothing, never as a zero or a false "missed" verdict.
 *
 * @param {number} actualEntries
 * @param {object|null} prediction the ClassEntryPrediction response row
 */
function compareClassToPrediction(actualEntries, prediction) {
  var predicted = readNumber(prediction, "predictedEntries", "PredictedEntries");

  if (predicted === null) {
    return null;
  }

  var min = readNumber(prediction, "minPredictedEntries", "MinPredictedEntries");
  var max = readNumber(prediction, "maxPredictedEntries", "MaxPredictedEntries");

  // A prediction without a band cannot support an inside/outside judgement, so it collapses
  // to the point value and every difference counts as a miss.
  var lowerBound = min === null ? predicted : min;
  var upperBound = max === null ? predicted : max;

  var actual = Number(actualEntries || 0);
  var difference = actual - predicted;

  var isBelowBand = actual < Math.floor(lowerBound);
  var isAboveBand = actual > Math.ceil(upperBound);

  return {
    actual: actual,
    predicted: predicted,
    minPredicted: lowerBound,
    maxPredicted: upperBound,
    difference: difference,
    isWithinBand: !isBelowBand && !isAboveBand,
    isBelowBand: isBelowBand,
    isAboveBand: isAboveBand,
  };
}

/**
 * Aggregates per-class comparisons into a verdict about the FORECAST, not about the
 * competition. Callers pass the full class list for the scope being judged.
 *
 * @param {Array<object>} classes
 * @param {(item: object) => number} getActualEntries
 * @param {(item: object) => object|null} getPredictionForClass
 */
function summarizePlannedVsActual(classes, getActualEntries, getPredictionForClass) {
  var items = Array.isArray(classes) ? classes : [];

  var comparisons = [];

  items.forEach(function (item) {
    var comparison = compareClassToPrediction(
      getActualEntries(item),
      getPredictionForClass(item),
    );

    if (comparison) {
      comparisons.push(comparison);
    }
  });

  if (comparisons.length === 0) {
    return {
      verdict: VERDICT_NO_DATA,
      comparedClasses: 0,
      withinBandCount: 0,
      belowBandCount: 0,
      aboveBandCount: 0,
      totalActual: 0,
      totalPredicted: 0,
    };
  }

  var withinBandCount = 0;
  var belowBandCount = 0;
  var aboveBandCount = 0;
  var totalActual = 0;
  var totalPredicted = 0;

  comparisons.forEach(function (comparison) {
    totalActual += comparison.actual;
    totalPredicted += comparison.predicted;

    if (comparison.isWithinBand) {
      withinBandCount += 1;
    } else if (comparison.isBelowBand) {
      belowBandCount += 1;
    } else {
      aboveBandCount += 1;
    }
  });

  var missCount = belowBandCount + aboveBandCount;

  var summary = {
    comparedClasses: comparisons.length,
    withinBandCount: withinBandCount,
    belowBandCount: belowBandCount,
    aboveBandCount: aboveBandCount,
    totalActual: totalActual,
    totalPredicted: totalPredicted,
  };

  if (missCount === 0) {
    summary.verdict = VERDICT_ON_TARGET;
    return summary;
  }

  // Too few classes to tell a biased model from an unlucky day. Say the classes missed;
  // do not indict the forecast on three data points.
  if (comparisons.length < MIN_CLASSES_FOR_BIAS_VERDICT) {
    summary.verdict = VERDICT_MIXED;
    return summary;
  }

  if (belowBandCount >= missCount * BIAS_MAJORITY_RATIO) {
    // Actuals came in under the band across the board: the forecast was too HIGH.
    summary.verdict = VERDICT_FORECAST_HIGH;
    return summary;
  }

  if (aboveBandCount >= missCount * BIAS_MAJORITY_RATIO) {
    summary.verdict = VERDICT_FORECAST_LOW;
    return summary;
  }

  summary.verdict = VERDICT_MIXED;
  return summary;
}

export {
  VERDICT_NO_DATA,
  VERDICT_ON_TARGET,
  VERDICT_MIXED,
  VERDICT_FORECAST_HIGH,
  VERDICT_FORECAST_LOW,
  compareClassToPrediction,
  summarizePlannedVsActual,
};
