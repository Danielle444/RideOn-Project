import { Search } from "lucide-react";
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

  return new Date(value).toLocaleString("he-IL");
}

export default function PayersList(props) {
  var [searchText, setSearchText] = useState("");

  var filteredPayers = useMemo(
    function () {
      var text = searchText.trim().toLowerCase();

      if (!text) {
        return props.items || [];
      }

      return (props.items || []).filter(function (payer) {
        var name = getValue(payer, "payerName", "PayerName", "").toLowerCase();

        return name.includes(text);
      });
    },
    [props.items, searchText],
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-right">
            <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
              <tr>
                <th className="px-6 py-4">משלם</th>
                <th className="px-6 py-4">סה״כ</th>
                <th className="px-6 py-4">שולם</th>
                <th className="px-6 py-4">יתרה</th>
                <th className="px-6 py-4">סטטוס</th>
                <th className="px-6 py-4">עדכון אחרון</th>
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
                var status = getValue(
                  payer,
                  "paymentStatus",
                  "PaymentStatus",
                  "",
                );

                return (
                  <tr
                    key={payerId}
                    className="border-t border-[#EFE5DF] text-sm text-[#3F312B] transition-colors hover:bg-[#FCF8F5]"
                  >
                    <td className="px-6 py-5 font-black">
                      {getValue(payer, "payerName", "PayerName", "-")}
                    </td>

                    <td className="px-6 py-5 font-bold">
                      {formatMoney(
                        getValue(payer, "totalAmount", "TotalAmount", 0),
                      )}
                    </td>

                    <td className="px-6 py-5 font-bold text-[#2E7D32]">
                      {formatMoney(
                        getValue(payer, "paidAmount", "PaidAmount", 0),
                      )}
                    </td>

                    <td className="px-6 py-5 font-bold text-[#C62828]">
                      {formatMoney(
                        getValue(payer, "unpaidAmount", "UnpaidAmount", 0),
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <PaymentStatusBadge status={status} />
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
