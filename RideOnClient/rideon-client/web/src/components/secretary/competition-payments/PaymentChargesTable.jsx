import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";

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

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("he-IL");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateRange(startDate, endDate, fallbackDate) {
  if (startDate || endDate) {
    var start = formatDate(startDate);
    var end = formatDate(endDate);

    if (start !== "-" && end !== "-" && start !== end) {
      return start + " - " + end;
    }

    if (start !== "-") {
      return start;
    }

    if (end !== "-") {
      return end;
    }
  }

  return formatDate(fallbackDate);
}

function getStatusLabel(status) {
  if (status === "Paid") {
    return "שולם";
  }

  if (status === "Open") {
    return "פתוח";
  }

  return status || "-";
}

function getStatusClass(status) {
  if (status === "Paid") {
    return "bg-[#EAF7EC] text-[#2E7D32]";
  }

  if (status === "Open") {
    return "bg-[#FFF4E5] text-[#B26A00]";
  }

  return "bg-[#F1ECE8] text-[#7A655C]";
}

function getChargeId(charge) {
  return getValue(charge, "billChargeId", "BillChargeId", 0);
}

function getDisplayRowKey(charge) {
  return String(
    getValue(charge, "displayRowKey", "DisplayRowKey", getChargeId(charge)),
  );
}

function getCategoryKey(charge) {
  return getValue(charge, "categoryKey", "CategoryKey", "");
}

function getMainTitle(charge) {
  var categoryKey = getCategoryKey(charge);
  var mainName = getValue(charge, "mainName", "MainName", "-");

  if (categoryKey === "stalls") {
    var stallTypeName = getValue(charge, "stallTypeName", "StallTypeName", "");

    return stallTypeName || mainName || "תא";
  }

  if (categoryKey === "shavings") {
    return mainName || "נסורת";
  }

  return mainName || "-";
}

function getHorseDisplay(charge) {
  var horseName = getValue(charge, "horseName", "HorseName", "");
  var barnName = getValue(charge, "barnName", "BarnName", "");

  if (!horseName && !barnName) {
    return "-";
  }

  if (barnName && horseName && barnName !== horseName) {
    return horseName + " (" + barnName + ")";
  }

  return barnName || horseName;
}

