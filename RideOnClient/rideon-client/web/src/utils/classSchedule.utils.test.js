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

// `arenaId` is carried on the fixture only to prove it does NOT affect the math: simultaneity
// is keyed on orderInDay alone. Verified against live 2026-07-21 -- of 25 tied groups in the
// database, 22 are same-arena, so an arena-keyed model would miss almost all of them.
function makeClass(id, startTime, orderInDay, arenaId) {
  return {
    classInCompId: id,
    classDateTime: "2026-08-14T00:00:00Z",
    orderInDay: orderInDay === undefined ? 1 : orderInDay,
    startTime: startTime,
    arenaRanchId: 11,
    arenaId: arenaId === undefined ? 1 : arenaId,
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

    // Displayed wrapped past midnight, and flagged as belonging to the next day.
    expect(cell.finishTime).toBe("00:30");
    expect(cell.finishesAfterMidnight).toBe(true);
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

    expect(cell.finishTime).toBe("02:10");
    expect(cell.finishesAfterMidnight).toBe(true);
    expect(cell.suggestion.newStartTime).toBe("06:00");
    expect(cell.suggestion.isInsufficient).toBe(true);
  });
});

// The clock display wraps at midnight but the rolled-forward minute count must NOT: the
// late-finish tiers are expressed as hours past midnight (yellow 23, orange 24, red 25), so
// classifying a wrapped value would read a 00:30 finish as half past midnight that same
// morning and drop every late day out of its tier entirely.
describe("post-midnight display wraps without breaking the tiers", () => {
  function longDayConfig() {
    return reiningConfig({
      minutesPerEntryMin: 30,
      minutesPerEntryMax: 30,
      betweenClassGapMinutes: 0,
      flatteningRunsPerGap: 0,
    });
  }

  it("keeps a past-midnight finish in its tier even though it displays wrapped", () => {
    // 33 entries at 30 min from 08:00 -> 24:30 unwrapped, which is the orange tier.
    var cell = cellFor([makeClass(1, "08:00")], longDayConfig(), { 1: 33 }, 1);

    expect(cell.finishTime).toBe("00:30");
    expect(cell.tier).toBe("orange");
  });

  it("reaches the red tier past 25:00 while displaying 01:00", () => {
    // 34 entries at 30 min from 08:00 -> 25:00 unwrapped.
    var cell = cellFor([makeClass(1, "08:00")], longDayConfig(), { 1: 34 }, 1);

    expect(cell.finishTime).toBe("01:00");
    expect(cell.tier).toBe("red");
  });

  it("does not flag a same-day finish as next-day", () => {
    var cell = cellFor([makeClass(1, "08:00")], longDayConfig(), { 1: 10 }, 1);

    expect(cell.finishTime).toBe("13:00");
    expect(cell.finishesAfterMidnight).toBe(false);
    expect(cell.dayFinishesAfterMidnight).toBe(false);
  });

  it("marks the day-level finish as next-day too", () => {
    var cell = cellFor([makeClass(1, "08:00")], longDayConfig(), { 1: 33 }, 1);

    expect(cell.dayFinishTime).toBe("00:30");
    expect(cell.dayFinishesAfterMidnight).toBe(true);
  });
});

