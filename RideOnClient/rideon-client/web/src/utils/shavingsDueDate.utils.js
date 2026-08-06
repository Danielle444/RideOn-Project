// Delivery due-date urgency — secretary shavings "requires attention" section.
//
// `requestedDeliveryTime` is a Postgres `timestamp without time zone` column (proc 176):
// it serializes to JSON with NO `Z`/offset. Feeding that string to `new Date(...)` would have
// JS reinterpret it in the DEVICE's local zone, which is exactly the "device UTC assumption"
// this feature must avoid. Since the value is a naive wall-clock timestamp entered by the
// secretary as an Israel business date to begin with (AddShavingsOrderModal concatenates the
// picked date/time directly, no timezone math anywhere in the chain), the calendar date it
// represents IS the literal YYYY-MM-DD prefix of the string. Reading that substring sidesteps
// the reinterpretation risk entirely instead of trying to "fix" it with a timezone conversion.
//
// "Today" is a real instant, so it DOES need a real conversion: Intl.DateTimeFormat with
// timeZone: "Asia/Jerusalem" gives the current Israel calendar date regardless of the browser's
// own timezone.
import {
  parseDateOnly,
  compareDateOnly,
} from "../components/common/DatePicker.utils";
import {
  getRequestedDeliveryTime,
  getDelivered,
  getIsCancelled,
} from "./shavingsStatus.utils";

export const ISRAEL_TIME_ZONE = "Asia/Jerusalem";

const israelDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISRAEL_TIME_ZONE,
});

const israelDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISRAEL_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const MS_PER_HOUR = 1000 * 60 * 60;

// {year, month, day} for "now" as seen on an Israel wall clock.
export function getIsraelToday(now = Date.now()) {
  const formatted = israelDateFormatter.format(new Date(now));
  return parseDateOnly(formatted);
}

// {year, month, day, hour, minute, second} for "now" as seen on an Israel wall clock -- the
// time-of-day companion to getIsraelToday, used by getHoursSinceDue below.
function getIsraelNowParts(now) {
  const lookup = {};
  israelDateTimeFormatter.formatToParts(new Date(now)).forEach(function (part) {
    lookup[part.type] = part.value;
  });

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

// Full literal (date + time) parse of a naive `requestedDeliveryTime` string -- same "read the
// digits, never `new Date(str)`" approach as getRequestedDeliveryDateOnly, extended with
// hour/minute/second so elapsed-hours math can anchor to the actual due moment.
function parseNaiveDateTime(raw) {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;

  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour > 23 || minute > 59 || second > 59
  ) {
    return null;
  }

  return { year, month, day, hour, minute, second };
}

// Both sides are naive Israel wall-clock readings (never a real UTC instant), so this is a plain
// calendar-arithmetic diff -- Date.UTC here is just an arithmetic scratchpad, not a real-world
// timezone conversion. Mirrors how getIsraelToday/compareDateOnly treat dates: no device-timezone
// or DST reinterpretation risk, because neither side is ever fed through `new Date(str)`.
function wallClockPartsToComparableMs(parts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

// Hours elapsed since the order's actual requested delivery MOMENT (date and time-of-day), not
// just its calendar date. Null when requestedDeliveryTime is missing/malformed. Callers should
// only trust this once getDeliveryUrgency has already confirmed the order is due (dueToday or
// overdue) -- it does not itself check urgency.
export function getHoursSinceDue(order, now = Date.now()) {
  const due = parseNaiveDateTime(getRequestedDeliveryTime(order));

  if (!due) {
    return null;
  }

  const dueMs = wallClockPartsToComparableMs(due);
  const nowMs = wallClockPartsToComparableMs(getIsraelNowParts(now));

  return (nowMs - dueMs) / MS_PER_HOUR;
}

// {year, month, day} of the order's requested delivery date, or null when the value is
// null/empty/not a string, or its first 10 characters aren't a well-formed YYYY-MM-DD date
// (parseDateOnly itself rejects out-of-range month/day) -- any of those count as "no usable
// due date" for classification purposes.
export function getRequestedDeliveryDateOnly(order) {
  const raw = getRequestedDeliveryTime(order);

  if (!raw || typeof raw !== "string" || raw.length < 10) {
    return null;
  }

  return parseDateOnly(raw.slice(0, 10));
}

// "overdue" | "dueToday" | "future" | "noDate" — pure date classification, independent of
// delivered/cancelled state (callers combine it with those separately). "noDate" covers a
// null/empty/malformed requestedDeliveryTime alike -- it is neither overdue nor due today, so
// isActionRequired below excludes it (confirmed business rule, 2026-08-07).
export function getDeliveryUrgency(order, now = Date.now()) {
  const dueDate = getRequestedDeliveryDateOnly(order);

  if (!dueDate) {
    return "noDate";
  }

  const cmp = compareDateOnly(dueDate, getIsraelToday(now));

  if (cmp < 0) {
    return "overdue";
  }

  if (cmp === 0) {
    return "dueToday";
  }

  return "future";
}

// Action-required = not delivered, not terminally (approved) cancelled, and due today or
// overdue. A null/empty/malformed due date ("noDate") is EXCLUDED -- it is neither overdue nor
// due today, so it cannot satisfy the business rule (confirmed business rule, 2026-08-07;
// supersedes an earlier "fold noDate into overdue" draft that was never confirmed). A PENDING
// cancellation stays included on purpose — it remains visible for operational awareness
// (ShavingsCancellationBadge already marks it read-only "ממתין לביטול" and the cancel button
// already locks it) — only an APPROVED cancellation drops an order from this section. Excludes
// "future" so upcoming orders never appear here.
export function isActionRequired(order, now = Date.now()) {
  if (getDelivered(order)) {
    return false;
  }

  if (getIsCancelled(order)) {
    return false;
  }

  const urgency = getDeliveryUrgency(order, now);
  return urgency === "overdue" || urgency === "dueToday";
}

// Every order reaching this comparator has already passed isActionRequired, which now excludes
// "noDate" entirely -- so da/db are always real dates here. The null branches stay as a defensive
// fallback only (never expected to trigger), not because a no-date row can reach this section.
function compareByDueDate(a, b) {
  const da = getRequestedDeliveryDateOnly(a);
  const db = getRequestedDeliveryDateOnly(b);

  if (!da && !db) {
    return 0;
  }

  if (!da) {
    return -1;
  }

  if (!db) {
    return 1;
  }

  return compareDateOnly(da, db);
}

// Splits the full order list into the two "requires attention" groups (overdue first, due-today
// second, per spec), sorted oldest-due-first within each. A null/empty/malformed due date is
// excluded entirely by isActionRequired -- it never appears in either group.
export function groupActionRequiredOrders(orders, now = Date.now()) {
  const list = Array.isArray(orders) ? orders : [];
  const overdue = [];
  const dueToday = [];

  list.forEach(function (order) {
    if (!isActionRequired(order, now)) {
      return;
    }

    if (getDeliveryUrgency(order, now) === "dueToday") {
      dueToday.push(order);
    } else {
      overdue.push(order);
    }
  });

  overdue.sort(compareByDueDate);
  dueToday.sort(compareByDueDate);

  return { overdue: overdue, dueToday: dueToday, all: overdue.concat(dueToday) };
}
