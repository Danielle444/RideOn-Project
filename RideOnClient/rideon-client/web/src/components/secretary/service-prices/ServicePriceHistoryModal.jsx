import { X, Play } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import StatusPill from "../../common/table/StatusPill";
import TableActionButton from "../../common/table/TableActionButton";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `₪ ${Number(value).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return date.toLocaleString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ServicePriceHistoryModal(props) {
  const rows = Array.isArray(props.historyItems) ? props.historyItems : [];

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#3F312B]">
              היסטוריית מחירים
            </h2>
            <p className="mt-1 text-sm text-[#8A7268]">
              {props.productName || "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="text-[#6A5248]"
          >
            <X />
          </button>
        </div>

        <DataTableShell widthMode="full">
          <thead className="bg-[#FAF7F5]">
            <tr className="border-b border-[#E8DDD6] text-sm text-[#6A5248]">
              <th className="px-5 py-4 font-bold text-center">מחיר</th>
              <th className="px-5 py-4 font-bold text-center">תאריך עדכון</th>
              <th className="px-5 py-4 font-bold text-center">סטטוס</th>
              <th className="px-5 py-4 font-bold text-center">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {props.loading && <DataTableLoadingState colSpan={4} />}

            {!props.loading && rows.length === 0 && (
              <DataTableEmptyState colSpan={4} message="אין היסטוריית מחירים להצגה" />
            )}

            {!props.loading &&
              rows.map(function (item, index) {
                return (
                  <tr
                    key={item.catalogItemId}
                    className={
                      "border-b border-[#F1E8E3] transition-colors " +
                      (item.isActive
                        ? "bg-[#F4FBF5] text-[#3F312B]"
                        : index % 2 === 0
                          ? "bg-white text-[#3F312B]"
                          : "bg-[#FFFEFD] text-[#3F312B]")
                    }
                  >
                    <td className="px-5 py-5 text-center font-semibold">
                      {formatPrice(item.itemPrice)}
                    </td>

                    <td className="px-5 py-5 text-center">
                      {formatDate(item.creationDate)}
                    </td>

                    <td className="px-5 py-5 text-center">
                      <StatusPill type="active" value={item.isActive} />
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex items-center justify-center">
                        {!item.isActive ? (
                          <TableActionButton
                            iconOnly={false}
                            variant="neutral"
                            title="הפעל מחיר זה"
                            icon={<Play size={16} />}
                            onClick={function () {
                              props.onActivateHistoryItem(item);
                            }}
                          >
                            הפעל מחיר זה
                          </TableActionButton>
                        ) : (
                          <span className="text-sm text-[#8A7268]">המחיר הפעיל כעת</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </DataTableShell>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl border border-[#D8CBC3] px-4 py-2 text-[#5C463D]"
          >
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}