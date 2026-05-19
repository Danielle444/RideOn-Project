import { ArrowDownUp, Search, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import PaymentStatusBadge from "./PaymentStatusBadge";

function getValue(item, camelKey, pascalKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("he-IL");
}

function normalizeStatus(payer) {
  var totalAmount = Number(getValue(payer, "totalAmount", "TotalAmount", 0));
  var paidAmount = Number(getValue(payer, "paidAmount", "PaidAmount", 0));
  var unpaidAmount = Number(getValue(payer, "unpaidAmount", "UnpaidAmount", 0));
  var status = getValue(payer, "paymentStatus", "PaymentStatus", "");

  if (totalAmount <= 0) {
    return "NoCharges";
  }

  if (unpaidAmount <= 0) {
    return "Paid";
  }

  if (paidAmount > 0 && unpaidAmount > 0) {
    return "Partial";
  }

  if (status) {
    return status;
  }

  return "Unpaid";
}

function getStatusPriority(status) {
  if (status === "Unpaid") {
    return 1;
  }

  if (status === "Partial") {
    return 2;
  }

  if (status === "Paid") {
    return 3;
  }

  return 4;
}

function getSortValue(payer, sortKey) {
  if (sortKey === "payerName") {
    return getValue(payer, "payerName", "PayerName", "");
  }

  if (sortKey === "totalAmount") {
    return Number(getValue(payer, "totalAmount", "TotalAmount", 0));
  }

  if (sortKey === "paidAmount") {
    return Number(getValue(payer, "paidAmount", "PaidAmount", 0));
  }

  if (sortKey === "unpaidAmount") {
    return Number(getValue(payer, "unpaidAmount", "UnpaidAmount", 0));
  }

  if (sortKey === "paymentStatus") {
    return getStatusPriority(normalizeStatus(payer));
  }

  if (sortKey === "lastUpdatedAt") {
    var value = getValue(payer, "lastUpdatedAt", "LastUpdatedAt", null);
    var date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }

  return "";
}

function compareValues(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a || "").localeCompare(String(b || ""), "he");
}

function getHeaderClass(active) {
  return (
    "px-6 py-4 text-right transition-colors " +
    (active ? "text-[#3F312B]" : "text-[#5D4037] hover:text-[#3F312B]")
  );
}

function HeaderButton(props) {
  var isActive = props.sortKey === props.columnKey;

  return (
    <button
      type="button"
      onClick={function () {
        props.onSort(props.columnKey);
      }}
      className="inline-flex items-center gap-2 font-black"
    >
      <span>{props.label}</span>

      <ArrowDownUp
        size={14}
        className={isActive ? "text-[#8B5E4C]" : "text-[#BCAAA4]"}
      />

      {isActive ? (
        <span className="text-xs text-[#8B5E4C]">
          {props.sortDirection === "asc" ? "↑" : "↓"}
        </span>
      ) : null}
    </button>
  );
}

function getFilterButtonClass(active) {
  return (
    "rounded-2xl border px-4 py-2 text-sm font-bold transition-colors " +
    (active
      ? "border-[#8B5E4C] bg-[#8B5E4C] text-white"
      : "border-[#E3D7D0] bg-white text-[#6D4C41] hover:bg-[#FCFAF8]")
  );
}

