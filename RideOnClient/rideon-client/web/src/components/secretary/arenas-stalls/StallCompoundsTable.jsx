import { Pencil, Trash2, Upload } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";

export default function StallCompoundsTable(props) {
  const rows = Array.isArray(props.items) ? props.items : [];

  return (
    <div className="px-6 pb-6">
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={props.onCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
        >
          <span className="text-xl leading-none">+</span>
          הוספת מתחם
        </button>
      </div>

      <DataTableShell widthMode="full">
        <thead className="bg-[#FAF7F5]">
          <tr className="border-b border-[#E8DDD6] text-sm text-[#6A5248]">
            <th className="px-5 py-4 font-bold text-right">שם מתחם</th>
            <th className="px-5 py-4 font-bold text-center">סוג תאים</th>
            <th className="px-5 py-4 font-bold text-center">כמות</th>
            <th className="px-5 py-4 font-bold text-center">קובץ אקסל</th>
            <th className="px-5 py-4 font-bold text-center">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {props.loading && <DataTableLoadingState colSpan={5} />}

          {!props.loading && rows.length === 0 && (
            <DataTableEmptyState colSpan={5} message="לא קיימים מתחמים להצגה" />
          )}

          {!props.loading &&
            rows.map(function (item, index) {
              return (
                <tr
                  key={item.compoundId}
                  className={
                    "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                    (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                  }
                >
                  <td className="px-5 py-5 font-medium">{item.compoundName}</td>

                  <td className="px-5 py-5 text-center">
                    <span className="inline-flex rounded-lg bg-[#F3EEEA] px-3 py-1 text-sm font-semibold text-[#6B574F]">
                      {item.stallTypeName}
                    </span>
                  </td>

                  <td className="px-5 py-5 text-center">{item.stallCount}</td>

                  <td className="px-5 py-5 text-center">
                    <button
                      type="button"
                      onClick={function () {
                        props.onExcelPlaceholder(item);
                      }}
                      className="inline-flex items-center gap-2 text-[#8B6352] hover:text-[#704D40]"
                    >
                      <Upload size={16} />
                      העלאת קובץ
                    </button>
                  </td>

                  <td className="px-5 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <TableActionButton
                        iconOnly={true}
                        variant="neutral"
                        title="עריכה"
                        icon={<Pencil size={17} />}
                        onClick={function () {
                          props.onEdit(item);
                        }}
                      />

                      <TableActionButton
                        iconOnly={true}
                        variant="danger"
                        title="מחיקה"
                        icon={<Trash2 size={17} />}
                        onClick={function () {
                          props.onDelete(item);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </DataTableShell>
    </div>
  );
}