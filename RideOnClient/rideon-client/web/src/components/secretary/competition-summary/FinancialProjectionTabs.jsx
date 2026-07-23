import { useState } from "react";

import { FINANCIAL_PROJECTION_COPY } from "./financialProjectionCopy";
import FinancialProjectionPanel from "./FinancialProjectionPanel";
import FinancialActualPanel from "./FinancialActualPanel";
import FinancialComparisonPanel from "./FinancialComparisonPanel";

var TAB_PROJECTION = "projection";
var TAB_ACTUAL = "actual";
var TAB_COMPARISON = "comparison";

var TAB_ORDER = [TAB_PROJECTION, TAB_ACTUAL, TAB_COMPARISON];

// Same treatment as SecretaryClassesViewTabs: an unavailable tab is NOT a bare "disabled". It
// stays legible and states what it is waiting for, because "disabled" tells the secretary
// nothing about when it will work. It is non-interactive -- the difference is what it
// communicates, not what it does.
function getTabClass(isActive, isAvailable) {
  if (isActive) {
    return "border-[#8B6352] bg-[#8B6352] text-white";
  }

  if (!isAvailable) {
    return "border-dashed border-[#D9C7BD] bg-[#FBF7F4] text-[#8D6E63] cursor-default";
  }

  return "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]";
}

export default function FinancialProjectionTabs(props) {
  var copy = FINANCIAL_PROJECTION_COPY;

  // Projection is always available (it works with zero real entries -- its whole point).
  // Actual applies once registration closes; comparison once there are real actuals to compare.
  var availability = {
    projection: true,
    actual: !!props.registrationClosed,
    comparison: !!props.registrationClosed && !!props.hasActualData,
  };

  var defaultTab = availability.actual ? TAB_ACTUAL : TAB_PROJECTION;
  var [activeTab, setActiveTab] = useState(defaultTab);

  // Guard against landing on a tab that is not available (e.g. state changed under us).
  var effectiveTab = availability[activeTab] ? activeTab : TAB_PROJECTION;

  function renderPanel() {
    if (effectiveTab === TAB_ACTUAL) {
      return <FinancialActualPanel actual={props.actual} />;
    }

    if (effectiveTab === TAB_COMPARISON) {
      return <FinancialComparisonPanel actual={props.actual} />;
    }

    return <FinancialProjectionPanel projection={props.projection} />;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist">
        {TAB_ORDER.map(function (tabKey) {
          var tabCopy = copy.tabs[tabKey];
          var isActive = effectiveTab === tabKey;
          var isAvailable = availability[tabKey];
          var hint = isAvailable ? tabCopy.hint : tabCopy.unavailableHint;

          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={!isAvailable}
              onClick={function () {
                if (isAvailable) {
                  setActiveTab(tabKey);
                }
              }}
              className={
                "flex min-w-[9rem] flex-col items-start rounded-2xl border px-4 py-2 text-right transition-colors " +
                getTabClass(isActive, isAvailable)
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

      {renderPanel()}
    </section>
  );
}
