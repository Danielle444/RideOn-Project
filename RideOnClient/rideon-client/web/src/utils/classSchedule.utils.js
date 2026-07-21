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

function formatMinutesAsClock(totalMinutes) {
  var hours = Math.floor(totalMinutes / 60);
  var minutes = Math.round(totalMinutes % 60);
  var hh = hours < 10 ? "0" + hours : String(hours);
  var mm = minutes < 10 ? "0" + minutes : String(minutes);

  return hh + ":" + mm;
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

  var cursor = origin.startMinutes;

  dayClasses.forEach(function (item, index) {
    if (index > 0) {
      cursor += gapMinutes;
    }

    var startMinutes = cursor;
    var entries = Number(getEntryCount(item) || 0);
    var duration = computeClassDuration(
      entries,
      minutesPerEntry,
      gapMinutes,
      runsPerGap,
    );
    var finishMinutes = startMinutes + duration;

    perClass[getClassInCompId(item)] = {
      hasClockTime: true,
      startMinutes: startMinutes,
      finishMinutes: finishMinutes,
      durationMinutes: duration,
    };

    cursor = finishMinutes;
  });

  var finishMinutesOfDay = perClass[lastClassId].finishMinutes;
  var finishHours = finishMinutesOfDay / 60;
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
    lastClassId: lastClassId,
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
    durationMinutes: cell.durationMinutes,
    dayHasOrigin: dayResult ? dayResult.hasOrigin : true,
    isAssumedOrigin: dayResult ? !!dayResult.isAssumedOrigin : false,
    isFirstOfDay: isFirstOfDay,
    isLastOfDay: isLastOfDay,
    tier: isLastOfDay && dayResult ? dayResult.tier : "none",
    suggestion: suggestion,
  };
}

export {
  computeScheduleColumn,
  getScheduleCellForClass,
  isScheduleExempt,
  getMinutesPerEntry,
};
