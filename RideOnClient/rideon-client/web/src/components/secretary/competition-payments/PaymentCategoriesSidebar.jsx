import { Clock3, Home, Package, Trophy } from "lucide-react";
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

function getIcon(categoryKey) {
  if (categoryKey === "classes") {
    return <Trophy size={18} />;
  }

  if (categoryKey === "paid-time") {
    return <Clock3 size={18} />;
  }

  if (categoryKey === "stalls") {
    return <Home size={18} />;
  }

  if (categoryKey === "shavings") {
    return <Package size={18} />;
  }

  return <Trophy size={18} />;
}

export default function PaymentCategoriesSidebar(props) {
  var items = (props.items || []).filter(function (item) {
    return getValue(item, "chargeOwner", "ChargeOwner", "") === props.activeOwner;
  });

  return (
    <aside className="rounded-[24px] border border-[#E6DCD5] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-black text-[#3F312B]">קטגוריות</h3>
        <p className="mt-1 text-xs text-[#8A7268]">
          סינון שורות החיוב לפי סוג
        </p>
      </div>

      <button
        type="button"
        onClick={function () {
          props.onSelectCategory(props.activeOwner, "");
        }}
        className={
          "mb-3 w-full rounded-2xl border px-4 py-3 text-right transition-colors " +
          (!props.activeCategoryKey
            ? "border-[#8B5E4C] bg-[#FCF8F5]"
            : "border-[#E6DCD5] bg-white hover:bg-[#FCFAF8]")
        }
      >
        <p className="font-black text-[#3F312B]">כל החיובים</p>
      </button>

      <div className="space-y-3">
        {items.map(function (item) {
          var categoryKey = getValue(item, "categoryKey", "CategoryKey", "");
          var isActive = props.activeCategoryKey === categoryKey;

          return (
            <button
              key={getValue(item, "chargeOwner", "ChargeOwner", "") + "-" + categoryKey}
              type="button"
              onClick={function () {
                props.onSelectCategory(props.activeOwner, categoryKey);
              }}
              className={
                "w-full rounded-2xl border px-4 py-4 text-right transition-colors " +
                (isActive
                  ? "border-[#8B5E4C] bg-[#FCF8F5]"
                  : "border-[#E6DCD5] bg-white hover:bg-[#FCFAF8]")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1ECE8] text-[#7B5A4D]">
                    {getIcon(categoryKey)}
                  </span>

                  <div>
                    <p className="font-black text-[#3F312B]">
                      {getValue(item, "categoryName", "CategoryName", "-")}
                    </p>

                    <p className="mt-1 text-xs text-[#8A7268]">
                      {getValue(item, "chargeCount", "ChargeCount", 0)} שורות
                    </p>
                  </div>
                </div>

                <PaymentStatusBadge
                  status={getValue(item, "paymentStatus", "PaymentStatus", "")}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="font-bold text-[#8A7268]">סה״כ</p>
                  <p className="mt-1 font-black text-[#3F312B]">
                    {formatMoney(getValue(item, "totalAmount", "TotalAmount", 0))}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-[#8A7268]">שולם</p>
                  <p className="mt-1 font-black text-[#2E7D32]">
                    {formatMoney(getValue(item, "paidAmount", "PaidAmount", 0))}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-[#8A7268]">יתרה</p>
                  <p className="mt-1 font-black text-[#C62828]">
                    {formatMoney(getValue(item, "unpaidAmount", "UnpaidAmount", 0))}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}