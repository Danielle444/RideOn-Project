import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function JudgeModal(props) {
  const [form, setForm] = useState({
    firstNameHebrew: "",
    lastNameHebrew: "",
    firstNameEnglish: "",
    lastNameEnglish: "",
    country: "",
  });

  const [selectedFieldIds, setSelectedFieldIds] = useState([]);

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (props.initialJudge) {
      setForm({
        firstNameHebrew: props.initialJudge.firstNameHebrew || "",
        lastNameHebrew: props.initialJudge.lastNameHebrew || "",
        firstNameEnglish: props.initialJudge.firstNameEnglish || "",
        lastNameEnglish: props.initialJudge.lastNameEnglish || "",
        country: props.initialJudge.country || "",
      });

      const existingFieldNames = (props.initialJudge.qualifiedFields || "")
        .split(",")
        .map(function (x) {
          return x.trim();
        })
        .filter(Boolean);

      const matchedIds = (props.fields || [])
        .filter(function (field) {
          return existingFieldNames.includes(field.fieldName);
        })
        .map(function (field) {
          return field.fieldId;
        });

      setSelectedFieldIds(matchedIds);
    } else {
      setForm({
        firstNameHebrew: "",
        lastNameHebrew: "",
        firstNameEnglish: "",
        lastNameEnglish: "",
        country: "",
      });
      setSelectedFieldIds([]);
    }
  }, [props.isOpen, props.initialJudge, props.fields]);

  function updateField(name, value) {
    setForm(function (prev) {
      return {
        ...prev,
        [name]: value,
      };
    });
  }

  function toggleField(fieldId) {
    setSelectedFieldIds(function (prev) {
      if (prev.includes(fieldId)) {
        return prev.filter(function (id) {
          return id !== fieldId;
        });
      }

      return [...prev, fieldId];
    });
  }

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      judgeId: props.initialJudge?.judgeId || 0,
      firstNameHebrew: form.firstNameHebrew.trim(),
      lastNameHebrew: form.lastNameHebrew.trim(),
      firstNameEnglish: form.firstNameEnglish.trim(),
      lastNameEnglish: form.lastNameEnglish.trim(),
      country: form.country.trim(),
      fieldIdsCsv: selectedFieldIds.join(","),
    });
  }

  const isEdit = !!props.initialJudge;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-3xl rounded-[28px] border border-[#E6DCD5] bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-2xl font-bold text-[#3F312B]">
            {isEdit ? "עריכת שופט" : "הוספת שופט"}
          </h2>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#7E675E] hover:bg-[#F6F1EE] transition-colors"
            title="סגירה"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                שם פרטי בעברית
              </label>
              <input
                type="text"
                value={form.firstNameHebrew}
                onChange={(e) => updateField("firstNameHebrew", e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                שם משפחה בעברית
              </label>
              <input
                type="text"
                value={form.lastNameHebrew}
                onChange={(e) => updateField("lastNameHebrew", e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                שם פרטי באנגלית
              </label>
              <input
                type="text"
                value={form.firstNameEnglish}
                onChange={(e) =>
                  updateField("firstNameEnglish", e.target.value)
                }
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                שם משפחה באנגלית
              </label>
              <input
                type="text"
                value={form.lastNameEnglish}
                onChange={(e) => updateField("lastNameEnglish", e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                מדינה
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-3 block text-sm font-semibold text-[#5D4037]">
                ענפים
              </label>

              <div className="rounded-2xl border border-[#E6DCD5] bg-[#FBF8F6] p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(props.fields || []).map(function (field) {
                    const isChecked = selectedFieldIds.includes(field.fieldId);

                    return (
                      <label
                        key={field.fieldId}
                        className="flex items-center gap-3 rounded-xl border border-[#E8DDD6] bg-white px-4 py-3 text-[#3F312B] cursor-pointer hover:bg-[#FCFAF8]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleField(field.fieldId)}
                          className="h-4 w-4 accent-[#8B6352]"
                        />
                        <span>{field.fieldName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {props.error ? (
            <div className="mt-5 rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]">
              {props.error}
            </div>
          ) : null}

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
