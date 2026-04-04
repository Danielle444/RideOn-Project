import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function ClassTypeModal(props) {
  const [fieldId, setFieldId] = useState("");
  const [className, setClassName] = useState("");
  const [judgingSheetFormat, setJudgingSheetFormat] = useState("");
  const [qualificationDescription, setQualificationDescription] = useState("");

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setFieldId(props.initialValue?.fieldId?.toString() || "");
    setClassName(props.initialValue?.className || "");
    setJudgingSheetFormat(props.initialValue?.judgingSheetFormat || "");
    setQualificationDescription(props.initialValue?.qualificationDescription || "");
  }, [props.isOpen, props.initialValue]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      classTypeId: props.initialValue?.classTypeId || 0,
      fieldId: Number(fieldId),
      className: className.trim(),
      judgingSheetFormat: judgingSheetFormat.trim(),
      qualificationDescription: qualificationDescription.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-[#E6DCD5] bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-2xl font-bold text-[#3F312B]">
            {props.initialValue ? "עריכת סוג מקצה" : "הוספת סוג מקצה"}
          </h2>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#7E675E] hover:bg-[#F6F1EE] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                ענף
              </label>
              <select
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              >
                <option value="">בחרי ענף</option>
                {(props.fields || []).map(function (field) {
                  return (
                    <option key={field.fieldId} value={field.fieldId}>
                      {field.fieldName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                שם סוג מקצה
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                Judging Sheet Format
              </label>
              <input
                type="text"
                value={judgingSheetFormat}
                onChange={(e) => setJudgingSheetFormat(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                תיאור / Qualification
              </label>
              <textarea
                value={qualificationDescription}
                onChange={(e) => setQualificationDescription(e.target.value)}
                rows="4"
                className="w-full rounded-xl border border-[#D8CBC3] bg-white px-4 py-3 text-[#3F312B] shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            {props.error ? (
              <div className="rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]">
                {props.error}
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[#D8CBC3] bg-white px-5 py-2.5 font-semibold text-[#5D4037] hover:bg-[#F8F5F2] transition-colors"
            >
              ביטול
            </button>

            <button
              type="submit"
              className="rounded-xl bg-[#8B6352] px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-[#7A5547] transition-colors"
            >
              שמירה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}