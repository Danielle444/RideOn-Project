import { Pencil, Trash2 } from "lucide-react";
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

export default function FinesTable(props) {
  const rows = Array.isArray(props.fines) ? props.fines : [];

  return (
    <DataTableShell tableClassName="w-full min-w-[980px] text-right">
      <thead>
        <tr className="border-b border-[#E8DDD6] bg-[#FAF7F5] text-sm text-[#6A5248]">
          <th className="px-5 py-4 font-bold">שם קנס</th>
          <th className="px-5 py-4 font-bold">תיאור</th>
          <th className="px-5 py-4 font-bold">סכום</th>
          <th className="px-5 py-4 font-bold text-center">פעולות</th>
        </tr>
      </thead>

      <tbody>
        {props.loading && <DataTableLoadingState colSpan={4} />}

        {!props.loading && rows.length === 0 && (
          <DataTableEmptyState colSpan={4} message="לא קיימים קנסות להצגה" />
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
                <td className="px-5 py-5 font-medium">{item.fineName}</td>
                <td className="px-5 py-5">{item.fineDescription || "-"}</td>
                <td className="px-5 py-5">₪ {formatAmount(item.fineAmount)}</td>

                <td className="px-5 py-5">
                  <div className="flex items-center justify-center gap-2">
                    <TableActionButton
                      iconOnly={true}
                      variant="neutral"
                      title="עריכה"
                      icon={<Pencil size={17} />}
                      onClick={() => props.onEdit(item)}
                    />

                    <TableActionButton
                      iconOnly={true}
                      variant="danger"
                      title="מחיקה"
                      icon={<Trash2 size={17} />}
                      onClick={() => props.onDelete(item)}
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