import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function FineModal(props) {
  const [fineName, setFineName] = useState("");
  const [fineDescription, setFineDescription] = useState("");
  const [fineAmount, setFineAmount] = useState("");

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setFineName(props.initialValue?.fineName || "");
    setFineDescription(props.initialValue?.fineDescription || "");
    setFineAmount(
      props.initialValue?.fineAmount !== undefined &&
      props.initialValue?.fineAmount !== null
        ? String(props.initialValue.fineAmount)
        : "",
    );
  }, [props.isOpen, props.initialValue]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      fineId: props.initialValue?.fineId || 0,
      fineName: fineName.trim(),
      fineDescription: fineDescription.trim(),
      fineAmount: Number(fineAmount),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-[#E6DCD5] bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-2xl font-bold text-[#3F312B]">
            {props.initialValue ? "עריכת קנס" : "הוספת קנס"}
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
                שם קנס
              </label>
              <input
                type="text"
                value={fineName}
                onChange={(e) => setFineName(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                תיאור
              </label>
              <textarea
                value={fineDescription}
                onChange={(e) => setFineDescription(e.target.value)}
                rows="4"
                className="w-full rounded-xl border border-[#D8CBC3] bg-white px-4 py-3 text-[#3F312B] shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                סכום קנס
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
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