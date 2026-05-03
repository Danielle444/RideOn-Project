import { X } from "lucide-react";
import DroppableBox from "../../common/dnd/DroppableBox";

export default function PaidTimeScheduleCell({ timeCell, assignment, onUnassign }) {
  var requestId = assignment
    ? assignment.paidTimeRequestId || assignment.PaidTimeRequestId
    : null;

  var horseName = assignment
    ? assignment.barnName || assignment.BarnName || assignment.horseName || assignment.HorseName
    : "";

  var riderName = assignment
    ? assignment.riderName || assignment.RiderName
    : "";

  var productName = assignment
    ? assignment.productName || assignment.ProductName
    : "";

  return (
    <DroppableBox
      id={"paid-time-cell-" + timeCell.slotId + "-" + timeCell.assignedOrder}
      data={{ timeCell: timeCell }}
      disabled={false}
      className={[
        "relative min-h-[58px] border-0 border-r border-[#EFE5DF] bg-white px-4 py-3 text-right transition-all",
        assignment ? "bg-[#EFEBE9]" : "hover:bg-[#FAF5F1]",
      ].join(" ")}
      overClassName="bg-[#F5EDE8] ring-2 ring-[#795548]"
    >
      {assignment ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#3F312B]">{horseName}</p>
            <p className="text-xs text-[#7A655C]">
              {riderName} {productName ? "• " + productName : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={function () {
              onUnassign(requestId);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#BCAAA4]">
          גררי לכאן בקשה {timeCell.assignedOrder}
        </p>
      )}
    </DroppableBox>
  );
}