import { useEffect, useState } from "react";
import { X } from "lucide-react";

var triggerModeOptions = [
  {
    value: "None",
    label: "ללא טריגר",
  },
  {
    value: "After",
    label: "לאחר אירוע",
  },
  {
    value: "Between",
    label: "בין אירועים",
  },
];

function getFineReasonLabel(reason) {
  switch (reason) {
    case "LateRegistration":
      return "רישום באיחור";

    case "EntryChange":
      return "שינוי הרשמה";

    case "EntryCancellation":
      return "ביטול הרשמה";

    case "LostNumber":
      return "איבוד מספר";

    default:
      return reason || "-";
  }
}

function getEventLabel(eventName) {
  switch (eventName) {
    case "RegistrationEnd":
      return "סיום הרשמה";

    case "CompetitionStart":
      return "תחילת תחרות";

    default:
      return eventName || "-";
  }
}

export default function FineModal(props) {
  const [fineAmount, setFineAmount] =
    useState("");

  const [triggerMode, setTriggerMode] =
    useState("None");

  const [isActive, setIsActive] =
    useState(true);

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setFineAmount(
      props.initialValue?.fineAmount !==
        undefined &&
        props.initialValue?.fineAmount !==
          null
        ? String(
            props.initialValue.fineAmount,
          )
        : "",
    );

    setTriggerMode(
      props.initialValue?.triggerMode ||
        "None",
    );

    setIsActive(
      props.initialValue?.isActive !==
        false,
    );
  }, [
    props.isOpen,
    props.initialValue,
  ]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      fineId:
        props.initialValue?.fineId || 0,

      fineName:
        props.initialValue?.fineName ||
        "",

      fineDescription:
        props.initialValue
          ?.fineDescription || "",

      fineAmount: Number(fineAmount),

      fineReason:
        props.initialValue?.fineReason,

      triggerMode,

      startEvent:
        props.initialValue?.startEvent,

      endEvent:
        props.initialValue?.endEvent,

      isActive,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-[#E6DCD5] bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-2xl font-bold text-[#3F312B]">
            עריכת מדיניות קנס
          </h2>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#7E675E] hover:bg-[#F6F1EE] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-6 py-6"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                סוג קנס
              </label>

              <div className="rounded-xl border border-[#E0D5CF] bg-[#F8F5F3] px-4 py-3 text-[#5D4037]">
                {getFineReasonLabel(
                  props.initialValue
                    ?.fineReason,
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                טריגר
              </label>

              <select
                value={triggerMode}
                onChange={function (e) {
                  setTriggerMode(
                    e.target.value,
                  );
                }}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              >
                {triggerModeOptions.map(
                  function (option) {
                    return (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    );
                  },
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                אירוע התחלה
              </label>

              <div className="rounded-xl border border-[#E0D5CF] bg-[#F8F5F3] px-4 py-3 text-[#5D4037]">
                {getEventLabel(
                  props.initialValue
                    ?.startEvent,
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                אירוע סיום
              </label>

              <div className="rounded-xl border border-[#E0D5CF] bg-[#F8F5F3] px-4 py-3 text-[#5D4037]">
                {getEventLabel(
                  props.initialValue
                    ?.endEvent,
                )}
              </div>
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
                onChange={function (e) {
                  setFineAmount(
                    e.target.value,
                  );
                }}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD6] bg-[#FAF7F5] px-4 py-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={function (e) {
                  setIsActive(
                    e.target.checked,
                  );
                }}
                className="h-4 w-4"
              />

              <span className="text-sm font-medium text-[#5D4037]">
                מדיניות פעילה
              </span>
            </label>

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
              שמירת מדיניות
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}