import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STATUS_SUGGESTIONS = [
  "טיוטה",
  "פתוחה",
  "פעילה",
  "הסתיימה",
  "עתידית",
  "כעת",
  "Draft",
  "Open",
  "Active",
  "Finished",
];

function toInputDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CompetitionModal(props) {
  const isEdit = !!props.initialValue;

  const [formData, setFormData] = useState({
    competitionName: "",
    fieldId: "",
    competitionStartDate: "",
    competitionEndDate: "",
    registrationOpenDate: "",
    registrationEndDate: "",
    paidTimeRegistrationDate: "",
    paidTimePublicationDate: "",
    competitionStatus: "",
    notes: "",
  });

  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      const item = props.initialValue;

      if (!item) {
        setFormData({
          competitionName: "",
          fieldId: "",
          competitionStartDate: "",
          competitionEndDate: "",
          registrationOpenDate: "",
          registrationEndDate: "",
          paidTimeRegistrationDate: "",
          paidTimePublicationDate: "",
          competitionStatus: "",
          notes: "",
        });
        return;
      }

      setFormData({
        competitionName: item.competitionName || "",
        fieldId: item.fieldId ? String(item.fieldId) : "",
        competitionStartDate: toInputDate(item.competitionStartDate),
        competitionEndDate: toInputDate(item.competitionEndDate),
        registrationOpenDate: toInputDate(item.registrationOpenDate),
        registrationEndDate: toInputDate(item.registrationEndDate),
        paidTimeRegistrationDate: toInputDate(item.paidTimeRegistrationDate),
        paidTimePublicationDate: toInputDate(item.paidTimePublicationDate),
        competitionStatus: item.competitionStatus || "",
        notes: item.notes || "",
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
      competitionName: formData.competitionName.trim(),
      fieldId: formData.fieldId ? Number(formData.fieldId) : "",
      competitionStartDate: formData.competitionStartDate || null,
      competitionEndDate: formData.competitionEndDate || null,
      registrationOpenDate: formData.registrationOpenDate || null,
      registrationEndDate: formData.registrationEndDate || null,
      paidTimeRegistrationDate: formData.paidTimeRegistrationDate || null,
      paidTimePublicationDate: formData.paidTimePublicationDate || null,
      competitionStatus: formData.competitionStatus.trim() || null,
      notes: formData.notes.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="w-full max-w-[880px] rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-7 py-5">
          <h2 className="text-[1.65rem] font-bold text-[#3F312B]">
            {isEdit ? "עריכת תחרות" : "פתיחת תחרות חדשה"}
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
                שם תחרות
              </label>
              <input
                type="text"
                value={formData.competitionName}
                onChange={function (e) {
                  handleChange("competitionName", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                ענף
              </label>
              <select
                value={formData.fieldId}
                onChange={function (e) {
                  handleChange("fieldId", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              >
                <option value="">בחרי ענף</option>
                {props.fields.map(function (field) {
                  return (
                    <option key={field.fieldId} value={field.fieldId}>
                      {field.fieldName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                תאריך התחלה
              </label>
              <input
                type="date"
                value={formData.competitionStartDate}
                onChange={function (e) {
                  handleChange("competitionStartDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                תאריך סיום
              </label>
              <input
                type="date"
                value={formData.competitionEndDate}
                onChange={function (e) {
                  handleChange("competitionEndDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                פתיחת הרשמה
              </label>
              <input
                type="date"
                value={formData.registrationOpenDate}
                onChange={function (e) {
                  handleChange("registrationOpenDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                סגירת הרשמה
              </label>
              <input
                type="date"
                value={formData.registrationEndDate}
                onChange={function (e) {
                  handleChange("registrationEndDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                פתיחת רישום פייד-טיים
              </label>
              <input
                type="date"
                value={formData.paidTimeRegistrationDate}
                onChange={function (e) {
                  handleChange("paidTimeRegistrationDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                פרסום פייד-טיים
              </label>
              <input
                type="date"
                value={formData.paidTimePublicationDate}
                onChange={function (e) {
                  handleChange("paidTimePublicationDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                סטטוס
              </label>
              <input
                list="competition-status-suggestions"
                type="text"
                value={formData.competitionStatus}
                onChange={function (e) {
                  handleChange("competitionStatus", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                placeholder="למשל: פתוחה / פעילה / טיוטה"
              />
              <datalist id="competition-status-suggestions">
                {STATUS_SUGGESTIONS.map(function (item) {
                  return <option key={item} value={item} />;
                })}
              </datalist>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                הערות
              </label>
              <textarea
                value={formData.notes}
                onChange={function (e) {
                  handleChange("notes", e.target.value);
                }}
                rows={4}
                className="w-full rounded-xl border border-[#D7CCC8] bg-white px-4 py-3 text-right text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
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
              className="rounded-xl bg-[#8B6352] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {props.saving ? "שומרת..." : "שמירה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}