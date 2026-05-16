import { MoveRight, Package, PawPrint } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import StatusPill from "../../common/table/StatusPill";

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("he-IL");
  } catch {
    return "—";
  }
}

function formatMoney(value) {
  if (value === null || value === undefined) return "₪0";

  try {
    return "₪" + Number(value).toLocaleString("he-IL");
  } catch {
    return "₪0";
  }
}

function getBookingName(item) {
  if (item.isForTack) {
    return "תא ציוד";
  }

  return item.barnName || item.horseName || "סוס ללא שם";
}

function getBookingSubName(item) {
  if (item.isForTack) {
    return "הזמנת ציוד #" + item.stallBookingId;
  }

  if (item.barnName && item.horseName) {
    return item.horseName;
  }

  return "הזמנה #" + item.stallBookingId;
}

function getPaymentStatusLabel(value) {
  if (value === "Paid") return "שולם";
  if (value === "Partial") return "חלקי";
  return "לא שולם";
}

function renderAssignmentStatus(item) {
  if (!item.isAssigned) {
    return (
      <span className="inline-flex rounded-full border border-[#E8C99A] bg-[#F7E7CF] px-3 py-1 text-xs font-semibold text-[#9A6700]">
        לא שובץ
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-[#B9D9C0] bg-[#E7F4EA] px-3 py-1 text-xs font-semibold text-[#2F6B3B]">
      תא {item.assignedStallNumber}
    </span>
  );
}

function renderBookingType(item) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#DDD1CA] bg-[#F3EEEA] px-3 py-1 text-xs font-semibold text-[#6B574F]">
      {item.isForTack ? <Package size={13} /> : <PawPrint size={13} />}
      {item.isForTack ? "ציוד" : "סוס"}
    </span>
  );
}

export default function StallBookingsOverviewTable({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-[#D7CCC8] bg-[#FAF5F1] p-8 text-center text-sm text-[#8D6E63]">
        אין הזמנות תאים לתחרות זו
      </div>
    );
  }

  return (
    <DataTableShell>
      <thead className="bg-[#F3EEEA] text-[#5D4037]">
        <tr>
          <th className="px-4 py-3 text-sm font-bold">חווה</th>
          <th className="px-4 py-3 text-sm font-bold">סוג</th>
          <th className="px-4 py-3 text-sm font-bold">סוס / ציוד</th>
          <th className="px-4 py-3 text-sm font-bold">תאריכים</th>
          <th className="px-4 py-3 text-sm font-bold">ימים</th>
          <th className="px-4 py-3 text-sm font-bold">סוג תא</th>
          <th className="px-4 py-3 text-sm font-bold">עלות</th>
          <th className="px-4 py-3 text-sm font-bold">תשלום</th>
          <th className="px-4 py-3 text-sm font-bold">משלמים</th>
          <th className="px-4 py-3 text-sm font-bold">הערות</th>
          <th className="px-4 py-3 text-sm font-bold">שיבוץ</th>
        </tr>
      </thead>

      <tbody>
        {items.map(function (item) {
          return (
            <tr
              key={item.stallBookingId}
              className="border-t border-[#EFE5DF] text-[#3F312B] hover:bg-[#FFF9F5]"
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">
                {item.bookingRanchName}
              </td>

              <td className="whitespace-nowrap px-4 py-3">
                {renderBookingType(item)}
              </td>

              <td className="min-w-[190px] px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{getBookingName(item)}</span>
                  <span className="text-xs text-[#8D6E63]">{getBookingSubName(item)}</span>
                </div>
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span>{formatDate(item.startDate)}</span>
                <MoveRight size={14} className="mx-1 inline text-[#A1887F]" />
                <span>{formatDate(item.endDate)}</span>
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">
                {item.stayDays}
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-sm">
                {item.productName}
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">
                {formatMoney(item.totalAmount)}
              </td>

              <td className="whitespace-nowrap px-4 py-3">
                <StatusPill value={getPaymentStatusLabel(item.paymentStatus)} />
              </td>

              <td className="min-w-[170px] px-4 py-3 text-sm">
                {item.payerNames || "—"}
              </td>

              <td className="min-w-[160px] px-4 py-3 text-sm text-[#6B574F]">
                {item.notes || "—"}
              </td>

              <td className="whitespace-nowrap px-4 py-3">
                {renderAssignmentStatus(item)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTableShell>
  );
}