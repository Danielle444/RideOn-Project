import { Pencil, Trash2 } from "lucide-react";
import DataTableShell from "../common/table/DataTableShell";
import DataTableEmptyState from "../common/table/DataTableEmptyState";
import DataTableLoadingState from "../common/table/DataTableLoadingState";
import TableActionButton from "../common/table/TableActionButton";

export default function JudgesTable(props) {
  const rows = Array.isArray(props.judges) ? props.judges : [];

  return (
    <DataTableShell tableClassName="w-full min-w-[1100px] text-right">
      <thead>
        <tr className="border-b border-[#E8DDD6] bg-[#FAF7F5] text-sm text-[#6A5248]">
          <th className="px-5 py-4 font-bold">שם מלא בעברית</th>
          <th className="px-5 py-4 font-bold">שם מלא באנגלית</th>
          <th className="px-5 py-4 font-bold">מדינה</th>
          <th className="px-5 py-4 font-bold">ענפים</th>
          <th className="px-5 py-4 font-bold text-center">פעולות</th>
        </tr>
      </thead>

      <tbody>
        {props.loading && <DataTableLoadingState colSpan={5} />}

        {!props.loading && rows.length === 0 && (
          <DataTableEmptyState colSpan={5} message="לא קיימים שופטים להצגה" />
        )}

        {!props.loading &&
          rows.map(function (judge, index) {
            const hebrewFullName =
              (judge.firstNameHebrew || "") + " " + (judge.lastNameHebrew || "");
            const englishFullName =
              (judge.firstNameEnglish || "") + " " + (judge.lastNameEnglish || "");

            return (
              <tr
                key={judge.judgeId}
                className={
                  "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                  (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                }
              >
                <td className="px-5 py-5 font-medium">{hebrewFullName.trim() || "-"}</td>
                <td className="px-5 py-5">{englishFullName.trim() || "-"}</td>
                <td className="px-5 py-5">{judge.country || "-"}</td>
                <td className="px-5 py-5">{judge.qualifiedFields || "-"}</td>

                <td className="px-5 py-5">
                  <div className="flex items-center justify-center gap-2">
                    <TableActionButton
                      iconOnly={true}
                      variant="neutral"
                      title="עריכה"
                      icon={<Pencil size={17} />}
                      onClick={() => props.onEdit(judge)}
                    />

                    <TableActionButton
                      iconOnly={true}
                      variant="danger"
                      title="מחיקה"
                      icon={<Trash2 size={17} />}
                      onClick={() => props.onDelete(judge)}
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