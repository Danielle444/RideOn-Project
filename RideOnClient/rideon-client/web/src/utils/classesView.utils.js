// Which of the three secretary classes views is showing, and which one opens by default.
//
// The secretary never picks the default -- it is derived from where the competition sits
// relative to its registration window.

var CLASSES_VIEW_FINANCIAL = "financial";
var CLASSES_VIEW_PLANNING = "planning";
var CLASSES_VIEW_ACTUALS = "actuals";

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

function readCompetitionField(competition, camelKey, pascalKey) {
  if (!competition) {
    return null;
  }

  var value = competition[camelKey];

  if (value === null || value === undefined) {
    value = competition[pascalKey];
  }

  return value === null || value === undefined ? null : value;
}

/**
 * Has this competition's registration window closed?
 *
 * `registrationenddate` is the authoritative signal, but it is NULL on every historical
 * competition in the live database (comps 34-38, all status הסתיימה, verified 2026-07-21) --
 * the field post-dates them. So a missing registration end date falls back to the
 * competition's own start date: a competition that has already begun is not still taking
 * registrations. A competition with neither date is treated as still open, which keeps the
 * forecast view -- the safer default, since it never claims actuals are final.
 *
 * @param {object} competition
 * @param {Date} [now] injectable for tests
 * @returns {boolean}
 */
function isRegistrationClosed(competition, now) {
  var today = toDateOnly(now || new Date());

  var registrationEnd = readDate(
    readCompetitionField(competition, "registrationEndDate", "RegistrationEndDate"),
  );

  if (registrationEnd) {
    return today > toDateOnly(registrationEnd);
  }

  var competitionStart = readDate(
    readCompetitionField(competition, "competitionStartDate", "CompetitionStartDate"),
  );

  if (competitionStart) {
    return today >= toDateOnly(competitionStart);
  }

  return false;
}

/**
 * Has this competition ended?
 *
 * `competitionEndDate` is read with the same camelCase/PascalCase fallback as every other
 * competition field here. No valid end date -> not ended (the safer default, same reasoning as
 * isRegistrationClosed: never claim a phase is over on missing data).
 *
 * @param {object} competition
 * @param {Date} [now] injectable for tests
 * @returns {boolean}
 */
function isCompetitionEnded(competition, now) {
  var today = toDateOnly(now || new Date());

  var competitionEnd = readDate(
    readCompetitionField(competition, "competitionEndDate", "CompetitionEndDate"),
  );

  if (!competitionEnd) {
    return false;
  }

  return today > toDateOnly(competitionEnd);
}

/**
 * The actuals view is the only one that waits on anything. Financial is a lens, not a phase,
 * and the forecast is always worth looking at -- including after the fact, to see what was
 * predicted.
 */
function isClassesViewAvailable(viewKey, competition, now) {
  if (viewKey !== CLASSES_VIEW_ACTUALS) {
    return true;
  }

  return isRegistrationClosed(competition, now);
}

/**
 * The tab that opens when the page loads. Never a stored preference -- always derived.
 */
function resolveDefaultClassesView(competition, now) {
  return isRegistrationClosed(competition, now)
    ? CLASSES_VIEW_ACTUALS
    : CLASSES_VIEW_PLANNING;
}

// Which views each column appears in.
//
// Financial columns live only in the financial view -- it is a lens rather than a time
// phase, and its column list is exhaustive by definition. In the two time-phase views,
// advice retires but arithmetic stays: the live schedule and real counts (entries) remain in
// actuals, while the predicted schedule, predicted entries, and the planned-vs-actual
// comparison retire once the forecast is over. (This map still lists "schedule" as
// PLANNING_AND_ACTUALS -- the predicted-vs-live split within that one logical column is
// resolved in the table component, so the live cell keeps showing in actuals even though the
// predicted cell does not.) Identity columns (order, name) are everywhere because a row with
// neither cannot be read.
var PLANNING_AND_ACTUALS = [CLASSES_VIEW_PLANNING, CLASSES_VIEW_ACTUALS];
var EVERY_VIEW = [CLASSES_VIEW_FINANCIAL, CLASSES_VIEW_PLANNING, CLASSES_VIEW_ACTUALS];

var COLUMN_VIEWS = {
  orderInDay: EVERY_VIEW,
  className: EVERY_VIEW,
  actions: EVERY_VIEW,

  organizerCost: [CLASSES_VIEW_FINANCIAL],
  federationCost: [CLASSES_VIEW_FINANCIAL],
  prizes: [CLASSES_VIEW_FINANCIAL],

  status: PLANNING_AND_ACTUALS,
  entries: PLANNING_AND_ACTUALS,
  predictedEntries: [CLASSES_VIEW_PLANNING],
  pattern: PLANNING_AND_ACTUALS,
  judges: PLANNING_AND_ACTUALS,
  arena: PLANNING_AND_ACTUALS,
  startTime: PLANNING_AND_ACTUALS,
  schedule: PLANNING_AND_ACTUALS,

  // Parked (CAP-5): the aggregate diagnostic retires from every view, but the code stays --
  // compareClassToPrediction is still load-bearing for the per-class color in actuals.
  plannedVsActual: [],
};

function isColumnVisible(columnKey, viewKey) {
  var views = COLUMN_VIEWS[columnKey];

  return !!views && views.indexOf(viewKey) >= 0;
}

export {
  CLASSES_VIEW_FINANCIAL,
  CLASSES_VIEW_PLANNING,
  CLASSES_VIEW_ACTUALS,
  isRegistrationClosed,
  isCompetitionEnded,
  isClassesViewAvailable,
  resolveDefaultClassesView,
  isColumnVisible,
};
