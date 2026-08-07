import { ArrowRight, X } from "lucide-react";
import {
  computeDetailLevelTotals,
  computeEntriesLevelTotals,
  getProductRequestCountForDay,
} from "../../../utils/competitionSummaryDayGrouping.utils";

function getValue(item, camelKey, pascalKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("he-IL");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("he-IL");
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).substring(0, 5);
}

function getPaidLabel(isPaid) {
  return isPaid ? "שולם" : "לא שולם";
}

function getPaidClass(isPaid) {
  return isPaid ? "bg-[#EEF8F0] text-[#2E7D32]" : "bg-[#FDECEC] text-[#C62828]";
}

function getEntriesTitle(type, item) {
  if (type === "classes") {
    return getValue(item, "className", "ClassName", "כניסות מקצה");
  }

  if (type === "paid-time") {
    return (
      getValue(item, "productName", "ProductName", "פייד־טיים") +
      " · " +
      formatDate(getValue(item, "slotDate", "SlotDate", null)) +
      " · " +
      formatTime(getValue(item, "startTime", "StartTime", ""))
    );
  }

  if (type === "stalls") {
    return (
      getValue(item, "bookingRanchName", "BookingRanchName", "תאים") +
      " · " +
      getValue(item, "productName", "ProductName", "")
    );
  }

  if (type === "shavings") {
    return getValue(item, "bookingRanchName", "BookingRanchName", "נסורת");
  }

  return "פירוט";
}

function DetailsTable(props) {
  var type = props.type;
  var items = Array.isArray(props.items) ? props.items : [];

  if (type === "classes") {
    return (
      <SummaryTable
        headers={[
          "יום",
          "מס׳",
          "שם מקצה",
          "כניסות",
          "קנסות",
          "שולם",
          "לא שולם",
          "סה״כ צפוי",
        ]}
        items={items}
        onRowClick={props.onRowClick}
        renderRow={function (item) {
          return [
            formatDate(getValue(item, "classDate", "ClassDate", null)),
            getValue(item, "orderInDay", "OrderInDay", "-"),
            getValue(item, "className", "ClassName", "-"),
            getValue(item, "entryCount", "EntryCount", 0),
            getValue(item, "fineCount", "FineCount", 0),
            formatMoney(getValue(item, "paidAmount", "PaidAmount", 0)),
            formatMoney(getValue(item, "unpaidAmount", "UnpaidAmount", 0)),
            formatMoney(getValue(item, "expectedAmount", "ExpectedAmount", 0)),
          ];
        }}
      />
    );
  }

  if (type === "paid-time") {
    return (
      <SummaryTable
        headers={[
          "יום",
          "שעה",
          "מגרש",
          "מוצר",
          "אורך",
          "בקשות",
          "שולם",
          "לא שולם",
          "סה״כ צפוי",
        ]}
        items={items}
        onRowClick={props.onRowClick}
        renderRow={function (item) {
          return [
            formatDate(getValue(item, "slotDate", "SlotDate", null)),
            formatTime(getValue(item, "startTime", "StartTime", "")) +
              "–" +
              formatTime(getValue(item, "endTime", "EndTime", "")),
            getValue(item, "arenaName", "ArenaName", "-"),
            getValue(item, "productName", "ProductName", "-"),
            getValue(item, "durationMinutes", "DurationMinutes", 0) + " דק׳",
            getValue(item, "requestCount", "RequestCount", 0),
            formatMoney(getValue(item, "paidAmount", "PaidAmount", 0)),
            formatMoney(getValue(item, "unpaidAmount", "UnpaidAmount", 0)),
            formatMoney(getValue(item, "expectedAmount", "ExpectedAmount", 0)),
          ];
        }}
      />
    );
  }

  if (type === "stalls") {
    return (
      <SummaryTable
        headers={[
          "חווה",
          "סוג תא",
          "סוג שימוש",
          "הזמנות",
          "שולם",
          "לא שולם",
          "סה״כ צפוי",
        ]}
        items={items}
        onRowClick={props.onRowClick}
        renderRow={function (item) {
          var isForTack = getValue(item, "isForTack", "IsForTack", false);

          return [
            getValue(item, "bookingRanchName", "BookingRanchName", "-"),
            getValue(item, "productName", "ProductName", "-"),
            isForTack ? "תא ציוד" : "תא סוס",
            getValue(item, "bookingCount", "BookingCount", 0),
            formatMoney(getValue(item, "paidAmount", "PaidAmount", 0)),
            formatMoney(getValue(item, "unpaidAmount", "UnpaidAmount", 0)),
            formatMoney(getValue(item, "expectedAmount", "ExpectedAmount", 0)),
          ];
        }}
      />
    );
  }

  if (type === "shavings") {
    return (
      <SummaryTable
        headers={[
          "חווה",
          "הזמנות",
          "תאים",
          "שקים",
          "שולם",
          "לא שולם",
          "סה״כ צפוי",
        ]}
        items={items}
        onRowClick={props.onRowClick}
        renderRow={function (item) {
          return [
            getValue(item, "bookingRanchName", "BookingRanchName", "-"),
            getValue(item, "orderCount", "OrderCount", 0),
            getValue(item, "stallCount", "StallCount", 0),
            getValue(item, "bagQuantity", "BagQuantity", 0),
            formatMoney(getValue(item, "paidAmount", "PaidAmount", 0)),
            formatMoney(getValue(item, "unpaidAmount", "UnpaidAmount", 0)),
            formatMoney(getValue(item, "expectedAmount", "ExpectedAmount", 0)),
          ];
        }}
      />
    );
  }

  if (type === "cash") {
    return (
      <SummaryTable
        headers={["תאריך", "משלם", "סכום", "חשבון", "אסמכתא", "הוזן על ידי"]}
        items={items}
        renderRow={function (item) {
          return [
            formatDateTime(getValue(item, "paymentDate", "PaymentDate", null)),
            getValue(item, "payerName", "PayerName", "-"),
            formatMoney(getValue(item, "amountPaid", "AmountPaid", 0)),
            getValue(item, "billId", "BillId", "-"),
            getValue(
              item,
              "transactionReference",
              "TransactionReference",
              "-",
            ) || "-",
            getValue(item, "enteredByName", "EnteredByName", "-") || "-",
          ];
        }}
      />
    );
  }

  return null;
}

