import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import CustomDropdown from "../common/CustomDropdown";
import {
  toInputDate,
  normalizeTimeForInput,
  normalizeTimeForServer,
} from "../../utils/competitionForm.utils";
import {
  TIMING_OPTIONS,
  MINUTE_OPTIONS,
  buildDayOptions,
  getTimeOfDayOptions,
  getTimingForDate,
  findBaseSlotId,
  formatDateOnlyForDisplay,
  buildHourOptions,
  splitTimeValue,
  combineTimeValue,
} from "../../utils/paidTimeSlotForm.utils";

// Required-field rules for the paid-time slot form. Adding another mandatory
// field later is a one-line addition here, mirroring ClassInCompetitionModal.
var FIELD_VALIDATION_RULES = [
  {
    key: "timing",
    message: "יש לבחור אם הסלוט לפני התחרות או במהלכה",
    isValid: function (value) {
      return !!value;
    },
  },
  {
    key: "slotDateValue",
    message: "יש לבחור יום בשבוע",
    isValid: function (value) {
      return !!value;
    },
  },
  {
    key: "timeOfDay",
    message: "יש לבחור מועד ביום",
    isValid: function (value) {
      return !!value;
    },
  },
  {
    key: "arenaId",
    message: "יש לבחור מגרש",
    isValid: function (value) {
      return !!value;
    },
  },
  {
    key: "startTime",
    message: "יש לבחור שעת התחלה",
    isValid: function (value) {
      return !!value;
    },
  },
  {
    key: "endTime",
    message: "יש לבחור שעת סיום",
    isValid: function (value) {
      return !!value;
    },
  },
];

function getFieldErrors(formData) {
  var errors = {};

  var derivedValues = {
    timing: formData.timing,
    slotDateValue: formData.slotDateValue,
    timeOfDay: formData.timeOfDay,
    arenaId: formData.arenaId,
    startTime: combineTimeValue(formData.startTimeHour, formData.startTimeMinute),
    endTime: combineTimeValue(formData.endTimeHour, formData.endTimeMinute),
  };

  FIELD_VALIDATION_RULES.forEach(function (rule) {
    if (!rule.isValid(derivedValues[rule.key])) {
      errors[rule.key] = rule.message;
    }
  });

  if (
    derivedValues.startTime &&
    derivedValues.endTime &&
    derivedValues.endTime <= derivedValues.startTime
  ) {
    errors.endTime = "שעת הסיום חייבת להיות מאוחרת משעת ההתחלה";
  }

  return errors;
}

var EMPTY_FORM_DATA = {
  timing: "",
  slotDateValue: "",
  timeOfDay: "",
  arenaId: "",
  startTimeHour: "",
  startTimeMinute: "",
  endTimeHour: "",
  endTimeMinute: "",
  slotStatus: "",
  slotNotes: "",
};

