import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Field from "../../common/Field";

export default function ArenaModal(props) {
  const [arenaName, setArenaName] = useState("");
  const [arenaLength, setArenaLength] = useState("");
  const [arenaWidth, setArenaWidth] = useState("");
  const [isCovered, setIsCovered] = useState(false);

  useEffect(
    function () {
      if (props.isOpen) {
        setArenaName(props.initialItem?.arenaName || "");
        setArenaLength(
          props.initialItem?.arenaLength !== null &&
            props.initialItem?.arenaLength !== undefined
            ? String(props.initialItem.arenaLength)
            : "",
        );
        setArenaWidth(
          props.initialItem?.arenaWidth !== null &&
            props.initialItem?.arenaWidth !== undefined
            ? String(props.initialItem.arenaWidth)
            : "",
        );
        setIsCovered(!!props.initialItem?.isCovered);
      }
    },
    [props.isOpen, props.initialItem],
  );

  if (!props.isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      arenaName: arenaName.trim(),
      arenaLength: arenaLength === "" ? null : Number(arenaLength),
      arenaWidth: arenaWidth === "" ? null : Number(arenaWidth),
      isCovered,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3F312B]">
            {props.isEdit ? "עריכת מגרש" : "הוספת מגרש"}
          </h2>

          <button type="button" onClick={props.onClose} className="text-[#6A5248]">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field label="שם מגרש" required={true}>
              <input
                type="text"
                value={arenaName}
                onChange={function (e) {
                  setArenaName(e.target.value);
                }}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                placeholder="שם מגרש"
                required
              />
            </Field>

            <Field label="אורך (מ׳)">
              <input
                type="number"
                min="0"
                value={arenaLength}
                onChange={function (e) {
                  setArenaLength(e.target.value);
                }}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                placeholder="למשל 80"
              />
            </Field>

            <Field label="רוחב (מ׳)">
              <input
                type="number"
                min="0"
                value={arenaWidth}
                onChange={function (e) {
                  setArenaWidth(e.target.value);
                }}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                placeholder="למשל 40"
              />
            </Field>

            <label className="flex items-center justify-between rounded-xl border border-[#E8DDD6] bg-[#FCFAF8] px-4 py-3">
              <span className="font-semibold text-[#5C463D]">מגרש מקורה</span>
              <input
                type="checkbox"
                checked={isCovered}
                onChange={function (e) {
                  setIsCovered(e.target.checked);
                }}
                className="h-4 w-4 accent-[#8B6352]"
              />
            </label>

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