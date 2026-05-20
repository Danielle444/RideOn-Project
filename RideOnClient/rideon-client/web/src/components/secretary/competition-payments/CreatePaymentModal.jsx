import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

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

function formatDate(value) {
  if (!value) {
    return "-";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("he-IL");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getDaysCount(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }

  var start = new Date(startDate);
  var end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  var diff = end.getTime() - start.getTime();
  var days = Math.round(diff / (1000 * 60 * 60 * 24)) + 1;

  if (days <= 0) {
    return null;
  }

  return days;
}

function getHorseDisplay(charge) {
  var horseName = getValue(charge, "horseName", "HorseName", "");
  var barnName = getValue(charge, "barnName", "BarnName", "");

  if (!horseName && !barnName) {
    return "-";
  }

  if (barnName && horseName && barnName !== horseName) {
    return horseName + " (" + barnName + ")";
  }

  return barnName || horseName;
}

function getSelectedChargeTitle(charge) {
  var categoryKey = getValue(charge, "categoryKey", "CategoryKey", "");
  var mainName = getValue(charge, "mainName", "MainName", "-");
  var displayDate = getValue(charge, "displayDate", "DisplayDate", null);

  if (categoryKey === "shavings") {
    var bagQuantity = getValue(charge, "bagQuantity", "BagQuantity", "-");
    var horse = getHorseDisplay(charge);
    var deliveryTime = getValue(
      charge,
      "requestedDeliveryTime",
      "RequestedDeliveryTime",
      null,
    );

    var text =
      mainName +
      " · " +
      bagQuantity +
      " שקים" +
      " · לסוס " +
      horse +
      " · הוזמן " +
      formatDate(displayDate);

    if (deliveryTime) {
      text += " · אספקה " + formatDateTime(deliveryTime);
    }

    return text;
  }

  if (categoryKey === "stalls") {
    var stallTypeName = getValue(
      charge,
      "stallTypeName",
      "StallTypeName",
      mainName,
    );

    var startDate = getValue(charge, "startDate", "StartDate", null);
    var endDate = getValue(charge, "endDate", "EndDate", null);
    var daysCount = getDaysCount(startDate, endDate);
    var horseName = getHorseDisplay(charge);

    var stallText = stallTypeName || mainName || "תא";

    if (daysCount) {
      stallText += " ל־" + daysCount + " ימים";
    }

    if (horseName && horseName !== "-") {
      stallText += " לסוס " + horseName;
    }

    if (startDate || endDate) {
      stallText += " · " + formatDate(startDate) + " - " + formatDate(endDate);
    }

    return stallText;
  }

  if (categoryKey === "classes") {
    var riderName = getValue(charge, "riderName", "RiderName", "-");
    var classHorse = getHorseDisplay(charge);

    return (
      mainName +
      " · " +
      formatDate(displayDate) +
      " · רוכב/ת " +
      riderName +
      " · סוס " +
      classHorse
    );
  }

  if (categoryKey === "paid-time") {
    var paidTimeRider = getValue(charge, "riderName", "RiderName", "-");
    var paidTimeHorse = getHorseDisplay(charge);

    return (
      mainName +
      " · " +
      formatDate(displayDate) +
      " · רוכב/ת " +
      paidTimeRider +
      " · סוס " +
      paidTimeHorse
    );
  }

  return mainName;
}

function normalizePaymentRows(rows, selectedTotal, changedRowId) {
  var total = Number(selectedTotal || 0);

  if (!rows || rows.length === 0) {
    return [];
  }

  if (rows.length === 1) {
    return rows.map(function (row) {
      return {
        ...row,
        amount: total,
      };
    });
  }

  var lastIndex = rows.length - 1;
  var previousRowsTotal = 0;

  rows.forEach(function (row, index) {
    if (index < lastIndex) {
      previousRowsTotal += Number(row.amount || 0);
    }
  });

  var remaining = total - previousRowsTotal;

  if (remaining < 0) {
    remaining = 0;
  }

  return rows.map(function (row, index) {
    if (index === lastIndex) {
      return {
        ...row,
        amount: Number(remaining.toFixed(2)),
        isAutoBalance: true,
      };
    }

    if (row.id === changedRowId) {
      return {
        ...row,
        isAutoBalance: false,
      };
    }

    return {
      ...row,
      isAutoBalance: false,
    };
  });
}

export default function CreatePaymentModal(props) {
  var [invoiceNumber, setInvoiceNumber] = useState("");
  var [notes, setNotes] = useState("");
  var [methodRows, setMethodRows] = useState([]);

  useEffect(
    function () {
      if (!props.open) {
        return;
      }

      var firstMethod =
        props.paymentMethods && props.paymentMethods.length > 0
          ? props.paymentMethods[0]
          : null;

      setInvoiceNumber("");
      setNotes("");

      if (firstMethod) {
        setMethodRows([
          {
            id: Date.now(),
            paymentMethodId: getValue(
              firstMethod,
              "paymentMethodId",
              "PaymentMethodId",
              0,
            ),
            amount: Number(props.selectedTotal || 0),
            isAutoBalance: true,
          },
        ]);
      } else {
        setMethodRows([]);
      }
    },
    [props.open, props.selectedTotal, props.paymentMethods],
  );

  var methodsTotal = useMemo(
    function () {
      return methodRows.reduce(function (sum, row) {
        return sum + Number(row.amount || 0);
      }, 0);
    },
    [methodRows],
  );

  var difference = Number(props.selectedTotal || 0) - methodsTotal;

  if (!props.open) {
    return null;
  }

  function addMethodRow() {
    var firstMethod =
      props.paymentMethods && props.paymentMethods.length > 0
        ? props.paymentMethods[0]
        : null;

    if (!firstMethod) {
      return;
    }

    setMethodRows(function (previous) {
      var next = previous.concat([
        {
          id: Date.now(),
          paymentMethodId: getValue(
            firstMethod,
            "paymentMethodId",
            "PaymentMethodId",
            0,
          ),
          amount: 0,
          isAutoBalance: true,
        },
      ]);

      return normalizePaymentRows(next, props.selectedTotal, null);
    });
  }

  function removeMethodRow(rowId) {
    setMethodRows(function (previous) {
      var next = previous.filter(function (row) {
        return row.id !== rowId;
      });

      return normalizePaymentRows(next, props.selectedTotal, null);
    });
  }

  function updateMethodRow(rowId, field, value) {
    setMethodRows(function (previous) {
      var next = previous.map(function (row) {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          [field]: value,
        };
      });

      if (field === "amount") {
        return normalizePaymentRows(next, props.selectedTotal, rowId);
      }

      return next;
    });
  }

  function handleSubmit() {
    props.onSubmit({
      invoiceNumber: invoiceNumber,
      notes: notes,
      paymentMethods: methodRows,
    });
  }

  var roundedMethodsTotal = Math.round(methodsTotal * 100);
  var roundedSelectedTotal = Math.round(Number(props.selectedTotal || 0) * 100);
  var roundedDifference = Math.round(difference * 100);

  var hasOverPayment = methodsTotal > Number(props.selectedTotal || 0);
  var hasInvalidAmount = methodRows.some(function (row) {
    return Number(row.amount || 0) <= 0;
  });

  var canSubmit =
    invoiceNumber.trim().length > 0 &&
    methodRows.length > 0 &&
    roundedMethodsTotal === roundedSelectedTotal &&
    !hasOverPayment &&
    !hasInvalidAmount &&
    !props.loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-[#3F312B]">הוספת תשלום</h2>

            <p className="mt-1 text-sm text-[#8A7268]">
              סכום לתשלום: {formatMoney(props.selectedTotal)}
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#6D4C41] transition-colors hover:bg-[#F5EDE8]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-105px)] overflow-y-auto p-6">
          {props.error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {props.error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#5D4037]">
                מספר חשבונית
              </span>

              <input
                type="text"
                value={invoiceNumber}
                onChange={function (event) {
                  setInvoiceNumber(event.target.value);
                }}
                className="mt-2 h-12 w-full rounded-2xl border border-[#E3D7D0] bg-[#FCFAF8] px-4 text-right outline-none focus:border-[#8B5E4C]"
                placeholder="לדוגמה: INV-1001"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#5D4037]">הערות</span>

              <input
                type="text"
                value={notes}
                onChange={function (event) {
                  setNotes(event.target.value);
                }}
                className="mt-2 h-12 w-full rounded-2xl border border-[#E3D7D0] bg-[#FCFAF8] px-4 text-right outline-none focus:border-[#8B5E4C]"
                placeholder="לא חובה"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#3F312B]">
                  אמצעי תשלום
                </h3>

                <p className="mt-1 text-xs text-[#8A7268]">
                  השורה האחרונה משלימה אוטומטית את ההפרש לסכום הכולל.
                </p>
              </div>

              <button
                type="button"
                onClick={addMethodRow}
                className="flex items-center gap-2 rounded-xl border border-[#D8CBC3] bg-white px-3 py-2 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#F8F3EF]"
              >
                <Plus size={16} />
                הוספת אמצעי
              </button>
            </div>

            <div className="space-y-3">
              {methodRows.map(function (row, index) {
                var isLastRow = index === methodRows.length - 1;
                var amountReadOnly = methodRows.length > 1 && isLastRow;

                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <select
                      value={row.paymentMethodId}
                      onChange={function (event) {
                        updateMethodRow(
                          row.id,
                          "paymentMethodId",
                          Number(event.target.value),
                        );
                      }}
                      className="h-11 rounded-xl border border-[#E3D7D0] bg-white px-3 text-right outline-none"
                    >
                      {(props.paymentMethods || []).map(function (method) {
                        return (
                          <option
                            key={getValue(
                              method,
                              "paymentMethodId",
                              "PaymentMethodId",
                              0,
                            )}
                            value={getValue(
                              method,
                              "paymentMethodId",
                              "PaymentMethodId",
                              0,
                            )}
                          >
                            {getValue(
                              method,
                              "paymentMethodType",
                              "PaymentMethodType",
                              "-",
                            )}
                          </option>
                        );
                      })}
                    </select>

                    <div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amount}
                        readOnly={amountReadOnly}
                        onChange={function (event) {
                          updateMethodRow(row.id, "amount", event.target.value);
                        }}
                        className={
                          "h-11 w-full rounded-xl border border-[#E3D7D0] px-3 text-right outline-none " +
                          (amountReadOnly
                            ? "bg-[#F5EFEA] text-[#7A655C]"
                            : "bg-white")
                        }
                      />

                      {amountReadOnly ? (
                        <p className="mt-1 text-xs font-bold text-[#8A7268]">
                          השלמה אוטומטית
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={function () {
                        removeMethodRow(row.id);
                      }}
                      disabled={methodRows.length === 1}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 disabled:opacity-30"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            {hasOverPayment ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                סכום אמצעי התשלום גבוה מהסכום שנבחר לתשלום.
              </div>
            ) : null}

            {hasInvalidAmount ? (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
                כל אמצעי תשלום חייב להיות עם סכום גדול מ־0.
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-[#8A7268]">נבחר לתשלום</p>
                <p className="mt-1 text-xl font-black text-[#3F312B]">
                  {formatMoney(props.selectedTotal)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-[#8A7268]">
                  סה״כ אמצעי תשלום
                </p>
                <p className="mt-1 text-xl font-black text-[#3F312B]">
                  {formatMoney(methodsTotal)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-[#8A7268]">הפרש</p>
                <p
                  className={
                    "mt-1 text-xl font-black " +
                    (roundedDifference === 0
                      ? "text-[#2E7D32]"
                      : "text-[#C62828]")
                  }
                >
                  {formatMoney(difference)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E6DCD5] bg-white p-5">
            <h3 className="mb-3 text-lg font-black text-[#3F312B]">
              שורות שנבחרו
            </h3>

            <div className="space-y-2">
              {(props.selectedCharges || []).map(function (charge) {
                var rowKey = getValue(
                  charge,
                  "displayRowKey",
                  "DisplayRowKey",
                  getValue(charge, "billChargeId", "BillChargeId", 0),
                );

                return (
                  <div
                    key={rowKey}
                    className="flex flex-col gap-2 rounded-xl bg-[#FCFAF8] px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
                  >
                    <span className="font-bold text-[#3F312B]">
                      {getSelectedChargeTitle(charge)}
                    </span>

                    <span className="shrink-0 font-black text-[#7B5A4D]">
                      {formatMoney(
                        getValue(charge, "amountToPay", "AmountToPay", 0),
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              disabled={props.loading}
              className="rounded-2xl border border-[#D8CBC3] bg-white px-6 py-3 font-bold text-[#6D4C41] transition-colors hover:bg-[#F8F3EF]"
            >
              ביטול
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-2xl bg-[#8B5E4C] px-7 py-3 font-bold text-white transition-colors hover:bg-[#765041] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.loading ? "שומר..." : "אישור תשלום"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}