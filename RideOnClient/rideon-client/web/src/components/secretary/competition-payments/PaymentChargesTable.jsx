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

function getDetailsContent(charge) {
  var categoryKey = getCategoryKey(charge);

  if (categoryKey === "stalls") {
    return (
      <div className="space-y-1 text-sm">
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

        <p className="text-[#7A655C]">
          {getValue(charge, "splitPaymentText", "SplitPaymentText", "")}
        </p>
      </div>
    );
  }

  if (categoryKey === "shavings") {
    return (
      <div className="space-y-1 text-sm">
        <p className="font-bold text-[#3F312B]">
          {getValue(
            charge,
            "stallAssignmentText",
            "StallAssignmentText",
            "נסורת",
          )}
        </p>

        <p className="text-[#7A655C]">
          כמות שקים:{" "}
          {getValue(charge, "bagQuantity", "BagQuantity", "-") || "-"}
        </p>

        <p className="text-[#7A655C]">
          טווח תא:{" "}
          {formatDateRange(
            getValue(charge, "startDate", "StartDate", null),
            getValue(charge, "endDate", "EndDate", null),
            getValue(charge, "displayDate", "DisplayDate", null),
          )}
        </p>

        <p className="text-[#7A655C]">
          {getValue(charge, "splitPaymentText", "SplitPaymentText", "")}
        </p>
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

export default function PaymentChargesTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var selectedChargeIds = Array.isArray(props.selectedChargeIds)
    ? props.selectedChargeIds
    : [];

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#D8CBC3] bg-white px-6 py-12 text-center text-sm text-[#8A7268]">
        אין שורות חיוב להצגה
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-hidden rounded-[24px] border border-[#E6DCD5] bg-white shadow-sm">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[760px] table-auto border-collapse text-right">
          <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
            <tr>
              <th className="w-[70px] px-4 py-4">בחירה</th>
              <th className="w-[150px] px-4 py-4">תאריך / טווח</th>
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
              var isSelected = selectedChargeIds.includes(chargeId);
              var canSelect = getValue(
                charge,
                "canSelectForPayment",
                "CanSelectForPayment",
                false,
              );

              var status = getValue(charge, "chargeStatus", "ChargeStatus", "");
              var displayDate = getValue(
                charge,
                "displayDate",
                "DisplayDate",
                null,
              );

              var startDate = getValue(charge, "startDate", "StartDate", null);
              var endDate = getValue(charge, "endDate", "EndDate", null);

              return (
                <tr
                  key={chargeId}
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
                    {formatDateRange(startDate, endDate, displayDate)}
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-black text-[#3F312B]">
                      {getMainTitle(charge)}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-[#8A7268]">
                      {getValue(charge, "payerName", "PayerName", "")}
                    </div>
                  </td>

                  <td className="max-w-[360px] px-4 py-4">
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
