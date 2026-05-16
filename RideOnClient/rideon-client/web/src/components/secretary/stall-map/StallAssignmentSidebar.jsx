import { AlertCircle, Package } from "lucide-react";
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

  return item.horseName || "";
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

function sortItemsForAssignment(items) {
  return [...items].sort(function (a, b) {
    if (a.isAssigned !== b.isAssigned) {
      return a.isAssigned ? 1 : -1;
    }

    if (a.isForTack !== b.isForTack) {
      return a.isForTack ? 1 : -1;
    }

    return getItemTitle(a).localeCompare(getItemTitle(b), "he");
  });
}

function AssignableBookingCard({ item }) {
  const isAssigned = !!item.isAssigned;

  return (
    <DraggableItem
      id={`stall-booking-${item.stallBookingId}`}
      data={{ item: item }}
      disabled={isAssigned}
      className={[
        "flex w-full min-w-0 items-start gap-2 rounded-xl border px-3 py-2 text-right transition-all",
        isAssigned
          ? "cursor-default border-[#E0D0C8] bg-[#F9F5F2] opacity-55"
          : "cursor-grab border-[#D7CCC8] bg-white hover:border-[#A5836A] hover:shadow-sm active:cursor-grabbing",
      ].join(" ")}
      draggingClassName="border-[#795548] bg-[#F5EDE8] shadow-lg opacity-90 z-50"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3ECE8] text-[#7B5A4D]">
        {item.isForTack ? (
          <Package size={15} />
        ) : (
          <span className="text-sm leading-none">🐴</span>
        )}
      </span>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate text-xs font-bold text-[#3F312B]">
          {getItemTitle(item)}
        </div>

        <div className="truncate text-[10px] text-[#8D6E63]">
          {getItemSubtitle(item)}
        </div>

        <div className="mt-1 flex max-w-full flex-wrap gap-1 text-[10px] text-[#7B5A4D]">
          <span className="max-w-full truncate rounded-full bg-[#F3EEEA] px-2 py-0.5">
            {item.productName}
          </span>

          <span className="rounded-full bg-[#F3EEEA] px-2 py-0.5">
            {formatShortDate(item.startDate)}–{formatShortDate(item.endDate)}
          </span>

          <span className="rounded-full bg-[#F3EEEA] px-2 py-0.5">
            {item.stayDays} ימים
          </span>
        </div>

        {item.notes && (
          <div className="mt-1 flex max-w-full items-start gap-1 rounded-lg bg-[#FFF4E8] px-2 py-1 text-[10px] leading-4 text-[#9A6700]">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2 min-w-0 break-words">
              {item.notes}
            </span>
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

function BookingSection({ title, items }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="px-1 text-xs font-bold text-[#7B5A4D]">{title}</div>

      {items.map(function (item) {
        return <AssignableBookingCard key={item.stallBookingId} item={item} />;
      })}
    </div>
  );
}

export default function StallAssignmentSidebar({ items }) {
  const sortedItems = sortItemsForAssignment(items || []);

  const horseItems = sortedItems.filter(function (item) {
    return !item.isForTack;
  });

  const tackItems = sortedItems.filter(function (item) {
    return item.isForTack;
  });

  const assignedCount = sortedItems.filter(function (item) {
    return item.isAssigned;
  }).length;

  const waitingCount = sortedItems.length - assignedCount;

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden"
      dir="rtl"
    >
      <div className="shrink-0 px-1">
        <h3 className="text-sm font-bold text-[#3F312B]">פריטים לשיבוץ</h3>
        <p className="text-xs text-[#8D6E63]">
          {waitingCount} ממתינים · {assignedCount} משובצים
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-2">
        <div className="flex min-w-0 flex-col gap-3">
          <BookingSection title="סוסים" items={horseItems} />
          <BookingSection title="תאי ציוד" items={tackItems} />

          {sortedItems.length === 0 && (
            <p className="py-4 text-center text-xs text-[#BCAAA4]">
              אין פריטים לשיבוץ בחווה זו
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
