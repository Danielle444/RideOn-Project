import { useDroppable } from "@dnd-kit/core";
import { DoorOpen, X } from "lucide-react";

export default function StallCell({ cell, assignment, onUnassign }) {
  const droppableId = `stall-${cell.col}-${cell.row}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { cell },
    disabled: cell.isEntrance || cell.stallNumber === null || !cell.stallId,
  });

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

  return (
    <div
      ref={setNodeRef}
      className={[
        "relative flex h-full min-h-[42px] select-none flex-col items-center justify-center rounded-lg border transition-all",
        isOver
          ? "scale-105 border-[#795548] bg-[#F5EDE8]"
          : isOccupied
            ? "border-[#A5836A] bg-[#EFEBE9]"
            : cell.stallId
              ? "border-[#D7CCC8] bg-white hover:border-[#BCAAA4]"
              : "border-red-200 bg-red-50",
      ].join(" ")}
    >
      <span className="absolute right-1 top-0.5 text-[9px] font-bold text-[#8D6E63]">
        {cell.stallNumber}
      </span>

      {isOccupied ? (
        <>
          <span className="mt-2 max-w-full truncate px-0.5 text-center text-[9px] font-semibold leading-tight text-[#3F312B]">
            {assignment.barnName || assignment.horseName}
          </span>

          <button
            type="button"
            onClick={function () {
              if (onUnassign) onUnassign(cell);
            }}
            className="absolute left-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-100 text-red-400 hover:bg-red-200"
          >
            <X size={9} />
          </button>
        </>
      ) : (
        <span className="mt-2 text-[9px] text-[#BCAAA4]">ריק</span>
      )}
    </div>
  );
}
