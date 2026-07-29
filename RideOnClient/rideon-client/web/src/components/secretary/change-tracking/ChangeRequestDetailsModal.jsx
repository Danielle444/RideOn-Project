import { Check, X } from "lucide-react";
import TableActionButton from "../../common/table/TableActionButton";
import DateRangeText from "./DateRangeText";
import {
  getStatusLabel,
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

function getRequestKey(item) {
  return (
    getValue(item, "requestSource", "") +
    "-" +
    getValue(item, "requestId", "")
  );
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

  var beforeText = getValue(item, "beforeText", "");
  var afterText = getValue(item, "afterText", "");
  var isCancelled = getValue(item, "isCancelled", false);
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

  return (
    <div className="rounded-3xl border border-[#EFE5DF] bg-[#FAF7F5] p-5">
      <p className="text-sm font-black text-[#3F312B]">מה שונה</p>

      <div className="mt-4 space-y-3">
        {isCancelled ? (
          <>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-[#8D6E63]">בקשה לביטול</p>

              <p className="mt-2 text-sm leading-7 text-[#3F312B]">
                <DateRangeText text={beforeText} fallback="ביטול הרשמה" />
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-[#8D6E63]">חיוב לאחר אישור</p>

              <p className="mt-2 text-sm font-bold text-[#3F312B]">
                <DateRangeText text={afterText} fallback="ביטול הרשמה למקצה" />
              </p>
            </div>

            {isPostStartFullCharge ? (
              <div className="rounded-2xl border border-[#EAD9C7] bg-[#FBF3EA] p-4">
                <p className="text-sm font-semibold leading-7 text-[#8D6E63]">
                  {POST_START_FULL_CHARGE_LABEL}
                </p>
              </div>
            ) : null}
          </>
        ) : changes.length > 0 ? (
          changes.map(function (change, index) {
            return (
              <div key={index} className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-[#8D6E63]">
                  {change.label}
                </p>

                <p className="mt-2 text-sm font-bold text-[#3F312B]">
                  <DateRangeText text={change.beforeValue} /> ←{" "}
                  <DateRangeText text={change.afterValue} />
                </p>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm leading-7 text-[#3F312B]">
              <DateRangeText
                text={afterText}
                fallback="לא נמצאו שדות שונים להצגה"
              />
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

  var source = getValue(item, "requestSource", "");
  var isPending = getValue(item, "status", "") === "Pending";
  var requestKey = getRequestKey(item);
  var isAnswering = props.answeringRequestKey === requestKey;
  var isApproving = isAnswering && props.answeringAction === "Approved";
  var isRejecting = isAnswering && props.answeringAction === "Rejected";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-[#3F312B]">
              פרטי בקשת שינוי
            </h2>

            <p className="mt-1 text-sm text-[#8D6E63]">
              {getValue(item, "requestType", "-")}
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
              value={getStatusLabel(getValue(item, "status", ""))}
            />

            <DetailRow
              label="תאריך בקשה"
              value={formatDateTime(
                getValue(item, "requestDate", null),
              )}
            />

            <DetailRow
              label="מבקש"
              value={getValue(item, "requestedByName", "-")}
            />

            <DetailRow
              label="תחרות"
              value={getValue(item, "competitionName", "-")}
            />

            <DetailRow
              label="נושא הבקשה"
              value={getValue(item, "entityName", "-")}
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
            label="סגור"
            disabled={isAnswering}
            onClick={props.onClose}
          />
        </div>
      </div>
    </div>
  );
}
