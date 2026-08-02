// Which financial tab (Prediction / Actual / Comparison) is showing on the competition-summary
// page, and which one is selected by default. Mirrors classesView.utils's
// resolveDefaultClassesView / hasChosenView split, for the same reason: the secretary never
// picks the default herself, it is derived from the competition's registration window -- and
// that window is not known synchronously. useCompetitionSummaryPage's financialRegistrationClosed
// starts out false (it derives from a competition record that is fetched asynchronously and
// starts null), so the default has to be re-resolved every time it changes, not just once at
// mount.
import {
  TAB_PROJECTION,
  TAB_ACTUAL,
} from "../components/secretary/competition-summary/FinancialProjectionTabs";

/**
 * Decides the next activeView / hasChosenView pair for the competition-summary page's financial
 * tabs. Called on every relevant change (competition switch, registration-closed becoming known,
 * a manual tab click) -- not just once at mount.
 *
 * - A competition switch always re-resolves the default, even if the secretary had chosen a tab
 *   for the previous competition: a manual choice does not carry over to a different competition.
 * - Once the secretary has chosen a tab for the CURRENT competition, later re-resolutions (e.g.
 *   registration closing while she is looking at Prediction) leave her choice alone.
 * - Otherwise the default is derived fresh from registrationClosed: Actual once closed, else
 *   Prediction.
 *
 * @param {object} input
 * @param {number|string|null} input.previousCompetitionId
 * @param {number|string|null} input.competitionId
 * @param {boolean} input.hasChosenView
 * @param {string} input.currentActiveView
 * @param {boolean} input.registrationClosed
 * @returns {{activeView: string, hasChosenView: boolean}}
 */
function resolveFinancialActiveView(input) {
  var competitionChanged = input.previousCompetitionId !== input.competitionId;

  if (!competitionChanged && input.hasChosenView) {
    return {
      activeView: input.currentActiveView,
      hasChosenView: true,
    };
  }

  return {
    activeView: input.registrationClosed ? TAB_ACTUAL : TAB_PROJECTION,
    hasChosenView: false,
  };
}

/**
 * The view the tab strip highlights and the view the page body renders must always be the same
 * one. If the currently-selected view is not available (e.g. registration reopened under her),
 * this is the shared fallback both use -- Prediction, never a blank body.
 *
 * @param {string} activeView
 * @param {object} availability map of view key -> boolean
 * @returns {string}
 */
function resolveEffectiveFinancialView(activeView, availability) {
  return availability[activeView] ? activeView : TAB_PROJECTION;
}

export { resolveFinancialActiveView, resolveEffectiveFinancialView };
