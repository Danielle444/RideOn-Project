// Delivery-destination cell — HostSecretary UX slice (2026-08-07). One line per compound the
// order is headed to, plus a partial/fully-unassigned notice. All formatting lives in
// shavingsDestination.utils.js — this component only renders the already-derived model.
import { getDeliveryDestinationDisplay } from "../../../utils/shavingsDestination.utils";

export default function ShavingsDestinationCell(props) {
  const display = getDeliveryDestinationDisplay(props.order);

  if (display.emptyText) {
    return (
      <span className="text-xs font-bold text-[#B26A00]">{display.emptyText}</span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {display.lines.map(function (line) {
        return (
          <span key={line} className="text-[#3F312B]">
            {line}
          </span>
        );
      })}

      {display.warningText ? (
        <span className="text-xs font-bold text-[#B26A00]">
          {display.warningText}
        </span>
      ) : null}
    </div>
  );
}
