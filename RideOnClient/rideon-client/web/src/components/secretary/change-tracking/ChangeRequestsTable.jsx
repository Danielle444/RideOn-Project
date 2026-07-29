import { Check, Eye, RotateCcw, X } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";
import DateRangeText from "./DateRangeText";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import {
  getStatusLabel,
  getStatusClass,
  getSourceLabel,
  isPostStartFullChargeCancellation,
  POST_START_FULL_CHARGE_LABEL,
  buildChangedFields,
} from "../../../utils/changeTracking.utils";

// #52: these endpoints serialize camelCase (MVC default naming policy), so
// this reads the one live key. The PascalCase fallback it replaced was dead.
function getValue(item, camelKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  return fallback;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("he-IL");
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return "₪" + Number(value).toLocaleString("he-IL");
}

function getRequestKey(item) {
  return (
    getValue(item, "requestSource", "") +
    "-" +
    getValue(item, "requestId", "")
  );
}

function ChangeSummary(props) {
  var item = props.item;

  var requestType = getValue(item, "requestType", "");
  var isCancelled = getValue(item, "isCancelled", false);
  var beforeText = getValue(item, "beforeText", "");
  var afterText = getValue(item, "afterText", "");
  var amountBefore = getValue(item, "amountBefore", null);
  var amountAfter = getValue(item, "amountAfter", null);
  var fineAmount = getValue(
    item,
    "fineAmountSnapshot",
    null,
  );

  var changes = buildChangedFields(beforeText, afterText);
  var isPostStartFullCharge = isPostStartFullChargeCancellation(
    isCancelled,
    amountBefore,
    amountAfter,
  );

  if (isCancelled) {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-bold text-[#3F312B]">{requestType}</span>

        <span className="text-xs text-[#6D4C41]">
          <DateRangeText text={beforeText} fallback="ביטול הרשמה" />
        </span>

        <span className="text-xs font-bold text-[#7B5A4D]">
          סכום: {formatMoney(amountBefore)} ← {formatMoney(amountAfter)}
        </span>

        {isPostStartFullCharge ? (
          <span className="text-xs font-semibold text-[#8D6E63]">
            {POST_START_FULL_CHARGE_LABEL}
          </span>
        ) : null}

        {fineAmount !== null && fineAmount !== undefined ? (
          <span className="text-xs font-bold text-[#B26A00]">
            החיוב הסופי כולל קנס: {formatMoney(fineAmount)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="font-bold text-[#3F312B]">{requestType}</span>

      {changes.length > 0 ? (
        changes.slice(0, 3).map(function (change, index) {
          return (
            <span key={index} className="text-xs text-[#6D4C41]">
              {change.label}: <DateRangeText text={change.beforeValue} />{" "}
              ← <DateRangeText text={change.afterValue} />
            </span>
          );
        })
      ) : (
        <span className="text-xs text-[#6D4C41]">
          <DateRangeText text={afterText} fallback="שינוי בפרטי הבקשה" />
        </span>
      )}

      <span className="text-xs font-bold text-[#7B5A4D]">
        סכום: {formatMoney(amountBefore)} ← {formatMoney(amountAfter)}
      </span>

      {fineAmount !== null && fineAmount !== undefined ? (
        <span className="text-xs font-bold text-[#B26A00]">
          כולל קנס: {formatMoney(fineAmount)}
        </span>
      ) : null}
    </div>
  );
}

export default function ChangeRequestsTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var isPendingTab = props.activeStatus === "Pending";

  return (
    <section className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#3F312B]">בקשות שינוי</h2>

          <p className="text-xs text-[#8D6E63]">
            {items.length} בקשות מוצגות כרגע
          </p>
        </div>
      </div>

      <DataTableShell>
        <thead className="bg-[#FAF5F1] text-sm text-[#6B574F]">
          <tr>
            <th className="px-4 py-3">תאריך בקשה</th>
            <th className="px-4 py-3">מבקש</th>
            <th className="px-4 py-3">מקור</th>
            <th className="px-4 py-3">נושא הבקשה</th>
            <th className="px-4 py-3">מה שונה</th>
            <th className="px-4 py-3">סטטוס</th>
            <th className="px-4 py-3">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {props.loading ? (
            <DataTableLoadingState colSpan={7} message="טוען בקשות שינוי..." />
          ) : null}

          {!props.loading && items.length === 0 && props.hasRequests ? (
            <tr>
              <td colSpan={7} className="py-16 text-center text-[#7A655C]">
                <div className="flex flex-col items-center gap-3">
                  <span>אין בקשות התואמות את הסינון. נסי לנקות את הסינון.</span>

                  <TableActionButton
                    label="ניקוי סינון"
                    icon={<RotateCcw size={15} />}
                    onClick={props.onClearFilters}
                  />
                </div>
              </td>
            </tr>
          ) : null}

          {!props.loading && items.length === 0 && !props.hasRequests ? (
            <DataTableEmptyState
              colSpan={7}
              message="אין בקשות שינוי או ביטול בתחרות זו."
            />
          ) : null}

          {!props.loading
            ? items.map(function (item) {
                var requestKey = getRequestKey(item);
                var status = getValue(item, "status", "");
                var source = getValue(
                  item,
                  "requestSource",
                  "",
                );

                var isAnswering = props.answeringRequestKey === requestKey;
                var isApproving =
                  isAnswering && props.answeringAction === "Approved";
                var isRejecting =
                  isAnswering && props.answeringAction === "Rejected";

                return (
                  <tr
                    key={requestKey}
                    className="border-t border-[#F1E7E1] text-sm text-[#4A3A34]"
                  >
                    <td className="px-4 py-3">
                      {formatDate(
                        getValue(item, "requestDate", null),
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {getValue(
                        item,
                        "requestedByName",
                        "-",
                      )}
                    </td>

                    <td className="px-4 py-3">{getSourceLabel(source)}</td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">
                          {getValue(item, "entityName", "-")}
                        </span>

                        <span className="text-xs text-[#8D6E63]">
                          {getValue(item, "entityType", "-")}
                        </span>
                      </div>
                    </td>

                    <td className="max-w-[430px] px-4 py-3">
                      <ChangeSummary item={item} />
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-3 py-1 text-xs font-semibold " +
                          getStatusClass(status)
                        }
                      >
                        {getStatusLabel(status)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isPendingTab ? (
                          <>
                            <TableActionButton
                              label={isApproving ? "מאשר..." : "אשר"}
                              icon={<Check size={15} />}
                              loading={isApproving}
                              disabled={isAnswering}
                              onClick={function () {
                                props.onApprove(item);
                              }}
                            />

                            <TableActionButton
                              label={isRejecting ? "דוחה..." : "דחה"}
                              icon={<X size={15} />}
                              variant="danger"
                              loading={isRejecting}
                              disabled={isAnswering}
                              onClick={function () {
                                props.onReject(item);
                              }}
                            />
                          </>
                        ) : null}

                        <TableActionButton
                          icon={<Eye size={15} />}
                          iconOnly
                          title="צפייה בפרטים"
                          onClick={function () {
                            props.onViewDetails(item);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
        </tbody>
      </DataTableShell>
    </section>
  );
}
