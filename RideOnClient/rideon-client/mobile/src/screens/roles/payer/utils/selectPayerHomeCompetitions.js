// Effective statuses (Hebrew) as returned by the backend.
var STATUS_FUTURE = "עתידית";
var STATUS_ACTIVE = "פעילה";
var STATUS_CURRENT = "כעת";
var STATUS_FINISHED = "הסתיימה";

var RECENTLY_FINISHED_DAYS = 7;
var UPCOMING_SOON_DAYS = 30;
var HOME_MAX_ITEMS = 3;

function startOfDay(value) {
  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(fromDate, toDate) {
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
}

// Home teaser: enrolled competitions that are still live or finished within the
// last week, plus ranch competitions starting within the next month.
function selectHomeCompetitions(items) {
  var source = Array.isArray(items) ? items : [];
  var today = startOfDay(new Date());

  var selected = source.filter(function (item) {
    if (!item) {
      return false;
    }

    var status = item.competitionStatus;
    var startDate = startOfDay(item.competitionStartDate);
    var endDate = startOfDay(item.competitionEndDate);

    if (item.hasParticipated) {
      if (
        status === STATUS_ACTIVE ||
        status === STATUS_CURRENT ||
        status === STATUS_FUTURE
      ) {
        return true;
      }

      if (status === STATUS_FINISHED && endDate) {
        return daysBetween(endDate, today) <= RECENTLY_FINISHED_DAYS;
      }

      return false;
    }

    if (status === STATUS_FUTURE && startDate) {
      var daysUntilStart = daysBetween(today, startDate);
      return daysUntilStart >= 0 && daysUntilStart <= UPCOMING_SOON_DAYS;
    }

    return false;
  });

  return selected
    .sort(function (a, b) {
      if (Boolean(a.hasParticipated) !== Boolean(b.hasParticipated)) {
        return a.hasParticipated ? -1 : 1;
      }

      return String(a.competitionStartDate || "").localeCompare(
        String(b.competitionStartDate || ""),
      );
    })
    .slice(0, HOME_MAX_ITEMS);
}

export { selectHomeCompetitions };
