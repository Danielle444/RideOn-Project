import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, Shield, X } from "lucide-react";

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

var DEFAULT_DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1];

function buildDefaultLines() {
  return DEFAULT_DENOMINATIONS.map(function (value) {
    return {
      denominationValue: value,
      quantity: "",
    };
  });
}

export default function CashDeskModal(props) {
  var [countLines, setCountLines] = useState(buildDefaultLines());
  var [countNotes, setCountNotes] = useState("");
  var [safeTransferAmount, setSafeTransferAmount] = useState("");
  var [safeTransferNotes, setSafeTransferNotes] = useState("");
  var [localError, setLocalError] = useState("");

  useEffect(
    function () {
      if (!props.open) {
        return;
      }

      setCountLines(buildDefaultLines());
      setCountNotes("");
      setSafeTransferAmount("");
      setSafeTransferNotes("");
      setLocalError("");
    },
    [props.open],
  );

  var countedTotal = useMemo(
    function () {
      return countLines.reduce(function (sum, line) {
        return (
          sum + Number(line.denominationValue || 0) * Number(line.quantity || 0)
        );
      }, 0);
    },
    [countLines],
  );

  if (!props.open) {
    return null;
  }

  var overview = props.overview || {};
  var currentCashInDeskAmount = Number(
    getValue(overview, "currentCashInDeskAmount", "CurrentCashInDeskAmount", 0),
  );

  var difference = countedTotal - currentCashInDeskAmount;

  function updateLineQuantity(index, value) {
    setCountLines(function (previous) {
      return previous.map(function (line, lineIndex) {
        if (lineIndex !== index) {
          return line;
        }

        return {
          ...line,
          quantity: value,
        };
      });
    });
  }

  function submitCount() {
    setLocalError("");

    var lines = countLines.map(function (line) {
      return {
        denominationValue: Number(line.denominationValue),
        quantity: Number(line.quantity || 0),
      };
    });

    props.onSaveCount({
      lines: lines,
      notes: countNotes,
    });
  }

  function submitSafeTransfer() {
    setLocalError("");

    var amount = Number(safeTransferAmount || 0);

    if (amount <= 0) {
      setLocalError("צריך להזין סכום גדול מ־0 להעברה לכספת.");
      return;
    }

    if (amount > currentCashInDeskAmount) {
      setLocalError("אי אפשר להעביר לכספת יותר מהמזומן שאמור להיות בקופה.");
      return;
    }

    props.onSaveSafeTransfer({
      amount: amount,
      notes: safeTransferNotes,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <div>
            <h2 className="text-2xl font-black text-[#3F312B]">קופה</h2>

            <p className="mt-1 text-sm text-[#8A7268]">
              מזומן צפוי, ספירת קופה והעברה לכספת
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            disabled={props.saving}
            className="rounded-full p-2 text-[#6D4C41] transition-colors hover:bg-[#F5EDE8] disabled:opacity-50"
          >
            <X size={21} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-95px)] overflow-y-auto p-6">
          {props.loading ? (
            <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] px-6 py-12 text-center text-[#7B5A4D]">
              טוען נתוני קופה...
            </div>
          ) : (
            <div className="space-y-6">
              {props.error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {props.error}
                </div>
              ) : null}

              {localError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {localError}
                </div>
              ) : null}

              {props.success ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                  {props.success}
                </div>
              ) : null}

              {getValue(
                overview,
                "isCountRequired",
                "IsCountRequired",
                false,
              ) ? (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
                  נדרשת ספירת קופה עדכנית.
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-[#E6DCD5] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-[#8A7268]">
                    מזומן צפוי במערכת
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#3F312B]">
                    {formatMoney(
                      getValue(
                        overview,
                        "expectedCashAmount",
                        "ExpectedCashAmount",
                        0,
                      ),
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E6DCD5] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-[#8A7268]">
                    הועבר לכספת
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#7B5A4D]">
                    {formatMoney(
                      getValue(
                        overview,
                        "transferredToSafeAmount",
                        "TransferredToSafeAmount",
                        0,
                      ),
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E6DCD5] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-[#8A7268]">
                    אמור להיות בקופה
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#2E7D32]">
                    {formatMoney(currentCashInDeskAmount)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E6DCD5] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-[#8A7268]">
                    ספירה אחרונה
                  </p>
                  <p className="mt-2 text-lg font-black text-[#3F312B]">
                    {formatMoney(
                      getValue(
                        overview,
                        "lastCountedAmount",
                        "LastCountedAmount",
                        0,
                      ),
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[#8A7268]">
                    {formatDateTime(
                      getValue(
                        overview,
                        "lastCountedAt",
                        "LastCountedAt",
                        null,
                      ),
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
                <section className="rounded-3xl border border-[#E6DCD5] bg-[#FCFAF8] p-5">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-[#3F312B]">
                        ספירת קופה
                      </h3>

                      <p className="mt-1 text-sm text-[#8A7268]">
                        הזיני כמות לכל שטר/מטבע. הסכום והפער יחושבו אוטומטית.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={function () {
                        setCountLines(buildDefaultLines());
                      }}
                      className="flex items-center gap-2 rounded-xl border border-[#D8CBC3] bg-white px-3 py-2 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#F8F3EF]"
                    >
                      <RefreshCw size={15} />
                      איפוס
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#E3D7D0] bg-white">
                    <table className="w-full border-collapse text-right">
                      <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
                        <tr>
                          <th className="px-4 py-3">ערך</th>
                          <th className="px-4 py-3">כמות</th>
                          <th className="px-4 py-3">סכום</th>
                        </tr>
                      </thead>

                      <tbody>
                        {countLines.map(function (line, index) {
                          var lineAmount =
                            Number(line.denominationValue || 0) *
                            Number(line.quantity || 0);

                          return (
                            <tr
                              key={line.denominationValue}
                              className="border-t border-[#EFE5DF] text-sm"
                            >
                              <td className="px-4 py-3 font-black text-[#3F312B]">
                                {formatMoney(line.denominationValue)}
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={line.quantity}
                                  onChange={function (event) {
                                    updateLineQuantity(
                                      index,
                                      event.target.value,
                                    );
                                  }}
                                  className="h-10 w-28 rounded-xl border border-[#E3D7D0] bg-white px-3 text-center outline-none focus:border-[#8B5E4C]"
                                />
                              </td>

                              <td className="px-4 py-3 font-bold text-[#7B5A4D]">
                                {formatMoney(lineAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-bold text-[#8A7268]">נספר</p>
                      <p className="mt-1 text-xl font-black text-[#3F312B]">
                        {formatMoney(countedTotal)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-bold text-[#8A7268]">
                        אמור להיות
                      </p>
                      <p className="mt-1 text-xl font-black text-[#3F312B]">
                        {formatMoney(currentCashInDeskAmount)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-bold text-[#8A7268]">פער</p>
                      <p
                        className={
                          "mt-1 text-xl font-black " +
                          (difference === 0
                            ? "text-[#2E7D32]"
                            : "text-[#C62828]")
                        }
                      >
                        {formatMoney(difference)}
                      </p>
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-sm font-bold text-[#5D4037]">
                      הערות לספירה
                    </span>

                    <input
                      type="text"
                      value={countNotes}
                      onChange={function (event) {
                        setCountNotes(event.target.value);
                      }}
                      className="mt-2 h-11 w-full rounded-2xl border border-[#E3D7D0] bg-white px-4 text-right outline-none focus:border-[#8B5E4C]"
                      placeholder="לא חובה"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={submitCount}
                    disabled={props.saving}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8B5E4C] px-5 py-3 font-bold text-white transition-colors hover:bg-[#765041] disabled:opacity-50"
                  >
                    <Save size={18} />
                    {props.saving ? "שומר..." : "שמירת ספירת קופה"}
                  </button>
                </section>

                <section className="rounded-3xl border border-[#E6DCD5] bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <h3 className="text-xl font-black text-[#3F312B]">
                      העברה לכספת
                    </h3>

                    <p className="mt-1 text-sm text-[#8A7268]">
                      אחרי העברה לכספת, המזומן שאמור להישאר בקופה יתעדכן.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FCFAF8] p-4">
                    <p className="text-xs font-bold text-[#8A7268]">
                      אפשר להעביר עד
                    </p>

                    <p className="mt-2 text-3xl font-black text-[#3F312B]">
                      {formatMoney(currentCashInDeskAmount)}
                    </p>
                  </div>

                  <label className="mt-5 block">
                    <span className="text-sm font-bold text-[#5D4037]">
                      סכום להעברה
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={safeTransferAmount}
                      onChange={function (event) {
                        setSafeTransferAmount(event.target.value);
                      }}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#E3D7D0] bg-[#FCFAF8] px-4 text-right outline-none focus:border-[#8B5E4C]"
                      placeholder="הזיני סכום"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-bold text-[#5D4037]">
                      הערות להעברה
                    </span>

                    <input
                      type="text"
                      value={safeTransferNotes}
                      onChange={function (event) {
                        setSafeTransferNotes(event.target.value);
                      }}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#E3D7D0] bg-[#FCFAF8] px-4 text-right outline-none focus:border-[#8B5E4C]"
                      placeholder="לא חובה"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={submitSafeTransfer}
                    disabled={props.saving || currentCashInDeskAmount <= 0}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8B5E4C] px-5 py-3 font-bold text-white transition-colors hover:bg-[#765041] disabled:opacity-50"
                  >
                    <Shield size={18} />
                    {props.saving ? "שומר..." : "שמירת העברה לכספת"}
                  </button>

                  <div className="mt-5 rounded-2xl border border-[#EFE5DF] bg-[#FCFAF8] p-4 text-sm text-[#7B5A4D]">
                    לאחר העברה לכספת, המערכת תסמן שנדרשת ספירת קופה עדכנית.
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
