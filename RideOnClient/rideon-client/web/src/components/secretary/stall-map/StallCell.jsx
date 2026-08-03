import { DoorOpen, Package, X } from "lucide-react";
import DroppableBox from "../../common/dnd/DroppableBox";
import DraggableItem from "../../common/dnd/DraggableItem";
import StallBookingLabel from "./StallBookingLabel";

export default function StallCell({ cell, assignment, onUnassign }) {
  const droppableId = `stall-${cell.col}-${cell.row}`;

  if (cell.isEntrance) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[#BCAAA4] bg-[#F3ECE8]">
        <DoorOpen size={13} className="text-[#8D6E63]" />
      </div>
    );
  }

  if (cell.stallNumber === null) {
    return <div className="h-full" />;
  }

  const isOccupied = !!assignment;
  const isDisabled =
    cell.isEntrance || cell.stallNumber === null || !cell.stallId;

  return (
    <DroppableBox
      id={droppableId}
      data={{ cell: cell }}
      disabled={isDisabled}
      className={[
        "relative flex h-full min-h-[48px] select-none flex-col items-center justify-center rounded-lg border px-1 transition-all",
        isOccupied
          ? "border-[#A5836A] bg-[#EFEBE9]"
          : cell.stallId
            ? "border-[#D7CCC8] bg-white hover:border-[#BCAAA4]"
            : "border-red-200 bg-red-50",
      ].join(" ")}
      overClassName="scale-105 border-[#795548] bg-[#F5EDE8]"
      blocked={isOccupied}
      blockedOverClassName="scale-105 border-red-400 bg-red-50"
    >
      <span className="absolute right-1 top-0.5 text-[9px] font-bold text-[#8D6E63]">
        {cell.stallNumber}
      </span>

      {isOccupied ? (
        <>
          <DraggableItem
            id={`stall-cell-booking-${assignment.stallBookingId}`}
            data={{ assignment: assignment, sourceCell: cell }}
            className="mt-2 flex max-w-full cursor-grab flex-col items-center leading-tight active:cursor-grabbing"
            draggingClassName="opacity-40"
          >
            <span className="mb-0.5 flex items-center gap-1 text-[8px] text-[#7B5A4D]">
              {assignment.isForTack ? (
                <Package size={9} />
              ) : (
                <span className="text-[10px]">🐴</span>
              )}
            </span>

            <StallBookingLabel item={assignment} />
          </DraggableItem>

          <button
            type="button"
            onClick={function () {
              if (onUnassign) {
                onUnassign(cell);
              }
            }}
            className="absolute left-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-100 text-red-400 hover:bg-red-200"
            title="הסר שיבוץ"
          >
            <X size={9} />
          </button>
        </>
      ) : (
        <span className="mt-2 text-[9px] text-[#BCAAA4]">ריק</span>
      )}
    </DroppableBox>
  );
}
