import { CheckCircle2, RefreshCw, X } from "lucide-react";

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

function getConfidenceClass(confidenceLevel) {
  if (confidenceLevel === "גבוהה") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (confidenceLevel === "בינונית") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-[#E6DCD5] bg-[#FCFAF8] text-[#7B5A4D]";
}

export default function FederationMatchingSuggestionsModal(props) {
  if (!props.open) {
    return null;
  }

  var items = Array.isArray(props.items) ? props.items : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      dir="rtl"
    >
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6DCD5] px-6 py-5">
          <div>
            <h2 className="text-2xl font-black text-[#3F312B]">
              התאמת קבלות התאחדות
            </h2>

            <p className="mt-1 text-sm font-bold text-[#8A7268]">
              כאן מוצגות הצעות התאמה בין קבלות/יתרות לבין משלמים שחסר להם כיסוי
              התאחדות. המזכירה מאשרת כל שיוך בנפרד.
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            disabled={props.approving}
            className="rounded-2xl border border-[#D8CBC3] bg-white p-2 text-[#6D4C41] transition-colors hover:bg-[#F8F3EF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto px-6 py-5">
          {props.error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {props.error}
            </div>
          ) : null}

          {props.success ? (
            <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              {props.success}
            </div>
          ) : null}

          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] px-5 py-3 text-sm font-bold text-[#7B5A4D]">
              נמצאו {items.length} הצעות התאמה
            </div>

            <button
              type="button"
              onClick={props.onReload}
              disabled={props.loading || props.approving}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-5 py-3 font-bold text-[#6D4C41] transition-colors hover:bg-[#F8F3EF] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw size={17} />
              רענון הצעות
            </button>
          </div>

          {props.loading ? (
            <div className="rounded-2xl border border-[#E6DCD5] bg-white px-6 py-12 text-center text-sm font-bold text-[#7B5A4D]">
              טוען הצעות התאמה...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-[#E6DCD5] bg-white px-6 py-12 text-center text-sm font-bold text-[#7B5A4D]">
              לא נמצאו הצעות התאמה כרגע.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E6DCD5] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1150px] text-right text-sm">
                  <thead>
                    <tr className="border-b border-[#E6DCD5] bg-[#FCFAF8] text-xs font-black text-[#6D4C41]">
                      <th className="px-4 py-3">קבלה</th>
                      <th className="px-4 py-3">שם באקסל</th>
                      <th className="px-4 py-3">חווה</th>
                      <th className="px-4 py-3">יתרה זמינה</th>
                      <th className="px-4 py-3">משלם מוצע</th>
                      <th className="px-4 py-3">חסר למשלם</th>
                      <th className="px-4 py-3">סכום לשיוך</th>
                      <th className="px-4 py-3">ביטחון</th>
                      <th className="px-4 py-3">סיבה</th>
                      <th className="px-4 py-3">פעולה</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map(function (item) {
                      var creditId = getValue(
                        item,
                        "federationExternalCreditId",
                        "FederationExternalCreditId",
                        0,
                      );

                      var paidByPersonId = getValue(
                        item,
                        "paidByPersonId",
                        "PaidByPersonId",
                        0,
                      );

                      var rowKey =
                        String(creditId) + "-" + String(paidByPersonId);

                      var confidenceLevel = getValue(
                        item,
                        "confidenceLevel",
                        "ConfidenceLevel",
                        "",
                      );

                      return (
                        <tr
                          key={rowKey}
                          className="border-b border-[#EFE7E1] last:border-b-0"
                        >
                          <td className="px-4 py-3 font-bold">
                            {getValue(
                              item,
                              "externalReference",
                              "ExternalReference",
                              "-",
                            )}
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {getValue(
                              item,
                              "externalName",
                              "ExternalName",
                              "-",
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {getValue(
                              item,
                              "externalClubName",
                              "ExternalClubName",
                              "-",
                            )}
                          </td>

                          <td className="px-4 py-3 font-black text-[#2E7D32]">
                            {formatMoney(
                              getValue(
                                item,
                                "availableAmount",
                                "AvailableAmount",
                                0,
                              ),
                            )}
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {getValue(
                              item,
                              "payerFullName",
                              "PayerFullName",
                              "-",
                            )}
                          </td>

                          <td className="px-4 py-3 font-black text-[#C62828]">
                            {formatMoney(
                              getValue(
                                item,
                                "missingFederationAmount",
                                "MissingFederationAmount",
                                0,
                              ),
                            )}
                          </td>

                          <td className="px-4 py-3 font-black text-[#3F312B]">
                            {formatMoney(
                              getValue(
                                item,
                                "suggestedAllocatedAmount",
                                "SuggestedAllocatedAmount",
                                0,
                              ),
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={
                                "inline-flex rounded-full border px-3 py-1 text-xs font-black " +
                                getConfidenceClass(confidenceLevel)
                              }
                            >
                              {confidenceLevel || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs font-bold text-[#7B5A4D]">
                            {getValue(item, "matchReason", "MatchReason", "-")}
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={function () {
                                props.onApprove(item);
                              }}
                              disabled={props.approving}
                              className="flex items-center justify-center gap-2 rounded-xl bg-[#8B5E4C] px-4 py-2 text-xs font-black text-white transition-colors hover:bg-[#765041] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <CheckCircle2 size={15} />
                              אשר שיוך
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
