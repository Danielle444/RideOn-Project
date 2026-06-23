import { useRef } from "react";
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

function ImportResultBox(props) {
  var result = props.result;

  if (!result) {
    return null;
  }

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-4 text-sm xl:grid-cols-5">
      <div>
        <p className="text-xs font-bold text-[#8A7268]">שורות</p>
        <p className="mt-1 font-black text-[#3F312B]">
          {getValue(result, "totalRows", "TotalRows", 0)}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#8A7268]">נקלטו</p>
        <p className="mt-1 font-black text-[#2E7D32]">
          {getValue(result, "importedCreditsCount", "ImportedCreditsCount", 0)}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#8A7268]">כפילויות</p>
        <p className="mt-1 font-black text-[#7B5A4D]">
          {getValue(
            result,
            "skippedDuplicatesCount",
            "SkippedDuplicatesCount",
            0,
          )}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#8A7268]">ללא סכום</p>
        <p className="mt-1 font-black text-[#7B5A4D]">
          {getValue(
            result,
            "skippedZeroAmountCount",
            "SkippedZeroAmountCount",
            0,
          )}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#8A7268]">שגיאות</p>
        <p className="mt-1 font-black text-[#C62828]">
          {getValue(result, "failedRowsCount", "FailedRowsCount", 0)}
        </p>
      </div>
    </div>
  );
}

export default function CompetitionSummarySection(props) {
  var categories = Array.isArray(props.categories) ? props.categories : [];
  var showCategoriesTable = props.showCategoriesTable !== false;
  var fileInputRef = useRef(null);

  function openFilePicker() {
    if (props.actionLoading) {
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function handleFileChange(event) {
    var file =
      event.target.files && event.target.files.length > 0
        ? event.target.files[0]
        : null;

    if (file && props.onInvoiceFileSelected) {
      props.onInvoiceFileSelected(file);
    }

    event.target.value = "";
  }

  return (
    <section className="rounded-[28px] border border-[#E6DCD5] bg-white p-8 shadow-sm">
      <div className="mb-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_260px_220px]">
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
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={openFilePicker}
              disabled={props.actionLoading}
              className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#8B5E4C] px-6 text-lg font-bold text-white transition-colors hover:bg-[#765041] disabled:cursor-not-allowed disabled:opacity-60"
              title="ייבוא אקסל תשלומי התאחדות"
            >
              <Upload size={22} />
              {props.actionLoading ? "מעלה..." : "העלאת חשבוניות"}
            </button>
          </div>
        ) : null}

        {props.secondaryActionLabel ? (
          <button
            type="button"
            onClick={props.onSecondaryActionClick}
            disabled={props.actionLoading}
            className="flex h-16 items-center justify-center gap-3 rounded-2xl border border-[#8B5E4C] bg-white px-6 text-lg font-bold text-[#6D4C41] transition-colors hover:bg-[#FCF8F5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {props.secondaryActionLabel}
          </button>
        ) : null}
      </div>

      {props.actionError ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {props.actionError}
        </div>
      ) : null}

      {props.actionSuccess ? (
        <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {props.actionSuccess}
        </div>
      ) : null}

      <ImportResultBox result={props.invoiceImportResult} />

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
