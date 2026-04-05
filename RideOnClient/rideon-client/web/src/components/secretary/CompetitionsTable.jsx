import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  Filter,
  Pencil,
  X,
} from "lucide-react";
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

function HeaderSortButton(props) {
  const isActive = props.sortKey === props.columnKey;

  return (
    <button
      type="button"
      onClick={function () {
        props.onSort(props.columnKey);
      }}
      className="inline-flex items-center gap-1 font-bold text-[#4E342E] transition-opacity hover:opacity-80"
    >
      <span>{props.label}</span>
      <ArrowUpDown size={14} />
      {isActive ? (
        <span className="text-[10px] text-[#8B6352]">
          {props.sortDirection === "asc" ? "▲" : "▼"}
        </span>
      ) : null}
    </button>
  );
}

function HeaderFilterMenu(props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(function () {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return function () {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasValue = props.value !== "" && props.value !== null && props.value !== undefined;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={function () {
          setOpen(!open);
        }}
        className={
          "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors " +
          (hasValue
            ? "border-[#8B6352] bg-[#F3ECE8] text-[#8B6352]"
            : "border-[#D7CCC8] bg-white text-[#7A655C] hover:bg-[#F8F5F2]")
        }
        title={props.title}
      >
        <Filter size={13} />
      </button>

      {open ? (
        <div className="absolute left-0 top-9 z-20 min-w-[160px] rounded-xl border border-[#E6DCD5] bg-white p-3 shadow-lg">
          <div className="mb-2 text-xs font-semibold text-[#6D4C41]">
            {props.title}
          </div>

          <select
            value={props.value}
            onChange={function (e) {
              props.onChange(e.target.value);
              setOpen(false);
            }}
            className="h-9 w-full rounded-lg border border-[#D7CCC8] bg-white px-2 text-sm text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#D2B7A7]"
          >
            <option value="">הכל</option>
            {props.options.map(function (opt) {
              const value = opt.value ?? opt;
              const label = opt.label ?? opt;

              return (
                <option key={String(value)} value={value}>
                  {label}
                </option>
              );
            })}
          </select>

          {hasValue ? (
            <button
              type="button"
              onClick={function () {
                props.onChange("");
                setOpen(false);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#8B6352] hover:opacity-80"
            >
              <X size={12} />
              ניקוי סינון
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function HeaderCell(props) {
  return (
    <div className="flex items-center justify-start gap-2">
      <HeaderSortButton
        label={props.label}
        columnKey={props.columnKey}
        sortKey={props.sortKey}
        sortDirection={props.sortDirection}
        onSort={props.onSort}
      />

      {props.filter ? (
        <HeaderFilterMenu
          title={props.filterTitle}
          value={props.filterValue}
          onChange={props.onFilterChange}
          options={props.filterOptions}
        />
      ) : null}
    </div>
  );
}

export default function CompetitionsTable(props) {
  const rows = Array.isArray(props.competitions) ? props.competitions : [];

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E8DDD7] bg-white">
      <DataTableShell widthMode="full" tableClassName="text-right w-full">
        <thead className="bg-[#FAF7F5]">
          <tr className="border-b border-[#E8DDD6] text-sm text-[#6A5248] align-middle">
            <th className="px-5 py-4 min-w-[260px]">
              <HeaderCell
                label="שם תחרות"
                columnKey="competitionName"
                sortKey={props.sortKey}
                sortDirection={props.sortDirection}
                onSort={props.onSort}
              />
            </th>

            <th className="px-5 py-4 min-w-[180px]">
              <HeaderCell
                label="ענף"
                columnKey="fieldName"
                sortKey={props.sortKey}
                sortDirection={props.sortDirection}
                onSort={props.onSort}
                filter={true}
                filterTitle="סינון לפי ענף"
                filterValue={props.fieldFilter}
                onFilterChange={props.onFieldFilterChange}
                filterOptions={props.fieldOptions.map(function (field) {
                  return {
                    value: field.fieldId,
                    label: field.fieldName,
                  };
                })}
              />
            </th>

            <th className="px-5 py-4 min-w-[220px]">
              <HeaderCell
                label="תאריכי תחרות"
                columnKey="competitionStartDate"
                sortKey={props.sortKey}
                sortDirection={props.sortDirection}
                onSort={props.onSort}
              />
            </th>

            <th className="px-5 py-4 min-w-[180px]">
              <HeaderCell
                label="סטטוס"
                columnKey="competitionStatus"
                sortKey={props.sortKey}
                sortDirection={props.sortDirection}
                onSort={props.onSort}
                filter={true}
                filterTitle="סינון לפי סטטוס"
                filterValue={props.statusFilter}
                onFilterChange={props.onStatusFilterChange}
                filterOptions={props.statusOptions}
              />
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