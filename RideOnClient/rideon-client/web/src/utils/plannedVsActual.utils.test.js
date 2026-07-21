import { describe, it, expect } from "vitest";
import {
  VERDICT_NO_DATA,
  VERDICT_ON_TARGET,
  VERDICT_MIXED,
  VERDICT_FORECAST_HIGH,
  VERDICT_FORECAST_LOW,
  compareClassToPrediction,
  summarizePlannedVsActual,
} from "./plannedVsActual.utils.js";

// A prediction as the Phase 6 endpoint returns it: a point plus a band of +/- the model RMSE.
function prediction(predicted, rmse) {
  var spread = rmse === undefined ? 3 : rmse;

  return {
    predictedEntries: predicted,
    minPredictedEntries: Math.max(predicted - spread, 0),
    maxPredictedEntries: predicted + spread,
  };
}

function makeClass(id) {
  return { classInCompId: id };
}

// Builds a competition where every class was predicted `predicted` and drew `actuals[i]`.
function summarize(predicted, actuals) {
  var classes = actuals.map(function (_, index) {
    return makeClass(index + 1);
  });

  return summarizePlannedVsActual(
    classes,
    function (item) {
      return actuals[item.classInCompId - 1];
    },
    function () {
      return prediction(predicted);
    },
  );
}

describe("compareClassToPrediction", () => {
  it("calls an actual inside the band a hit", () => {
    var result = compareClassToPrediction(11, prediction(10));

    expect(result.isWithinBand).toBe(true);
    expect(result.difference).toBe(1);
  });

  it("calls an actual below the band a miss, and says which way", () => {
    var result = compareClassToPrediction(4, prediction(10));

    expect(result.isWithinBand).toBe(false);
    expect(result.isBelowBand).toBe(true);
    expect(result.isAboveBand).toBe(false);
    expect(result.difference).toBe(-6);
  });

  it("calls an actual above the band a miss the other way", () => {
    var result = compareClassToPrediction(20, prediction(10));

    expect(result.isAboveBand).toBe(true);
  });

  it("treats the band edges as inside", () => {
    expect(compareClassToPrediction(7, prediction(10)).isWithinBand).toBe(true);
    expect(compareClassToPrediction(13, prediction(10)).isWithinBand).toBe(true);
  });

  it("returns nothing at all when the class has no prediction", () => {
    // Absent predictions render as nothing -- never a zero, never a false miss.
    expect(compareClassToPrediction(8, null)).toBeNull();
    expect(compareClassToPrediction(8, {})).toBeNull();
  });

  it("falls back to the point value when the band is missing", () => {
    var result = compareClassToPrediction(9, { predictedEntries: 10 });

    expect(result.isBelowBand).toBe(true);
  });
});

describe("summarizePlannedVsActual", () => {
  it("reports no data when nothing has a prediction", () => {
    var summary = summarizePlannedVsActual(
      [makeClass(1), makeClass(2)],
      function () {
        return 5;
      },
      function () {
        return null;
      },
    );

    expect(summary.verdict).toBe(VERDICT_NO_DATA);
    expect(summary.comparedClasses).toBe(0);
  });

  it("says the forecast held when every class landed inside its band", () => {
    var summary = summarize(10, [9, 10, 11, 12, 8]);

    expect(summary.verdict).toBe(VERDICT_ON_TARGET);
    expect(summary.withinBandCount).toBe(5);
  });

  // The case the view exists for: this must be readable as "the model was wrong", not as
  // "the competition underperformed".
  it("concludes the forecast was too HIGH when actuals miss low across the board", () => {
    var summary = summarize(20, [3, 2, 4, 3, 5]);

    expect(summary.verdict).toBe(VERDICT_FORECAST_HIGH);
    expect(summary.belowBandCount).toBe(5);
    expect(summary.totalActual).toBe(17);
    expect(summary.totalPredicted).toBe(100);
  });

  it("concludes the forecast was too LOW when actuals miss high across the board", () => {
    var summary = summarize(5, [20, 22, 25, 19, 30]);

    expect(summary.verdict).toBe(VERDICT_FORECAST_LOW);
    expect(summary.aboveBandCount).toBe(5);
  });

  it("stays mixed when misses go both ways -- noise, not bias", () => {
    var summary = summarize(10, [1, 25, 2, 30, 10]);

    expect(summary.verdict).toBe(VERDICT_MIXED);
    expect(summary.belowBandCount).toBe(2);
    expect(summary.aboveBandCount).toBe(2);
  });

  it("still indicts the forecast when a clear majority of misses share a direction", () => {
    // Four low, one high: the one contrary class does not rescue the forecast.
    var summary = summarize(20, [3, 2, 4, 3, 40]);

    expect(summary.verdict).toBe(VERDICT_FORECAST_HIGH);
  });

  it("refuses a bias verdict on too few classes", () => {
    // Two classes missing low is not evidence of a biased model, however large the gap.
    var summary = summarize(20, [1, 2]);

    expect(summary.verdict).toBe(VERDICT_MIXED);
    expect(summary.belowBandCount).toBe(2);
  });

  it("counts only classes that actually have predictions", () => {
    var classes = [makeClass(1), makeClass(2), makeClass(3)];

    var summary = summarizePlannedVsActual(
      classes,
      function () {
        return 10;
      },
      function (item) {
        return item.classInCompId === 3 ? null : prediction(10);
      },
    );

    expect(summary.comparedClasses).toBe(2);
    expect(summary.verdict).toBe(VERDICT_ON_TARGET);
  });
});
