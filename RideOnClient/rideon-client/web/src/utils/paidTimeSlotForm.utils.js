var WEEKDAY_NAMES_BY_INDEX = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

var TIME_OF_DAY_OPTIONS_BY_TIMING = {
  before: ["בוקר", "צהריים", "ערב"],
  during: ["בוקר", "ערב"],
};

var BEFORE_WINDOW_DAYS = 3;

var TIMING_OPTIONS = [
  { value: "before", label: "לפני התחרות" },
  { value: "during", label: "במהלך התחרות" },
];

function parseDateOnlyParts(value) {
  var parts = String(value).slice(0, 10).split("-");

  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
  };
}

function toDateOnlyString(year, month, day) {
  return (
    String(year).padStart(4, "0") +
    "-" +
    String(month).padStart(2, "0") +
    "-" +
    String(day).padStart(2, "0")
  );
}

function addDaysToDateOnly(value, days) {
  var parts = parseDateOnlyParts(value);
  var utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return toDateOnlyString(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
  );
}

function getWeekdayIndexForDateOnly(value) {
  var parts = parseDateOnlyParts(value);
  var utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  return utcDate.getUTCDay();
}

function formatDateOnlyForDisplay(value) {
  if (!value) {
    return "";
  }

  var parts = parseDateOnlyParts(value);

  return (
    String(parts.day).padStart(2, "0") +
    "/" +
    String(parts.month).padStart(2, "0") +
    "/" +
    String(parts.year)
  );
}

function buildDateRangeOptions(startDate, endDate) {
  var options = [];
  var cursor = startDate;

  while (cursor <= endDate) {
    var weekdayIndex = getWeekdayIndexForDateOnly(cursor);

    options.push({
      dateValue: cursor,
      weekdayIndex: weekdayIndex,
      dayName: WEEKDAY_NAMES_BY_INDEX[weekdayIndex],
    });

    cursor = addDaysToDateOnly(cursor, 1);
  }

  return options;
}

function buildDayOptions(timing, competitionStartDate, competitionEndDate) {
  if (!timing || !competitionStartDate) {
    return [];
  }

  if (timing === "during") {
    if (!competitionEndDate) {
      return [];
    }

    return buildDateRangeOptions(competitionStartDate, competitionEndDate);
  }

  if (timing === "before") {
    var rangeStart = addDaysToDateOnly(
      competitionStartDate,
      -BEFORE_WINDOW_DAYS,
    );
    var rangeEnd = addDaysToDateOnly(competitionStartDate, -1);

    return buildDateRangeOptions(rangeStart, rangeEnd);
  }

  return [];
}

function getTimeOfDayOptions(timing) {
  return TIME_OF_DAY_OPTIONS_BY_TIMING[timing] || [];
}

function getTimingForDate(dateValue, competitionStartDate, competitionEndDate) {
  if (!dateValue || !competitionStartDate || !competitionEndDate) {
    return "";
  }

  if (dateValue >= competitionStartDate && dateValue <= competitionEndDate) {
    return "during";
  }

  var beforeRangeStart = addDaysToDateOnly(
    competitionStartDate,
    -BEFORE_WINDOW_DAYS,
  );

  if (dateValue >= beforeRangeStart && dateValue < competitionStartDate) {
    return "before";
  }

  return "";
}

function findBaseSlotId(baseSlots, dayName, timeOfDay) {
  if (!Array.isArray(baseSlots) || !dayName || !timeOfDay) {
    return null;
  }

  var match = baseSlots.find(function (slot) {
    var slotDayName = slot.dayOfWeek || slot.DayOfWeek;
    var slotTimeOfDay = slot.timeOfDay || slot.TimeOfDay;

    return slotDayName === dayName && slotTimeOfDay === timeOfDay;
  });

  if (!match) {
    return null;
  }

  return match.paidTimeSlotId || match.PaidTimeSlotId || null;
}

function buildQuarterHourOptions() {
  var options = [];

  for (var hour = 0; hour < 24; hour++) {
    [0, 15, 30, 45].forEach(function (minute) {
      options.push(
        String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0"),
      );
    });
  }

  return options;
}

export {
  WEEKDAY_NAMES_BY_INDEX,
  TIMING_OPTIONS,
  BEFORE_WINDOW_DAYS,
  addDaysToDateOnly,
  formatDateOnlyForDisplay,
  buildDayOptions,
  getTimeOfDayOptions,
  getTimingForDate,
  findBaseSlotId,
  buildQuarterHourOptions,
};
