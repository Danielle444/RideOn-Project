import { Pencil, Trash2, Plus, PauseCircle, Play } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";
import StatusPill from "../../common/table/StatusPill";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `₪ ${Number(value).toFixed(2)}`;
}

function isItemActive(item) {
  return !!item.isActive;
}

export default function ServicePricesTable(props) {
  const rows = Array.isArray(props.items) ? props.items : [];
  const isPaidTime = props.categoryId === 1;

  return (
    <div className="rounded-[22px] border border-[#E8DDD6] bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE5DF] px-6 py-5">
        <div>
          <h2 className="text-[1.35rem] font-bold text-[#3F312B]">
            {props.categoryName}
          </h2>
          <p className="mt-1 text-sm text-[#8A7268]">
            {rows.length} מוצרים בקטגוריה
          </p>
        </div>

        <button
          type="button"
          onClick={props.onCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#8B6352] px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
        >
          <Plus size={18} />
          הוספת מוצר
        </button>
      </div>

      <div className="px-4 pb-4">
        <DataTableShell widthMode="fit" tableClassName="text-right">
          <thead className="bg-[#FAF7F5]">
            <tr className="border-b border-[#E8DDD6] text-sm text-[#6A5248]">
              <th className="px-5 py-4 font-bold min-w-[220px]">שם מוצר</th>
              {isPaidTime && (
                <th className="px-5 py-4 font-bold min-w-[120px] text-center">
                  דקות
                </th>
              )}
              <th className="px-5 py-4 font-bold min-w-[140px] text-center">
                מחיר אחרון
              </th>
              <th className="px-5 py-4 font-bold min-w-[120px] text-center">
                סטטוס
              </th>
              <th className="px-5 py-4 font-bold min-w-[260px] text-center">
                פעולות
              </th>
            </tr>
          </thead>

          <tbody>
            {props.loading && (
              <DataTableLoadingState colSpan={isPaidTime ? 5 : 4} />
            )}

            {!props.loading && rows.length === 0 && (
              <DataTableEmptyState
                colSpan={isPaidTime ? 5 : 4}
                message="לא קיימים מוצרים להצגה"
              />
            )}

            {!props.loading &&
              rows.map(function (item, index) {
                const active = isItemActive(item);

                return (
                  <tr
                    key={item.productId}
                    className={
                      "border-b border-[#F1E8E3] transition-colors hover:bg-[#FCFAF8] " +
                      (active
                        ? index % 2 === 0
                          ? "bg-white text-[#3F312B]"
                          : "bg-[#FFFEFD] text-[#3F312B]"
                        : "bg-[#F5F3F1] text-[#A08D84]")
                    }
                  >
                    <td className="px-5 py-5 font-medium">{item.productName}</td>

                    {isPaidTime && (
                      <td className="px-5 py-5 text-center">
                        {item.durationMinutes || "—"}
                      </td>
                    )}

                    <td className="px-5 py-5 text-center font-semibold">
                      {formatPrice(item.itemPrice)}
                    </td>

                    <td className="px-5 py-5 text-center">
                      <StatusPill type="active" value={active} />
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <TableActionButton
                          iconOnly={true}
                          variant="neutral"
                          title="עדכון מחיר"
                          icon={<Pencil size={17} />}
                          onClick={function () {
                            props.onEdit(item);
                          }}
                        />

                        {active ? (
                          <TableActionButton
                            iconOnly={true}
                            variant="neutral"
                            title="השבתה"
                            icon={<PauseCircle size={17} />}
                            onClick={function () {
                              props.onDeactivate(item);
                            }}
                          />
                        ) : (
                          <TableActionButton
                            iconOnly={true}
                            variant="neutral"
                            title="הפעלה"
                            icon={<Play size={17} />}
                            onClick={function () {
                              props.onActivate(item);
                            }}
                          />
                        )}

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
    </div>
  );
}