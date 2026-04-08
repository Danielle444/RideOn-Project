import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Field from "../../common/Field";
import CustomDropdown from "../../common/CustomDropdown";

export default function StallCompoundModal(props) {
  const [compoundName, setCompoundName] = useState("");
  const [stallTypeProductId, setStallTypeProductId] = useState("");
  const [numberingPattern, setNumberingPattern] = useState("");
  const [openDropdownKey, setOpenDropdownKey] = useState("");

  useEffect(
    function () {
      if (props.isOpen) {
        setCompoundName(props.initialItem?.compoundName || "");
        setStallTypeProductId(
          props.initialItem?.stallTypeProductId
            ? String(props.initialItem.stallTypeProductId)
            : "",
        );
        setNumberingPattern("");
        setOpenDropdownKey("");
      }
    },
    [props.isOpen, props.initialItem],
  );

  if (!props.isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      compoundName: compoundName.trim(),
      stallTypeProductId: stallTypeProductId === "" ? null : Number(stallTypeProductId),
      numberingPattern: numberingPattern.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3F312B]">
            {props.isEdit ? "עריכת מתחם" : "הוספת מתחם"}
          </h2>

          <button type="button" onClick={props.onClose} className="text-[#6A5248]">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field label="שם מתחם" required={true}>
              <input
                type="text"
                value={compoundName}
                onChange={function (e) {
                  setCompoundName(e.target.value);
                }}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                placeholder="שם מתחם"
                required
              />
            </Field>

            <Field label="סוג תאים" required={true}>
              <CustomDropdown
                options={props.stallTypeOptions}
                value={stallTypeProductId}
                onChange={function (e) {
                  setStallTypeProductId(e.target.value);
                }}
                placeholder="בחרי סוג תאים"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                dropdownKey="stall-type"
                disabled={props.isEdit}
                getOptionValue={function (option) {
                  return option.productId;
                }}
                getOptionLabel={function (option) {
                  return option.productName;
                }}
              />
            </Field>

            {!props.isEdit && (
              <Field label="תבנית מספור" required={true}>
                <textarea
                  value={numberingPattern}
                  onChange={function (e) {
                    setNumberingPattern(e.target.value);
                  }}
                  className="min-h-[110px] w-full rounded-xl border border-[#D8CBC3] bg-white px-4 py-3 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  placeholder="למשל: 101-110,201-209"
                  required
                />
              </Field>
            )}

            {!props.isEdit && (
              <div className="rounded-xl border border-[#E8DDD6] bg-[#FCFAF8] px-4 py-3 text-sm text-[#7A655C]">
                אפשר להזין טווחים ורשימות, למשל: 101-110,201-209
              </div>
            )}

            {props.isEdit && (
              <div className="rounded-xl border border-[#E8DDD6] bg-[#FCFAF8] px-4 py-3 text-sm text-[#7A655C]">
                בשלב זה ניתן לערוך רק את שם המתחם.
              </div>
            )}

            {props.error && <p className="text-sm text-red-500">{props.error}</p>}
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