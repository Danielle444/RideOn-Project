import { useDroppable } from "@dnd-kit/core";
import { DoorOpen, X } from "lucide-react";

export default function StallCell({ cell, assignment, onUnassign }) {
  const droppableId = `stall-${cell.col}-${cell.row}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { cell },
    disabled: cell.isEntrance || cell.stallNumber === null,
  });

  if (cell.isEntrance) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-[#F3ECE8] border border-dashed border-[#BCAAA4] h-full">
        <DoorOpen size={16} className="text-[#8D6E63]" />
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
        "relative flex flex-col items-center justify-center rounded-xl border-2 h-full min-h-[60px] transition-all select-none",
        isOver
          ? "border-[#795548] bg-[#F5EDE8] scale-105"
          : isOccupied
          ? "border-[#A5836A] bg-[#EFEBE9]"
          : "border-[#D7CCC8] bg-white hover:border-[#BCAAA4]",
      ].join(" ")}
    >
      <span className="text-[10px] font-bold text-[#8D6E63] absolute top-1 right-2">
        {cell.stallNumber}
      </span>

      {isOccupied ? (
        <>
          <span className="text-xs font-semibold text-[#3F312B] text-center px-1 leading-tight mt-2">
            {assignment.barnName || assignment.horseName}
          </span>
          <button
            type="button"
            onClick={function () { onUnassign && onUnassign(cell); }}
            className="absolute top-1 left-1 w-4 h-4 rounded-full bg-red-100 text-red-400 hover:bg-red-200 flex items-center justify-center"
          >
            <X size={10} />
          </button>
        </>
      ) : (
        <span className="text-[10px] text-[#BCAAA4] mt-2">ריק</span>
      )}
    </div>
  );
}
