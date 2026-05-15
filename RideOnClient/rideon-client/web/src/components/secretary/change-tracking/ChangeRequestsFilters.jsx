import { RotateCcw } from "lucide-react";
import TableActionButton from "../../common/table/TableActionButton";

function getFilterButtonClass(isActive) {
  return (
    "rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors " +
    (isActive
      ? "border-[#8B6352] bg-[#8B6352] text-white"
      : "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]")
  );
}

export default function ChangeRequestsFilters(props) {
  return (
    <section className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#3F312B]">סינון בקשות</h2>
          <p className="text-xs text-[#8D6E63]">
            חיפוש לפי מבקש, סוג בקשה, סוס, מוצר או פרטי שינוי
          </p>
        </div>

        <TableActionButton
          label="ניקוי סינון"
          icon={<RotateCcw size={15} />}
          onClick={props.onClear}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
            חיפוש
          </label>

          <input
            type="text"
            value={props.searchText}
            onChange={function (event) {
              props.onSearchTextChange(event.target.value);
            }}
            placeholder="חיפוש בקשות שינוי..."
            className="h-11 w-full rounded-2xl border border-[#E2D5CE] bg-white px-4 text-right text-sm text-[#3F312B] outline-none transition-colors focus:border-[#8B6352]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
            מקור בקשה
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={function () {
                props.onSourceFilterChange("all");
              }}
              className={getFilterButtonClass(props.sourceFilter === "all")}
            >
              הכל
            </button>

            <button
              type="button"
              onClick={function () {
                props.onSourceFilterChange("Entry");
              }}
              className={getFilterButtonClass(props.sourceFilter === "Entry")}
            >
              מקצים
            </button>

            <button
              type="button"
              onClick={function () {
                props.onSourceFilterChange("Product");
              }}
              className={getFilterButtonClass(props.sourceFilter === "Product")}
            >
              מוצרים
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
            סוג בקשה
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={function () {
                props.onTypeFilterChange("all");
              }}
              className={getFilterButtonClass(props.typeFilter === "all")}
            >
              הכל
            </button>

            <button
              type="button"
              onClick={function () {
                props.onTypeFilterChange("שינוי מקצה");
              }}
              className={getFilterButtonClass(
                props.typeFilter === "שינוי מקצה",
              )}
            >
              שינוי
            </button>

            <button
              type="button"
              onClick={function () {
                props.onTypeFilterChange("ביטול מקצה");
              }}
              className={getFilterButtonClass(
                props.typeFilter === "ביטול מקצה",
              )}
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