// QA iss 40. Classes sharing an orderInDay run SIMULTANEOUSLY, so the day advances once per
// POSITION: a position costs the MAX of its classes' durations, never their sum, and the
// between-class gap falls once per position boundary. `extremeConfig` is used throughout
// (6 minutes per entry, no gaps of any kind) so every expected clock time is plain arithmetic.
describe("tied orderInDay positions run simultaneously", () => {
  it("leaves a day with no ties rolling forward exactly as before", () => {
    var classes = [
      makeClass(1, "08:00", 1),
      makeClass(2, null, 2),
      makeClass(3, null, 3),
    ];

    var entries = { 1: 10, 2: 10, 3: 10 };
    var config = extremeConfig();

    expect(cellFor(classes, config, entries, 2).startTime).toBe("09:00");
    expect(cellFor(classes, config, entries, 3).startTime).toBe("10:00");
    expect(cellFor(classes, config, entries, 3).dayFinishTime).toBe("11:00");
  });

  it("charges a 5-class tie one duration, not five", () => {
    // The live reining shape: comps 7, 39 and 43 each carry a 5-class tie at orderinday 4,
    // all in the same arena. Longest tied class is 10 entries = 60 minutes.
    var classes = [
      makeClass(1, "08:00", 4),
      makeClass(2, null, 4),
      makeClass(3, null, 4),
      makeClass(4, null, 4),
      makeClass(5, null, 4),
    ];

    var entries = { 1: 10, 2: 5, 3: 5, 4: 5, 5: 5 };
    var config = extremeConfig();

    // Every tied class shares the position's start and finish.
    [1, 2, 3, 4, 5].forEach(function (id) {
      var cell = cellFor(classes, config, entries, id);

      expect(cell.startTime).toBe("08:00");
      expect(cell.finishTime).toBe("09:00");
    });

    // Serialized this day would have ended at 10:00.
    expect(cellFor(classes, config, entries, 5).dayFinishTime).toBe("09:00");
  });

  it("keeps each tied class's own durationMinutes even though they share a finish", () => {
    var classes = [makeClass(1, "08:00", 1), makeClass(2, null, 1)];
    var entries = { 1: 10, 2: 5 };

    expect(cellFor(classes, extremeConfig(), entries, 1).durationMinutes).toBe(60);
    expect(cellFor(classes, extremeConfig(), entries, 2).durationMinutes).toBe(30);
    expect(cellFor(classes, extremeConfig(), entries, 2).finishTime).toBe("09:00");
  });

  it("walks several tied positions across one day", () => {
    var classes = [
      makeClass(1, "08:00", 1),
      makeClass(2, null, 1),
      makeClass(3, null, 2),
      makeClass(4, null, 2),
      makeClass(5, null, 3),
    ];

    // Position 1 max 60 -> 08:00-09:00. Position 2 max 30 -> 09:00-09:30.
    // Position 3 is a lone 60 -> 09:30-10:30.
    var entries = { 1: 10, 2: 5, 3: 5, 4: 3, 5: 10 };
    var config = extremeConfig();

    expect(cellFor(classes, config, entries, 3).startTime).toBe("09:00");
    expect(cellFor(classes, config, entries, 4).startTime).toBe("09:00");
    expect(cellFor(classes, config, entries, 5).startTime).toBe("09:30");
    expect(cellFor(classes, config, entries, 5).dayFinishTime).toBe("10:30");
  });

  it("applies the between-class gap once per position boundary, not once per class", () => {
    // Reining: 10-minute gap. Three classes tied at position 1, one at position 2 -- exactly
    // one gap falls, at the single boundary between them.
    var classes = [
      makeClass(1, "08:00", 1),
      makeClass(2, null, 1),
      makeClass(3, null, 1),
      makeClass(4, null, 2),
    ];

    // 6 entries at 5 minutes = 30 minutes, and 6 runs trips no mid-class flattening gap.
    var entries = { 1: 6, 2: 6, 3: 6, 4: 6 };
    var cell = cellFor(classes, reiningConfig(), entries, 4);

    expect(cell.startTime).toBe("08:40");
    expect(cell.dayFinishTime).toBe("09:10");
  });

  it("gives the same answer for a tie spanning two arenas as for one inside a single arena", () => {
    // Arena is not a key. Only THREE tied groups in the live database span two arenas, and
    // they must behave identically to the 22 that do not.
    var sameArena = [makeClass(1, "08:00", 1, 2), makeClass(2, null, 1, 2)];
    var twoArenas = [makeClass(1, "08:00", 1, 1), makeClass(2, null, 1, 2)];
    var entries = { 1: 10, 2: 5 };
    var config = extremeConfig();

    var sameArenaCell = cellFor(sameArena, config, entries, 2);
    var twoArenasCell = cellFor(twoArenas, config, entries, 2);

    expect(twoArenasCell.startTime).toBe(sameArenaCell.startTime);
    expect(twoArenasCell.finishTime).toBe(sameArenaCell.finishTime);
    expect(twoArenasCell.dayFinishTime).toBe(sameArenaCell.dayFinishTime);
    expect(twoArenasCell.dayFinishTime).toBe("09:00");
  });

  it("does not let a tie inflate the day into a late-finish tier", () => {
    // Two tied classes of 100 entries: 600 minutes each. Tied, the day ends 18:00 and trips
    // no tier. Serialized it would end at 04:00 the next day, deep into red.
    var classes = [makeClass(1, "08:00", 1), makeClass(2, null, 1)];
    var cell = cellFor(classes, extremeConfig(), { 1: 100, 2: 100 }, 2);

    expect(cell.dayFinishTime).toBe("18:00");
    expect(cell.tier).toBe("none");
  });
});

describe("null orderInDay", () => {
  // Live shape: competition 45 on 2026-07-07 has four null-order classes. Nulls each take
  // their own position and stay sequential -- absence of an order is not an assertion of
  // simultaneity, and collapsing them would under-state the day.
  it("keeps null-order classes sequential instead of collapsing them into one position", () => {
    var classes = [
      makeClass(1, "08:00", null, 3),
      makeClass(2, null, null, 2),
      makeClass(3, null, null, 2),
      makeClass(4, null, null, 1),
    ];

    var entries = { 1: 10, 2: 10, 3: 10, 4: 10 };
    var config = extremeConfig();

    expect(cellFor(classes, config, entries, 1).startTime).toBe("08:00");
    expect(cellFor(classes, config, entries, 2).startTime).toBe("09:00");
    expect(cellFor(classes, config, entries, 3).startTime).toBe("10:00");
    expect(cellFor(classes, config, entries, 4).startTime).toBe("11:00");
    expect(cellFor(classes, config, entries, 4).dayFinishTime).toBe("12:00");
  });

  it("does not tie a null-order class to a numbered one", () => {
    var classes = [makeClass(1, "08:00", null), makeClass(2, null, 1)];
    var entries = { 1: 10, 2: 10 };

    expect(cellFor(classes, extremeConfig(), entries, 2).startTime).toBe("09:00");
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
