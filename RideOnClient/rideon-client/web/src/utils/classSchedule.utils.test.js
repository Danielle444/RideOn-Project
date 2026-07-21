import { describe, it, expect } from "vitest";
import {
  computeScheduleColumn,
  getScheduleCellForClass,
} from "./classSchedule.utils.js";

// Flattening is reining-only, enforced in proc 164 -- it returns both gap columns as NULL
// for every other field. These fixtures model that: `reiningConfig` carries the gap values,
// `extremeConfig` carries nulls exactly as a non-reining field arrives here.

var TIERS = {
  lateFinishYellowHour: 23,
  lateFinishOrangeHour: 24,
  lateFinishRedHour: 25,
  defaultFirstClassStartHour: 8,
};

function reiningConfig(overrides) {
  return Object.assign(
    {
      minutesPerEntryMin: 5,
      minutesPerEntryMax: 5,
      betweenClassGapMinutes: 10,
      flatteningRunsPerGap: 6,
    },
    TIERS,
    overrides || {},
  );
}

function extremeConfig() {
  return Object.assign(
    {
      minutesPerEntryMin: 5,
      minutesPerEntryMax: 7,
      betweenClassGapMinutes: null,
      flatteningRunsPerGap: null,
    },
    TIERS,
  );
}

function makeClass(id, startTime, orderInDay) {
  return {
    classInCompId: id,
    classDateTime: "2026-08-14T00:00:00Z",
    orderInDay: orderInDay === undefined ? 1 : orderInDay,
    startTime: startTime,
  };
}

// Reads one class's cell out of a computed column, by entry count per class id.
function cellFor(classes, config, entriesById, classId, viewMode) {
  var column = computeScheduleColumn(
    classes,
    config,
    viewMode || "avg",
    function (item) {
      return entriesById[item.classInCompId] || 0;
    },
  );

  var item = classes.find(function (c) {
    return c.classInCompId === classId;
  });

  return getScheduleCellForClass(column, item);
}

describe("mid-class flattening gaps (reining)", () => {
  it("adds one gap for 12 runs at an interval of 6, not two", () => {
    // Run 12 is the class boundary, where the between-class gap already falls -- counting it
    // again would double the flattening. 12*5 = 60 run minutes + one 10-minute gap.
    var classes = [makeClass(1, "08:00")];
    var cell = cellFor(classes, reiningConfig(), { 1: 12 }, 1);

    expect(cell.durationMinutes).toBe(70);
    expect(cell.finishTime).toBe("09:10");
  });

  it("adds one gap for 7 runs at an interval of 6", () => {
    var classes = [makeClass(1, "08:00")];
    var cell = cellFor(classes, reiningConfig(), { 1: 7 }, 1);

    expect(cell.durationMinutes).toBe(45);
  });

  it("adds no gap for exactly 6 runs -- the boundary is the class end", () => {
    var classes = [makeClass(1, "08:00")];
    var cell = cellFor(classes, reiningConfig(), { 1: 6 }, 1);

    expect(cell.durationMinutes).toBe(30);
    expect(cell.finishTime).toBe("08:30");
  });

  it("adds two gaps for 13 runs", () => {
    var classes = [makeClass(1, "08:00")];
    var cell = cellFor(classes, reiningConfig(), { 1: 13 }, 1);

    expect(cell.durationMinutes).toBe(85);
  });

  it("still applies the between-class gap, and never before the day's first class", () => {
    var classes = [makeClass(1, "08:00", 1), makeClass(2, null, 2)];
    var first = cellFor(classes, reiningConfig(), { 1: 6, 2: 6 }, 1);
    var second = cellFor(classes, reiningConfig(), { 1: 6, 2: 6 }, 2);

    expect(first.startTime).toBe("08:00");
    expect(second.startTime).toBe("08:40");
  });
});

describe("non-reining fields get no gaps at all", () => {
  it("rolls forward continuously when the proc returns null gap columns", () => {
    // Extreme: avg of 5 and 7 = 6 minutes per entry. 12 entries = 72 minutes, no gaps.
    var classes = [makeClass(1, "08:00")];
    var cell = cellFor(classes, extremeConfig(), { 1: 12 }, 1);

    expect(cell.durationMinutes).toBe(72);
    expect(cell.finishTime).toBe("09:12");
  });

  it("starts the next class the moment the previous one finishes", () => {
    var classes = [makeClass(1, "08:00", 1), makeClass(2, null, 2)];
    var second = cellFor(classes, extremeConfig(), { 1: 10, 2: 10 }, 2);

    expect(second.startTime).toBe("09:00");
  });
});

describe("missing config degrades instead of crashing", () => {
  it("treats an absent flatteningRunsPerGap as no mid-class gaps", () => {
    var config = reiningConfig({ flatteningRunsPerGap: undefined });
    var classes = [makeClass(1, "08:00")];
    var cell = cellFor(classes, config, { 1: 12 }, 1);

    expect(cell.durationMinutes).toBe(60);
  });
});

describe("insufficient suggestion after the 06:00 clamp", () => {
  it("does not flag a suggestion the 06:00 floor never touched", () => {
    // 33 entries at 30 min = 990 min from 08:00 -> finishes 24:30, orange tier.
    // Overage 30 min, so the suggestion is 07:30 -- well clear of the floor.
    var config = reiningConfig({
      minutesPerEntryMin: 30,
      minutesPerEntryMax: 30,
      betweenClassGapMinutes: 0,
      flatteningRunsPerGap: 0,
    });
    var classes = [makeClass(1, "08:00")];
    var cell = cellFor(classes, config, { 1: 33 }, 1);

    expect(cell.finishTime).toBe("24:30");
    expect(cell.suggestion.newStartTime).toBe("07:30");
    expect(cell.suggestion.isInsufficient).toBe(false);
  });

  it("flags the suggestion when the floor clamps it short of the overage", () => {
    // 118 entries at 10 min = 1180 min from 06:30 -> finishes 26:10.
    // Overage 130 min rounds to 150, so the day actually needs a 04:00 start.
    // Clamped to 06:00, the suggestion no longer resolves the overage.
    var config = reiningConfig({
      minutesPerEntryMin: 10,
      minutesPerEntryMax: 10,
      betweenClassGapMinutes: 0,
      flatteningRunsPerGap: 0,
    });
    var classes = [makeClass(1, "06:30")];
    var cell = cellFor(classes, config, { 1: 118 }, 1);

    expect(cell.finishTime).toBe("26:10");
    expect(cell.suggestion.newStartTime).toBe("06:00");
    expect(cell.suggestion.isInsufficient).toBe(true);
  });
});

describe("exempt fields", () => {
  it("returns no column at all when minutesPerEntry bounds are absent", () => {
    var config = Object.assign({}, TIERS, {
      minutesPerEntryMin: null,
      minutesPerEntryMax: null,
    });

    var column = computeScheduleColumn([makeClass(1, "08:00")], config, "avg", () => 5);

    expect(column).toBeNull();
  });
});
