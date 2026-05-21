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

function DetailRow(props) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#8D6E63]">{props.label}</p>
      <p className="mt-1 text-sm font-bold text-[#3F312B]">{props.value}</p>
    </div>
  );
}

function TextBox(props) {
  return (
    <div className="rounded-2xl border border-[#EFE5DF] bg-[#FAF7F5] p-4">
      <p className="text-xs font-bold text-[#8D6E63]">{props.title}</p>

      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#3F312B]">
        {props.text || "-"}
      </p>
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

            <DetailRow
              label="סכום לפני"
              value={formatMoney(
                getValue(item, "amountBefore", "AmountBefore", null),
              )}
            />

            <DetailRow
              label="סכום אחרי"
              value={formatMoney(
                getValue(item, "amountAfter", "AmountAfter", null),
              )}
            />

            <DetailRow
              label="קנס"
              value={formatMoney(
                getValue(
                  item,
                  "fineAmountSnapshot",
                  "FineAmountSnapshot",
                  null,
                ),
              )}
            />
          </section>

          <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextBox
              title="לפני השינוי"
              text={getValue(item, "beforeText", "BeforeText", "-")}
            />

            <TextBox
              title="אחרי השינוי"
              text={getValue(item, "afterText", "AfterText", "-")}
            />
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
