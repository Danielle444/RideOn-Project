// Order rows — Spec 2 (CAP-3). Reuses the summary SummaryTable visual language. Each row shows
// the DERIVED lifecycle (created / seen / delivered) with a status chip; flagged-delayed orders
// get a distinct warm treatment (RTL leading red border + tint) and an SLA badge.
import {
  getValue,
  getSeen,
  getDelivered,
  getCreated,
  getRequestedDeliveryTime,
  getIsCancelled,
  getHasPendingCancellation,
} from "../../../utils/shavingsStatus.utils";
import { getDelayRule } from "../../../utils/shavingsSla.utils";
import { getDeliveryUrgency } from "../../../utils/shavingsDueDate.utils";
import ShavingsStatusChip from "./ShavingsStatusChip";
import ShavingsSlaBadge from "./ShavingsSlaBadge";
import ShavingsCancellationBadge from "./ShavingsCancellationBadge";
import ShavingsDestinationCell from "./ShavingsDestinationCell";

// Overdue/due-today label — opt-in (showUrgencyBadge), used only inside the "requires attention"
// section, which only ever passes overdue/dueToday orders (a null/empty/malformed due date is
// excluded from that section entirely — see isActionRequired). The main ranch/status groups keep
// rendering exactly as before.
function UrgencyBadge(props) {
  const urgency = getDeliveryUrgency(props.order);

  if (urgency === "overdue") {
    return (
      <span className="mt-1 block w-fit rounded-full bg-[#F3E1DE] px-2 py-0.5 text-[11px] font-bold text-[#C62828]">
        באיחור
      </span>
    );
  }

  if (urgency === "dueToday") {
    return (
      <span className="mt-1 block w-fit rounded-full bg-[#FDF2E3] px-2 py-0.5 text-[11px] font-bold text-[#B26A00]">
        היום
      </span>
    );
  }

  return null;
}

const HEADERS = [
  "מס׳ הזמנה",
  "סטטוס",
  "שקים",
  "מועד אספקה",
  "יעד אספקה",
  "נוצר",
  "נצפה",
  "סופק",
  "הוזמן ע״י",
  "סכום",
  "התראה",
  "ביטול",
];

function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("he-IL");
}

export default function ShavingsOrdersTable(props) {
  const orders = Array.isArray(props.orders) ? props.orders : [];
  const onCancelOrder = props.onCancelOrder;
  const cancellingId = props.cancellingId;

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D8CBC3] bg-white px-6 py-10 text-center text-sm text-[#8A7268]">
        אין נתונים להצגה
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E3D7D0]">
      <table className="w-full min-w-[1000px] border-collapse text-right">
        <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
          <tr>
            {HEADERS.map(function (header) {
              return (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {orders.map(function (order, index) {
            const rule = getDelayRule(order);
            const delayed = !!rule;

            return (
              <tr
                key={getValue(order, "shavingsOrderId", "ShavingsOrderId", index)}
                className={
                  "border-t border-[#EFE5DF] text-sm text-[#3F312B] " +
                  (delayed
                    ? "border-r-4 border-r-[#C62828] bg-[#FDECEC]/40"
                    : "")
                }
              >
                <td className="px-4 py-4 align-top font-bold">
                  {getValue(order, "shavingsOrderId", "ShavingsOrderId", "-")}
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <ShavingsStatusChip order={order} />
                    <ShavingsCancellationBadge order={order} />
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  {getValue(order, "bagQuantity", "BagQuantity", 0)}
                </td>
                <td className="px-4 py-4 align-top">
                  {formatDateTime(getRequestedDeliveryTime(order))}
                  {props.showUrgencyBadge ? <UrgencyBadge order={order} /> : null}
                </td>
                <td className="px-4 py-4 align-top text-sm">
                  <ShavingsDestinationCell order={order} />
                </td>
                <td className="px-4 py-4 align-top text-[#7B5A4D]">
                  {formatDateTime(getCreated(order))}
                </td>
                <td className="px-4 py-4 align-top text-[#7B5A4D]">
                  {formatDateTime(getSeen(order))}
                </td>
                <td className="px-4 py-4 align-top text-[#7B5A4D]">
                  {formatDateTime(getDelivered(order))}
                </td>
                <td className="px-4 py-4 align-top">
                  {getValue(order, "orderedByName", "OrderedByName", "-") || "-"}
                </td>
                <td className="px-4 py-4 align-top font-bold">
                  {formatMoney(
                    getValue(order, "totalAmount", "TotalAmount", 0),
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  {delayed ? <ShavingsSlaBadge rule={rule} /> : null}
                </td>
                <td className="px-4 py-4 align-top">
                  {(function () {
                    const shavingsOrderId = getValue(
                      order,
                      "shavingsOrderId",
                      "ShavingsOrderId",
                      index,
                    );
                    const isLocked =
                      getIsCancelled(order) || getHasPendingCancellation(order);
                    const isBusy = cancellingId === shavingsOrderId;

                    if (isLocked || typeof onCancelOrder !== "function") {
                      return <span className="text-xs text-[#8A7268]">-</span>;
                    }

                    return (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={function () {
                          onCancelOrder(order);
                        }}
                        className={
                          "rounded-lg px-3 py-1.5 text-xs font-bold text-white " +
                          (isBusy ? "bg-[#C9B7AC]" : "bg-[#A0522D] hover:bg-[#8A4526]")
                        }
                      >
                        {isBusy ? "מבטל..." : "בטל"}
                      </button>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