export default function PayersList(props) {
  var [searchText, setSearchText] = useState("");
  var [statusFilter, setStatusFilter] = useState("all");
  var [balanceFilter, setBalanceFilter] = useState("all");
  var [sortKey, setSortKey] = useState("paymentStatus");
  var [sortDirection, setSortDirection] = useState("asc");

  function handleSort(columnKey) {
    if (sortKey === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(columnKey);

    if (
      columnKey === "totalAmount" ||
      columnKey === "paidAmount" ||
      columnKey === "unpaidAmount" ||
      columnKey === "lastUpdatedAt"
    ) {
      setSortDirection("desc");
      return;
    }

    setSortDirection("asc");
  }

  function clearFilters() {
    setSearchText("");
    setStatusFilter("all");
    setBalanceFilter("all");
    setSortKey("paymentStatus");
    setSortDirection("asc");
  }

  var filteredPayers = useMemo(
    function () {
      var text = searchText.trim().toLowerCase();

      var filtered = (props.items || []).filter(function (payer) {
        var name = getValue(payer, "payerName", "PayerName", "").toLowerCase();
        var totalAmount = Number(
          getValue(payer, "totalAmount", "TotalAmount", 0),
        );
        var unpaidAmount = Number(
          getValue(payer, "unpaidAmount", "UnpaidAmount", 0),
        );
        var status = normalizeStatus(payer);

        if (text && !name.includes(text)) {
          return false;
        }

        if (statusFilter !== "all" && status !== statusFilter) {
          return false;
        }

        if (balanceFilter === "openOnly" && unpaidAmount <= 0) {
          return false;
        }

        if (balanceFilter === "noBalance" && unpaidAmount > 0) {
          return false;
        }

        if (balanceFilter === "withAmount" && totalAmount <= 0) {
          return false;
        }

        return true;
      });

      filtered.sort(function (a, b) {
        var aValue = getSortValue(a, sortKey);
        var bValue = getSortValue(b, sortKey);
        var result = compareValues(aValue, bValue);

        if (result === 0 && sortKey !== "payerName") {
          result = compareValues(
            getValue(a, "payerName", "PayerName", ""),
            getValue(b, "payerName", "PayerName", ""),
          );
        }

        return sortDirection === "asc" ? result : result * -1;
      });

      return filtered;
    },
    [
      props.items,
      searchText,
      statusFilter,
      balanceFilter,
      sortKey,
      sortDirection,
    ],
  );

  if (props.loading) {
    return (
      <div className="rounded-[28px] border border-[#E6DCD5] bg-white px-8 py-12 text-center text-[#7B5A4D] shadow-sm">
        טוען משלמים...
      </div>
    );
  }

  return (
    <section className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm">
      <div className="border-b border-[#EFE5DF] px-8 py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#3F312B]">רשימת משלמים</h2>

            <p className="mt-1 text-sm text-[#8A7268]">
              לחצי על משלם כדי להיכנס לחשבון התשלומים שלו
            </p>
          </div>

          <div className="relative w-full xl:w-[360px]">
            <Search
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A7268]"
            />

            <input
              type="text"
              value={searchText}
              onChange={function (event) {
                setSearchText(event.target.value);
              }}
              placeholder="חיפוש לפי שם משלם"
              className="h-12 w-full rounded-2xl border border-[#E3D7D0] bg-[#FCFAF8] pr-11 pl-4 text-right text-sm outline-none focus:border-[#8B5E4C]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={function () {
              setStatusFilter("all");
            }}
            className={getFilterButtonClass(statusFilter === "all")}
          >
            כל הסטטוסים
          </button>

          <button
            type="button"
            onClick={function () {
              setStatusFilter("Unpaid");
            }}
            className={getFilterButtonClass(statusFilter === "Unpaid")}
          >
            לא שולם
          </button>

          <button
            type="button"
            onClick={function () {
              setStatusFilter("Partial");
            }}
            className={getFilterButtonClass(statusFilter === "Partial")}
          >
            חלקי
          </button>

          <button
            type="button"
            onClick={function () {
              setStatusFilter("Paid");
            }}
            className={getFilterButtonClass(statusFilter === "Paid")}
          >
            שולם
          </button>

          <button
            type="button"
            onClick={function () {
              setBalanceFilter("openOnly");
            }}
            className={getFilterButtonClass(balanceFilter === "openOnly")}
          >
            יתרה פתוחה בלבד
          </button>

          <button
            type="button"
            onClick={function () {
              setBalanceFilter("noBalance");
            }}
            className={getFilterButtonClass(balanceFilter === "noBalance")}
          >
            ללא יתרה
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E3D7D0] bg-white px-4 py-2 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#FCFAF8]"
          >
            <RotateCcw size={15} />
            ניקוי
          </button>
        </div>
      </div>

      {props.error ? (
        <div className="m-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {props.error}
        </div>
      ) : null}

      {filteredPayers.length === 0 ? (
        <div className="px-8 py-14 text-center text-[#8A7268]">
          אין משלמים להצגה
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-right">
            <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
              <tr>
                <th className={getHeaderClass(sortKey === "payerName")}>
                  <HeaderButton
                    label="משלם"
                    columnKey="payerName"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th className={getHeaderClass(sortKey === "totalAmount")}>
                  <HeaderButton
                    label="סה״כ"
                    columnKey="totalAmount"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th className={getHeaderClass(sortKey === "paidAmount")}>
                  <HeaderButton
                    label="שולם"
                    columnKey="paidAmount"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th className={getHeaderClass(sortKey === "unpaidAmount")}>
                  <HeaderButton
                    label="יתרה"
                    columnKey="unpaidAmount"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th className={getHeaderClass(sortKey === "paymentStatus")}>
                  <HeaderButton
                    label="סטטוס"
                    columnKey="paymentStatus"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th className={getHeaderClass(sortKey === "lastUpdatedAt")}>
                  <HeaderButton
                    label="עדכון אחרון"
                    columnKey="lastUpdatedAt"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-6 py-4">פעולה</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayers.map(function (payer) {
                var payerId = getValue(
                  payer,
                  "payerPersonId",
                  "PayerPersonId",
                  0,
                );

                var totalAmount = Number(
                  getValue(payer, "totalAmount", "TotalAmount", 0),
                );

                var unpaidAmount = Number(
                  getValue(payer, "unpaidAmount", "UnpaidAmount", 0),
                );

                var status = normalizeStatus(payer);

                return (
                  <tr
                    key={payerId}
                    className="border-t border-[#EFE5DF] text-sm text-[#3F312B] transition-colors hover:bg-[#FCF8F5]"
                  >
                    <td className="px-6 py-5 font-black">
                      {getValue(payer, "payerName", "PayerName", "-")}
                    </td>

                    <td className="px-6 py-5 font-bold">
                      {formatMoney(totalAmount)}
                    </td>

                    <td className="px-6 py-5 font-bold text-[#2E7D32]">
                      {formatMoney(
                        getValue(payer, "paidAmount", "PaidAmount", 0),
                      )}
                    </td>

                    <td
                      className={
                        "px-6 py-5 font-bold " +
                        (unpaidAmount > 0 ? "text-[#C62828]" : "text-[#2E7D32]")
                      }
                    >
                      {formatMoney(unpaidAmount)}
                    </td>

                    <td className="px-6 py-5">
                      <PaymentStatusBadge
                        status={status}
                        totalAmount={totalAmount}
                        unpaidAmount={unpaidAmount}
                      />
                    </td>

                    <td className="px-6 py-5 text-[#7A655C]">
                      {formatDateTime(
                        getValue(payer, "lastUpdatedAt", "LastUpdatedAt", null),
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={function () {
                          props.onOpenPayer(payer);
                        }}
                        className="rounded-xl bg-[#8B5E4C] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#765041]"
                      >
                        כניסה לחשבון
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