function parseSplitPayersJson(value) {
  if (!value) {
    return [];
  }

  try {
    var parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
}

function SplitPayersButton(props) {
  var [open, setOpen] = useState(false);
  var payers = parseSplitPayersJson(
    getValue(props.charge, "splitPayersJson", "SplitPayersJson", "[]"),
  );

  var count = Number(
    getValue(props.charge, "splitPayersCount", "SplitPayersCount", 0),
  );

  if (!payers.length) {
    return null;
  }

  return (
    <div className="relative inline-block text-right">
      <button
        type="button"
        onClick={function () {
          setOpen(!open);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-[#D8CBC3] bg-white px-3 py-1 text-xs font-black text-[#6D4C41] transition-colors hover:bg-[#FCF8F5]"
        title="הצגת משלמים"
      >
        <Users size={14} />
        {count > 1 ? count + " משלמים" : "משלם"}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open ? (
        <div className="absolute left-0 z-30 mt-2 w-72 rounded-2xl border border-[#E6DCD5] bg-white p-3 text-right shadow-lg">
          <p className="mb-2 text-xs font-black text-[#3F312B]">משלמים בחיוב</p>

          <div className="space-y-2">
            {payers.map(function (payer) {
              var payerPersonId =
                payer.payerPersonId || payer.PayerPersonId || payer.personId;
              var payerName = payer.payerName || payer.PayerName || "-";
              var amount = payer.amountToPay || payer.AmountToPay || 0;
              var status = payer.chargeStatus || payer.ChargeStatus || "";
              var isCurrent =
                payer.isCurrentPayer === true || payer.IsCurrentPayer === true;

              return (
                <div
                  key={payerPersonId + "-" + payerName}
                  className={
                    "rounded-xl border px-3 py-2 text-xs " +
                    (isCurrent
                      ? "border-[#8B5E4C] bg-[#FCF8F5]"
                      : "border-[#EFE5DF] bg-white")
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-[#3F312B]">{payerName}</p>

                      {isCurrent ? (
                        <p className="mt-1 inline-flex rounded-full bg-[#8B5E4C] px-2 py-0.5 text-[10px] font-black text-white">
                          החשבון הנוכחי
                        </p>
                      ) : null}
                    </div>

                    <div className="text-left">
                      <p className="font-black text-[#3F312B]">
                        {formatMoney(amount)}
                      </p>
                      <p className="mt-1 text-[#8A7268]">
                        {getStatusLabel(status)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getDetailsContent(charge) {
  var categoryKey = getCategoryKey(charge);

  if (categoryKey === "stalls") {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-bold text-[#3F312B]">
          {getValue(charge, "stallAssignmentText", "StallAssignmentText", "תא")}
        </p>

        <p className="text-[#7A655C]">
          סוג תא:{" "}
          {getValue(charge, "stallTypeName", "StallTypeName", "-") || "-"}
        </p>

        <p className="text-[#7A655C]">
          טווח:{" "}
          {formatDateRange(
            getValue(charge, "startDate", "StartDate", null),
            getValue(charge, "endDate", "EndDate", null),
            getValue(charge, "displayDate", "DisplayDate", null),
          )}
        </p>

        <SplitPayersButton charge={charge} />
      </div>
    );
  }

  if (categoryKey === "shavings") {
    return (
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-bold text-[#7A655C]">סוס: </span>
          <span className="font-black text-[#3F312B]">
            {getHorseDisplay(charge)}
          </span>
        </p>

        <p className="text-[#7A655C]">
          כמות שקים:{" "}
          <span className="font-bold text-[#3F312B]">
            {getValue(charge, "bagQuantity", "BagQuantity", "-") || "-"}
          </span>
        </p>

        <p className="text-[#7A655C]">
          אספקה:{" "}
          {formatDateTime(
            getValue(
              charge,
              "requestedDeliveryTime",
              "RequestedDeliveryTime",
              null,
            ),
          )}
        </p>

        <p className="text-[#7A655C]">
          הוזמן על ידי:{" "}
          {getValue(charge, "orderedByName", "OrderedByName", "-") || "-"}
        </p>

        <SplitPayersButton charge={charge} />
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm">
      <p>
        <span className="font-bold text-[#7A655C]">רוכב: </span>
        <span className="text-[#3F312B]">
          {getValue(charge, "riderName", "RiderName", "-") || "-"}
        </span>
      </p>

      <p>
        <span className="font-bold text-[#7A655C]">סוס: </span>
        <span className="text-[#3F312B]">{getHorseDisplay(charge)}</span>
      </p>

      <p>
        <span className="font-bold text-[#7A655C]">מאמן: </span>
        <span className="text-[#3F312B]">
          {getValue(charge, "coachName", "CoachName", "-") || "-"}
        </span>
      </p>
    </div>
  );
}

function getDateCellContent(charge) {
  var categoryKey = getCategoryKey(charge);

  if (categoryKey === "shavings") {
    return formatDate(getValue(charge, "displayDate", "DisplayDate", null));
  }

  return formatDateRange(
    getValue(charge, "startDate", "StartDate", null),
    getValue(charge, "endDate", "EndDate", null),
    getValue(charge, "displayDate", "DisplayDate", null),
  );
}

export default function PaymentChargesTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var selectedChargeIds = Array.isArray(props.selectedChargeIds)
    ? props.selectedChargeIds
    : [];

  var selectableCount = Array.isArray(props.visibleSelectableChargeIds)
    ? props.visibleSelectableChargeIds.length
    : 0;

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#D8CBC3] bg-white px-6 py-12 text-center text-sm text-[#8A7268]">
        אין שורות חיוב להצגה
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-hidden rounded-[24px] border border-[#E6DCD5] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#EFE5DF] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#3F312B]">פירוט חיובים</h3>
          <p className="mt-1 text-xs text-[#8A7268]">
            ניתן לבחור רק חיובים פתוחים. בחירת נסורת בוחרת את כל החיוב של אותה
            הזמנה למשלם.
          </p>
        </div>

        <button
          type="button"
          onClick={props.onToggleSelectAllVisibleCharges}
          disabled={selectableCount === 0}
          className="rounded-2xl border border-[#D8CBC3] bg-white px-5 py-3 text-sm font-black text-[#6D4C41] transition-colors hover:bg-[#F8F3EF] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {props.allVisibleChargesSelected ? "בטל בחירת הכל" : "בחר הכל לתשלום"}
        </button>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[820px] table-auto border-collapse text-right">
          <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
            <tr>
              <th className="w-[70px] px-4 py-4">בחירה</th>
              <th className="w-[140px] px-4 py-4">תאריך</th>
              <th className="w-[190px] px-4 py-4">חיוב</th>
              <th className="px-4 py-4">פרטים</th>
              <th className="w-[110px] px-4 py-4">סכום</th>
              <th className="w-[100px] px-4 py-4">סטטוס</th>
              <th className="w-[120px] px-4 py-4">חשבונית</th>
            </tr>
          </thead>

          <tbody>
            {items.map(function (charge) {
              var chargeId = getChargeId(charge);
              var rowKey = getDisplayRowKey(charge);
              var isSelected = selectedChargeIds.includes(chargeId);
              var canSelect = getValue(
                charge,
                "canSelectForPayment",
                "CanSelectForPayment",
                false,
              );

              var status = getValue(charge, "chargeStatus", "ChargeStatus", "");

              return (
                <tr
                  key={rowKey}
                  className={
                    "border-t border-[#EFE5DF] align-top text-sm text-[#3F312B] " +
                    (canSelect
                      ? "hover:bg-[#FCF8F5]"
                      : "bg-[#FAFAFA] text-[#8A8A8A]")
                  }
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!canSelect}
                      onChange={function () {
                        props.onToggleCharge(charge);
                      }}
                      className="h-5 w-5 accent-[#8B5E4C]"
                    />
                  </td>

                  <td className="px-4 py-4 text-sm font-bold text-[#7A655C]">
                    {getDateCellContent(charge)}
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-black text-[#3F312B]">
                      {getMainTitle(charge)}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-[#8A7268]">
                      {getValue(charge, "payerName", "PayerName", "")}
                    </div>
                  </td>

                  <td className="max-w-[390px] px-4 py-4">
                    <div className="whitespace-normal break-words">
                      {getDetailsContent(charge)}
                    </div>
                  </td>

                  <td className="px-4 py-4 font-black">
                    {formatMoney(
                      getValue(charge, "amountToPay", "AmountToPay", 0),
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={
                        "inline-flex rounded-full px-3 py-1 text-xs font-black " +
                        getStatusClass(status)
                      }
                    >
                      {getStatusLabel(status)}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm">
                    {getValue(charge, "invoiceNumber", "InvoiceNumber", "-") ||
                      "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
