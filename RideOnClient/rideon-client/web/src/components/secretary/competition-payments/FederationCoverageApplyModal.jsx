import { Search, X } from "lucide-react";

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

function getCreditId(credit) {
  return getValue(
    credit,
    "federationExternalCreditId",
    "FederationExternalCreditId",
    0,
  );
}

export default function FederationCoverageApplyModal(props) {
  if (!props.open) {
    return null;
  }

  var selectedCreditId = props.selectedCredit
    ? getCreditId(props.selectedCredit)
    : 0;

  var selectedCreditAllocations = props.selectedCreditAllocations || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      dir="rtl"
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6DCD5] px-6 py-5">
          <div>
            <h2 className="text-2xl font-black text-[#3F312B]">
              שיוך כיסוי התאחדות
            </h2>

            <p className="mt-1 text-sm font-bold text-[#8A7268]">
              השורות כבר נבחרו מטבלת חיובי ההתאחדות. כאן בוחרים קבלה / העברה /
              זיכוי שישמשו לכיסוי.
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            disabled={props.loading || props.creatingManualCredit}
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-4">
              <p className="text-xs font-bold text-[#8A7268]">שורות שנבחרו</p>
              <p className="mt-1 text-2xl font-black text-[#3F312B]">
                {props.selectedChargesCount}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-4">
              <p className="text-xs font-bold text-[#8A7268]">חסר לכיסוי</p>
              <p className="mt-1 text-2xl font-black text-[#C62828]">
                {formatMoney(props.selectedMissingAmount)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-4">
              <p className="text-xs font-bold text-[#8A7268]">יתרה שנבחרה</p>
              <p className="mt-1 text-2xl font-black text-[#2E7D32]">
                {formatMoney(
                  props.selectedCredit
                    ? getValue(
                        props.selectedCredit,
                        "availableAmount",
                        "AvailableAmount",
                        0,
                      )
                    : 0,
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E6DCD5] bg-white p-4">
            <label className="text-sm font-black text-[#3F312B]">
              חיפוש קבלה / יתרה
            </label>

            <div className="mt-2 flex flex-col gap-3 xl:flex-row">
              <input
                type="text"
                value={props.searchText}
                onChange={function (event) {
                  props.onSearchTextChange(event.target.value);
                }}
                placeholder="חיפוש לפי שם, חווה, ת״ז, אסמכתא או סכום"
                className="min-w-0 flex-1 rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
              />

              <label className="flex items-center gap-2 rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm font-bold text-[#6D4C41]">
                <input
                  type="checkbox"
                  checked={props.onlyAvailable === true}
                  onChange={function (event) {
                    props.onOnlyAvailableChange(event.target.checked);
                  }}
                />
                רק יתרות זמינות
              </label>

              <button
                type="button"
                onClick={props.onSearch}
                disabled={props.searching}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#8B5E4C] px-5 py-3 font-bold text-white transition-colors hover:bg-[#765041] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Search size={17} />
                חיפוש
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { key: "all", label: "הכול" },
              { key: "available", label: "יתרות זמינות" },
              { key: "partiallyUsed", label: "נוצל חלקית" },
              { key: "fullyUsed", label: "נוצל במלואו" },
            ].map(function (option) {
              var active = props.creditStatusFilter === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={function () {
                    props.onCreditStatusFilterChange(option.key);
                  }}
                  className={
                    "rounded-full border px-4 py-2 text-xs font-black transition-colors " +
                    (active
                      ? "border-[#8B5E4C] bg-[#FCF8F5] text-[#3F312B]"
                      : "border-[#D8CBC3] bg-white text-[#7B5A4D] hover:bg-[#FCFAF8]")
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-black text-[#3F312B]">
                  יתרה ידנית
                </h3>

                <p className="mt-1 text-sm font-bold text-[#8A7268]">
                  מיועד להעברה בנקאית, זיכוי קודם או יתרה שלא קיימת באקסל.
                </p>
              </div>

              <button
                type="button"
                onClick={props.onToggleManualCreditForm}
                disabled={props.loading || props.creatingManualCredit}
                className="rounded-2xl border border-[#D8CBC3] bg-white px-5 py-3 font-bold text-[#6D4C41] transition-colors hover:bg-[#F8F3EF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {props.manualCreditOpen ? "סגור טופס" : "הוסף יתרה ידנית"}
              </button>
            </div>

            {props.manualCreditOpen ? (
              <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
                <div>
                  <label className="text-xs font-black text-[#6D4C41]">
                    מקור
                  </label>

                  <select
                    value={props.manualCreditForm.sourceType}
                    onChange={function (event) {
                      props.onManualCreditFieldChange(
                        "sourceType",
                        event.target.value,
                      );
                    }}
                    className="mt-1 w-full rounded-2xl border border-[#D8CBC3] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
                  >
                    <option value="BankTransfer">העברה בנקאית</option>
                    <option value="PreviousCredit">זיכוי מתחרות קודמת</option>
                    <option value="Manual">ידני</option>
                    <option value="Exception">חריג</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-[#6D4C41]">
                    אסמכתא
                  </label>

                  <input
                    type="text"
                    value={props.manualCreditForm.externalReference}
                    onChange={function (event) {
                      props.onManualCreditFieldChange(
                        "externalReference",
                        event.target.value,
                      );
                    }}
                    placeholder="מספר העברה / קבלה / זיכוי"
                    className="mt-1 w-full rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#6D4C41]">
                    סכום
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={props.manualCreditForm.originalAmount}
                    onChange={function (event) {
                      props.onManualCreditFieldChange(
                        "originalAmount",
                        event.target.value,
                      );
                    }}
                    placeholder="0"
                    className="mt-1 w-full rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#6D4C41]">
                    שם
                  </label>

                  <input
                    type="text"
                    value={props.manualCreditForm.externalName}
                    onChange={function (event) {
                      props.onManualCreditFieldChange(
                        "externalName",
                        event.target.value,
                      );
                    }}
                    placeholder="שם משלם / שם באסמכתא"
                    className="mt-1 w-full rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#6D4C41]">
                    חווה / מועדון
                  </label>

                  <input
                    type="text"
                    value={props.manualCreditForm.externalClubName}
                    onChange={function (event) {
                      props.onManualCreditFieldChange(
                        "externalClubName",
                        event.target.value,
                      );
                    }}
                    placeholder="שם חווה"
                    className="mt-1 w-full rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#6D4C41]">
                    ת״ז
                  </label>

                  <input
                    type="text"
                    value={props.manualCreditForm.externalIdNumber}
                    onChange={function (event) {
                      props.onManualCreditFieldChange(
                        "externalIdNumber",
                        event.target.value,
                      );
                    }}
                    placeholder="לא חובה"
                    className="mt-1 w-full rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
                  />
                </div>

                <div className="xl:col-span-3">
                  <label className="text-xs font-black text-[#6D4C41]">
                    הערה
                  </label>

                  <textarea
                    value={props.manualCreditForm.notes}
                    onChange={function (event) {
                      props.onManualCreditFieldChange(
                        "notes",
                        event.target.value,
                      );
                    }}
                    placeholder="הערה פנימית למזכירה"
                    rows={2}
                    className="mt-1 w-full resize-none rounded-2xl border border-[#D8CBC3] px-4 py-3 text-sm outline-none focus:border-[#8B5E4C]"
                  />
                </div>

                <div className="xl:col-span-3">
                  <button
                    type="button"
                    onClick={props.onSubmitManualCredit}
                    disabled={props.creatingManualCredit}
                    className="rounded-2xl bg-[#8B5E4C] px-6 py-3 font-bold text-white transition-colors hover:bg-[#765041] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {props.creatingManualCredit
                      ? "יוצר יתרה..."
                      : "צור יתרה ובחר אותה"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#E6DCD5] bg-white">
            <div className="border-b border-[#E6DCD5] px-4 py-3">
              <h3 className="text-lg font-black text-[#3F312B]">
                תוצאות חיפוש
              </h3>
            </div>

            {props.searching ? (
              <div className="px-4 py-8 text-center text-sm font-bold text-[#7B5A4D]">
                מחפש יתרות...
              </div>
            ) : props.credits.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-bold text-[#7B5A4D]">
                לא נמצאו יתרות להצגה
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-right text-sm">
                  <thead>
                    <tr className="border-b border-[#E6DCD5] bg-[#FCFAF8] text-xs font-black text-[#6D4C41]">
                      <th className="px-4 py-3">בחירה</th>
                      <th className="px-4 py-3">שם</th>
                      <th className="px-4 py-3">חווה</th>
                      <th className="px-4 py-3">אסמכתא</th>
                      <th className="px-4 py-3">מקור</th>
                      <th className="px-4 py-3">סכום מקורי</th>
                      <th className="px-4 py-3">נוצל</th>
                      <th className="px-4 py-3">יתרה</th>
                      <th className="px-4 py-3">סטטוס</th>
                      <th className="px-4 py-3">שיוכים</th>
                    </tr>
                  </thead>

                  <tbody>
                    {props.credits.map(function (credit) {
                      var creditId = getCreditId(credit);

                      var availableAmount = getValue(
                        credit,
                        "availableAmount",
                        "AvailableAmount",
                        0,
                      );

                      var usedAmount = getValue(
                        credit,
                        "usedAmount",
                        "UsedAmount",
                        0,
                      );

                      return (
                        <tr
                          key={creditId}
                          className={
                            "border-b border-[#EFE7E1] last:border-b-0 " +
                            (selectedCreditId === creditId
                              ? "bg-[#FCF8F5]"
                              : "")
                          }
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={function () {
                                props.onSelectCredit(credit);
                              }}
                              disabled={availableAmount <= 0}
                              className="rounded-xl border border-[#D8CBC3] bg-white px-3 py-2 text-xs font-black text-[#6D4C41] hover:bg-[#F8F3EF] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {selectedCreditId === creditId ? "נבחר" : "בחר"}
                            </button>
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {getValue(
                              credit,
                              "externalName",
                              "ExternalName",
                              "-",
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {getValue(
                              credit,
                              "externalClubName",
                              "ExternalClubName",
                              "-",
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {getValue(
                              credit,
                              "externalReference",
                              "ExternalReference",
                              "-",
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {getValue(credit, "sourceType", "SourceType", "-")}
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {formatMoney(
                              getValue(
                                credit,
                                "originalAmount",
                                "OriginalAmount",
                                0,
                              ),
                            )}
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {formatMoney(usedAmount)}
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {formatMoney(availableAmount)}
                          </td>

                          <td className="px-4 py-3 font-black">
                            {getValue(
                              credit,
                              "usageStatusLabel",
                              "UsageStatusLabel",
                              getValue(
                                credit,
                                "creditStatus",
                                "CreditStatus",
                                "",
                              ),
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {Number(usedAmount) > 0 ? (
                              <button
                                type="button"
                                onClick={function () {
                                  props.onViewAllocations(credit);
                                }}
                                className="rounded-xl border border-[#D8CBC3] bg-white px-3 py-2 text-xs font-black text-[#6D4C41] hover:bg-[#F8F3EF]"
                              >
                                צפה
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-[#B09C93]">
                                אין
                              </span>
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

          {props.allocationsCreditId ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#E6DCD5] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#E6DCD5] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#3F312B]">
                    שיוכים קיימים ליתרה
                  </h3>

                  <p className="mt-1 text-sm font-bold text-[#8A7268]">
                    פירוט השימושים שכבר בוצעו מתוך הקבלה / היתרה שנבחרה.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={props.onClearAllocations}
                  className="rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2 text-sm font-bold text-[#6D4C41] hover:bg-[#F8F3EF]"
                >
                  סגור פירוט
                </button>
              </div>

              {props.creditAllocationsError ? (
                <div className="px-4 py-4 text-sm font-bold text-red-700">
                  {props.creditAllocationsError}
                </div>
              ) : props.creditAllocationsLoading ? (
                <div className="px-4 py-8 text-center text-sm font-bold text-[#7B5A4D]">
                  טוען שיוכים...
                </div>
              ) : selectedCreditAllocations.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-bold text-[#7B5A4D]">
                  לא נמצאו שיוכים ליתרה זו
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-right text-sm">
                    <thead>
                      <tr className="border-b border-[#E6DCD5] bg-[#FCFAF8] text-xs font-black text-[#6D4C41]">
                        <th className="px-4 py-3">משלם</th>
                        <th className="px-4 py-3">רוכב</th>
                        <th className="px-4 py-3">סוס</th>
                        <th className="px-4 py-3">מקצה</th>
                        <th className="px-4 py-3">סכום ששויך</th>
                        <th className="px-4 py-3">סטטוס חיוב</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedCreditAllocations.map(function (allocation) {
                        var allocationId = getValue(
                          allocation,
                          "federationCreditAllocationId",
                          "FederationCreditAllocationId",
                          0,
                        );

                        var payerName = getValue(
                          allocation,
                          "payerFullName",
                          "PayerFullName",
                          "-",
                        );

                        var riderName = getValue(
                          allocation,
                          "riderFullName",
                          "RiderFullName",
                          "-",
                        );

                        var horseName = getValue(
                          allocation,
                          "horseName",
                          "HorseName",
                          "-",
                        );

                        var className = getValue(
                          allocation,
                          "className",
                          "ClassName",
                          "-",
                        );

                        var allocatedAmount = getValue(
                          allocation,
                          "allocatedAmount",
                          "AllocatedAmount",
                          0,
                        );

                        var billChargeStatus = getValue(
                          allocation,
                          "billChargeStatus",
                          "BillChargeStatus",
                          "-",
                        );

                        return (
                          <tr
                            key={allocationId}
                            className="border-b border-[#EFE7E1] last:border-b-0"
                          >
                            <td className="px-4 py-3 font-bold">{payerName}</td>
                            <td className="px-4 py-3">{riderName}</td>
                            <td className="px-4 py-3">{horseName}</td>
                            <td className="px-4 py-3">{className}</td>
                            <td className="px-4 py-3 font-black">
                              {formatMoney(allocatedAmount)}
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {billChargeStatus}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 border-t border-[#E6DCD5] pt-5 xl:flex-row xl:items-center xl:justify-between">
            <p className="text-sm font-bold text-[#8A7268]">
              המערכת תשייך את היתרה לשורות שנבחרו לפי סדר הבחירה, עד שהכיסוי
              ייגמר או שכל החיובים יכוסו.
            </p>

            <button
              type="button"
              onClick={props.onSubmit}
              disabled={
                props.loading ||
                !props.selectedCredit ||
                props.selectedChargesCount === 0 ||
                props.selectedMissingAmount <= 0
              }
              className="rounded-2xl bg-[#8B5E4C] px-6 py-3 font-bold text-white transition-colors hover:bg-[#765041] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {props.loading ? "משייך..." : "שייך כיסוי לשורות שנבחרו"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
