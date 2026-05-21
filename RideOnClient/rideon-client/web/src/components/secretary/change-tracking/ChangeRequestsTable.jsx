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
            <th className="px-4 py-3">סוג שינוי</th>
            <th className="px-4 py-3">ישות</th>
            <th className="px-4 py-3">לפני</th>
            <th className="px-4 py-3">אחרי</th>
            <th className="px-4 py-3">סטטוס</th>
            <th className="px-4 py-3">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {props.loading ? (
            <DataTableLoadingState colSpan={9} message="טוען בקשות שינוי..." />
          ) : null}

          {!props.loading && items.length === 0 ? (
            <DataTableEmptyState colSpan={9} message="לא נמצאו בקשות שינוי" />
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

                    <td className="px-4 py-3 font-semibold">
                      {getValue(item, "requestType", "RequestType", "-")}
                    </td>

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

                    <td className="max-w-[260px] px-4 py-3">
                      <span className="line-clamp-2">
                        {getValue(item, "beforeText", "BeforeText", "-")}
                      </span>
                    </td>

                    <td className="max-w-[260px] px-4 py-3">
                      <span className="line-clamp-2">
                        {getValue(item, "afterText", "AfterText", "-")}
                      </span>
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
