import { Check, PencilOff, X } from "lucide-react";
import DataTableShell from "../common/table/DataTableShell";
import DataTableEmptyState from "../common/table/DataTableEmptyState";
import DataTableLoadingState from "../common/table/DataTableLoadingState";
import TableActionButton from "../common/table/TableActionButton";
import StatusPill from "../common/table/StatusPill";

export default function RequestsTable(props) {
  const rows = Array.isArray(props.rows) ? props.rows : [];
  const isPayerTab = props.activeTab === "payer";

  return (
    <DataTableShell tableClassName="w-full min-w-[980px] text-right">
      <thead>
        <tr className="bg-[#FAF7F5] border-b border-[#E8DDD6] text-[#6A5248] text-sm">
          <th className="px-5 py-4 font-bold">שם</th>
          {isPayerTab ? (
            <th className="px-5 py-4 font-bold">תאריך הרשמה</th>
          ) : (
            <th className="px-5 py-4 font-bold">ת"ז</th>
          )}
          <th className="px-5 py-4 font-bold">אימייל</th>
          <th className="px-5 py-4 font-bold">טלפון</th>
          <th className="px-5 py-4 font-bold">חווה</th>
          {!isPayerTab && <th className="px-5 py-4 font-bold">סטטוס</th>}
          <th className="px-5 py-4 font-bold text-center">פעולות</th>
        </tr>
      </thead>

      <tbody>
        {props.loading && <DataTableLoadingState colSpan={isPayerTab ? 6 : 7} />}

        {!props.loading && rows.length === 0 && (
          <DataTableEmptyState
            colSpan={isPayerTab ? 6 : 7}
            message={isPayerTab ? "אין משלמים הממתינים לאישור" : "לא נמצאו בקשות להצגה"}
          />
        )}

        {!props.loading &&
          rows.map(function (item, index) {
            const rowKey = props.getRowKey(item);
            const isActionLoading = props.actionLoadingKey === rowKey;

            if (isPayerTab) {
              const requestDate = item.requestDate
                ? new Date(item.requestDate).toLocaleDateString("he-IL")
                : "-";

              return (
                <tr
                  key={rowKey}
                  className={
                    "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                    (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                  }
                >
                  <td className="px-5 py-5 font-medium">
                    {item.firstName} {item.lastName}
                  </td>
                  <td className="px-5 py-5">{requestDate}</td>
                  <td className="px-5 py-5">{item.email || "-"}</td>
                  <td className="px-5 py-5">{item.cellPhone || "-"}</td>
                  <td className="px-5 py-5">{item.ranchName}</td>
                  <td className="px-5 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <TableActionButton
                        iconOnly={true}
                        variant="success"
                        title="אשר משלם"
                        icon={<Check size={17} />}
                        loading={isActionLoading}
                        disabled={isActionLoading}
                        onClick={function () { props.onApprove(item); }}
                      />
                      <TableActionButton
                        iconOnly={true}
                        variant="danger"
                        title="דחה משלם"
                        icon={<X size={17} />}
                        loading={isActionLoading}
                        disabled={isActionLoading}
                        onClick={function () { props.onReject(item); }}
                      />
                    </div>
                  </td>
                </tr>
              );
            }

            const currentStatus =
              props.activeTab === "ranch" ? item.requestStatus : item.roleStatus;

            return (
              <tr
                key={rowKey}
                className={
                  "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                  (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                }
              >
                <td className="px-5 py-5 font-medium">{item.fullName}</td>
                <td className="px-5 py-5">{item.nationalId}</td>
                <td className="px-5 py-5">{item.email || "-"}</td>
                <td className="px-5 py-5">{item.cellPhone || "-"}</td>
                <td className="px-5 py-5">{item.ranchName}</td>
                <td className="px-5 py-5">
                  <StatusPill value={currentStatus} type="request" />
                </td>
                <td className="px-5 py-5">
                  <div className="flex items-center justify-center gap-2">
                    {currentStatus === "Pending" && (
                      <>
                        <TableActionButton
                          iconOnly={true}
                          variant="success"
                          title="אישור"
                          icon={<Check size={17} />}
                          loading={isActionLoading}
                          disabled={isActionLoading}
                          onClick={function () { props.onApprove(item); }}
                        />

                        <TableActionButton
                          iconOnly={true}
                          variant="danger"
                          title="דחייה"
                          icon={<X size={17} />}
                          loading={isActionLoading}
                          disabled={isActionLoading}
                          onClick={function () { props.onReject(item); }}
                        />
                      </>
                    )}

                    {currentStatus === "Approved" && (
                      <TableActionButton
                        variant="danger"
                        title="ביטול אישור"
                        label="ביטול אישור"
                        icon={<PencilOff size={15} />}
                        loading={isActionLoading}
                        disabled={isActionLoading}
                        onClick={function () { props.onUndoApprove(item); }}
                      />
                    )}

                    {currentStatus === "Rejected" && (
                      <TableActionButton
                        variant="success"
                        title="אשר בקשה"
                        label="אשר בקשה"
                        icon={<Check size={15} />}
                        loading={isActionLoading}
                        disabled={isActionLoading}
                        onClick={function () { props.onApproveRejected(item); }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
      </tbody>
    </DataTableShell>
  );
}