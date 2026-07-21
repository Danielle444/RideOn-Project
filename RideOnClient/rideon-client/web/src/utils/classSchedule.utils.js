// Pure schedule math for the secretary classes page's predicted/live schedule columns.
// Computation is always run over the FULL day-grouped class list (not a filtered/visible
// subset) so a search or entries filter never changes the objective rolled-forward times --
// only which rows are rendered changes.

function normalizeDateOnly(value) {
  if (!value) {
    return "";
  }

  return String(value).substring(0, 10);
}

function getClassInCompId(item) {
  return item.classInCompId || item.ClassInCompId;
}

function getClassDate(item) {
  return normalizeDateOnly(item.classDateTime || item.ClassDateTime);
}

function getOrderInDay(item) {
  var value = item.orderInDay;

  if (value === null || value === undefined) {
    value = item.OrderInDay;
  }

  return value === null || value === undefined ? null : Number(value);
}

// The day position a class occupies. Classes sharing a position run SIMULTANEOUSLY.
//
// A null `orderinday` gets a position of its OWN rather than joining the other nulls,
// so null-order classes stay sequential. Two reasons. Sharing an order number is a
// deliberate act -- the secretary typed the same number twice -- whereas null is simply
// the absence of an answer, and absence is not an assertion that two classes run at once.
// And the error directions are not symmetric: collapsing nulls into one tied position
// would UNDER-state the day, silently promising a finish time that will not happen --
// the same silent failure this fix exists to remove, only pointing the other way.
//
// Live shape this covers: competition 45 on 2026-07-07 has four null-order classes.
function getPositionKey(item) {
  var value = getOrderInDay(item);

  return value === null ? "null:" + getClassInCompId(item) : "order:" + value;
}

