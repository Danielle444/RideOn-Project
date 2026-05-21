import {
  Clock3,
  Home,
  Package,
  Trophy,
  Upload,
  WalletCards,
} from "lucide-react";
import SummaryAmountCards from "./SummaryAmountCards";

function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

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

function getCategoryIcon(categoryKey) {
  if (categoryKey === "classes") {
    return <Trophy size={20} />;
  }

  if (categoryKey === "paid-time") {
    return <Clock3 size={20} />;
  }

  if (categoryKey === "stalls") {
    return <Home size={20} />;
  }

  if (categoryKey === "shavings") {
    return <Package size={20} />;
  }

  return <Trophy size={20} />;
}

export default function CompetitionSummarySection(props) {
  var categories = Array.isArray(props.categories) ? props.categories : [];
  var showCategoriesTable = props.showCategoriesTable !== false;

  return (
    <section className="rounded-[28px] border border-[#E6DCD5] bg-white p-8 shadow-sm">
      <div className="mb-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_260px]">
        <div>
          <h2 className="text-3xl font-black text-[#3F312B]">{props.title}</h2>

          {props.description ? (
            <p className="mt-2 text-sm text-[#8A7268]">{props.description}</p>
          ) : null}
        </div>

        {props.actionType === "cash" ? (
          <button
            type="button"
            onClick={props.onActionClick}
            className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-[#8B5E4C] px-6 text-lg font-bold text-white transition-colors hover:bg-[#765041]"
          >
            <WalletCards size={22} />
            קופה
          </button>
        ) : null}

        {props.actionType === "invoice" ? (
          <button
            type="button"
            disabled
            className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-[#8B5E4C] px-6 text-lg font-bold text-white opacity-70"
            title="העלאת חשבוניות תחובר בהמשך"
          >
            <Upload size={22} />
            העלאת חשבוניות
          </button>
        ) : null}
      </div>

      <SummaryAmountCards
        totals={props.totals}
        showQuantity={props.showQuantity}
        quantity={props.quantity}
        onExpectedAmountClick={props.onExpectedAmountClick}
        onPaidAmountClick={props.onPaidAmountClick}
      />

      {showCategoriesTable && categories.length > 0 ? (
        <div className="mt-7 overflow-hidden rounded-2xl border border-[#E3D7D0]">
          <table className="w-full border-collapse text-right">
            <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
              <tr>
                <th className="px-5 py-4">קטגוריה</th>
                <th className="px-5 py-4">כמות</th>
                <th className="px-5 py-4">שולם</th>
                <th className="px-5 py-4">לא שולם</th>
                <th className="px-5 py-4">סה״כ הכנסות צפויות</th>
              </tr>
            </thead>

            <tbody>
              {categories.map(function (item) {
                var categoryKey = getValue(
                  item,
                  "categoryKey",
                  "CategoryKey",
                  "",
                );

                var categoryName = getValue(
                  item,
                  "categoryName",
                  "CategoryName",
                  "-",
                );

                return (
                  <tr
                    key={categoryKey}
                    onClick={function () {
                      if (props.onCategoryClick) {
                        props.onCategoryClick(item);
                      }
                    }}
                    className={
                      "border-t border-[#EFE5DF] text-[#3F312B] " +
                      (props.onCategoryClick
                        ? "cursor-pointer transition-colors hover:bg-[#FCF8F5]"
                        : "")
                    }
                  >
                    <td className="px-5 py-5">
                      <div className="flex items-center justify-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0ECE8] text-[#7B5A4D]">
                          {getCategoryIcon(categoryKey)}
                        </span>

                        <span className="font-black">{categoryName}</span>
                      </div>
                    </td>

                    <td className="px-5 py-5 font-bold">
                      {getValue(item, "quantity", "Quantity", 0)}
                    </td>

                    <td className="px-5 py-5 font-bold text-[#2E7D32]">
                      {formatMoney(
                        getValue(item, "paidAmount", "PaidAmount", 0),
                      )}
                    </td>

                    <td className="px-5 py-5 font-bold text-[#C62828]">
                      {formatMoney(
                        getValue(item, "unpaidAmount", "UnpaidAmount", 0),
                      )}
                    </td>

                    <td className="px-5 py-5 font-bold text-[#7B5A4D]">
                      {formatMoney(
                        getValue(item, "expectedAmount", "ExpectedAmount", 0),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
