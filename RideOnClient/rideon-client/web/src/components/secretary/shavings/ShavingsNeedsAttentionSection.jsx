// Needs-attention section — undelivered orders whose requested delivery date is today or
// earlier (Asia/Jerusalem business date; see shavingsDueDate.utils.js), regardless of the page's
// active ranch/status grouping. Collapsed by default; the expand/collapse state is local
// component state, so it survives data refreshes and is only ever reset by an actual remount.
import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import ShavingsOrdersTable from "./ShavingsOrdersTable";

export default function ShavingsNeedsAttentionSection(props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const overdueOrders = Array.isArray(props.overdueOrders)
    ? props.overdueOrders
    : [];
  const dueTodayOrders = Array.isArray(props.dueTodayOrders)
    ? props.dueTodayOrders
    : [];
  const count = overdueOrders.length + dueTodayOrders.length;

  function toggle() {
    setIsExpanded(function (prev) {
      return !prev;
    });
  }

  return (
    <div className="rounded-2xl border border-[#F1C6C6] bg-[#FDECEC] shadow-sm">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-right"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#C62828]">
            <AlertTriangle size={18} />
          </span>

          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-[#C62828]">
              הזמנות שדורשות טיפול
              <span className="rounded-full bg-[#C62828] px-2.5 py-0.5 text-sm font-bold text-white">
                ({count})
              </span>
            </h2>
            <p className="text-sm text-[#9A4A44]">
              הזמנות שלא סופקו ומועד האספקה שלהן היום או שחלף
            </p>
          </div>
        </div>

        <span className="shrink-0 text-[#C62828]">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>

      {isExpanded ? (
        <div className="px-5 pb-5">
          {count === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E9B9B6] bg-white px-6 py-8 text-center text-sm text-[#9A4A44]">
              אין כרגע הזמנות שדורשות טיפול
            </div>
          ) : (
            <div className="space-y-5">
              {overdueOrders.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-black text-[#C62828]">
                    באיחור ({overdueOrders.length})
                  </h3>
                  <ShavingsOrdersTable
                    orders={overdueOrders}
                    onCancelOrder={props.onCancelOrder}
                    cancellingId={props.cancellingId}
                    showUrgencyBadge
                  />
                </div>
              ) : null}

              {dueTodayOrders.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-black text-[#B26A00]">
                    היום ({dueTodayOrders.length})
                  </h3>
                  <ShavingsOrdersTable
                    orders={dueTodayOrders}
                    onCancelOrder={props.onCancelOrder}
                    cancellingId={props.cancellingId}
                    showUrgencyBadge
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
