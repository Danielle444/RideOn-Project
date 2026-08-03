import { useEffect, useState } from "react";
import FormModal from "../common/form/FormModal";
import FormField from "../common/form/FormField";
import TextInput from "../common/form/TextInput";
import Select from "../common/form/Select";

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

var eventOptions = [
  {
    value: "RegistrationEnd",
    label: "סיום הרשמה",
  },
  {
    value: "CompetitionStart",
    label: "תחילת תחרות",
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

export default function FineModal(props) {
  const [fineAmount, setFineAmount] = useState("");

  const [triggerMode, setTriggerMode] = useState("None");

  const [startEvent, setStartEvent] = useState("");

  const [endEvent, setEndEvent] = useState("");

  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setFineAmount(
      props.initialValue?.fineAmount !== undefined &&
        props.initialValue?.fineAmount !== null
        ? String(props.initialValue.fineAmount)
        : "",
    );

    setTriggerMode(props.initialValue?.triggerMode || "None");

    setStartEvent(props.initialValue?.startEvent || "");

    setEndEvent(props.initialValue?.endEvent || "");

    setIsActive(props.initialValue?.isActive !== false);
  }, [props.isOpen, props.initialValue]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      fineId: props.initialValue?.fineId || 0,
      fineAmount: Number(fineAmount),
      fineReason: props.initialValue?.fineReason,
      triggerMode,
      startEvent,
      endEvent,
      isActive,
    });
  }

  return (
    <FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={handleSubmit}
      title="עריכת מדיניות קנס"
      error={props.error}
      maxWidthClassName="max-w-xl"
      submitLabel="שמירת מדיניות"
    >
      <div className="space-y-5">
        <FormField label="סוג קנס">
          <div className="rounded-xl border border-[#E0D5CF] bg-[#F8F5F3] px-4 py-3 text-[#5D4037]">
            {getFineReasonLabel(props.initialValue?.fineReason)}
          </div>
        </FormField>

        <FormField label="טריגר">
          <Select
            value={triggerMode}
            onChange={function (e) {
              setTriggerMode(e.target.value);
            }}
          >
            {triggerModeOptions.map(function (option) {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              );
            })}
          </Select>
        </FormField>

        {triggerMode !== "None" ? (
          <FormField label="אירוע התחלה">
            <Select
              value={startEvent}
              onChange={function (e) {
                setStartEvent(e.target.value);
              }}
            >
              <option value="">בחרי אירוע</option>

              {eventOptions.map(function (option) {
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
            </Select>
          </FormField>
        ) : null}

        {triggerMode === "Between" ? (
          <FormField label="אירוע סיום">
            <Select
              value={endEvent}
              onChange={function (e) {
                setEndEvent(e.target.value);
              }}
            >
              <option value="">בחרי אירוע</option>

              {eventOptions.map(function (option) {
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
            </Select>
          </FormField>
        ) : null}

        <FormField label="סכום קנס" required>
          <TextInput
            type="number"
            min="0"
            step="0.01"
            value={fineAmount}
            onChange={function (e) {
              setFineAmount(e.target.value);
            }}
            required
          />
        </FormField>

        <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD6] bg-[#FAF7F5] px-4 py-3">
          <input
            type="checkbox"
            checked={isActive}
            onChange={function (e) {
              setIsActive(e.target.checked);
            }}
            className="h-4 w-4"
          />

          <span className="text-sm font-medium text-[#5D4037]">
            מדיניות פעילה
          </span>
        </label>
      </div>
    </FormModal>
  );
}
