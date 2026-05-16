import { Package, PawPrint } from "lucide-react";
import DraggableItem from "../../common/dnd/DraggableItem";

function getItemTitle(item) {
  if (item.isForTack) {
    return "תא ציוד #" + item.stallBookingId;
  }

  return item.barnName || item.horseName || "סוס ללא שם";
}

function getItemSubtitle(item) {
  if (item.isForTack) {
    return item.productName || "תא ציוד";
  }

  return item.horseName || item.productName || "";
}

function formatShortDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

function AssignableBookingCard({ item }) {
  const isAssigned = !!item.isAssigned;

  return (
    <DraggableItem
      id={`stall-booking-${item.stallBookingId}`}
      data={{ item: item }}
      disabled={isAssigned}
      className={[
        "flex items-start gap-2 rounded-xl border px-3 py-2 text-right transition-all",
        isAssigned
          ? "cursor-default border-[#E0D0C8] bg-[#F9F5F2] opacity-55"
          : "cursor-grab border-[#D7CCC8] bg-white hover:border-[#A5836A] hover:shadow-sm active:cursor-grabbing",
      ].join(" ")}
      draggingClassName="border-[#795548] bg-[#F5EDE8] shadow-lg opacity-90 z-50"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3ECE8] text-[#7B5A4D]">
        {item.isForTack ? <Package size={15} /> : <PawPrint size={15} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-[#3F312B]">
          {getItemTitle(item)}
        </div>

        <div className="truncate text-[10px] text-[#8D6E63]">
          {getItemSubtitle(item)}
        </div>

        <div className="mt-1 text-[10px] text-[#8D6E63]">
          {formatShortDate(item.startDate)}–{formatShortDate(item.endDate)} · {item.stayDays} ימים
        </div>

        {item.notes && (
          <div className="mt-1 line-clamp-2 text-[10px] text-[#A05A3B]">
            {item.notes}
          </div>
        )}
      </div>

      {isAssigned && (
        <span className="shrink-0 rounded-full bg-[#E8DDD8] px-1.5 py-0.5 text-[10px] font-medium text-[#7B5A4D]">
          תא {item.assignedStallNumber}
        </span>
      )}
    </DraggableItem>
  );
}

export default function StallAssignmentSidebar({ items }) {
  const horseItems = items.filter(function (item) {
    return !item.isForTack;
  });

  const tackItems = items.filter(function (item) {
    return item.isForTack;
  });

  const assignedCount = items.filter(function (item) {
    return item.isAssigned;
  }).length;

  const waitingCount = items.length - assignedCount;

  return (
    <div className="flex h-full flex-col gap-3" dir="rtl">
      <div className="px-1">
        <h3 className="text-sm font-bold text-[#3F312B]">פריטים לשיבוץ</h3>
        <p className="text-xs text-[#8D6E63]">
          {waitingCount} ממתינים · {assignedCount} משובצים
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-1 pb-1">
        {horseItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-1 text-xs font-bold text-[#7B5A4D]">סוסים</div>

            {horseItems.map(function (item) {
              return <AssignableBookingCard key={item.stallBookingId} item={item} />;
            })}
          </div>
        )}

        {tackItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-1 text-xs font-bold text-[#7B5A4D]">תאי ציוד</div>

            {tackItems.map(function (item) {
              return <AssignableBookingCard key={item.stallBookingId} item={item} />;
            })}
          </div>
        )}

        {items.length === 0 && (
          <p className="py-4 text-center text-xs text-[#BCAAA4]">
            אין פריטים לשיבוץ בחווה זו
          </p>
        )}
      </div>
    </div>
  );
}