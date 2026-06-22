import { useMemo, useState } from "react";
import { MoveRight, Package, Pencil, Search, Trash2 } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";

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

function getCalculatedCost(item) {
  const itemPrice = Number(item.itemPrice || 0);
  const stayDays = Number(item.stayDays || 0);

  return itemPrice * stayDays;
}

function getBookingName(item) {
  if (item.isForTack) {
    return "תא ציוד";
  }

  return item.barnName || item.horseName || "סוס ללא שם";
}

function getBookingSubName(item) {
  if (item.isForTack) {
    return "הזמנה #" + item.stallBookingId;
  }

  if (item.barnName && item.horseName) {
    return item.horseName;
  }

  return "הזמנה #" + item.stallBookingId;
}

function getPaymentLabel(value) {
  if (value === "Paid") return "שולם";
  if (value === "Partial") return "שולם חלקית";
  return "לא שולם";
}

function getPaymentClassName(value) {
  if (value === "Paid") {
    return "border-[#B9D9C0] bg-[#E7F4EA] text-[#2F6B3B]";
  }

  if (value === "Partial") {
    return "border-[#E8C99A] bg-[#F7E7CF] text-[#9A6700]";
  }

  return "border-[#E7BABA] bg-[#F9E5E5] text-[#A54848]";
}

function PaymentPill({ status }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap " +
        getPaymentClassName(status)
      }
    >
      {getPaymentLabel(status)}
    </span>
  );
}

function getCompoundName(compounds, compoundId) {
  if (!compoundId) return "";

  const compound = compounds.find(function (item) {
    return item.compoundId === compoundId;
  });

  return compound ? compound.compoundName : "";
}

function renderAssignmentStatus(item, compounds) {
  if (!item.isAssigned) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full border border-[#E8C99A] bg-[#F7E7CF] px-3 py-1 text-xs font-bold text-[#9A6700]">
        לא שובץ
      </span>
    );
  }

  const compoundName = getCompoundName(compounds, item.assignedCompoundId);

  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <span className="inline-flex w-fit whitespace-nowrap rounded-full border border-[#B9D9C0] bg-[#E7F4EA] px-3 py-1 text-xs font-bold text-[#2F6B3B]">
        תא {item.assignedStallNumber}
      </span>

      {compoundName && (
        <span className="whitespace-nowrap text-[11px] font-semibold text-[#7B5A4D]">
          {compoundName}
        </span>
      )}
    </div>
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function itemMatchesSearch(item, searchValue) {
  const search = normalizeText(searchValue);

  if (!search) return true;

  const values = [
    item.bookingRanchName,
    item.horseName,
    item.barnName,
    item.payerNames,
    item.productName,
    item.notes,
    item.paymentStatus,
    item.assignedStallNumber,
    formatDate(item.startDate),
    formatDate(item.endDate),
  ];

  return values.some(function (value) {
    return normalizeText(value).includes(search);
  });
}

export default function StallBookingsOverviewTable({ items, compounds }) {
  const [searchValue, setSearchValue] = useState("");

  const filteredItems = useMemo(
    function () {
      return (items || []).filter(function (item) {
        return itemMatchesSearch(item, searchValue);
      });
    },
    [items, searchValue],
  );

  if (!items || items.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-[#D7CCC8] bg-[#FAF5F1] p-8 text-center text-sm text-[#8D6E63]">
        אין הזמנות תאים לתחרות זו
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xl">
        <Search
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A1887F]"
        />

        <input
          type="text"
          value={searchValue}
          onChange={function (event) {
            setSearchValue(event.target.value);
          }}
          placeholder="חיפוש לפי חווה, סוס, משלם, תאריכים, סוג תא..."
          className="w-full rounded-2xl border border-[#E6D8D0] bg-white py-2.5 pr-10 pl-3 text-sm text-[#3F312B] outline-none transition placeholder:text-[#BCAAA4] focus:border-[#A5836A] focus:ring-2 focus:ring-[#F3ECE8]"
        />
      </div>

      <DataTableShell tableClassName="w-full min-w-[1180px] text-right">
        <thead className="bg-[#F3EEEA] text-[#5D4037]">
          <tr>
            <th className="px-4 py-3 text-sm font-bold">חווה</th>
            <th className="px-4 py-3 text-sm font-bold">סוס / ציוד</th>
            <th className="px-4 py-3 text-sm font-bold">תאריכים</th>
            <th className="px-4 py-3 text-sm font-bold">ימים</th>
            <th className="px-4 py-3 text-sm font-bold">סוג תא</th>
            <th className="px-4 py-3 text-sm font-bold">עלות כוללת</th>
            <th className="px-4 py-3 text-sm font-bold">תשלום</th>
            <th className="px-4 py-3 text-sm font-bold">משלמים</th>
            <th className="px-4 py-3 text-sm font-bold">הערות</th>
            <th className="px-4 py-3 text-sm font-bold">פעולות</th>
            <th className="sticky left-0 z-20 bg-[#F3EEEA] px-4 py-3 text-sm font-bold shadow-[6px_0_10px_-10px_rgba(0,0,0,0.35)]">
              שיבוץ
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredItems.map(function (item) {
            return (
              <tr
                key={item.stallBookingId}
                className="border-t border-[#EFE5DF] bg-white text-[#3F312B] hover:bg-[#FFF9F5]"
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">
                  {item.bookingRanchName}
                </td>

                <td className="min-w-[210px] px-4 py-3">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      {item.isForTack ? (
                        <Package size={15} className="text-[#7B5A4D]" />
                      ) : (
                        <span className="text-sm leading-none">🐴</span>
                      )}

                      <span>{getBookingName(item)}</span>
                    </span>

                    <span className="text-xs text-[#8D6E63]">
                      {getBookingSubName(item)}
                    </span>
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

                <td className="whitespace-nowrap px-4 py-3 text-sm font-bold">
                  {formatMoney(getCalculatedCost(item))}

                  <div className="text-[11px] font-normal text-[#8D6E63]">
                    {formatMoney(item.itemPrice)} ליום
                  </div>
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  <PaymentPill status={item.paymentStatus} />
                </td>

                <td className="min-w-[170px] px-4 py-3 text-sm">
                  {item.payerNames || "—"}
                </td>

                <td className="min-w-[160px] px-4 py-3 text-sm text-[#6B574F]">
                  {item.notes || "—"}
                </td>

                <td className="whitespace-nowrap px-2 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {props.onEditBooking ? (
                      <button
                        type="button"
                        onClick={function () {
                          props.onEditBooking(item);
                        }}
                        title="עריכה"
                        className="rounded-lg border border-[#E2D5CE] bg-white p-1.5 text-[#5D4037] hover:bg-[#F5EDE8]"
                      >
                        <Pencil size={14} />
                      </button>
                    ) : null}

                    {props.onDeleteBooking ? (
                      <button
                        type="button"
                        onClick={function () {
                          props.onDeleteBooking(item);
                        }}
                        title="ביטול"
                        className="rounded-lg border border-[#E7BABA] bg-white p-1.5 text-[#A54848] hover:bg-[#F9E5E5]"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </td>

                <td className="sticky left-0 z-10 bg-inherit px-4 py-3 shadow-[6px_0_10px_-10px_rgba(0,0,0,0.35)]">
                  {renderAssignmentStatus(item, compounds || [])}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTableShell>

      {filteredItems.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#D7CCC8] bg-[#FAF5F1] p-6 text-center text-sm text-[#8D6E63]">
          לא נמצאו הזמנות לפי החיפוש
        </div>
      )}
    </div>
  );
}
