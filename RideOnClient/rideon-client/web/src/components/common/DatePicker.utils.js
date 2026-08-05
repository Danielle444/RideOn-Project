// Pure date-only (YYYY-MM-DD) helpers for the shared DatePicker. Kept
// dependency-free and side-effect-free so calendar math and parsing can be
// unit-tested without a DOM. All parsing/formatting works on explicit
// {year, month, day} parts rather than ISO strings fed through `new Date()`,
// so nothing here is sensitive to the runtime's local timezone offset.

var HEBREW_MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

var HEBREW_WEEKDAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Accepts only a strict YYYY-MM-DD string. Returns null for "", null,
// undefined or anything malformed -- callers treat null as "no date".
function parseDateOnly(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year: year, month: month, day: day };
}

function formatDateOnly(parts) {
  return parts.year + "-" + pad2(parts.month) + "-" + pad2(parts.day);
}

// Local calendar "today" -- deliberately NOT UTC, so the picker's notion of
// "today" matches what the user's own clock and calendar app would show.
function getLocalToday() {
  var now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function compareDateOnly(a, b) {
  if (a.year !== b.year) {
    return a.year - b.year;
  }

  if (a.month !== b.month) {
    return a.month - b.month;
  }

  return a.day - b.day;
}

// new Date(year, monthIndex, day) with numeric args reads/writes local
// calendar fields directly -- no ISO-string parsing, so no UTC shift risk.
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstWeekdayOfMonth(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

function isDateWithinRange(parts, minParts, maxParts) {
  if (minParts && compareDateOnly(parts, minParts) < 0) {
    return false;
  }

  if (maxParts && compareDateOnly(parts, maxParts) > 0) {
    return false;
  }

  return true;
}

function shiftMonth(year, month, delta) {
  var zeroBased = month - 1 + delta;
  var nextYear = year + Math.floor(zeroBased / 12);
  var nextMonth = ((zeroBased % 12) + 12) % 12;

  return { year: nextYear, month: nextMonth + 1 };
}

// Builds a flat list of calendar cells for the given month: leading nulls for
// the blank days before day 1 (aligned to a Sunday-first week), then 1..N.
function buildMonthCells(year, month) {
  var totalDays = daysInMonth(year, month);
  var firstWeekday = getFirstWeekdayOfMonth(year, month);
  var cells = [];

  for (var i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }

  for (var day = 1; day <= totalDays; day++) {
    cells.push(day);
  }

  return cells;
}

export {
  HEBREW_MONTH_NAMES,
  HEBREW_WEEKDAY_LABELS,
  parseDateOnly,
  formatDateOnly,
  getLocalToday,
  compareDateOnly,
  daysInMonth,
  getFirstWeekdayOfMonth,
  isDateWithinRange,
  shiftMonth,
  buildMonthCells,
};
