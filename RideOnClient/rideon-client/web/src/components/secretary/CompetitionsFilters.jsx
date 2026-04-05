export default function CompetitionsFilters(props) {
  const filters = props.filters;

  function handleChange(fieldName, value) {
    props.onChange(fieldName, value);
  }

  return (
    <div className="rounded-[24px] border border-[#E4D8D1] bg-[#FDFBFA] p-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px]">
            <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
              סטטוס
            </label>
            <select
              value={filters.status}
              onChange={function (e) {
                handleChange("status", e.target.value);
              }}
              className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            >
              <option value="">הכל</option>
              <option value="Draft">טיוטה</option>
              <option value="Open">פתוחה</option>
              <option value="Active">פעילה</option>
              <option value="Finished">הסתיימה</option>
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
              מתאריך
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={function (e) {
                handleChange("dateFrom", e.target.value);
              }}
              className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
              עד תאריך
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={function (e) {
                handleChange("dateTo", e.target.value);
              }}
              className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>
        </div>

        <div className="w-full max-w-[420px]">
          <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
            חיפוש
          </label>
          <input
            type="text"
            value={filters.searchText}
            onChange={function (e) {
              handleChange("searchText", e.target.value);
            }}
            placeholder="חיפוש לפי שם תחרות"
            className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] placeholder-[#BCAAA4] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-start gap-3">
        <button
          type="button"
          onClick={props.onSearch}
          className="rounded-xl bg-[#8B6352] px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
        >
          חיפוש
        </button>

        <button
          type="button"
          onClick={props.onReset}
          className="rounded-xl border border-[#D7CCC8] px-5 py-2.5 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
        >
          איפוס סינון
        </button>
      </div>
    </div>
  );
}