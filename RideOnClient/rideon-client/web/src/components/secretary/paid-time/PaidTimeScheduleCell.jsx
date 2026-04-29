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

  return (
    <DroppableBox
      id={"paid-time-cell-" + timeCell.slotId + "-" + timeCell.timeValue}
      data={{ timeCell: timeCell }}
      disabled={!!assignment}
      className={[
        "relative min-h-[68px] rounded-2xl border p-2 text-right transition-all",
        assignment
          ? "border-[#A5836A] bg-[#EFEBE9]"
          : "border-[#D7CCC8] bg-white hover:border-[#BCAAA4]",
      ].join(" ")}
      overClassName="scale-[1.02] border-[#795548] bg-[#F5EDE8]"
    >
      <div className="text-xs font-bold text-[#8D6E63]">{timeCell.label}</div>

      {assignment ? (
        <div className="mt-2">
          <p className="text-sm font-bold text-[#3F312B]">{horseName}</p>
          <p className="text-xs text-[#7A655C]">{riderName}</p>

          <button
            type="button"
            onClick={function () {
              onUnassign(requestId);
            }}
            className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#BCAAA4]">גררי לכאן בקשה</p>
      )}
    </DroppableBox>
  );
}