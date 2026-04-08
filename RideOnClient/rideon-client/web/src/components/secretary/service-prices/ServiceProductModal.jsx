import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Field from "../../common/Field";

export default function ServiceProductModal(props) {
  const [productName, setProductName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  const isPaidTime = props.categoryId === 1;

  useEffect(
    function () {
      if (props.isOpen) {
        setProductName(props.initialItem?.productName || "");
        setDurationMinutes(
          props.initialItem?.durationMinutes
            ? String(props.initialItem.durationMinutes)
            : "",
        );
        setItemPrice(
          props.initialItem?.itemPrice !== null &&
            props.initialItem?.itemPrice !== undefined
            ? String(props.initialItem.itemPrice)
            : "",
        );
      }
    },
    [props.isOpen, props.initialItem],
  );

  if (!props.isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      productName: productName.trim(),
      durationMinutes: isPaidTime ? Number(durationMinutes) : null,
      itemPrice: Number(itemPrice),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3F312B]">
            {props.isEdit ? "עדכון מחיר מוצר" : "הוספת מוצר"}
          </h2>

          <button type="button" onClick={props.onClose} className="text-[#6A5248]">
            <X />
          </button>
        </div>

        <p className="mb-4 text-sm text-[#8A7268]">
          קטגוריה: {props.categoryName || "—"}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field label="שם מוצר" required={true}>
              <input
                type="text"
                value={productName}
                onChange={function (e) {
                  setProductName(e.target.value);
                }}
                disabled={props.isEdit}
                className={
                  props.isEdit
                    ? "h-12 w-full rounded-xl border border-[#E5D7CF] bg-[#F3ECE8] px-4 text-right text-[#6D4C41] shadow-sm cursor-not-allowed"
                    : "h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                }
                placeholder="שם מוצר"
                required
              />
            </Field>

            {isPaidTime && (
              <Field label="משך בדקות" required={true}>
                <input
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={function (e) {
                    setDurationMinutes(e.target.value);
                  }}
                  disabled={props.isEdit}
                  className={
                    props.isEdit
                      ? "h-12 w-full rounded-xl border border-[#E5D7CF] bg-[#F3ECE8] px-4 text-right text-[#6D4C41] shadow-sm cursor-not-allowed"
                      : "h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  }
                  placeholder="למשל 7 או 10"
                  required={isPaidTime}
                />
              </Field>
            )}

            <Field label={props.isEdit ? "מחיר חדש" : "מחיר פעיל"} required={true}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemPrice}
                onChange={function (e) {
                  setItemPrice(e.target.value);
                }}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                placeholder="0.00"
                required
              />
            </Field>

            {props.error && (
              <p className="text-sm text-red-500">{props.error}</p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[#D8CBC3] px-4 py-2 text-[#5C463D]"
            >
              ביטול
            </button>

            <button
              type="submit"
              className="rounded-xl bg-[#8B6352] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#7A5547]"
            >
              שמירה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}