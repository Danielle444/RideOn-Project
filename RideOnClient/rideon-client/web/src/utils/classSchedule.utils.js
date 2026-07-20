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

  var origin = resolveDayOrigin(dayClasses);
  var perClass = {};
  var firstClassId = getClassInCompId(dayClasses[0]);
  var lastClassId = getClassInCompId(dayClasses[dayClasses.length - 1]);

  if (origin.startMinutes === null) {
    dayClasses.forEach(function (item) {
      var entries = Number(getEntryCount(item) || 0);
      var duration = Math.round(entries * minutesPerEntry);

      perClass[getClassInCompId(item)] = {
        hasClockTime: false,
        durationMinutes: duration,
      };
    });

    return {
      hasOrigin: false,
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
    var duration = Math.round(entries * minutesPerEntry);
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

  if (tier === "orange" || tier === "red") {
    var overageMinutes = Math.max(0, finishHours - MIDNIGHT_HOUR) * 60;
    var roundedOverage =
      Math.ceil(overageMinutes / SUGGESTION_ROUND_MINUTES) * SUGGESTION_ROUND_MINUTES;
    var newOriginMinutes = Math.max(
      origin.startMinutes - roundedOverage,
      EARLIEST_SUGGESTABLE_START_MINUTES,
    );

    suggestion = {
      targetClassId: origin.targetClassId,
      newStartTime: formatMinutesAsClock(newOriginMinutes),
    };
  }

  return {
    hasOrigin: true,
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
  var dayResults = [];

  days.forEach(function (day) {
    var result = computeDaySchedule(day.classes, scheduleConfig, viewMode, getEntryCount);

    if (!result) {
      return;
    }

    Object.keys(result.perClass).forEach(function (classId) {
      byClassId[classId] = result.perClass[classId];
    });

    dayResults.push(result);
  });

  return { byClassId: byClassId, dayResults: dayResults };
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

  var dayResult = scheduleColumn.dayResults.find(function (day) {
    return day.firstClassId === classId || day.lastClassId === classId;
  });

  var isFirstOfDay = !!dayResult && dayResult.firstClassId === classId;
  var isLastOfDay = !!dayResult && dayResult.lastClassId === classId;

  return {
    hasClockTime: cell.hasClockTime,
    startTime: cell.hasClockTime ? formatMinutesAsClock(cell.startMinutes) : null,
    finishTime: cell.hasClockTime ? formatMinutesAsClock(cell.finishMinutes) : null,
    durationMinutes: cell.durationMinutes,
    dayHasOrigin: dayResult ? dayResult.hasOrigin : true,
    isFirstOfDay: isFirstOfDay,
    isLastOfDay: isLastOfDay,
    tier: isLastOfDay && dayResult ? dayResult.tier : "none",
    suggestion: isLastOfDay && dayResult ? dayResult.suggestion : null,
  };
}

export {
  computeScheduleColumn,
  getScheduleCellForClass,
  isScheduleExempt,
  getMinutesPerEntry,
};
