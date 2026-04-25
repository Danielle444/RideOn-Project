import { Pencil, Trash2 } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";
import StallMapUploader from "../stall-map/StallMapUploader";

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
            <th className="px-5 py-4 text-right font-bold">שם מתחם</th>
            <th className="px-5 py-4 text-center font-bold">סוג תאים</th>
            <th className="px-5 py-4 text-center font-bold">כמות</th>
            <th className="px-5 py-4 text-center font-bold">פריסה</th>
            <th className="px-5 py-4 text-center font-bold">פעולות</th>
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
                    <div className="flex flex-col items-center gap-1">
                      <StallMapUploader
                        compound={item}
                        buttonLabel={
                          item.layoutJson ? "החלפת פריסה" : "העלאת פריסה"
                        }
                        onLayoutParsed={function (layout) {
                          props.onLayoutParsed(item, layout);
                        }}
                      />

                      {item.layoutJson ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          פריסה קיימת
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#F3EEEA] px-2 py-0.5 text-xs font-semibold text-[#8A7268]">
                          אין פריסה
                        </span>
                      )}
                    </div>
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
