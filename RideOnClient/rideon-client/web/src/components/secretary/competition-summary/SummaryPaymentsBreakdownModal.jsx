import { ArrowRight, CreditCard, ReceiptText, X } from "lucide-react";

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

function getModalTitle(modal) {
  if (!modal) {
    return "פילוח תשלומים";
  }

  if (modal.mode === "breakdown") {
    return "פילוח תשלומים לפי אמצעי תשלום";
  }

  if (modal.mode === "batches") {
    if (modal.selectedPaymentMethod) {
      return (
        "חשבוניות ששולמו ב" +
        getValue(
          modal.selectedPaymentMethod,
          "paymentMethodType",
          "PaymentMethodType",
          "",
        )
      );
    }

    return "כל החשבוניות ששולמו";
  }

  if (modal.mode === "batch-details") {
    return (
      "פירוט חשבונית " +
      getValue(modal.selectedPaymentBatch, "invoiceNumber", "InvoiceNumber", "")
    );
  }

  return "פילוח תשלומים";
}

function PaymentMethodBreakdownView(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var total = items.reduce(function (sum, item) {
    return sum + Number(getValue(item, "amountPaid", "AmountPaid", 0));
  }, 0);

  if (props.loading) {
    return (
      <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] px-6 py-10 text-center text-[#7B5A4D]">
        טוען פילוח תשלומים...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D8CBC3] bg-white px-6 py-10 text-center text-sm text-[#8A7268]">
        אין תשלומים להצגה
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={props.onOpenAllBatches}
        className="flex w-full items-center justify-between rounded-2xl border border-[#8B5E4C] bg-[#FCF8F5] px-5 py-4 text-right transition-colors hover:bg-[#F6EEE8]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#7B5A4D]">
            <ReceiptText size={20} />
          </span>

          <div>
            <p className="font-black text-[#3F312B]">סה״כ כל התשלומים</p>
            <p className="mt-1 text-xs text-[#8A7268]">
              לחצי כדי לראות את כל החשבוניות
            </p>
          </div>
        </div>

        <p className="text-xl font-black text-[#2E7D32]">
          {formatMoney(total)}
        </p>
      </button>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map(function (item) {
          return (
            <button
              key={getValue(item, "paymentMethodId", "PaymentMethodId", 0)}
              type="button"
              onClick={function () {
                props.onOpenMethodBatches(item);
              }}
              className="rounded-2xl border border-[#E6DCD5] bg-white p-5 text-right shadow-sm transition-colors hover:bg-[#FCF8F5]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1ECE8] text-[#7B5A4D]">
                    <CreditCard size={19} />
                  </span>

                  <div>
                    <p className="font-black text-[#3F312B]">
                      {getValue(
                        item,
                        "paymentMethodType",
                        "PaymentMethodType",
                        "-",
                      )}
                    </p>

                    <p className="mt-1 text-xs text-[#8A7268]">
                      {getValue(
                        item,
                        "paymentBatchCount",
                        "PaymentBatchCount",
                        0,
                      )}{" "}
                      חשבוניות
                    </p>
                  </div>
                </div>

                <p className="text-lg font-black text-[#2E7D32]">
                  {formatMoney(getValue(item, "amountPaid", "AmountPaid", 0))}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentBatchesView(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  if (props.loading) {
    return (
      <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] px-6 py-10 text-center text-[#7B5A4D]">
        טוען חשבוניות...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E3D7D0]">
      <table className="w-full min-w-[950px] border-collapse text-right">
        <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
          <tr>
            <th className="px-4 py-3">חשבונית</th>
            <th className="px-4 py-3">משלם</th>
            <th className="px-4 py-3">תאריך</th>
            <th className="px-4 py-3">אמצעים</th>
            <th className="px-4 py-3">סכום חשבונית</th>
            <th className="px-4 py-3">סכום בשיטה שנבחרה</th>
            <th className="px-4 py-3">הוזן על ידי</th>
          </tr>
        </thead>

        <tbody>
          {items.map(function (item) {
            return (
              <tr
                key={getValue(item, "paymentBatchId", "PaymentBatchId", 0)}
                onClick={function () {
                  props.onOpenBatchDetails(item);
                }}
                className="cursor-pointer border-t border-[#EFE5DF] text-sm text-[#3F312B] transition-colors hover:bg-[#FCF8F5]"
              >
                <td className="px-4 py-4 font-black">
                  {getValue(item, "invoiceNumber", "InvoiceNumber", "-")}
                </td>

                <td className="px-4 py-4">
                  {getValue(item, "payerName", "PayerName", "-")}
                </td>

                <td className="px-4 py-4">
                  {formatDateTime(
                    getValue(item, "createdAt", "CreatedAt", null),
                  )}
                </td>

                <td className="px-4 py-4">
                  {getValue(
                    item,
                    "paymentMethodsText",
                    "PaymentMethodsText",
                    "-",
                  )}
                </td>

                <td className="px-4 py-4 font-black text-[#3F312B]">
                  {formatMoney(
                    getValue(item, "batchTotalAmount", "BatchTotalAmount", 0),
                  )}
                </td>

                <td className="px-4 py-4 font-black text-[#2E7D32]">
                  {formatMoney(
                    getValue(
                      item,
                      "selectedMethodAmount",
                      "SelectedMethodAmount",
                      0,
                    ),
                  )}
                </td>

                <td className="px-4 py-4">
                  {getValue(item, "enteredByName", "EnteredByName", "-") || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BatchDetailsView(props) {
  var methods = Array.isArray(props.methods) ? props.methods : [];
  var charges = Array.isArray(props.charges) ? props.charges : [];
  var batch = props.batch || {};

  if (props.loading) {
    return (
      <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] px-6 py-10 text-center text-[#7B5A4D]">
        טוען פירוט חשבונית...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E6DCD5] bg-white p-4">
          <p className="text-xs font-bold text-[#8A7268]">חשבונית</p>
          <p className="mt-1 text-lg font-black text-[#3F312B]">
            {getValue(batch, "invoiceNumber", "InvoiceNumber", "-")}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6DCD5] bg-white p-4">
          <p className="text-xs font-bold text-[#8A7268]">משלם</p>
          <p className="mt-1 text-lg font-black text-[#3F312B]">
            {getValue(batch, "payerName", "PayerName", "-")}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6DCD5] bg-white p-4">
          <p className="text-xs font-bold text-[#8A7268]">סה״כ</p>
          <p className="mt-1 text-lg font-black text-[#2E7D32]">
            {formatMoney(
              getValue(batch, "batchTotalAmount", "BatchTotalAmount", 0),
            )}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-black text-[#3F312B]">אמצעי תשלום</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {methods.map(function (method) {
            return (
              <div
                key={getValue(method, "paymentId", "PaymentId", 0)}
                className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-4"
              >
                <p className="text-sm font-black text-[#3F312B]">
                  {getValue(
                    method,
                    "paymentMethodType",
                    "PaymentMethodType",
                    "-",
                  )}
                </p>

                <p className="mt-2 text-xl font-black text-[#2E7D32]">
                  {formatMoney(getValue(method, "amountPaid", "AmountPaid", 0))}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-black text-[#3F312B]">
          פריטים ששולמו בחשבונית
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-[#E3D7D0]">
          <table className="w-full min-w-[850px] border-collapse text-right">
            <thead className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]">
              <tr>
                <th className="px-4 py-3">קטגוריה</th>
                <th className="px-4 py-3">שם</th>
                <th className="px-4 py-3">פרטים</th>
                <th className="px-4 py-3">סכום</th>
              </tr>
            </thead>

            <tbody>
              {charges.map(function (charge) {
                return (
                  <tr
                    key={getValue(charge, "billChargeId", "BillChargeId", 0)}
                    className="border-t border-[#EFE5DF] text-sm text-[#3F312B]"
                  >
                    <td className="px-4 py-4">
                      {getValue(charge, "categoryKey", "CategoryKey", "-")}
                    </td>

                    <td className="px-4 py-4 font-black">
                      {getValue(charge, "mainName", "MainName", "-")}
                    </td>

                    <td className="px-4 py-4">
                      {getValue(
                        charge,
                        "productDetailsText",
                        "ProductDetailsText",
                        "-",
                      ) || "-"}
                    </td>

                    <td className="px-4 py-4 font-black text-[#2E7D32]">
                      {formatMoney(
                        getValue(charge, "amountToPay", "AmountToPay", 0),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SummaryPaymentsBreakdownModal(props) {
  if (!props.modal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-[#3F312B]">
              {getModalTitle(props.modal)}
            </h2>

            <p className="mt-1 text-sm text-[#8A7268]">
              לחצי על שורה כדי להיכנס לפירוט נוסף
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

        <div className="max-h-[calc(92vh-120px)] overflow-y-auto p-6">
          {props.error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {props.error}
            </div>
          ) : null}

          {props.modal.mode !== "breakdown" ? (
            <button
              type="button"
              onClick={props.onBack}
              className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E2D5CE] bg-white px-4 py-2 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#FAF5F1]"
            >
              <ArrowRight size={16} />
              חזרה
            </button>
          ) : null}

          {props.modal.mode === "breakdown" ? (
            <PaymentMethodBreakdownView
              items={props.breakdownItems}
              loading={props.loading}
              onOpenAllBatches={props.onOpenAllBatches}
              onOpenMethodBatches={props.onOpenMethodBatches}
            />
          ) : null}

          {props.modal.mode === "batches" ? (
            <PaymentBatchesView
              items={props.batchItems}
              loading={props.loading}
              onOpenBatchDetails={props.onOpenBatchDetails}
            />
          ) : null}

          {props.modal.mode === "batch-details" ? (
            <BatchDetailsView
              batch={props.modal.selectedPaymentBatch}
              methods={props.batchMethods}
              charges={props.batchCharges}
              loading={props.loading}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
