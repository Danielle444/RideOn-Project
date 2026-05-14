import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import SecretaryClassEntriesSummaryCards from "./SecretaryClassEntriesSummaryCards";

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return "₪" + Number(value).toLocaleString("he-IL");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("he-IL");
}

function getValue(item, camelKey, pascalKey, fallback) {
  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function getFilterButtonClass(isActive) {
  return (
    "rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors " +
    (isActive
      ? "border-[#8B6352] bg-[#8B6352] text-white"
      : "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]")
  );
}

export default function SecretaryClassEntriesTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  return (
    <div className="space-y-4">
      <SecretaryClassEntriesSummaryCards
        summary={props.summary}
        titlePrefix="כניסות"
      />

      <section className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#3F312B]">כניסות למקצה</h2>
            <p className="text-xs text-[#8D6E63]">
              {items.length} כניסות מוצגות כרגע
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={function () {
                props.onPaymentFilterChange("all");
              }}
              className={getFilterButtonClass(props.paymentFilter === "all")}
            >
              הכל
            </button>

            <button
              type="button"
              onClick={function () {
                props.onPaymentFilterChange("paid");
              }}
              className={getFilterButtonClass(props.paymentFilter === "paid")}
            >
              שולם
            </button>

            <button
              type="button"
              onClick={function () {
                props.onPaymentFilterChange("unpaid");
              }}
              className={getFilterButtonClass(props.paymentFilter === "unpaid")}
            >
              לא שולם
            </button>

            <div className="w-full max-w-sm md:w-72">
              <input
                type="text"
                value={props.searchText}
                onChange={function (event) {
                  props.onSearchTextChange(event.target.value);
                }}
                placeholder="חיפוש לפי סוס, רוכב, מאמן או משלם..."
                className="h-11 w-full rounded-2xl border border-[#E2D5CE] bg-white px-4 text-right text-sm text-[#3F312B] outline-none transition-colors focus:border-[#8B6352]"
              />
            </div>
          </div>
        </div>

        <DataTableShell>
          <thead className="bg-[#FAF5F1] text-sm text-[#6B574F]">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">סדר הגרלה</th>
              <th className="px-4 py-3">מקצה</th>
              <th className="px-4 py-3">רוכב</th>
              <th className="px-4 py-3">סוס</th>
              <th className="px-4 py-3">מאמן</th>
              <th className="px-4 py-3">משלם</th>
              <th className="px-4 py-3">מקבל פרס</th>
              <th className="px-4 py-3">סה״כ</th>
              <th className="px-4 py-3">סטטוס תשלום</th>
              <th className="px-4 py-3">נוצר בתאריך</th>
            </tr>
          </thead>

          <tbody>
            {props.loading ? (
              <DataTableLoadingState colSpan={11} message="טוען כניסות..." />
            ) : null}

            {!props.loading && items.length === 0 ? (
              <DataTableEmptyState
                colSpan={11}
                message="לא נמצאו כניסות להצגה"
              />
            ) : null}

            {!props.loading
              ? items.map(function (item, index) {
                  var isPaid = !!getValue(item, "isPaid", "IsPaid", false);
                  var horseName = getValue(item, "horseName", "HorseName", "");
                  var barnName = getValue(item, "barnName", "BarnName", "");

                  return (
                    <tr
                      key={getValue(item, "entryId", "EntryId", index)}
                      className="border-t border-[#F1E7E1] text-sm text-[#4A3A34]"
                    >
                      <td className="px-4 py-3 font-bold">{index + 1}</td>

                      <td className="px-4 py-3">
                        {getValue(item, "drawOrder", "DrawOrder", null) || "-"}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {getValue(item, "className", "ClassName", "-")}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {getValue(item, "riderName", "RiderName", "-")}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">
                            {horseName || "-"}
                          </span>

                          {barnName ? (
                            <span className="text-xs text-[#8D6E63]">
                              {barnName}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {getValue(item, "coachName", "CoachName", "-") || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {getValue(item, "payerName", "PayerName", "-")}
                      </td>

                      <td className="px-4 py-3">
                        {getValue(
                          item,
                          "prizeRecipientName",
                          "PrizeRecipientName",
                          "-",
                        ) || "-"}
                      </td>

                      <td className="px-4 py-3 font-bold">
                        {formatMoney(
                          getValue(item, "amountToPay", "AmountToPay", 0),
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            "rounded-full px-3 py-1 text-xs font-semibold " +
                            (isPaid
                              ? "bg-[#EEF8F0] text-[#2F6B3B]"
                              : "bg-[#FFF4E5] text-[#9A5B00]")
                          }
                        >
                          {isPaid ? "שולם" : "לא שולם"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {formatDateTime(
                          getValue(item, "createdAt", "CreatedAt", null),
                        )}
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </DataTableShell>
      </section>
    </div>
  );
}
