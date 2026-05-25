import { Check, X } from "lucide-react";
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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("he-IL");
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

function DetailRow(props) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#8D6E63]">{props.label}</p>
      <p className="mt-1 text-sm font-bold text-[#3F312B]">{props.value}</p>
    </div>
  );
}

function ChangeSummaryBox(props) {
  var item = props.item;

  var beforeText = getValue(item, "beforeText", "BeforeText", "");
  var afterText = getValue(item, "afterText", "AfterText", "");
  var isCancelled = getValue(item, "isCancelled", "IsCancelled", false);
  var amountBefore = getValue(item, "amountBefore", "AmountBefore", null);
  var amountAfter = getValue(item, "amountAfter", "AmountAfter", null);
  var fineAmount = getValue(
    item,
    "fineAmountSnapshot",
    "FineAmountSnapshot",
    null,
  );

  var changes = buildChangedFields(beforeText, afterText);

  return (
    <div className="rounded-3xl border border-[#EFE5DF] bg-[#FAF7F5] p-5">
      <p className="text-sm font-black text-[#3F312B]">מה שונה</p>

      <div className="mt-4 space-y-3">
        {isCancelled ? (
          <>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-[#8D6E63]">בקשה לביטול</p>

              <p className="mt-2 text-sm leading-7 text-[#3F312B]">
                {beforeText || "ביטול הרשמה"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-[#8D6E63]">לאחר אישור</p>

              <p className="mt-2 text-sm font-bold text-[#3F312B]">
                {afterText || "ביטול הרשמה למקצה"}
              </p>
            </div>
          </>
        ) : changes.length > 0 ? (
          changes.map(function (change, index) {
            return (
              <div key={index} className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-[#8D6E63]">
                  {change.label}
                </p>

                <p className="mt-2 text-sm font-bold text-[#3F312B]">
                  {change.beforeValue} ← {change.afterValue}
                </p>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm leading-7 text-[#3F312B]">
              {afterText || "לא נמצאו שדות שונים להצגה"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-bold text-[#8D6E63]">סכום לפני</p>
            <p className="mt-2 text-lg font-black text-[#3F312B]">
              {formatMoney(amountBefore)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-bold text-[#8D6E63]">סכום אחרי</p>
            <p className="mt-2 text-lg font-black text-[#3F312B]">
              {formatMoney(amountAfter)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-bold text-[#8D6E63]">קנס</p>
            <p className="mt-2 text-lg font-black text-[#B26A00]">
              {formatMoney(fineAmount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangeRequestDetailsModal(props) {
  var item = props.item;

  if (!item) {
    return null;
  }

  var source = getValue(item, "requestSource", "RequestSource", "");
  var isPending = getValue(item, "status", "Status", "") === "Pending";
  var requestKey = getRequestKey(item);
  var isAnswering = props.answeringRequestKey === requestKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-[#3F312B]">
              פרטי בקשת שינוי
            </h2>

            <p className="mt-1 text-sm text-[#8D6E63]">
              {getValue(item, "requestType", "RequestType", "-")}
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            disabled={isAnswering}
            className="rounded-full p-2 text-[#6D4C41] transition-colors hover:bg-[#F5EDE8] disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-6 py-6">
          <section className="grid grid-cols-1 gap-4 rounded-3xl border border-[#EFE5DF] bg-white p-5 md:grid-cols-3">
            <DetailRow label="מקור" value={getSourceLabel(source)} />

            <DetailRow
              label="סטטוס"
              value={getValue(item, "status", "Status", "-")}
            />

            <DetailRow
              label="תאריך בקשה"
              value={formatDateTime(
                getValue(item, "requestDate", "RequestDate", null),
              )}
            />

            <DetailRow
              label="מבקש"
              value={getValue(item, "requestedByName", "RequestedByName", "-")}
            />

            <DetailRow
              label="תחרות"
              value={getValue(item, "competitionName", "CompetitionName", "-")}
            />

            <DetailRow
              label="ישות"
              value={getValue(item, "entityName", "EntityName", "-")}
            />
          </section>

          <section className="mt-5">
            <ChangeSummaryBox item={item} />
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#EFE5DF] px-6 py-5">
          {isPending ? (
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
            label="סגור"
            disabled={isAnswering}
            onClick={props.onClose}
          />
        </div>
      </div>
    </div>
  );
}
