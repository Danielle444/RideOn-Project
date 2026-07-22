import {
  CLASSES_VIEW_FINANCIAL,
  CLASSES_VIEW_PLANNING,
  CLASSES_VIEW_ACTUALS,
} from "../../../utils/classesView.utils";
import { CLASSES_VIEW_TABS_COPY } from "./classesViewCopy";

var TAB_ORDER = [
  CLASSES_VIEW_PLANNING,
  CLASSES_VIEW_ACTUALS,
  CLASSES_VIEW_FINANCIAL,
];

// An unavailable tab is NOT greyed out. It stays legible and states what it is waiting for,
// because "disabled" tells the secretary nothing about when it will work. It is still
// non-interactive -- the difference is what it communicates, not what it does.
function getTabClass(isActive, isAvailable) {
  if (isActive) {
    return "border-[#8B6352] bg-[#8B6352] text-white";
  }

  if (!isAvailable) {
    return "border-dashed border-[#D9C7BD] bg-[#FBF7F4] text-[#8D6E63] cursor-default";
  }

  return "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]";
}

export default function SecretaryClassesViewTabs(props) {
  var activeView = props.activeView;

  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {TAB_ORDER.map(function (viewKey) {
        var copy = CLASSES_VIEW_TABS_COPY[viewKey];
        var isActive = activeView === viewKey;
        var isAvailable = props.isViewAvailable
          ? props.isViewAvailable(viewKey)
          : true;

        var hint = isAvailable ? copy.hint : copy.unavailableHint;

        return (
          <button
            key={viewKey}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={!isAvailable}
            onClick={function () {
              if (isAvailable && props.onChangeView) {
                props.onChangeView(viewKey);
              }
            }}
            className={
              "flex min-w-[9rem] flex-col items-start rounded-2xl border px-4 py-2 text-right transition-colors " +
              getTabClass(isActive, isAvailable)
            }
          >
            <span className="text-sm font-bold">{copy.label}</span>
            <span
              className={
                "text-xs " + (isActive ? "text-[#F3E7E0]" : "text-[#8D6E63]")
              }
            >
              {hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