export default function PaidTimeSlotInCompetitionModal(props) {
  var isEdit = !!props.initialValue;

  var [formData, setFormData] = useState(EMPTY_FORM_DATA);
  var [fieldErrors, setFieldErrors] = useState({});
  var [openDropdownKey, setOpenDropdownKey] = useState("");

  var hourOptions = useMemo(function () {
    return buildHourOptions();
  }, []);

  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      setFieldErrors({});
      setOpenDropdownKey("");

      if (!props.initialValue) {
        setFormData(EMPTY_FORM_DATA);
        return;
      }

      var slotDateValue = toInputDate(props.initialValue.slotDate);
      var timing = getTimingForDate(
        slotDateValue,
        props.competitionStartDate,
        props.competitionEndDate,
      );
      var startTimeParts = splitTimeValue(
        normalizeTimeForInput(props.initialValue.startTime),
      );
      var endTimeParts = splitTimeValue(
        normalizeTimeForInput(props.initialValue.endTime),
      );

      setFormData({
        timing: timing,
        slotDateValue: slotDateValue,
        timeOfDay:
          props.initialValue.timeOfDay || props.initialValue.TimeOfDay || "",
        arenaId: props.initialValue.arenaId
          ? String(props.initialValue.arenaId)
          : "",
        startTimeHour: startTimeParts.hour,
        startTimeMinute: startTimeParts.minute,
        endTimeHour: endTimeParts.hour,
        endTimeMinute: endTimeParts.minute,
        slotStatus: props.initialValue.slotStatus || "",
        slotNotes: props.initialValue.slotNotes || "",
      });
    },
    [props.isOpen, props.initialValue],
  );

  var dayOptions = useMemo(
    function () {
      return buildDayOptions(
        formData.timing,
        props.competitionStartDate,
        props.competitionEndDate,
      );
    },
    [formData.timing, props.competitionStartDate, props.competitionEndDate],
  );

  var timeOfDayOptions = useMemo(
    function () {
      return getTimeOfDayOptions(formData.timing);
    },
    [formData.timing],
  );

  var selectedDayOption = dayOptions.find(function (option) {
    return option.dateValue === formData.slotDateValue;
  });

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

  function handleTimingChange(value) {
    setFormData(function (prev) {
      return {
        ...prev,
        timing: value,
        slotDateValue: "",
        timeOfDay: "",
      };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    var nextFieldErrors = getFieldErrors(formData);
    var dayName = selectedDayOption ? selectedDayOption.dayName : "";
    var paidTimeSlotId = null;

    if (Object.keys(nextFieldErrors).length === 0) {
      paidTimeSlotId = findBaseSlotId(props.baseSlots, dayName, formData.timeOfDay);

      if (!paidTimeSlotId) {
        nextFieldErrors.timeOfDay =
          "מועד זה אינו זמין עבור הבחירה שנעשתה (לפני/במהלך התחרות)";
      }
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      if (props.onShowToast) {
        props.onShowToast(
          "error",
          "פייד-טיים סלוט לא נשמר. יש לעקוב אחרי ההנחיות בטופס.",
        );
      }

      return;
    }

    props.onSubmit({
      paidTimeSlotId: paidTimeSlotId,
      arenaId: formData.arenaId ? Number(formData.arenaId) : "",
      slotDate: formData.slotDateValue || null,
      startTime: normalizeTimeForServer(
        combineTimeValue(formData.startTimeHour, formData.startTimeMinute),
      ),
      endTime: normalizeTimeForServer(
        combineTimeValue(formData.endTimeHour, formData.endTimeMinute),
      ),
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
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                תזמון הסלוט
              </label>

              <div className="grid grid-cols-2 gap-3">
                {TIMING_OPTIONS.map(function (option) {
                  var isSelected = formData.timing === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={function () {
                        handleTimingChange(option.value);
                      }}
                      className={
                        "h-11 w-full rounded-xl border-2 px-4 text-sm font-semibold transition-colors " +
                        (isSelected
                          ? "border-[#8B6352] bg-[#F5EDE8] text-[#4E342E]"
                          : "border-[#D7CCC8] bg-white text-[#212121] hover:border-[#BCAAA4]")
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {fieldErrors.timing ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.timing}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                יום בשבוע
              </label>

              <CustomDropdown
                dropdownKey="paid-time-day"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                options={dayOptions}
                value={formData.slotDateValue}
                placeholder={
                  formData.timing ? "בחרי יום בשבוע" : "יש לבחור תזמון תחילה"
                }
                disabled={!formData.timing}
                getOptionValue={function (item) {
                  return item.dateValue;
                }}
                getOptionLabel={function (item) {
                  return (
                    "יום " +
                    item.dayName +
                    " - " +
                    formatDateOnlyForDisplay(item.dateValue)
                  );
                }}
                onChange={function (e) {
                  handleChange("slotDateValue", e.target.value);
                }}
              />

              {fieldErrors.slotDateValue ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.slotDateValue}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                מועד ביום
              </label>

              <CustomDropdown
                dropdownKey="paid-time-time-of-day"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                options={timeOfDayOptions}
                value={formData.timeOfDay}
                placeholder={
                  formData.timing ? "בחרי מועד ביום" : "יש לבחור תזמון תחילה"
                }
                disabled={!formData.timing}
                getOptionValue={function (item) {
                  return item;
                }}
                getOptionLabel={function (item) {
                  return item;
                }}
                onChange={function (e) {
                  handleChange("timeOfDay", e.target.value);
                }}
              />

              {fieldErrors.timeOfDay ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.timeOfDay}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                מגרש
              </label>

              <CustomDropdown
                dropdownKey="paid-time-arena"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                options={props.arenas}
                value={formData.arenaId}
                placeholder="בחרי מגרש"
                searchable={true}
                getOptionValue={function (item) {
                  return item.arenaId;
                }}
                getOptionLabel={function (item) {
                  return item.arenaName;
                }}
                onChange={function (e) {
                  handleChange("arenaId", e.target.value);
                }}
              />

              {fieldErrors.arenaId ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.arenaId}
                </div>
              ) : null}
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

              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomDropdown
                    dropdownKey="paid-time-start-time-hour"
                    openDropdownKey={openDropdownKey}
                    setOpenDropdownKey={setOpenDropdownKey}
                    options={hourOptions}
                    value={formData.startTimeHour}
                    placeholder="שעה"
                    searchable={true}
                    getOptionValue={function (item) {
                      return item;
                    }}
                    getOptionLabel={function (item) {
                      return item;
                    }}
                    onChange={function (e) {
                      handleChange("startTimeHour", e.target.value);
                    }}
                  />
                </div>

                <div className="flex-1">
                  <CustomDropdown
                    dropdownKey="paid-time-start-time-minute"
                    openDropdownKey={openDropdownKey}
                    setOpenDropdownKey={setOpenDropdownKey}
                    options={MINUTE_OPTIONS}
                    value={formData.startTimeMinute}
                    placeholder="דקות"
                    getOptionValue={function (item) {
                      return item;
                    }}
                    getOptionLabel={function (item) {
                      return item;
                    }}
                    onChange={function (e) {
                      handleChange("startTimeMinute", e.target.value);
                    }}
                  />
                </div>
              </div>

              {fieldErrors.startTime ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.startTime}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                שעת סיום
              </label>

              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomDropdown
                    dropdownKey="paid-time-end-time-hour"
                    openDropdownKey={openDropdownKey}
                    setOpenDropdownKey={setOpenDropdownKey}
                    options={hourOptions}
                    value={formData.endTimeHour}
                    placeholder="שעה"
                    searchable={true}
                    getOptionValue={function (item) {
                      return item;
                    }}
                    getOptionLabel={function (item) {
                      return item;
                    }}
                    onChange={function (e) {
                      handleChange("endTimeHour", e.target.value);
                    }}
                  />
                </div>

                <div className="flex-1">
                  <CustomDropdown
                    dropdownKey="paid-time-end-time-minute"
                    openDropdownKey={openDropdownKey}
                    setOpenDropdownKey={setOpenDropdownKey}
                    options={MINUTE_OPTIONS}
                    value={formData.endTimeMinute}
                    placeholder="דקות"
                    getOptionValue={function (item) {
                      return item;
                    }}
                    getOptionLabel={function (item) {
                      return item;
                    }}
                    onChange={function (e) {
                      handleChange("endTimeMinute", e.target.value);
                    }}
                  />
                </div>
              </div>

              {fieldErrors.endTime ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.endTime}
                </div>
              ) : null}
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
