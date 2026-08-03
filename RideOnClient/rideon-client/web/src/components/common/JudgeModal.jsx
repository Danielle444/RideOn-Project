import { useEffect, useState } from "react";
import FormModal from "./form/FormModal";
import FormField from "./form/FormField";
import TextInput from "./form/TextInput";

// Required-field rules for the judge form. Mirrors the declarative array used by
// ClassInCompetitionModal / PaidTimeSlotInCompetitionModal so a new mandatory
// field is a one-line addition here. English names and country stay optional —
// they are nullable on `judge` and BL/Judge.cs ValidateJudge does not require them.
var FIELD_VALIDATION_RULES = [
  {
    key: "firstNameHebrew",
    message: "יש להזין שם פרטי בעברית",
    isValid: function (value) {
      return !!String(value || "").trim();
    },
  },
  {
    key: "lastNameHebrew",
    message: "יש להזין שם משפחה בעברית",
    isValid: function (value) {
      return !!String(value || "").trim();
    },
  },
  {
    key: "fieldIds",
    message: "יש לבחור לפחות ענף אחד",
    isValid: function (value) {
      return Array.isArray(value) && value.length > 0;
    },
  },
];

function getFieldErrors(form, selectedFieldIds) {
  var errors = {};

  var values = {
    firstNameHebrew: form.firstNameHebrew,
    lastNameHebrew: form.lastNameHebrew,
    fieldIds: selectedFieldIds,
  };

  FIELD_VALIDATION_RULES.forEach(function (rule) {
    if (!rule.isValid(values[rule.key])) {
      errors[rule.key] = rule.message;
    }
  });

  return errors;
}

export default function JudgeModal(props) {
  const [form, setForm] = useState({
    firstNameHebrew: "",
    lastNameHebrew: "",
    firstNameEnglish: "",
    lastNameEnglish: "",
    country: "",
  });

  const [selectedFieldIds, setSelectedFieldIds] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setFieldErrors({});

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

  function clearFieldError(name) {
    setFieldErrors(function (prev) {
      if (!prev[name]) {
        return prev;
      }

      var next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function updateField(name, value) {
    clearFieldError(name);

    setForm(function (prev) {
      return {
        ...prev,
        [name]: value,
      };
    });
  }

  function toggleField(fieldId) {
    clearFieldError("fieldIds");

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

    var nextFieldErrors = getFieldErrors(form, selectedFieldIds);

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      if (props.onShowToast) {
        props.onShowToast(
          "error",
          "השופט לא נשמר. יש למלא את השדות המסומנים.",
        );
      }

      return;
    }

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
    <FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={handleSubmit}
      title={isEdit ? "עריכת שופט" : "הוספת שופט"}
      error={props.error}
      maxWidthClassName="max-w-3xl"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="שם פרטי בעברית" required error={fieldErrors.firstNameHebrew}>
          <TextInput
            type="text"
            value={form.firstNameHebrew}
            onChange={(e) => updateField("firstNameHebrew", e.target.value)}
          />
        </FormField>

        <FormField label="שם משפחה בעברית" required error={fieldErrors.lastNameHebrew}>
          <TextInput
            type="text"
            value={form.lastNameHebrew}
            onChange={(e) => updateField("lastNameHebrew", e.target.value)}
          />
        </FormField>

        <FormField label="שם פרטי באנגלית">
          <TextInput
            type="text"
            value={form.firstNameEnglish}
            onChange={(e) => updateField("firstNameEnglish", e.target.value)}
          />
        </FormField>

        <FormField label="שם משפחה באנגלית">
          <TextInput
            type="text"
            value={form.lastNameEnglish}
            onChange={(e) => updateField("lastNameEnglish", e.target.value)}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="מדינה">
            <TextInput
              type="text"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
            />
          </FormField>
        </div>

        <div className="md:col-span-2">
          <FormField label="ענפים" required error={fieldErrors.fieldIds}>
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
          </FormField>
        </div>
      </div>
    </FormModal>
  );
}
