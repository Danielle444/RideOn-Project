import { ArrowDown, ArrowUp, Dice5, Save, Shuffle, X } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";
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

function getEntryId(item) {
  return getValue(item, "entryId", "EntryId", 0);
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
  var canEditDrawOrder = !!props.canEditDrawOrder;

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
              {props.drawOrderEditMode
                ? "מצב עריכת סדר פעיל - הזיזי כניסות למעלה/למטה ואז שמרי"
                : items.length + " כניסות מוצגות כרגע"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEditDrawOrder && !props.drawOrderEditMode ? (
              <TableActionButton
                label="עריכת סדר"
                icon={<Shuffle size={15} />}
                onClick={props.onStartDrawOrderEdit}
              />
            ) : null}

            {props.drawOrderEditMode ? (
              <>
                <TableActionButton
                  label="הגרלה אקראית"
                  icon={<Dice5 size={15} />}
                  onClick={props.onShuffleDrawOrder}
                  disabled={props.savingDrawOrder}
                />

                <TableActionButton
                  label="שמירת סדר"
                  icon={<Save size={15} />}
                  onClick={props.onSaveDrawOrder}
                  loading={props.savingDrawOrder}
                />

                <TableActionButton
                  label="ביטול"
                  icon={<X size={15} />}
                  variant="danger"
                  onClick={props.onCancelDrawOrderEdit}
                  disabled={props.savingDrawOrder}
                />
              </>
            ) : null}

            {!props.drawOrderEditMode ? (
              <>
                <button
                  type="button"
                  onClick={function () {
                    props.onPaymentFilterChange("all");
                  }}
                  className={getFilterButtonClass(
                    props.paymentFilter === "all",
                  )}
                >
                  הכל
                </button>

                <button
                  type="button"
                  onClick={function () {
                    props.onPaymentFilterChange("paid");
                  }}
                  className={getFilterButtonClass(
                    props.paymentFilter === "paid",
                  )}
                >
                  שולם
                </button>

                <button
                  type="button"
                  onClick={function () {
                    props.onPaymentFilterChange("unpaid");
                  }}
                  className={getFilterButtonClass(
                    props.paymentFilter === "unpaid",
                  )}
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
              </>
            ) : null}
          </div>
        </div>

        {props.drawOrderError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {props.drawOrderError}
          </div>
        ) : null}

        {props.drawOrderEditMode ? (
          <div className="mb-4 rounded-2xl border border-[#EFE5DF] bg-[#FAF5F1] px-4 py-3 text-sm text-[#7A655C]">
            שימי לב: שמירת הסדר תעדכן את סדר ההגרלה של המקצה הנוכחי בלבד.
          </div>
        ) : null}

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
              {props.drawOrderEditMode ? (
                <th className="px-4 py-3">סידור</th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {props.loading ? (
              <DataTableLoadingState
                colSpan={props.drawOrderEditMode ? 12 : 11}
                message="טוען כניסות..."
              />
            ) : null}

            {!props.loading && items.length === 0 ? (
              <DataTableEmptyState
                colSpan={props.drawOrderEditMode ? 12 : 11}
                message="לא נמצאו כניסות להצגה"
              />
            ) : null}

            {!props.loading
              ? items.map(function (item, index) {
                  var isPaid = !!getValue(item, "isPaid", "IsPaid", false);
                  var horseName = getValue(item, "horseName", "HorseName", "");
                  var barnName = getValue(item, "barnName", "BarnName", "");
                  var entryId = getEntryId(item);

                  return (
                    <tr
                      key={entryId || index}
                      className={
                        "border-t border-[#F1E7E1] text-sm text-[#4A3A34] " +
                        (props.drawOrderEditMode ? "bg-white" : "")
                      }
                    >
                      <td className="px-4 py-3 font-bold">{index + 1}</td>

                      <td className="px-4 py-3 font-bold text-[#7B5A4D]">
                        {props.drawOrderEditMode
                          ? index + 1
                          : getValue(item, "drawOrder", "DrawOrder", null) ||
                            "-"}
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

                      {props.drawOrderEditMode ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={index === 0 || props.savingDrawOrder}
                              onClick={function () {
                                props.onMoveDrawOrderEntry(entryId, -1);
                              }}
                              className="rounded-xl border border-[#E2D5CE] bg-white p-2 text-[#7B5A4D] transition-colors hover:bg-[#FAF5F1] disabled:cursor-not-allowed disabled:opacity-40"
                              title="הזזה למעלה"
                            >
                              <ArrowUp size={16} />
                            </button>

                            <button
                              type="button"
                              disabled={
                                index === items.length - 1 ||
                                props.savingDrawOrder
                              }
                              onClick={function () {
                                props.onMoveDrawOrderEntry(entryId, 1);
                              }}
                              className="rounded-xl border border-[#E2D5CE] bg-white p-2 text-[#7B5A4D] transition-colors hover:bg-[#FAF5F1] disabled:cursor-not-allowed disabled:opacity-40"
                              title="הזזה למטה"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </td>
                      ) : null}
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
