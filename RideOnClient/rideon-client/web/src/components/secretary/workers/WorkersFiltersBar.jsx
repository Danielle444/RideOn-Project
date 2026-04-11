import { Search } from "lucide-react";

export default function WorkersFiltersBar(props) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-start gap-3 rounded-2xl bg-[#FBF8F6] border border-[#ECE2DC] px-4 py-4">
      <select
        value={props.statusFilter}
        onChange={function (e) {
          props.onStatusFilterChange(e.target.value);
        }}
        className="h-11 min-w-[160px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
      >
        <option value="">כל הסטטוסים</option>
        <option value="Pending">ממתינים</option>
        <option value="Approved">מאושרים</option>
        <option value="Rejected">נדחו</option>
      </select>

      <div className="relative">
        <input
          type="text"
          value={props.searchInput}
          onChange={function (e) {
            props.onSearchInputChange(e.target.value);
          }}
          onKeyDown={function (e) {
            if (e.key === "Enter") {
              props.onSearch();
            }
          }}
          placeholder="חיפוש לפי שם, ת״ז, אימייל, טלפון או שם משתמש"
          className="w-[360px] h-11 rounded-xl border border-[#D8CBC3] bg-white pr-11 pl-4 text-[#3F312B] placeholder:text-[#A08D84] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
        />
        <Search
          size={17}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E786E]"
        />
      </div>

      <button
        type="button"
        onClick={props.onSearch}
        className="h-11 px-5 rounded-xl bg-[#8B6352] text-white font-semibold shadow-sm hover:bg-[#7A5547] transition-colors"
      >
        חפש
      </button>

      <button
        type="button"
        onClick={props.onReset}
        className="h-11 px-5 rounded-xl border border-[#D8CBC3] bg-white text-[#5D4037] font-semibold shadow-sm hover:bg-[#F8F5F2] transition-colors"
      >
        איפוס
      </button>
    </div>
  );
}