import { Info, X } from "lucide-react";
import DroppableBox from "../../common/dnd/DroppableBox";
import DraggableItem from "../../common/dnd/DraggableItem";
import PaidTimeBookingLabel from "./PaidTimeBookingLabel";

export default function PaidTimeScheduleCell({
  timeCell,
  assignment,
  onUnassign,
  selectedCoach,
  onOpenDetails,
}) {
  var requestId = assignment
    ? assignment.paidTimeRequestId || assignment.PaidTimeRequestId
    : null;

  var coachName = assignment
    ? assignment.coachName || assignment.CoachName
    : "";

  var isCoachMatch = assignment && selectedCoach && coachName === selectedCoach;

  return (
    <DroppableBox
      id={"paid-time-cell-" + timeCell.slotId + "-" + timeCell.assignedOrder}
      data={{ timeCell: timeCell }}
      disabled={false}
      className={[
        "relative min-h-[58px] border-0 border-r border-[#EFE5DF] px-4 py-3 text-right transition-all",
        assignment ? "bg-[#EFEBE9]" : "bg-white hover:bg-[#FAF5F1]",
        isCoachMatch ? "ring-2 ring-[#7B5A4D] bg-[#F5EDE8]" : "",
      ].join(" ")}
      overClassName="bg-[#F5EDE8] ring-2 ring-[#795548]"
      blocked={!!assignment}
      blockedOverClassName="bg-red-50 ring-2 ring-red-400"
    >
      {onOpenDetails ? (
        <button
          type="button"
          onClick={function (e) {
            e.stopPropagation();
            onOpenDetails(timeCell);
          }}
          title="צפייה ברשומים לסלוט"
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[#7B5A4D] shadow-sm hover:bg-white"
        >
          <Info size={13} />
        </button>
      ) : null}

      {assignment ? (
        <div className="flex items-center justify-between gap-3">
          <DraggableItem
            id={"paid-time-cell-booking-" + requestId}
            data={{ assignment: assignment, sourceTimeCell: timeCell }}
            className="w-full flex-1 cursor-grab active:cursor-grabbing"
          >
            <PaidTimeBookingLabel item={assignment} />
          </DraggableItem>

          <button
            type="button"
            onClick={function (e) {
              e.stopPropagation();
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
