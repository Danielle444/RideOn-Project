import { Search } from "lucide-react";

export default function CompetitionsSearchBar(props) {
  return (
    <div className="rounded-[24px] border border-[#E4D8D1] bg-[#FDFBFA] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="w-full max-w-[520px]">
          <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
            חיפוש
          </label>

          <div className="relative">
            <input
              type="text"
              value={props.value}
              onChange={function (e) {
                props.onChange(e.target.value);
              }}
              onKeyDown={function (e) {
                if (e.key === "Enter") {
                  props.onSearch();
                }
              }}
              placeholder="חיפוש לפי שם תחרות"
              className="h-12 w-full rounded-xl border border-[#D7CCC8] bg-white pr-12 pl-4 text-right text-[#3E2723] placeholder-[#BCAAA4] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />

            <Search
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B6352]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={props.onReset}
            className="rounded-xl border border-[#D7CCC8] px-5 py-3 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
          >
            איפוס
          </button>

          <button
            type="button"
            onClick={props.onSearch}
            className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
          >
            חיפוש
          </button>
        </div>
      </div>
    </div>
  );
}