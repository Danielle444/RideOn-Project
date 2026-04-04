import { Pencil, Trash2 } from "lucide-react";
import DataTableShell from "../common/table/DataTableShell";
import DataTableEmptyState from "../common/table/DataTableEmptyState";
import DataTableLoadingState from "../common/table/DataTableLoadingState";
import TableActionButton from "../common/table/TableActionButton";

export default function FieldsTable(props) {
  const rows = Array.isArray(props.fields) ? props.fields : [];

  return (
    <DataTableShell widthMode="fit" tableClassName="text-right">
      <thead className="bg-[#FAF7F5]">
        <tr className="border-b border-[#E8DDD6] text-sm text-[#6A5248]">
          <th className="px-5 py-4 font-bold min-w-[200px]">שם ענף</th>
          <th className="px-5 py-4 font-bold text-center min-w-[200px]">פעולות</th>
        </tr>
      </thead>

      <tbody>
        {props.loading && <DataTableLoadingState colSpan={2} />}

        {!props.loading && rows.length === 0 && (
          <DataTableEmptyState colSpan={2} message="לא קיימים ענפים להצגה" />
        )}

        {!props.loading &&
          rows.map(function (f, index) {
            return (
              <tr
                key={f.fieldId}
                className={
                  "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                  (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                }
              >
                <td className="px-5 py-5 font-medium">{f.fieldName}</td>

                <td className="px-5 py-5">
                  <div className="flex items-center justify-center gap-2">
                    <TableActionButton
                      iconOnly={true}
                      variant="neutral"
                      title="עריכה"
                      icon={<Pencil size={17} />}
                      onClick={() => props.onEdit(f)}
                    />

                    <TableActionButton
                      iconOnly={true}
                      variant="danger"
                      title="מחיקה"
                      icon={<Trash2 size={17} />}
                      onClick={() => props.onDelete(f)}
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