import { sortCompetitionsByStatusAndDate } from "./competitionSorting";

var DRAFT_STATUS = "טיוטה";
var DEFAULT_SHORTLIST_CAP = 3;

// Admin/Worker home teasers are only ever allowed to show a live or
// upcoming competition — never a finished or cancelled one, even if fewer
// than the cap is otherwise available. Payer's teaser is an intentional
// exception with its own eligibility rule and does not use this constant
// (see PayerHomeScreen's own selectHomeCompetitions).
var HOME_TEASER_ALLOWED_STATUSES = ["כעת", "פעילה", "עתידית"];

// Pure ordering/selection helper shared by the mobile home teasers: excludes
// draft, optionally restricts to an explicit allowed-status set, applies the
// given status order + date, caps the result. Per-role scope (which list
// feeds it, e.g. ranch-scoped vs cross-ranch) stays in the calling screen;
// callers that need a restricted eligibility set (e.g. Admin/Worker via
// HOME_TEASER_ALLOWED_STATUSES) pass it explicitly rather than the primitive
// assuming it for every caller.
function selectCompetitionsShortlist(items, statusOrder, cap, allowedStatuses) {
  var source = Array.isArray(items) ? items : [];
  var maxItems = typeof cap === "number" ? cap : DEFAULT_SHORTLIST_CAP;

  var eligible = source.filter(function (item) {
    if (!item || item.competitionStatus === DRAFT_STATUS) {
      return false;
    }

    if (
      Array.isArray(allowedStatuses) &&
      allowedStatuses.indexOf(item.competitionStatus) === -1
    ) {
      return false;
    }

    return true;
  });

  return sortCompetitionsByStatusAndDate(eligible, statusOrder).slice(
    0,
    maxItems,
  );
}

export {
  selectCompetitionsShortlist,
  DEFAULT_SHORTLIST_CAP,
  HOME_TEASER_ALLOWED_STATUSES,
};
