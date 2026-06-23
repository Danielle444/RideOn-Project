import { Check, Eye, X } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";

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

function getSourceLabel(source) {
  if (source === "Entry") {
    return "מקצים";
  }

  if (source === "Product") {
    return "מוצרים";
  }

  return source || "-";
}

function getStatusLabel(status) {
  if (status === "Pending") {
    return "ממתינה";
  }

  if (status === "Approved") {
    return "אושרה";
  }

  if (status === "Rejected") {
    return "נדחתה";
  }

  return status || "-";
}

function getStatusClass(status) {
  if (status === "Approved") {
    return "bg-[#EEF8F0] text-[#2F6B3B]";
  }

  if (status === "Rejected") {
    return "bg-[#FDECEC] text-[#A33A3A]";
  }

  return "bg-[#FFF4E5] text-[#9A5B00]";
}

function getRequestKey(item) {
  return (
    getValue(item, "requestSource", "RequestSource", "") +
    "-" +
    getValue(item, "requestId", "RequestId", "")
  );
}

function splitDetailsText(text) {
  if (!text) {
    return [];
  }

  return String(text)
    .split("|")
    .map(function (part) {
      return part.trim();
    })
    .filter(function (part) {
      return part.length > 0;
    });
}

function getDetailLabel(part) {
  var index = part.indexOf(":");

  if (index === -1) {
    return part.trim();
  }

  return part.substring(0, index).trim();
}

function getDetailValue(part) {
  var index = part.indexOf(":");

  if (index === -1) {
    return "";
  }

  return part.substring(index + 1).trim();
}

function buildChangedFields(beforeText, afterText) {
  var beforeParts = splitDetailsText(beforeText);
  var afterParts = splitDetailsText(afterText);
  var changes = [];

  beforeParts.forEach(function (beforePart) {
    var beforeLabel = getDetailLabel(beforePart);
    var beforeValue = getDetailValue(beforePart);

    var matchingAfterPart = afterParts.find(function (afterPart) {
      return getDetailLabel(afterPart) === beforeLabel;
    });

    if (!matchingAfterPart) {
      return;
    }

    var afterValue = getDetailValue(matchingAfterPart);

    var isMissingAfterValue =
      afterValue === "" ||
      afterValue === "-" ||
      afterValue === "₪" ||
      afterValue === "₪0" ||
      afterValue === "₪0.00";

    var isPayerField = beforeLabel === "משלם" || beforeLabel === "משלמים";

    if (isPayerField && isMissingAfterValue) {
      return;
    }

    if (beforeValue !== afterValue) {
      changes.push({
        label: beforeLabel,
        beforeValue: beforeValue || "-",
        afterValue: afterValue || "-",
      });
    }
  });

  return changes;
}

function ChangeSummary(props) {
  var item = props.item;

  var requestType = getValue(item, "requestType", "RequestType", "");
  var isCancelled = getValue(item, "isCancelled", "IsCancelled", false);
  var beforeText = getValue(item, "beforeText", "BeforeText", "");
  var afterText = getValue(item, "afterText", "AfterText", "");
  var amountBefore = getValue(item, "amountBefore", "AmountBefore", null);
  var amountAfter = getValue(item, "amountAfter", "AmountAfter", null);
  var fineAmount = getValue(
    item,
    "fineAmountSnapshot",
    "FineAmountSnapshot",
    null,
  );

  var changes = buildChangedFields(beforeText, afterText);

  if (isCancelled) {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-bold text-[#3F312B]">{requestType}</span>

        <span className="text-xs text-[#6D4C41]">
          {beforeText || "ביטול הרשמה"}
        </span>

        <span className="text-xs font-bold text-[#9A5B00]">
          לאחר אישור: {formatMoney(amountAfter)}
        </span>

        {fineAmount !== null && fineAmount !== undefined ? (
          <span className="text-xs font-bold text-[#B26A00]">
            כולל קנס: {formatMoney(fineAmount)}
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
              {change.label}: {change.beforeValue} ← {change.afterValue}
            </span>
          );
        })
      ) : (
        <span className="text-xs text-[#6D4C41]">
          {afterText || "שינוי בפרטי הבקשה"}
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
            <th className="px-4 py-3">ישות</th>
            <th className="px-4 py-3">מה שונה</th>
            <th className="px-4 py-3">סטטוס</th>
            <th className="px-4 py-3">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {props.loading ? (
            <DataTableLoadingState colSpan={7} message="טוען בקשות שינוי..." />
          ) : null}

          {!props.loading && items.length === 0 ? (
            <DataTableEmptyState colSpan={7} message="לא נמצאו בקשות שינוי" />
          ) : null}

          {!props.loading
            ? items.map(function (item) {
                var requestKey = getRequestKey(item);
                var status = getValue(item, "status", "Status", "");
                var source = getValue(
                  item,
                  "requestSource",
                  "RequestSource",
                  "",
                );

                var isAnswering = props.answeringRequestKey === requestKey;

                return (
                  <tr
                    key={requestKey}
                    className="border-t border-[#F1E7E1] text-sm text-[#4A3A34]"
                  >
                    <td className="px-4 py-3">
                      {formatDate(
                        getValue(item, "requestDate", "RequestDate", null),
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {getValue(
                        item,
                        "requestedByName",
                        "RequestedByName",
                        "-",
                      )}
                    </td>

                    <td className="px-4 py-3">{getSourceLabel(source)}</td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">
                          {getValue(item, "entityName", "EntityName", "-")}
                        </span>

                        <span className="text-xs text-[#8D6E63]">
                          {getValue(item, "entityType", "EntityType", "-")}
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
                              label={isAnswering ? "מאשר..." : "אשר"}
                              icon={<Check size={15} />}
                              disabled={isAnswering}
                              onClick={function () {
                                props.onApprove(item);
                              }}
                            />

                            <TableActionButton
                              label={isAnswering ? "דוחה..." : "דחה"}
                              icon={<X size={15} />}
                              variant="danger"
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
