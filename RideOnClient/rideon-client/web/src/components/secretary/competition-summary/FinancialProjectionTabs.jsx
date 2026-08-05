import { FINANCIAL_PROJECTION_COPY } from "./financialProjectionCopy";

var TAB_PROJECTION = "projection";
var TAB_ACTUAL = "actual";
var TAB_COMPARISON = "comparison";

var TAB_ORDER = [TAB_PROJECTION, TAB_ACTUAL, TAB_COMPARISON];

// Same treatment as SecretaryClassesViewTabs: an unavailable tab is NOT a bare "disabled". It
// stays legible and states what it is waiting for, because "disabled" tells the secretary
// nothing about when it will work. It is non-interactive -- the difference is what it
// communicates, not what it does.
function getTabClass(isActive, isAvailable, isPendingResolution) {
  if (isActive) {
    return "border-[#8B6352] bg-[#8B6352] text-white";
  }

  // While availability is still resolving (financial data loading) a not-yet-available tab must
  // not wear the dashed "locked / waiting for registration to close" look -- render it neutral
  // and non-interactive until we actually know.
  if (isPendingResolution) {
    return "border-[#E2D5CE] bg-white text-[#6B574F] cursor-default";
  }

  if (!isAvailable) {
    return "border-dashed border-[#D9C7BD] bg-[#FBF7F4] text-[#8D6E63] cursor-default";
  }

  return "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]";
}

// Controlled tab strip -- mirrors SecretaryClassesViewTabs. The page owns the active view and
// the guard against landing on an unavailable view; this component only renders the strip and
// reports clicks back via onChangeView.
export default function FinancialProjectionTabs(props) {
  var copy = FINANCIAL_PROJECTION_COPY;

  // Projection is always available (it works with zero real entries -- its whole point).
  // Actual applies once registration closes; comparison once there are real actuals to compare.
  var availability = {
    projection: true,
    actual: !!props.registrationClosed,
    comparison: !!props.registrationClosed && !!props.hasActualData,
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist">
        {TAB_ORDER.map(function (tabKey) {
          var tabCopy = copy.tabs[tabKey];
          var isActive = props.activeView === tabKey;
          var isAvailable = availability[tabKey];
          // The Actual/Comparison tabs derive availability from registrationClosed, which is
          // unknown until the financial data loads (finCompetition starts null). Until then, do
          // not assert the locked "unavailableHint"; show a loading hint and neutral styling.
          var isPendingResolution =
            !!props.loading && !isAvailable && tabKey !== TAB_PROJECTION;
          var hint = isAvailable
            ? tabCopy.hint
            : isPendingResolution
              ? copy.tabLoadingHint
              : tabCopy.unavailableHint;

          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={!isAvailable}
              onClick={function () {
                if (isAvailable && props.onChangeView) {
                  props.onChangeView(tabKey);
                }
              }}
              className={
                "flex min-w-[9rem] flex-col items-start rounded-2xl border px-4 py-2 text-right transition-colors " +
                getTabClass(isActive, isAvailable, isPendingResolution)
              }
            >
              <span className="text-sm font-bold">{tabCopy.label}</span>
              <span
                className={"text-xs " + (isActive ? "text-[#F3E7E0]" : "text-[#8D6E63]")}
              >
                {hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export { TAB_PROJECTION, TAB_ACTUAL, TAB_COMPARISON };
