import { CheckCircle2, RefreshCw, Search, X } from "lucide-react";

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

function getCreditId(credit) {
  return getValue(
    credit,
    "federationExternalCreditId",
    "FederationExternalCreditId",
    0,
  );
}

function getPayerId(payer) {
  return getValue(payer, "payerPersonId", "PayerPersonId", 0);
}

function getPayerName(payer) {
  return getValue(payer, "payerName", "PayerName", "-");
}

function SuggestionsTab(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  if (props.loading) {
    return (
      <div className="rounded-2xl border border-[#E6DCD5] bg-white px-6 py-12 text-center text-sm font-bold text-[#7B5A4D]">
        טוען הצעות התאמה...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E6DCD5] bg-white px-6 py-12 text-center text-sm font-bold text-[#7B5A4D]">
        לא נמצאו הצעות התאמה כרגע.
      </div>
    );
  }

  return (
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

              var rowKey = String(creditId) + "-" + String(paidByPersonId);

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
                    {getValue(item, "externalName", "ExternalName", "-")}
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
                      getValue(item, "availableAmount", "AvailableAmount", 0),
                    )}
                  </td>

                  <td className="px-4 py-3 font-bold">
                    {getValue(item, "payerFullName", "PayerFullName", "-")}
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
  );
}

function ManualTab(props) {
  var credits = Array.isArray(props.manualCredits) ? props.manualCredits : [];
  var payers = Array.isArray(props.manualPayers) ? props.manualPayers : [];
  var charges = Array.isArray(props.manualFederationCharges)
    ? props.manualFederationCharges
    : [];

  var selectedCreditId = props.selectedManualCredit
    ? getCreditId(props.selectedManualCredit)
    : 0;

  var selectedPayerId = props.selectedManualPayer
    ? getPayerId(props.selectedManualPayer)
    : 0;

  var selectedCreditAvailable = props.selectedManualCredit
    ? Number(
        getValue(
          props.selectedManualCredit,
          "availableAmount",
          "AvailableAmount",
          0,
        ),
      )
    : 0;

  var payerMissingTotal = charges.reduce(function (sum, charge) {
    return sum + Number(getValue(charge, "missingAmount", "MissingAmount", 0));
  }, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E6DCD5] bg-white p-4">
          <h3 className="text-lg font-black text-[#3F312B]">1. בחירת קבלה</h3>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={props.manualCreditSearchText}
              onChange={function (event) {
                props.onManualCreditSearchTextChange(event.target.value);
              }}
              placeholder="חיפוש לפי שם, חווה, קבלה, ת״ז או סכום"
              className="min-w-0 flex-1 rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
            />

            <button
              type="button"
              onClick={props.onSearchManualCredits}
              disabled={props.manualCreditsLoading || props.approving}
              className="rounded-2xl bg-[#8B5E4C] px-4 py-3 text-white disabled:opacity-40"
            >
              <Search size={18} />
            </button>
          </div>

          <div className="mt-4 max-h-[260px] overflow-y-auto rounded-2xl border border-[#EFE7E1]">
            {props.manualCreditsLoading ? (
              <div className="p-5 text-center text-sm font-bold text-[#7B5A4D]">
                מחפש קבלות...
              </div>
            ) : credits.length === 0 ? (
              <div className="p-5 text-center text-sm font-bold text-[#7B5A4D]">
                לא נמצאו קבלות זמינות
              </div>
            ) : (
              credits.map(function (credit) {
                var creditId = getCreditId(credit);

                return (
                  <button
                    key={creditId}
                    type="button"
                    onClick={function () {
                      props.onSelectManualCredit(credit);
                    }}
                    className={
                      "block w-full border-b border-[#EFE7E1] px-4 py-3 text-right last:border-b-0 hover:bg-[#FCF8F5] " +
                      (selectedCreditId === creditId
                        ? "bg-[#FCF8F5]"
                        : "bg-white")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#3F312B]">
                          {getValue(
                            credit,
                            "externalName",
                            "ExternalName",
                            "-",
                          )}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#8A7268]">
                          קבלה:{" "}
                          {getValue(
                            credit,
                            "externalReference",
                            "ExternalReference",
                            "-",
                          )}{" "}
                          | חווה:{" "}
                          {getValue(
                            credit,
                            "externalClubName",
                            "ExternalClubName",
                            "-",
                          )}
                        </p>
                      </div>

                      <p className="font-black text-[#2E7D32]">
                        {formatMoney(
                          getValue(
                            credit,
                            "availableAmount",
                            "AvailableAmount",
                            0,
                          ),
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6DCD5] bg-white p-4">
          <h3 className="text-lg font-black text-[#3F312B]">2. בחירת משלם</h3>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={props.manualPayerSearchText}
              onChange={function (event) {
                props.onManualPayerSearchTextChange(event.target.value);
              }}
              placeholder="חיפוש לפי שם משלם"
              className="min-w-0 flex-1 rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
            />

            <button
              type="button"
              onClick={props.onSearchManualPayers}
              disabled={props.manualPayersLoading || props.approving}
              className="rounded-2xl bg-[#8B5E4C] px-4 py-3 text-white disabled:opacity-40"
            >
              <Search size={18} />
            </button>
          </div>

          <div className="mt-4 max-h-[260px] overflow-y-auto rounded-2xl border border-[#EFE7E1]">
            {props.manualPayersLoading ? (
              <div className="p-5 text-center text-sm font-bold text-[#7B5A4D]">
                מחפש משלמים...
              </div>
            ) : payers.length === 0 ? (
              <div className="p-5 text-center text-sm font-bold text-[#7B5A4D]">
                לא נמצאו משלמים
              </div>
            ) : (
              payers.map(function (payer) {
                var payerId = getPayerId(payer);

                return (
                  <button
                    key={payerId}
                    type="button"
                    onClick={function () {
                      props.onSelectManualPayer(payer);
                    }}
                    className={
                      "block w-full border-b border-[#EFE7E1] px-4 py-3 text-right last:border-b-0 hover:bg-[#FCF8F5] " +
                      (selectedPayerId === payerId
                        ? "bg-[#FCF8F5]"
                        : "bg-white")
                    }
                  >
                    <p className="font-black text-[#3F312B]">
                      {getPayerName(payer)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-4">
        <h3 className="text-lg font-black text-[#3F312B]">
          3. אישור שיוך ידני
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div>
            <p className="text-xs font-bold text-[#8A7268]">יתרה זמינה בקבלה</p>
            <p className="mt-1 text-xl font-black text-[#2E7D32]">
              {formatMoney(selectedCreditAvailable)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-[#8A7268]">חסר למשלם</p>
            <p className="mt-1 text-xl font-black text-[#C62828]">
              {formatMoney(payerMissingTotal)}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-[#8A7268]">
              סכום לשיוך
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={props.manualAllocationAmount}
              onChange={function (event) {
                props.onManualAllocationAmountChange(event.target.value);
              }}
              className="mt-1 w-full rounded-2xl border border-[#D8CBC3] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#E6DCD5] bg-white">
          {props.manualChargesLoading ? (
            <div className="p-5 text-center text-sm font-bold text-[#7B5A4D]">
              טוען חיובי התאחדות...
            </div>
          ) : charges.length === 0 ? (
            <div className="p-5 text-center text-sm font-bold text-[#7B5A4D]">
              לא נבחר משלם או שאין לו חיובי התאחדות חסרים
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-right text-sm">
                <thead>
                  <tr className="border-b border-[#E6DCD5] bg-[#FCFAF8] text-xs font-black text-[#6D4C41]">
                    <th className="px-4 py-3">מקצה</th>
                    <th className="px-4 py-3">רוכב</th>
                    <th className="px-4 py-3">סוס</th>
                    <th className="px-4 py-3">חסר</th>
                  </tr>
                </thead>

                <tbody>
                  {charges.map(function (charge) {
                    var chargeId = getValue(
                      charge,
                      "billChargeId",
                      "BillChargeId",
                      0,
                    );

                    return (
                      <tr
                        key={chargeId}
                        className="border-b border-[#EFE7E1] last:border-b-0"
                      >
                        <td className="px-4 py-3 font-bold">
                          {getValue(charge, "className", "ClassName", "-")}
                        </td>
                        <td className="px-4 py-3">
                          {getValue(
                            charge,
                            "riderFullName",
                            "RiderFullName",
                            "-",
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getValue(charge, "horseName", "HorseName", "-")}
                        </td>
                        <td className="px-4 py-3 font-black text-[#C62828]">
                          {formatMoney(
                            getValue(
                              charge,
                              "missingAmount",
                              "MissingAmount",
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={props.onApproveManualAllocation}
          disabled={
            props.approving ||
            !props.selectedManualCredit ||
            !props.selectedManualPayer ||
            Number(props.manualAllocationAmount || 0) <= 0
          }
          className="mt-4 rounded-2xl bg-[#8B5E4C] px-6 py-3 font-bold text-white transition-colors hover:bg-[#765041] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {props.approving ? "משייך..." : "שייך ידנית"}
        </button>
      </div>
    </div>
  );
}

export default function FederationMatchingSuggestionsModal(props) {
  if (!props.open) {
    return null;
  }

  var items = Array.isArray(props.items) ? props.items : [];
  var activeTab = props.activeTab || "suggestions";

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
              אפשר לאשר הצעות אוטומטיות או לבצע שיוך ידני לפי קבלה ומשלם.
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
            <div className="flex rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-1">
              <button
                type="button"
                onClick={function () {
                  props.onChangeTab("suggestions");
                }}
                className={
                  "rounded-xl px-5 py-2 text-sm font-black " +
                  (activeTab === "suggestions"
                    ? "bg-white text-[#3F312B] shadow-sm"
                    : "text-[#8A7268]")
                }
              >
                הצעות אוטומטיות
              </button>

              <button
                type="button"
                onClick={function () {
                  props.onChangeTab("manual");
                }}
                className={
                  "rounded-xl px-5 py-2 text-sm font-black " +
                  (activeTab === "manual"
                    ? "bg-white text-[#3F312B] shadow-sm"
                    : "text-[#8A7268]")
                }
              >
                שיוך ידני
              </button>
            </div>

            {activeTab === "suggestions" ? (
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
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
            ) : null}
          </div>

          {activeTab === "suggestions" ? (
            <SuggestionsTab
              items={items}
              loading={props.loading}
              approving={props.approving}
              onApprove={props.onApprove}
            />
          ) : (
            <ManualTab {...props} />
          )}
        </div>
      </div>
    </div>
  );
}
