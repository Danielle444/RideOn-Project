import DraggableItem from "../../common/dnd/DraggableItem";
import BookingCardBody, { getItemTitle } from "./BookingCardBody";

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
        // Colors-only transition, deliberately not the broader "every
        // property" one: the drag transform must reset to rest position
        // INSTANTLY when a drop completes, or the CSS transition animates
        // that reset and the card visibly slides back through the queue for
        // a frame before re-rendering into its new section. Border/
        // background/shadow hover polish stays smooth.
        "flex w-full min-w-0 items-start gap-2 rounded-xl border px-3 py-2 text-right transition-colors",
        isAssigned
          ? "cursor-default border-[#E0D0C8] bg-[#F9F5F2] opacity-55"
          : "cursor-grab border-[#D7CCC8] bg-white hover:border-[#A5836A] hover:shadow-sm active:cursor-grabbing",
      ].join(" ")}
      draggingClassName="border-[#795548] bg-[#F5EDE8] shadow-lg opacity-90 z-50"
    >
      <BookingCardBody item={item} />

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

  const unassignedItems = sortedItems.filter(function (item) {
    return !item.isAssigned;
  });

  const assignedItems = sortedItems.filter(function (item) {
    return item.isAssigned;
  });

  const unassignedHorseItems = unassignedItems.filter(function (item) {
    return !item.isForTack;
  });

  const unassignedTackItems = unassignedItems.filter(function (item) {
    return item.isForTack;
  });

  const assignedHorseItems = assignedItems.filter(function (item) {
    return !item.isForTack;
  });

  const assignedTackItems = assignedItems.filter(function (item) {
    return item.isForTack;
  });

  const waitingCount = unassignedItems.length;
  const assignedCount = assignedItems.length;

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
          <BookingSection title="סוסים" items={unassignedHorseItems} />
          <BookingSection title="תאי ציוד" items={unassignedTackItems} />

          {unassignedItems.length > 0 && assignedItems.length > 0 ? (
            <div className="border-t border-[#EFE5DF] pt-1" />
          ) : null}

          <BookingSection title="סוסים" items={assignedHorseItems} />
          <BookingSection title="תאי ציוד" items={assignedTackItems} />

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
