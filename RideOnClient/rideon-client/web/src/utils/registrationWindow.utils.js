// The registration-open window instrument: is this competition filling fast enough?
//
// Denominated by POSITION IN THE WINDOW, never by raw percentage. 50% of forecast on day 2
// of a 30-day window is healthy; 50% with three days left is urgent. A flat threshold would
// fire on every competition at the start of every window and teach the secretary to ignore
// it.
//
// The comparison is: how far through the window are we, versus how far toward the forecast
// are we. A competition tracking its window is fine. One materially behind its window is
// worth acting on, and the closer to the deadline, the less room is left to recover.
//
// Copy caution baked into the verdicts: early in the window the FORECAST is usually the less
// reliable side, so the wording leans "the forecast may be high" rather than "the competition
// is failing". Only late in the window, when the forecast has had time to be tested, does the
// language shift to the registration itself.

var WINDOW_STATUS_CLOSED = "closed";
var WINDOW_STATUS_ON_TRACK = "onTrack";
var WINDOW_STATUS_EARLY_SOFT = "earlySoft";
var WINDOW_STATUS_BEHIND = "behind";
var WINDOW_STATUS_URGENT = "urgent";

// How far behind its own window progress a competition may drift before it is called out.
// A window 60% elapsed with only 35% of forecast entries is 25 points behind.
var BEHIND_GAP = 0.2;

// Past this much of the window elapsed, there is too little time left to recover, so the
// same gap is treated as urgent rather than merely behind.
var URGENT_WINDOW_ELAPSED = 0.7;

// Before this much of the window has passed, a gap is more likely to be forecast error than
// a real shortfall -- registrations cluster near the deadline.
var EARLY_WINDOW_ELAPSED = 0.3;

function readDate(value) {
  if (!value) {
    return null;
  }

  var parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function readField(competition, camelKey, pascalKey) {
  if (!competition) {
    return null;
  }

  var value = competition[camelKey];

  if (value === null || value === undefined) {
    value = competition[pascalKey];
  }

  return value === null || value === undefined ? null : value;
}

var MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Where the competition sits in its registration window, and whether registration is
 * keeping pace with the forecast.
 *
 * Returns status `closed` whenever the window is not currently open -- including when the
 * dates are missing entirely, which is the case for every historical competition.
 *
 * @param {object} competition
 * @param {number} actualEntries total Active entries so far
 * @param {number} predictedEntries total forecast entries
 * @param {Date} [now] injectable for tests
 */
function analyzeRegistrationWindow(competition, actualEntries, predictedEntries, now) {
  var today = toDateOnly(now || new Date());

  var openDate = readDate(readField(competition, "registrationOpenDate", "RegistrationOpenDate"));
  var endDate = readDate(readField(competition, "registrationEndDate", "RegistrationEndDate"));

  if (!openDate || !endDate) {
    return { status: WINDOW_STATUS_CLOSED, isOpen: false };
  }

  var start = toDateOnly(openDate);
  var end = toDateOnly(endDate);

  if (today < start || today > end) {
    return { status: WINDOW_STATUS_CLOSED, isOpen: false };
  }

  var totalDays = Math.max(Math.round((end - start) / MS_PER_DAY), 1);
  var elapsedDays = Math.round((today - start) / MS_PER_DAY);
  var daysRemaining = Math.max(totalDays - elapsedDays, 0);

  // Clamped to 1 so the final day reads as a full window rather than overflowing.
  var windowElapsed = Math.min(elapsedDays / totalDays, 1);

  var forecast = Number(predictedEntries || 0);
  var actual = Number(actualEntries || 0);

  // With no forecast there is nothing to be behind of. Say the window is open and stop.
  if (forecast <= 0) {
    return {
      status: WINDOW_STATUS_ON_TRACK,
      isOpen: true,
      totalDays: totalDays,
      daysRemaining: daysRemaining,
      windowElapsed: windowElapsed,
      forecastProgress: 0,
      actualEntries: actual,
      predictedEntries: 0,
      gap: 0,
    };
  }

  var forecastProgress = Math.min(actual / forecast, 1);
  var gap = windowElapsed - forecastProgress;

  var base = {
    isOpen: true,
    totalDays: totalDays,
    daysRemaining: daysRemaining,
    windowElapsed: windowElapsed,
    forecastProgress: forecastProgress,
    actualEntries: actual,
    predictedEntries: forecast,
    gap: gap,
  };

  if (gap < BEHIND_GAP) {
    base.status = WINDOW_STATUS_ON_TRACK;
    return base;
  }

  if (windowElapsed >= URGENT_WINDOW_ELAPSED) {
    base.status = WINDOW_STATUS_URGENT;
    return base;
  }

  // Behind, but early enough that the forecast is the likelier culprit.
  base.status =
    windowElapsed <= EARLY_WINDOW_ELAPSED
      ? WINDOW_STATUS_EARLY_SOFT
      : WINDOW_STATUS_BEHIND;

  return base;
}

export {
  WINDOW_STATUS_CLOSED,
  WINDOW_STATUS_ON_TRACK,
  WINDOW_STATUS_EARLY_SOFT,
  WINDOW_STATUS_BEHIND,
  WINDOW_STATUS_URGENT,
  BEHIND_GAP,
  URGENT_WINDOW_ELAPSED,
  EARLY_WINDOW_ELAPSED,
  analyzeRegistrationWindow,
};
