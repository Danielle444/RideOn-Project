import { Pencil } from "lucide-react";
import DataTableShell from "../common/table/DataTableShell";
import DataTableEmptyState from "../common/table/DataTableEmptyState";
import DataTableLoadingState from "../common/table/DataTableLoadingState";
import TableActionButton from "../common/table/TableActionButton";

function formatAmount(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  try {
    return Number(value).toLocaleString("he-IL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    return value;
  }
}

function getFineReasonLabel(reason) {
  switch (reason) {
    case "LateRegistration":
      return "רישום באיחור";

    case "EntryChange":
      return "שינוי הרשמה";

    case "EntryCancellation":
      return "ביטול הרשמה";

    case "LostNumber":
      return "איבוד מספר";

    default:
      return reason || "-";
  }
}

function getTriggerModeLabel(mode) {
  switch (mode) {
    case "None":
      return "ללא טריגר";

    case "After":
      return "לאחר אירוע";

    case "Between":
      return "בין אירועים";

    default:
      return mode || "-";
  }
}

export default function FinesTable(props) {
  const rows = Array.isArray(props.fines) ? props.fines : [];

  return (
    <DataTableShell tableClassName="w-full min-w-[900px] text-right">
      <thead>
        <tr className="border-b border-[#E8DDD6] bg-[#FAF7F5] text-sm text-[#6A5248]">
          <th className="px-5 py-4 font-bold">סוג קנס</th>
          <th className="px-5 py-4 font-bold">טריגר</th>
          <th className="px-5 py-4 font-bold text-center">פעיל</th>
          <th className="px-5 py-4 font-bold">סכום</th>
          <th className="px-5 py-4 font-bold text-center">פעולות</th>
        </tr>
      </thead>

      <tbody>
        {props.loading && <DataTableLoadingState colSpan={5} />}

        {!props.loading && rows.length === 0 && (
          <DataTableEmptyState
            colSpan={5}
            message="לא קיימות מדיניות קנסות להצגה"
          />
        )}

        {!props.loading &&
          rows.map(function (item, index) {
            return (
              <tr
                key={item.fineId}
                className={
                  "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                  (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                }
              >
                <td className="px-5 py-5 font-medium">
                  {getFineReasonLabel(item.fineReason)}
                </td>

                <td className="px-5 py-5">
                  {getTriggerModeLabel(item.triggerMode)}
                </td>

                <td className="px-5 py-5 text-center">
                  {item.isActive ? "כן" : "לא"}
                </td>

                <td className="px-5 py-5">
                  ₪ {formatAmount(item.fineAmount)}
                </td>

                <td className="px-5 py-5">
                  <div className="flex items-center justify-center gap-2">
                    <TableActionButton
                      iconOnly={true}
                      variant="neutral"
                      title="עריכה"
                      icon={<Pencil size={17} />}
                      onClick={() => props.onEdit(item)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
      </tbody>
    </DataTableShell>
  );
}