function EntriesTable(props) {
  var type = props.type;
  var items = Array.isArray(props.items) ? props.items : [];

  if (type === "classes") {
    return (
      <SummaryTable
        headers={[
          "סדר",
          "רוכב",
          "סוס",
          "מאמן",
          "משלם",
          "מקבל פרס",
          "מחיר כניסה",
          "קנס הרשמה מאוחרת",
          "סה״כ",
          "סטטוס",
        ]}
        items={items}
        renderRow={function (item) {
          var isPaid = getValue(item, "isPaid", "IsPaid", false);
          var baseAmount = Number(getValue(item, "amount", "Amount", 0)) || 0;
          var fineAmount =
            Number(getValue(item, "fineAmount", "FineAmount", 0)) || 0;
          var combinedTotal = baseAmount + fineAmount;

          return [
            getValue(item, "drawOrder", "DrawOrder", "-") || "-",
            getValue(item, "riderName", "RiderName", "-"),
            getValue(item, "horseName", "HorseName", "-"),
            getValue(item, "coachName", "CoachName", "-") || "-",
            getValue(item, "payerName", "PayerName", "-"),
            getValue(item, "prizeRecipientName", "PrizeRecipientName", "-") ||
              "-",
            formatMoney(baseAmount),
            fineAmount > 0 ? formatMoney(fineAmount) : "-",
            formatMoney(combinedTotal),
            <StatusBadge isPaid={isPaid} />,
          ];
        }}
      />
    );
  }

  if (type === "paid-time") {
    return (
      <SummaryTable
        headers={["רוכב", "סוס", "מאמן", "משלם", "סטטוס בקשה", "תשלום", "סכום"]}
        items={items}
        renderRow={function (item) {
          var isPaid = getValue(item, "isPaid", "IsPaid", false);

          return [
            getValue(item, "riderName", "RiderName", "-"),
            getValue(item, "horseName", "HorseName", "-"),
            getValue(item, "coachName", "CoachName", "-") || "-",
            getValue(item, "payerName", "PayerName", "-"),
            getValue(item, "status", "Status", "-"),
            <StatusBadge isPaid={isPaid} />,
            formatMoney(getValue(item, "amount", "Amount", 0)),
          ];
        }}
      />
    );
  }

  if (type === "stalls") {
    return (
      <SummaryTable
        headers={[
          "מס׳ הזמנה",
          "חווה",
          "סוג",
          "סוס",
          "תאריכים",
          "משלמים",
          "תשלום",
          "סה״כ",
        ]}
        items={items}
        renderRow={function (item) {
          var isPaid = getValue(item, "isPaid", "IsPaid", false);

          return [
            getValue(item, "stallBookingId", "StallBookingId", "-"),
            getValue(item, "bookingRanchName", "BookingRanchName", "-"),
            getValue(item, "productName", "ProductName", "-"),
            getValue(item, "horseName", "HorseName", "-") || "תא ציוד",
            formatDate(getValue(item, "startDate", "StartDate", null)) +
              "–" +
              formatDate(getValue(item, "endDate", "EndDate", null)),
            getValue(item, "payerNames", "PayerNames", "-"),
            <StatusBadge isPaid={isPaid} />,
            formatMoney(getValue(item, "expectedAmount", "ExpectedAmount", 0)),
          ];
        }}
      />
    );
  }

  if (type === "shavings") {
    return (
      <SummaryTable
        headers={[
          "מס׳ הזמנה",
          "תאים",
          "שקים",
          "מועד אספקה",
          "סטטוס",
          "סוסים",
          "משלמים",
          "תשלום",
          "סה״כ",
        ]}
        items={items}
        renderRow={function (item) {
          var isPaid = getValue(item, "isPaid", "IsPaid", false);

          return [
            getValue(item, "shavingsOrderId", "ShavingsOrderId", "-"),
            getValue(item, "stallCount", "StallCount", 0),
            getValue(item, "bagQuantity", "BagQuantity", 0),
            formatDateTime(
              getValue(
                item,
                "requestedDeliveryTime",
                "RequestedDeliveryTime",
                null,
              ),
            ),
            getValue(item, "deliveryStatus", "DeliveryStatus", "-") || "-",
            getValue(item, "horseNames", "HorseNames", "-"),
            getValue(item, "payerNames", "PayerNames", "-"),
            <StatusBadge isPaid={isPaid} />,
            formatMoney(getValue(item, "expectedAmount", "ExpectedAmount", 0)),
          ];
        }}
      />
    );
  }

  return null;
}

function SummaryTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  if (items.length === 0) {
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
            {props.headers.map(function (header) {
              return (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {items.map(function (item, index) {
            var cells = props.renderRow(item);

            return (
              <tr
                key={index}
                onClick={function () {
                  if (props.onRowClick) {
                    props.onRowClick(item);
                  }
                }}
                className={
                  "border-t border-[#EFE5DF] text-sm text-[#3F312B] " +
                  (props.onRowClick
                    ? "cursor-pointer transition-colors hover:bg-[#FCF8F5]"
                    : "")
                }
              >
                {cells.map(function (cell, cellIndex) {
                  return (
                    <td key={cellIndex} className="px-4 py-4 align-top">
                      {cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge(props) {
  return (
    <span
      className={
        "rounded-full px-3 py-1 text-xs font-bold " + getPaidClass(props.isPaid)
      }
    >
      {getPaidLabel(props.isPaid)}
    </span>
  );
}

function SummaryTotalsStrip(props) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#E3D7D0] bg-[#FBF7F4] px-5 py-4 text-sm sm:grid-cols-4">
      <div>
        <p className="text-xs font-bold text-[#8A7268]">{props.countLabel}</p>
        <p className="mt-1 text-lg font-black text-[#3F312B]">
          {props.countValue}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#8A7268]">שולם</p>
        <p className="mt-1 text-lg font-black text-[#2E7D32]">
          {formatMoney(props.paidAmount)}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#8A7268]">לא שולם</p>
        <p className="mt-1 text-lg font-black text-[#C62828]">
          {formatMoney(props.unpaidAmount)}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#8A7268]">סה״כ צפוי</p>
        <p className="mt-1 text-lg font-black text-[#7B5A4D]">
          {formatMoney(props.expectedAmount)}
        </p>
      </div>
    </div>
  );
}

function ClassesDayListTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  return (
    <SummaryTable
      headers={[
        "יום",
        "מס׳ מקצים",
        "כניסות",
        "קנסות",
        "שולם",
        "לא שולם",
        "סה״כ צפוי",
      ]}
      items={items}
      onRowClick={props.onRowClick}
      renderRow={function (day) {
        return [
          formatDate(day.dayKey),
          day.classCount,
          day.entryCount,
          day.fineCount,
          formatMoney(day.paidAmount),
          formatMoney(day.unpaidAmount),
          formatMoney(day.expectedAmount),
        ];
      }}
    />
  );
}

function PaidTimeDayListTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var productColumns = Array.isArray(props.productColumns)
    ? props.productColumns
    : [];

  var headers = ["יום"]
    .concat(
      productColumns.map(function (product) {
        return product.productName + " · בקשות";
      }),
    )
    .concat(["סה״כ בקשות", "שולם", "לא שולם", "סה״כ צפוי"]);

  return (
    <SummaryTable
      headers={headers}
      items={items}
      onRowClick={props.onRowClick}
      renderRow={function (day) {
        var productCells = productColumns.map(function (product) {
          return getProductRequestCountForDay(day, product.productName);
        });

        return [formatDate(day.dayKey)]
          .concat(productCells)
          .concat([
            day.requestCount,
            formatMoney(day.paidAmount),
            formatMoney(day.unpaidAmount),
            formatMoney(day.expectedAmount),
          ]);
      }}
    />
  );
}

export default function SummaryDetailsModal(props) {
  if (!props.modal) {
    return null;
  }

  var type = props.modal.type;
  var isDayTierType = type === "classes" || type === "paid-time";
  var isEntriesMode = !!props.selectedDetailItem;
  var isDayRowsMode =
    isDayTierType &&
    !isEntriesMode &&
    props.selectedDay !== null &&
    props.selectedDay !== undefined;
  var isDayListMode = isDayTierType && !isEntriesMode && !isDayRowsMode;

  var detailsItems = Array.isArray(props.detailsItems) ? props.detailsItems : [];
  var dayGroups = Array.isArray(props.detailsDayGroups)
    ? props.detailsDayGroups
    : [];
  var selectedDayItems = Array.isArray(props.selectedDayItems)
    ? props.selectedDayItems
    : [];
  var entryItems = Array.isArray(props.entryItems) ? props.entryItems : [];

  // A single flag for "is the data behind whatever's currently visible still loading" -- day-list
  // and day-rows both read off detailsItems (no separate fetch for selecting a day), so
  // detailsLoading covers both; only entries mode has its own fetch/loading flag.
  var isLoadingCurrentLevel = isEntriesMode
    ? props.entriesLoading
    : props.detailsLoading;

  // Cash rows have no paid/unpaid/expected shape (they're a payment ledger, not a charge-status
  // table) so the strip is not rendered for cash -- never invent that semantics for it.
  var showStrip = type !== "cash";
  var stripTotals = null;

  if (showStrip && !isLoadingCurrentLevel) {
    if (isEntriesMode) {
      stripTotals = computeEntriesLevelTotals(type, entryItems);
    } else if (isDayRowsMode) {
      stripTotals = computeDetailLevelTotals(type, selectedDayItems);
    } else {
      stripTotals = computeDetailLevelTotals(type, detailsItems);
    }
  }

  var headerTitle = props.modal.title;

  if (isEntriesMode) {
    headerTitle = getEntriesTitle(type, props.selectedDetailItem);
  } else if (isDayRowsMode) {
    headerTitle = props.modal.title + " · " + formatDate(props.selectedDay);
  }

  var subtitle = "לחצי על שורה כדי לראות פירוט פנימי";

  if (isEntriesMode) {
    subtitle = "פירוט הרשומות בתוך השורה שנבחרה";
  } else if (isDayListMode) {
    subtitle = "לחצי על יום כדי לראות את הפירוט שלו";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-[#3F312B]">{headerTitle}</h2>

            <p className="mt-1 text-sm text-[#8A7268]">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#6D4C41] transition-colors hover:bg-[#F5EDE8]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-120px)] overflow-y-auto p-6">
          {isEntriesMode ? (
            <button
              type="button"
              onClick={props.onBackToDetails}
              className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E2D5CE] bg-white px-4 py-2 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#FAF5F1]"
            >
              <ArrowRight size={16} />
              חזרה לפירוט
            </button>
          ) : null}

          {isDayRowsMode ? (
            <button
              type="button"
              onClick={props.onBackToDayList}
              className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E2D5CE] bg-white px-4 py-2 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#FAF5F1]"
            >
              <ArrowRight size={16} />
              חזרה לרשימת הימים
            </button>
          ) : null}

          {props.detailsError && !isEntriesMode ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {props.detailsError}
            </div>
          ) : null}

          {props.entriesError && isEntriesMode ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {props.entriesError}
            </div>
          ) : null}

          {isLoadingCurrentLevel && !isEntriesMode ? (
            <div className="rounded-2xl border border-[#E3D7D0] bg-[#FCFAF8] px-6 py-10 text-center text-[#7B5A4D]">
              טוען פירוט...
            </div>
          ) : null}

          {isLoadingCurrentLevel && isEntriesMode ? (
            <div className="rounded-2xl border border-[#E3D7D0] bg-[#FCFAF8] px-6 py-10 text-center text-[#7B5A4D]">
              טוען רשומות...
            </div>
          ) : null}

          {stripTotals ? (
            <SummaryTotalsStrip
              countLabel={stripTotals.countLabel}
              countValue={stripTotals.countValue}
              paidAmount={stripTotals.paidAmount}
              unpaidAmount={stripTotals.unpaidAmount}
              expectedAmount={stripTotals.expectedAmount}
            />
          ) : null}

          {!isLoadingCurrentLevel && isDayListMode && type === "classes" ? (
            <ClassesDayListTable items={dayGroups} onRowClick={props.onOpenDay} />
          ) : null}

          {!isLoadingCurrentLevel && isDayListMode && type === "paid-time" ? (
            <PaidTimeDayListTable
              items={dayGroups}
              productColumns={props.paidTimeProductColumns}
              onRowClick={props.onOpenDay}
            />
          ) : null}

          {!isLoadingCurrentLevel && isDayRowsMode ? (
            <DetailsTable
              type={type}
              items={selectedDayItems}
              onRowClick={props.onDetailRowClick}
            />
          ) : null}

          {!isLoadingCurrentLevel && !isEntriesMode && !isDayTierType ? (
            <DetailsTable
              type={type}
              items={detailsItems}
              onRowClick={type === "cash" ? null : props.onDetailRowClick}
            />
          ) : null}

          {!isLoadingCurrentLevel && isEntriesMode ? (
            <EntriesTable type={type} items={entryItems} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
