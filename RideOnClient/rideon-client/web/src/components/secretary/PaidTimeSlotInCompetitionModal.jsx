import { useEffect, useState } from "react";
import { X } from "lucide-react";

function toInputDate(value) {
  if (!value) {
    return "";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function normalizeTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function normalizeTimeForApi(value) {
  if (!value) {
    return null;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value + ":00";
  }

  return value;
}

export default function PaidTimeSlotInCompetitionModal(props) {
  var isEdit = !!props.initialValue;

  var [formData, setFormData] = useState({
    paidTimeSlotId: "",
    arenaId: "",
    slotDate: "",
    startTime: "",
    endTime: "",
    slotStatus: "",
    slotNotes: "",
  });

  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      if (!props.initialValue) {
        setFormData({
          paidTimeSlotId: "",
          arenaId: "",
          slotDate: "",
          startTime: "",
          endTime: "",
          slotStatus: "",
          slotNotes: "",
        });
        return;
      }

      setFormData({
        paidTimeSlotId: props.initialValue.paidTimeSlotId
          ? String(props.initialValue.paidTimeSlotId)
          : "",
        arenaId: props.initialValue.arenaId
          ? String(props.initialValue.arenaId)
          : "",
        slotDate: toInputDate(props.initialValue.slotDate),
        startTime: normalizeTime(props.initialValue.startTime),
        endTime: normalizeTime(props.initialValue.endTime),
        slotStatus: props.initialValue.slotStatus || "",
        slotNotes: props.initialValue.slotNotes || "",
      });
    },
    [props.isOpen, props.initialValue],
  );

  if (!props.isOpen) {
    return null;
  }

  function handleChange(fieldName, value) {
    setFormData(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      paidTimeSlotId: formData.paidTimeSlotId
        ? Number(formData.paidTimeSlotId)
        : "",
      arenaId: formData.arenaId ? Number(formData.arenaId) : "",
      slotDate: formData.slotDate || null,
      startTime: normalizeTimeForApi(formData.startTime),
      endTime: normalizeTimeForApi(formData.endTime),
      slotStatus: formData.slotStatus.trim() || null,
      slotNotes: formData.slotNotes.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="w-full max-w-[900px] rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-7 py-5">
          <h2 className="text-[1.65rem] font-bold text-[#3F312B]">
            {isEdit ? "עריכת סלוט פייד־טיים" : "הוספת סלוט פייד־טיים"}
          </h2>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#6D4C41] transition-colors hover:bg-[#F8F5F2]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                סלוט פייד־טיים
              </label>
              <select
                value={formData.paidTimeSlotId}
                onChange={function (e) {
                  handleChange("paidTimeSlotId", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                required
              >
                <option value="">בחרי סלוט פייד־טיים</option>
                {props.baseSlots.map(function (item) {
                  return (
                    <option
                      key={item.paidTimeSlotId}
                      value={item.paidTimeSlotId}
                    >
                      {item.dayOfWeek} - {item.timeOfDay}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                מגרש
              </label>
              <select
                value={formData.arenaId}
                onChange={function (e) {
                  handleChange("arenaId", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                required
              >
                <option value="">בחרי מגרש</option>
                {props.arenas.map(function (item) {
                  return (
                    <option key={item.arenaId} value={item.arenaId}>
                      {item.arenaName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                תאריך
              </label>
              <input
                type="date"
                value={formData.slotDate}
                onChange={function (e) {
                  handleChange("slotDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                סטטוס סלוט
              </label>
              <input
                type="text"
                value={formData.slotStatus}
                onChange={function (e) {
                  handleChange("slotStatus", e.target.value);
                }}
                placeholder="לא חובה"
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                שעת התחלה
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={function (e) {
                  handleChange("startTime", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                שעת סיום
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={function (e) {
                  handleChange("endTime", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                הערות
              </label>
              <textarea
                rows={4}
                value={formData.slotNotes}
                onChange={function (e) {
                  handleChange("slotNotes", e.target.value);
                }}
                className="w-full rounded-xl border border-[#D7CCC8] bg-white px-4 py-3 text-right"
              />
            </div>
          </div>

          {props.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-right">
              {props.error}
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-start gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[#D7CCC8] px-5 py-3 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
            >
              ביטול
            </button>

            <button
              type="submit"
              disabled={props.saving}
              className="rounded-xl bg-[#8B6352] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547] disabled:opacity-70"
            >
              {props.saving ? "שומר..." : "שמירה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
