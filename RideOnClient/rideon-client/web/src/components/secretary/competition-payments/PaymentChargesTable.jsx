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

function getStatusLabel(status) {
  if (status === "Paid") {
    return "שולם";
  }

  if (status === "Open") {
    return "פתוח";
  }

  return status || "-";
}

function getChargeId(charge) {
  return getValue(charge, "billChargeId", "BillChargeId", 0);
}

export default function PaymentChargesTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#D8CBC3] bg-white px-6 py-12 text-center text-sm text-[#8A7268]">
        אין שורות חיוב להצגה
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[24px] border border-[#E6DCD5] bg-white shadow-sm">
      <table className="w-full min-w-[1100px] border-collapse text-right">
        <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
          <tr>
            <th className="px-4 py-4">בחירה</th>
            <th className="px-4 py-4">תאריך</th>
            <th className="px-4 py-4">שם</th>
            <th className="px-4 py-4">רוכב</th>
            <th className="px-4 py-4">סוס</th>
            <th className="px-4 py-4">מאמן</th>
            <th className="px-4 py-4">סכום</th>
            <th className="px-4 py-4">סטטוס</th>
            <th className="px-4 py-4">חשבונית</th>
          </tr>
        </thead>

        <tbody>
          {items.map(function (charge) {
            var chargeId = getChargeId(charge);
            var isSelected = props.selectedChargeIds.includes(chargeId);
            var canSelect = getValue(
              charge,
              "canSelectForPayment",
              "CanSelectForPayment",
              false,
            );

            var status = getValue(charge, "chargeStatus", "ChargeStatus", "");

            return (
              <tr
                key={chargeId}
                className={
                  "border-t border-[#EFE5DF] text-sm text-[#3F312B] " +
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

                <td className="px-4 py-4">
                  {formatDate(
                    getValue(charge, "displayDate", "DisplayDate", null),
                  )}
                </td>

                <td className="px-4 py-4 font-black">
                  {getValue(charge, "mainName", "MainName", "-")}
                </td>

                <td className="px-4 py-4">
                  {getValue(charge, "riderName", "RiderName", "-") || "-"}
                </td>

                <td className="px-4 py-4">
                  <div className="font-bold">
                    {getValue(charge, "horseName", "HorseName", "-") || "-"}
                  </div>

                  <div className="mt-1 text-xs text-[#8A7268]">
                    {getValue(charge, "barnName", "BarnName", "") || ""}
                  </div>
                </td>

                <td className="px-4 py-4">
                  {getValue(charge, "coachName", "CoachName", "-") || "-"}
                </td>

                <td className="px-4 py-4 font-black">
                  {formatMoney(
                    getValue(charge, "amountToPay", "AmountToPay", 0),
                  )}
                </td>

                <td className="px-4 py-4 font-bold">
                  {getStatusLabel(status)}
                </td>

                <td className="px-4 py-4">
                  {getValue(charge, "invoiceNumber", "InvoiceNumber", "-") ||
                    "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
