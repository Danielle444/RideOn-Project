import DraggableItem from "../../common/dnd/DraggableItem";

function DraggableHorse({ horse, isAssigned }) {
  return (
    <DraggableItem
      id={`horse-${horse.horseId}`}
      data={{ horse }}
      disabled={isAssigned}
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-xl border text-right cursor-grab active:cursor-grabbing transition-all",
        isAssigned
          ? "border-[#E0D0C8] bg-[#F9F5F2] opacity-50 cursor-default"
          : "border-[#D7CCC8] bg-white hover:border-[#A5836A] hover:shadow-sm",
      ].join(" ")}
      draggingClassName="border-[#795548] bg-[#F5EDE8] shadow-lg opacity-90 z-50"
    >
      <span className="text-xl">🐴</span>

      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-[#3F312B] truncate">
          {horse.barnName || horse.horseName}
        </span>

        {horse.barnName && (
          <span className="text-xs text-[#8D6E63] truncate">
            {horse.horseName}
          </span>
        )}
      </div>

      {isAssigned && (
        <span className="mr-auto text-[10px] bg-[#E8DDD8] text-[#7B5A4D] px-1.5 py-0.5 rounded-full font-medium shrink-0">
          משובץ
        </span>
      )}
    </DraggableItem>
  );
}

export default function HorseSidebar({ horses, assignments }) {
  const assignedHorseIds = new Set(
    assignments.map(function (a) {
      return a.horseId;
    }),
  );

  const unassigned = horses.filter(function (h) {
    return !assignedHorseIds.has(h.horseId);
  });

  const assigned = horses.filter(function (h) {
    return assignedHorseIds.has(h.horseId);
  });

  return (
    <div className="flex flex-col gap-3 h-full" dir="rtl">
      <div className="px-1">
        <h3 className="text-sm font-bold text-[#3F312B]">סוסים לשיבוץ</h3>
        <p className="text-xs text-[#8D6E63]">
          {unassigned.length} ממתינים • {assigned.length} משובצים
        </p>
      </div>

      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 px-1">
        {unassigned.length === 0 && assigned.length === 0 && (
          <p className="text-xs text-[#BCAAA4] text-center py-4">
            אין סוסים רשומים לתחרות זו
          </p>
        )}

        {unassigned.map(function (horse) {
          return (
            <DraggableHorse
              key={horse.horseId}
              horse={horse}
              isAssigned={false}
            />
          );
        })}

        {assigned.map(function (horse) {
          return (
            <DraggableHorse
              key={horse.horseId}
              horse={horse}
              isAssigned={true}
            />
          );
        })}
      </div>
    </div>
  );
}