import { ArrowUpDown, ChevronDown, Pencil, ArrowLeft } from "lucide-react";
import DataTableShell from "../common/table/DataTableShell";
import DataTableEmptyState from "../common/table/DataTableEmptyState";
import DataTableLoadingState from "../common/table/DataTableLoadingState";

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("he-IL");
}

function formatDateRange(startDate, endDate) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function getStatusLabel(status) {
  if (!status) {
    return "-";
  }

  return status;
}

function getStatusClass(status) {
  if (status === "פעילה" || status === "Active" || status === "כעת") {
    return "bg-green-100 text-green-700";
  }

  if (status === "טיוטה" || status === "Draft") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "הסתיימה" || status === "Finished") {
    return "bg-gray-100 text-gray-700";
  }

  if (status === "פתוחה" || status === "Open" || status === "עתידית") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-[#F3ECE8] text-[#6D4C41]";
}

function SortHeader(props) {
  const isActive = props.sortKey === props.columnKey;

  return (
    <button
      type="button"
      onClick={function () {
        props.onSort(props.columnKey);
      }}
      className="inline-flex items-center gap-2 font-bold text-[#4E342E] transition-opacity hover:opacity-80"
    >
      <span>{props.label}</span>
      <ArrowUpDown size={14} />
      {isActive ? (
        <span className="text-xs text-[#8B6352]">
          {props.sortDirection === "asc" ? "▲" : "▼"}
        </span>
      ) : null}
    </button>
  );
}

export default function CompetitionsTable(props) {
  const rows = Array.isArray(props.competitions) ? props.competitions : [];

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E8DDD7] bg-white">
      <DataTableShell widthMode="full" tableClassName="text-right w-full">
        <thead className="bg-[#FAF7F5]">
          <tr className="border-b border-[#E8DDD6] text-sm text-[#6A5248] align-top">
            <th className="px-5 py-4 min-w-[260px]">
              <SortHeader
                label="שם תחרות"
                columnKey="competitionName"
                sortKey={props.sortKey}
                sortDirection={props.sortDirection}
                onSort={props.onSort}
              />
            </th>

            <th className="px-5 py-4 min-w-[170px]">
              <div className="flex flex-col gap-3">
                <SortHeader
                  label="ענף"
                  columnKey="fieldName"
                  sortKey={props.sortKey}
                  sortDirection={props.sortDirection}
                  onSort={props.onSort}
                />

                <div className="relative">
                  <select
                    value={props.fieldFilter}
                    onChange={function (e) {
                      props.onFieldFilterChange(e.target.value);
                    }}
                    className="h-9 w-full rounded-lg border border-[#D7CCC8] bg-white px-3 text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  >
                    <option value="">הכל</option>
                    {props.fieldOptions.map(function (field) {
                      return (
                        <option key={field.fieldId} value={field.fieldId}>
                          {field.fieldName}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8B6352]"
                  />
                </div>
              </div>
            </th>

            <th className="px-5 py-4 min-w-[220px]">
              <SortHeader
                label="תאריכי תחרות"
                columnKey="competitionStartDate"
                sortKey={props.sortKey}
                sortDirection={props.sortDirection}
                onSort={props.onSort}
              />
            </th>

            <th className="px-5 py-4 min-w-[170px]">
              <div className="flex flex-col gap-3">
                <SortHeader
                  label="סטטוס"
                  columnKey="competitionStatus"
                  sortKey={props.sortKey}
                  sortDirection={props.sortDirection}
                  onSort={props.onSort}
                />

                <div className="relative">
                  <select
                    value={props.statusFilter}
                    onChange={function (e) {
                      props.onStatusFilterChange(e.target.value);
                    }}
                    className="h-9 w-full rounded-lg border border-[#D7CCC8] bg-white px-3 text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  >
                    <option value="">הכל</option>
                    {props.statusOptions.map(function (status) {
                      return (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8B6352]"
                  />
                </div>
              </div>
            </th>

            <th className="px-5 py-4 text-center min-w-[160px] font-bold text-[#4E342E]">
              פעולות
            </th>
          </tr>
        </thead>

        <tbody>
          {props.loading && <DataTableLoadingState colSpan={5} />}

          {!props.loading && rows.length === 0 && (
            <DataTableEmptyState colSpan={5} message="לא נמצאו תחרויות להצגה" />
          )}

          {!props.loading &&
            rows.map(function (item, index) {
              return (
                <tr
                  key={item.competitionId}
                  className={
                    "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                    (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                  }
                >
                  <td className="px-5 py-5 font-semibold">{item.competitionName}</td>
                  <td className="px-5 py-5">{item.fieldName || "-"}</td>
                  <td className="px-5 py-5">
                    {formatDateRange(item.competitionStartDate, item.competitionEndDate)}
                  </td>
                  <td className="px-5 py-5">
                    <span
                      className={
                        "inline-flex rounded-full px-3 py-1 text-sm font-semibold " +
                        getStatusClass(item.competitionStatus)
                      }
                    >
                      {getStatusLabel(item.competitionStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={function () {
                          props.onEnter(item);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#BCAAA4] bg-white text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
                        title="כניסה"
                      >
                        <ArrowLeft size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={function () {
                          props.onEdit(item);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D7CCC8] bg-white text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
                        title="עריכה"
                      >
                        <Pencil size={17} />
                      </button>
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