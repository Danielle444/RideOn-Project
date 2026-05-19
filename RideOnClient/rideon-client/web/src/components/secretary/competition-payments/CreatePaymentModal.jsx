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
      return previous.concat([
        {
          id: Date.now(),
          paymentMethodId: getValue(
            firstMethod,
            "paymentMethodId",
            "PaymentMethodId",
            0,
          ),
          amount: 0,
        },
      ]);
    });
  }

  function removeMethodRow(rowId) {
    setMethodRows(function (previous) {
      return previous.filter(function (row) {
        return row.id !== rowId;
      });
    });
  }

  function updateMethodRow(rowId, field, value) {
    setMethodRows(function (previous) {
      return previous.map(function (row) {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          [field]: value,
        };
      });
    });
  }

  function handleSubmit() {
    props.onSubmit({
      invoiceNumber: invoiceNumber,
      notes: notes,
      paymentMethods: methodRows,
    });
  }

  var canSubmit =
    invoiceNumber.trim().length > 0 &&
    methodRows.length > 0 &&
    Math.round(methodsTotal * 100) ===
      Math.round(Number(props.selectedTotal || 0) * 100) &&
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
              <h3 className="text-lg font-black text-[#3F312B]">אמצעי תשלום</h3>

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
              {methodRows.map(function (row) {
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

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      onChange={function (event) {
                        updateMethodRow(row.id, "amount", event.target.value);
                      }}
                      className="h-11 rounded-xl border border-[#E3D7D0] bg-white px-3 text-right outline-none"
                    />

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
                    (Math.round(difference * 100) === 0
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
                return (
                  <div
                    key={getValue(charge, "billChargeId", "BillChargeId", 0)}
                    className="flex items-center justify-between rounded-xl bg-[#FCFAF8] px-4 py-3 text-sm"
                  >
                    <span className="font-bold text-[#3F312B]">
                      {getValue(charge, "mainName", "MainName", "-")}
                    </span>

                    <span className="font-black text-[#7B5A4D]">
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
