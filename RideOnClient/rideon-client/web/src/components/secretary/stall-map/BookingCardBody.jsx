import { AlertCircle, Package } from "lucide-react";

export function getItemTitle(item) {
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

// Shared rich-card content for a stall booking, used by both the sidebar
// queue card (AssignableBookingCard) and the placed-in-cell card (StallCell)
// so the two surfaces render identically. Badges/notes render only when the
// underlying item actually carries that field - the grid's assignment
// objects (StallAssignmentDto) don't carry startDate/endDate/stayDays/notes
// the way sidebar queue items (from the overview endpoint) do, so those
// badges simply don't appear for a placed card instead of showing blanks.
export default function BookingCardBody({ item }) {
  const hasDateRange = !!(item.startDate || item.endDate);

  return (
    <>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3ECE8] text-[#7B5A4D]">
        {item.isForTack ? (
          <Package size={15} />
        ) : (
          <span className="text-sm leading-none">🐴</span>
        )}
      </span>

      <div className="min-w-0 flex-1 overflow-hidden">
        {item.bookingRanchName ? (
          <div className="truncate text-[9px] font-semibold text-[#A5836A]">
            {item.bookingRanchName}
          </div>
        ) : null}

        <div className="truncate text-xs font-bold text-[#3F312B]">
          {getItemTitle(item)}
        </div>

        <div className="truncate text-[10px] text-[#8D6E63]">
          {getItemSubtitle(item)}
        </div>

        <div className="mt-1 flex max-w-full flex-wrap gap-1 text-[10px] text-[#7B5A4D]">
          {item.productName ? (
            <span className="max-w-full truncate rounded-full bg-[#F3EEEA] px-2 py-0.5">
              {item.productName}
            </span>
          ) : null}

          {hasDateRange ? (
            <span className="rounded-full bg-[#F3EEEA] px-2 py-0.5">
              {formatShortDate(item.startDate)}–{formatShortDate(item.endDate)}
            </span>
          ) : null}

          {item.stayDays ? (
            <span className="rounded-full bg-[#F3EEEA] px-2 py-0.5">
              {item.stayDays} ימים
            </span>
          ) : null}
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
    </>
  );
}
