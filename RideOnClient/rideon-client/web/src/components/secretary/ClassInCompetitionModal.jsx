import { useEffect, useState } from "react";
import { X } from "lucide-react";

function toInputDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
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

function normalizeTimeForInput(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function normalizeTimeForServer(value) {
  if (!value) {
    return null;
  }

  if (value.length === 5) {
    return value + ":00";
  }

  return value;
}

export default function ClassInCompetitionModal(props) {
  var isEdit = !!props.initialValue;

  var [formData, setFormData] = useState({
    classTypeId: "",
    arenaId: "",
    classDate: "",
    startTime: "",
    orderInDay: "",
    organizerCost: "",
    federationCost: "",
    classNotes: "",
  });

  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      if (!props.initialValue) {
        setFormData({
          classTypeId: "",
          arenaId: "",
          classDate: props.defaultDate || "",
          startTime: "",
          orderInDay: "",
          organizerCost: "",
          federationCost: "",
          classNotes: "",
        });
        return;
      }

      setFormData({
        classTypeId: props.initialValue.classTypeId
          ? String(props.initialValue.classTypeId)
          : "",
        arenaId: props.initialValue.arenaId ? String(props.initialValue.arenaId) : "",
        classDate: toInputDate(props.initialValue.classDateTime),
        startTime: normalizeTimeForInput(props.initialValue.startTime),
        orderInDay:
          props.initialValue.orderInDay !== null &&
          props.initialValue.orderInDay !== undefined
            ? String(props.initialValue.orderInDay)
            : "",
        organizerCost:
          props.initialValue.organizerCost !== null &&
          props.initialValue.organizerCost !== undefined
            ? String(props.initialValue.organizerCost)
            : "",
        federationCost:
          props.initialValue.federationCost !== null &&
          props.initialValue.federationCost !== undefined
            ? String(props.initialValue.federationCost)
            : "",
        classNotes: props.initialValue.classNotes || "",
      });
    },
    [props.isOpen, props.initialValue, props.defaultDate],
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
      classTypeId: formData.classTypeId ? Number(formData.classTypeId) : "",
      arenaId: formData.arenaId ? Number(formData.arenaId) : "",
      classDateTime: formData.classDate ? formData.classDate + "T12:00:00" : null,
      startTime: normalizeTimeForServer(formData.startTime),
      orderInDay: formData.orderInDay ? Number(formData.orderInDay) : null,
      organizerCost: formData.organizerCost ? Number(formData.organizerCost) : null,
      federationCost: formData.federationCost ? Number(formData.federationCost) : null,
      classNotes: formData.classNotes.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="w-full max-w-[900px] rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-7 py-5">
          <h2 className="text-[1.65rem] font-bold text-[#3F312B]">
            {isEdit ? "עריכת מקצה" : "הוספת מקצה"}
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
                סוג מקצה
              </label>
              <select
                value={formData.classTypeId}
                onChange={function (e) {
                  handleChange("classTypeId", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                required
              >
                <option value="">בחרי סוג מקצה</option>
                {props.classTypes.map(function (item) {
                  return (
                    <option key={item.classTypeId} value={item.classTypeId}>
                      {item.className}
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
                value={formData.classDate}
                onChange={function (e) {
                  handleChange("classDate", e.target.value);
                }}
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
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                סדר ביום
              </label>
              <input
                type="number"
                min="1"
                value={formData.orderInDay}
                onChange={function (e) {
                  handleChange("orderInDay", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                עלות מארגן
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.organizerCost}
                onChange={function (e) {
                  handleChange("organizerCost", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                עלות התאחדות
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.federationCost}
                onChange={function (e) {
                  handleChange("federationCost", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                הערות
              </label>
              <textarea
                rows={4}
                value={formData.classNotes}
                onChange={function (e) {
                  handleChange("classNotes", e.target.value);
                }}
                className="w-full rounded-xl border border-[#D7CCC8] bg-white px-4 py-3 text-right"
              />
            </div>
          </div>

          {props.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
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