function getStartTimeMinutes(item) {
  var raw = item.startTime || item.StartTime;

  if (!raw) {
    return null;
  }

  var parts = String(raw).split(":");
  var hours = Number(parts[0]);
  var minutes = Number(parts[1] || 0);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

var MINUTES_PER_DAY = 24 * 60;

// Clock times WRAP past midnight: a day finishing 1470 minutes after its origin reads
// "00:30", not "24:30".
//
// The rolled-forward minute count itself stays unwrapped everywhere else in this file --
// the late-finish tiers are expressed as hours past midnight (yellow 23, orange 24, red 25),
// so classifying against a wrapped value would read 00:30 as half past midnight on the same
// morning and silently drop every late day out of its tier. Wrapping is a display concern
// and lives only here.
function formatMinutesAsClock(totalMinutes) {
  var wrapped = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  var hours = Math.floor(wrapped / 60);
  var minutes = Math.round(wrapped % 60);
  var hh = hours < 10 ? "0" + hours : String(hours);
  var mm = minutes < 10 ? "0" + minutes : String(minutes);

  return hh + ":" + mm;
}

// Whether a rolled-forward time has crossed into the following calendar day. Once the clock
// wraps, "00:30" alone cannot say whether it means tonight or this morning, so callers mark
// it.
function isAfterMidnight(totalMinutes) {
  return totalMinutes >= MINUTES_PER_DAY;
}

function readConfigValue(scheduleConfig, camelKey, pascalKey) {
  var value = scheduleConfig[camelKey];

  if (value === null || value === undefined) {
    value = scheduleConfig[pascalKey];
  }

  return value === null || value === undefined ? null : Number(value);
}

/**
 * @param {object} scheduleConfig
 * @param {"avg"|"min"|"max"} viewMode
 * @returns {number|null} null means the field is exempt (no minutesPerEntry bounds configured)
 */
function getMinutesPerEntry(scheduleConfig, viewMode) {
  if (!scheduleConfig) {
    return null;
  }

  var min = readConfigValue(scheduleConfig, "minutesPerEntryMin", "MinutesPerEntryMin");
  var max = readConfigValue(scheduleConfig, "minutesPerEntryMax", "MinutesPerEntryMax");

  if (min === null || max === null) {
    return null;
  }

  if (viewMode === "min") {
    return min;
  }

  if (viewMode === "max") {
    return max;
  }

  return (min + max) / 2;
}

function isScheduleExempt(scheduleConfig) {
  return getMinutesPerEntry(scheduleConfig, "avg") === null;
}

function classifyLateFinishTier(finishHours, scheduleConfig) {
  var yellow = readConfigValue(scheduleConfig, "lateFinishYellowHour", "LateFinishYellowHour");
  var orange = readConfigValue(scheduleConfig, "lateFinishOrangeHour", "LateFinishOrangeHour");
  var red = readConfigValue(scheduleConfig, "lateFinishRedHour", "LateFinishRedHour");

  if (yellow === null || orange === null || red === null) {
    return "none";
  }

  if (finishHours >= red) {
    return "red";
  }

  if (finishHours >= orange) {
    return "orange";
  }

  if (finishHours >= yellow) {
    return "yellow";
  }

  return "none";
}

function groupClassesByDay(classes) {
  var order = [];
  var byDate = {};

  classes.forEach(function (item) {
    var date = getClassDate(item);

    if (!byDate[date]) {
      byDate[date] = [];
      order.push(date);
    }

    byDate[date].push(item);
  });

  return order.map(function (date) {
    return { date: date, classes: byDate[date] };
  });
}

// Groups one day's classes into consecutive orderInDay positions, preserving the order the
// classes arrive in (the caller sorts by date -> orderInDay -> startTime).
function groupClassesByPosition(dayClasses) {
  var order = [];
  var byKey = {};

  dayClasses.forEach(function (item) {
    var key = getPositionKey(item);

    if (!byKey[key]) {
      byKey[key] = [];
      order.push(key);
    }

    byKey[key].push(item);
  });

  return order.map(function (key) {
    return byKey[key];
  });
}

// Resolves a day's timing origin: the earliest starttime among the classes tied for the
// day's first orderInDay position (simultaneous classes). Usually only one of them has a
// starttime at all; if none do, the day has no origin (nudge + durations-only for the day).
function resolveDayOrigin(dayClasses) {
  var firstOrder = getOrderInDay(dayClasses[0]);

  var tiedGroup = dayClasses.filter(function (item) {
    return getOrderInDay(item) === firstOrder;
  });

  var best = null;

  tiedGroup.forEach(function (item) {
    var minutes = getStartTimeMinutes(item);

    if (minutes === null) {
      return;
    }

    if (best === null || minutes < best.minutes) {
      best = { minutes: minutes, classId: getClassInCompId(item) };
    }
  });

  if (!best) {
    return { startMinutes: null, targetClassId: getClassInCompId(tiedGroup[0]) };
  }

  return { startMinutes: best.minutes, targetClassId: best.classId };
}

// Never suggests a starttime before 06:00.
var EARLIEST_SUGGESTABLE_START_MINUTES = 6 * 60;
var SUGGESTION_ROUND_MINUTES = 30;
var MIDNIGHT_HOUR = 24;

// Flattening is reining-only. The proc returns both gap values as NULL for every other
// field, so `gapMinutes`/`runsPerGap` arrive as 0 here and every formula below degrades to
// a plain continuous roll-forward -- no field knowledge is needed on this side.
//
// A flattening gap falls every `runsPerGap` runs INSIDE a class as well as between classes.
// The `- 1` is what stops it doubling: a class of exactly 12 runs at an interval of 6 has
// its second boundary at run 12, which is the class boundary itself, where the between-class
// gap already falls. So 12 runs yields 1 mid-class gap, not 2; 6 runs yields 0.
function countMidClassGaps(entries, runsPerGap) {
  if (!runsPerGap || runsPerGap <= 0 || entries <= 0) {
    return 0;
  }

  return Math.floor((entries - 1) / runsPerGap);
}

function computeClassDuration(entries, minutesPerEntry, gapMinutes, runsPerGap) {
  var runMinutes = Math.round(entries * minutesPerEntry);

  return runMinutes + countMidClassGaps(entries, runsPerGap) * gapMinutes;
}

function computeDaySchedule(dayClasses, scheduleConfig, viewMode, getEntryCount) {
  var minutesPerEntry = getMinutesPerEntry(scheduleConfig, viewMode);

  if (minutesPerEntry === null) {
    return null;
  }

  var gapMinutes = readConfigValue(
    scheduleConfig,
    "betweenClassGapMinutes",
    "BetweenClassGapMinutes",
  ) || 0;

  var runsPerGap = readConfigValue(
    scheduleConfig,
    "flatteningRunsPerGap",
    "FlatteningRunsPerGap",
  ) || 0;

  // When no class on the day carries a starttime, fall back to the configured assumed start
  // hour so the day still gets a real rolled-forward timeline instead of bare durations. The
  // day stays flagged as assumed so the view can say so and offer to make it real.
  var assumedStartHour = readConfigValue(
    scheduleConfig,
    "defaultFirstClassStartHour",
    "DefaultFirstClassStartHour",
  );

  var origin = resolveDayOrigin(dayClasses);
  var isAssumedOrigin = false;

  if (origin.startMinutes === null && assumedStartHour !== null) {
    origin = {
      startMinutes: Math.round(assumedStartHour * 60),
      targetClassId: origin.targetClassId,
    };
    isAssumedOrigin = true;
  }

  var perClass = {};
  var firstClassId = getClassInCompId(dayClasses[0]);
  var lastClassId = getClassInCompId(dayClasses[dayClasses.length - 1]);

  if (origin.startMinutes === null) {
    dayClasses.forEach(function (item) {
      var entries = Number(getEntryCount(item) || 0);
      var duration = computeClassDuration(
        entries,
        minutesPerEntry,
        gapMinutes,
        runsPerGap,
      );

      perClass[getClassInCompId(item)] = {
        hasClockTime: false,
        durationMinutes: duration,
      };
    });

    return {
      hasOrigin: false,
      isAssumedOrigin: false,
      perClass: perClass,
      firstClassId: firstClassId,
      lastClassId: lastClassId,
      tier: "none",
      suggestion: null,
    };
  }

  // The day advances once per POSITION, not once per class. Classes sharing an orderInDay
  // run simultaneously, so a position costs the MAX of its classes' durations, never their
  // sum, and the between-class gap falls once per position boundary rather than once per
  // class. A 5-class tie -- routine in reining -- costs one duration and one gap, not five
  // and four.
  //
  // `dayClasses` is required to be in ascending orderInDay order. The caller's sortClasses
  // guarantees it, and resolveDayOrigin above already depends on it.
  var positions = groupClassesByPosition(dayClasses);
  var cursor = origin.startMinutes;

  positions.forEach(function (positionClasses, index) {
    if (index > 0) {
      cursor += gapMinutes;
    }

    var startMinutes = cursor;
    var durations = positionClasses.map(function (item) {
      var entries = Number(getEntryCount(item) || 0);

      return computeClassDuration(entries, minutesPerEntry, gapMinutes, runsPerGap);
    });

    var positionDuration = durations.reduce(function (longest, duration) {
      return duration > longest ? duration : longest;
    }, 0);

    var finishMinutes = startMinutes + positionDuration;

    positionClasses.forEach(function (item, classIndex) {
      perClass[getClassInCompId(item)] = {
        hasClockTime: true,
        // Every class in a tied position shares the position's start AND finish: they run
        // together and the position is not done until its longest class is. `durationMinutes`
        // stays the class's OWN run length, so for a shorter tied class it is deliberately
        // less than finish - start.
        startMinutes: startMinutes,
        finishMinutes: finishMinutes,
        durationMinutes: durations[classIndex],
      };
    });

    cursor = finishMinutes;
  });

  // The day ends when its last POSITION ends -- never the last row's own finish, which for
  // a short class tied to a long one is earlier than the day actually runs.
  var dayFinishMinutes = cursor;
  var finishHours = dayFinishMinutes / 60;
  var tier = classifyLateFinishTier(finishHours, scheduleConfig);
  var suggestion = null;

  if (isAssumedOrigin) {
    // The origin was invented, so the finish time is too -- suggesting a shift off it would
    // be false precision. Offer instead to make the assumption real. Writes the single class
    // the rest of the machinery already treats as the day's origin, never the whole tied
    // group: `orderInDay` may be null across every class, in which case the tied group is
    // the entire day and a bulk write would stamp the assumed hour onto all of it.
    suggestion = {
      kind: "set",
      targetClassId: origin.targetClassId,
      newStartTime: formatMinutesAsClock(origin.startMinutes),
    };
  } else if (tier === "orange" || tier === "red") {
    var overageMinutes = Math.max(0, finishHours - MIDNIGHT_HOUR) * 60;
    var roundedOverage =
      Math.ceil(overageMinutes / SUGGESTION_ROUND_MINUTES) * SUGGESTION_ROUND_MINUTES;
    // What the overage actually demands, before the 06:00 floor is applied. When the floor
    // bites, the offered start no longer resolves the overage -- the day still finishes late.
    // Saying so is the whole point of finding 6; the button is still offered because an
    // insufficient improvement is better than none.
    var desiredOriginMinutes = origin.startMinutes - roundedOverage;
    var newOriginMinutes = Math.max(
      desiredOriginMinutes,
      EARLIEST_SUGGESTABLE_START_MINUTES,
    );

    suggestion = {
      kind: "advance",
      targetClassId: origin.targetClassId,
      newStartTime: formatMinutesAsClock(newOriginMinutes),
      isInsufficient: desiredOriginMinutes < EARLIEST_SUGGESTABLE_START_MINUTES,
    };
  }

  return {
    hasOrigin: true,
    isAssumedOrigin: isAssumedOrigin,
    perClass: perClass,
    firstClassId: firstClassId,
    // The day's last ROW in order -- the anchor the view renders day-level facts beside.
    // Its own finish is NOT the day's finish when it is the short half of a tied position,
    // which is why dayFinishMinutes is carried separately rather than read back from it.
    lastClassId: lastClassId,
    dayFinishMinutes: dayFinishMinutes,
    tier: tier,
    suggestion: suggestion,
  };
}

/**
 * Computes one schedule column (predicted or live) for every class across every day.
 * Returns null when the competition's field is exempt (no minutesPerEntry configured) --
 * callers should render no schedule columns at all in that case.
 *
 * @param {Array<object>} classes full, unfiltered class list for the competition
 * @param {object} scheduleConfig
 * @param {"avg"|"min"|"max"} viewMode
 * @param {(item: object) => number} getEntryCount
 */
function computeScheduleColumn(classes, scheduleConfig, viewMode, getEntryCount) {
  if (!scheduleConfig || isScheduleExempt(scheduleConfig)) {
    return null;
  }

  var days = groupClassesByDay(classes);
  var byClassId = {};
  var dayByClassId = {};
  var dayResults = [];

  days.forEach(function (day) {
    var result = computeDaySchedule(day.classes, scheduleConfig, viewMode, getEntryCount);

    if (!result) {
      return;
    }

    Object.keys(result.perClass).forEach(function (classId) {
      byClassId[classId] = result.perClass[classId];
      // Every class maps back to its day, not just the first and last, so day-level facts
      // (assumed origin, tier) are answerable for a mid-day row too.
      dayByClassId[classId] = result;
    });

    dayResults.push(result);
  });

  return { byClassId: byClassId, dayByClassId: dayByClassId, dayResults: dayResults };
}

/**
 * Per-row view model for a single schedule column (predicted or live).
 * Returns null if the class has no computed cell (exempt field, or class missing from
 * the computed map for any reason).
 */
function getScheduleCellForClass(scheduleColumn, item) {
  if (!scheduleColumn) {
    return null;
  }

  var classId = getClassInCompId(item);
  var cell = scheduleColumn.byClassId[classId];

  if (!cell) {
    return null;
  }

  var dayResult = scheduleColumn.dayByClassId[classId] || null;

  var isFirstOfDay = !!dayResult && dayResult.firstClassId === classId;
  var isLastOfDay = !!dayResult && dayResult.lastClassId === classId;

  // A "set" suggestion belongs beside the nudge on the day's first row; an "advance"
  // suggestion belongs beside the late-finish warning on its last row.
  var suggestion = null;

  if (dayResult && dayResult.suggestion) {
    var isSetOnFirstRow = dayResult.suggestion.kind === "set" && isFirstOfDay;
    var isAdvanceOnLastRow = dayResult.suggestion.kind === "advance" && isLastOfDay;

    if (isSetOnFirstRow || isAdvanceOnLastRow) {
      suggestion = dayResult.suggestion;
    }
  }

  return {
    hasClockTime: cell.hasClockTime,
    startTime: cell.hasClockTime ? formatMinutesAsClock(cell.startMinutes) : null,
    finishTime: cell.hasClockTime ? formatMinutesAsClock(cell.finishMinutes) : null,
    // The clock wraps at midnight, so these say which side of it the time falls on.
    startsAfterMidnight: cell.hasClockTime && isAfterMidnight(cell.startMinutes),
    finishesAfterMidnight: cell.hasClockTime && isAfterMidnight(cell.finishMinutes),
    durationMinutes: cell.durationMinutes,
    // Day-level fact, answerable from any row of the day: when its last POSITION finishes.
    dayFinishTime:
      dayResult && dayResult.dayFinishMinutes !== undefined
        ? formatMinutesAsClock(dayResult.dayFinishMinutes)
        : null,
    dayFinishesAfterMidnight:
      !!dayResult &&
      dayResult.dayFinishMinutes !== undefined &&
      isAfterMidnight(dayResult.dayFinishMinutes),
    dayHasOrigin: dayResult ? dayResult.hasOrigin : true,
    isAssumedOrigin: dayResult ? !!dayResult.isAssumedOrigin : false,
    isFirstOfDay: isFirstOfDay,
    isLastOfDay: isLastOfDay,
    tier: isLastOfDay && dayResult ? dayResult.tier : "none",
    suggestion: suggestion,
  };
}

/**
 * Day-level schedule facts for one day, for the notices panel above the table. Returns null
 * when the day has no computed schedule. Takes any class of the day -- every class maps back
 * to its own day result.
 */
function getScheduleDayResult(scheduleColumn, item) {
  if (!scheduleColumn || !item) {
    return null;
  }

  var dayResult = scheduleColumn.dayByClassId[getClassInCompId(item)];

  if (!dayResult) {
    return null;
  }

  return {
    hasOrigin: dayResult.hasOrigin,
    isAssumedOrigin: !!dayResult.isAssumedOrigin,
    tier: dayResult.tier,
    suggestion: dayResult.suggestion,
    dayFinishTime:
      dayResult.dayFinishMinutes === undefined
        ? null
        : formatMinutesAsClock(dayResult.dayFinishMinutes),
    dayFinishesAfterMidnight:
      dayResult.dayFinishMinutes !== undefined &&
      isAfterMidnight(dayResult.dayFinishMinutes),
  };
}

export {
  computeScheduleColumn,
  getScheduleCellForClass,
  getScheduleDayResult,
  isScheduleExempt,
  getMinutesPerEntry,
};
