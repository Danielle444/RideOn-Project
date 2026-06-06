import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import CustomDropdown from "../../common/CustomDropdown";
import MultiSelectPicker from "../../common/MultiSelectPicker";

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

function formatDate(value) {
  if (!value) {
    return "-";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("he-IL");
}

function getDaysDuration(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }

  var start = new Date(startDate);
  var end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  var diff = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  return diff + 1;
}

function addDaysToInputDate(dateValue, daysToAdd) {
  if (!dateValue) {
    return "";
  }

  var date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() + daysToAdd);

  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function buildDefaultForm(sourceCompetition) {
  var sourceStart = toInputDate(sourceCompetition?.competitionStartDate);
  var sourceEnd = toInputDate(sourceCompetition?.competitionEndDate);
  var sourceDuration = getDaysDuration(sourceStart, sourceEnd);
  var today = new Date();
  var defaultStartYear = today.getFullYear();
  var defaultStartMonth = String(today.getMonth() + 1).padStart(2, "0");
  var defaultStartDay = String(today.getDate()).padStart(2, "0");
  var defaultStart =
    defaultStartYear + "-" + defaultStartMonth + "-" + defaultStartDay;

  return {
    sourceCompetitionId: sourceCompetition?.competitionId
      ? String(sourceCompetition.competitionId)
      : "",
    newCompetitionName: sourceCompetition?.competitionName
      ? sourceCompetition.competitionName + " - עותק"
      : "",
    newCompetitionStartDate: defaultStart,
    newCompetitionEndDate:
      sourceDuration && sourceDuration > 0
        ? addDaysToInputDate(defaultStart, sourceDuration - 1)
        : defaultStart,
    registrationOpenDate: "",
    registrationEndDate: "",
    paidTimeRegistrationDate: "",
    paidTimePublicationDate: "",
    notes: "",
    copyClasses: true,
    copyClassPrices: true,
    copyClassPrizes: true,
    copyReiningPatterns: false,
    copyPaidTimeSlots: true,
    classJudgeIds: [],
  };
}

export default function DuplicateCompetitionModal(props) {
  var isOpen = !!props.isOpen;
  var sourceCompetitions = Array.isArray(props.sourceCompetitions)
    ? props.sourceCompetitions
    : [];
  var judges = Array.isArray(props.judges) ? props.judges : [];

  var [openDropdownKey, setOpenDropdownKey] = useState("");
  var [localError, setLocalError] = useState("");
  var [formData, setFormData] = useState(buildDefaultForm(null));

  var selectedSourceCompetition = useMemo(
    function () {
      return sourceCompetitions.find(function (item) {
        return (
          String(item.competitionId) === String(formData.sourceCompetitionId)
        );
      });
    },
    [sourceCompetitions, formData.sourceCompetitionId],
  );

  var sourceDuration = getDaysDuration(
    selectedSourceCompetition?.competitionStartDate,
    selectedSourceCompetition?.competitionEndDate,
  );

  var newDuration = getDaysDuration(
    formData.newCompetitionStartDate,
    formData.newCompetitionEndDate,
  );

  var hasDifferentDuration =
    sourceDuration !== null &&
    newDuration !== null &&
    sourceDuration !== newDuration;

  useEffect(
    function () {
      if (!isOpen) {
        return;
      }

      setLocalError("");

      var firstCompetition =
        sourceCompetitions.length > 0 ? sourceCompetitions[0] : null;

      setFormData(buildDefaultForm(firstCompetition));
    },
    [isOpen, sourceCompetitions],
  );

  useEffect(
    function () {
      if (!isOpen) {
        return;
      }

      if (!selectedSourceCompetition) {
        return;
      }

      setFormData(function (prev) {
        if (prev.newCompetitionName && prev.sourceCompetitionId) {
          return prev;
        }

        return {
          ...prev,
          newCompetitionName: selectedSourceCompetition.competitionName
            ? selectedSourceCompetition.competitionName + " - עותק"
            : "",
        };
      });
    },
    [isOpen, selectedSourceCompetition],
  );

  if (!isOpen) {
    return null;
  }

  function handleChange(fieldName, value) {
    setLocalError("");

    setFormData(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  function toggleBoolean(fieldName) {
    setLocalError("");

    setFormData(function (prev) {
      return {
        ...prev,
        [fieldName]: !prev[fieldName],
      };
    });
  }

  function toggleJudge(judgeId) {
    setLocalError("");

    setFormData(function (prev) {
      var current = Array.isArray(prev.classJudgeIds) ? prev.classJudgeIds : [];
      var exists = current.some(function (id) {
        return String(id) === String(judgeId);
      });

      return {
        ...prev,
        classJudgeIds: exists
          ? current.filter(function (id) {
              return String(id) !== String(judgeId);
            })
          : [...current, judgeId],
      };
    });
  }

  function handleSourceChange(e) {
    var sourceCompetitionId = e.target.value;
    var sourceCompetition = sourceCompetitions.find(function (item) {
      return String(item.competitionId) === String(sourceCompetitionId);
    });

    setLocalError("");

    setFormData(function (prev) {
      return {
        ...prev,
        sourceCompetitionId: sourceCompetitionId,
        newCompetitionName: sourceCompetition?.competitionName
          ? sourceCompetition.competitionName + " - עותק"
          : prev.newCompetitionName,
      };
    });
  }

  function validateForm() {
    if (!formData.sourceCompetitionId) {
      return "יש לבחור תחרות מקור לשכפול";
    }

    if (!formData.newCompetitionName.trim()) {
      return "יש להזין שם לתחרות החדשה";
    }

    if (!formData.newCompetitionStartDate) {
      return "יש להזין תאריך התחלה לתחרות החדשה";
    }

    if (!formData.newCompetitionEndDate) {
      return "יש להזין תאריך סיום לתחרות החדשה";
    }

    if (
      new Date(formData.newCompetitionEndDate) <
      new Date(formData.newCompetitionStartDate)
    ) {
      return "תאריך הסיום לא יכול להיות לפני תאריך ההתחלה";
    }

    if (
      formData.registrationOpenDate &&
      formData.registrationEndDate &&
      new Date(formData.registrationEndDate) <
        new Date(formData.registrationOpenDate)
    ) {
      return "תאריך סגירת ההרשמה לא יכול להיות לפני פתיחת ההרשמה";
    }

    if (formData.copyClasses && formData.classJudgeIds.length === 0) {
      return "אם משכפלים מקצים, חובה לבחור לפחות שופט אחד לתחרות החדשה";
    }

    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();

    var error = validateForm();

    if (error) {
      setLocalError(error);
      return;
    }

    props.onSubmit({
      sourceCompetitionId: Number(formData.sourceCompetitionId),
      hostRanchId: props.currentRanchId,
      newCompetitionName: formData.newCompetitionName.trim(),
      newCompetitionStartDate: formData.newCompetitionStartDate,
      newCompetitionEndDate: formData.newCompetitionEndDate,
      registrationOpenDate: formData.registrationOpenDate || null,
      registrationEndDate: formData.registrationEndDate || null,
      paidTimeRegistrationDate: formData.paidTimeRegistrationDate || null,
      paidTimePublicationDate: formData.paidTimePublicationDate || null,
      notes: formData.notes.trim() || null,
      copyClasses: formData.copyClasses,
      copyClassPrices: formData.copyClassPrices,
      copyClassPrizes: formData.copyClassPrizes,
      copyReiningPatterns: formData.copyReiningPatterns,
      classJudgeIds: formData.classJudgeIds,
      copyPaidTimeSlots: formData.copyPaidTimeSlots,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-7 py-5">
          <div>
            <h2 className="text-[1.7rem] font-bold text-[#3F312B]">
              שכפול תחרות קיימת
            </h2>
            <p className="mt-1 text-sm text-[#8A7268]">
              בחרי תחרות מקור, הגדירי תאריכים חדשים ושופטים לתחרות החדשה.
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#6D4C41] transition-colors hover:bg-[#F8F5F2]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-7 py-6">
          {sourceCompetitions.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-right text-sm text-amber-800">
              לא נמצאו תחרויות קודמות באותו ענף עבור החווה הפעילה.
            </div>
          ) : (
            <div className="space-y-7">
              <div className="rounded-3xl border border-[#E8DDD7] bg-[#FFFCFA] p-5">
                <h3 className="mb-4 text-lg font-bold text-[#3F312B]">
                  1. בחירת תחרות מקור
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                      תחרות מקור
                    </label>

                    <CustomDropdown
                      dropdownKey="duplicate-source-competition"
                      openDropdownKey={openDropdownKey}
                      setOpenDropdownKey={setOpenDropdownKey}
                      options={sourceCompetitions}
                      value={formData.sourceCompetitionId}
                      placeholder="בחרי תחרות מקור"
                      searchable={true}
                      getOptionValue={function (item) {
                        return item.competitionId;
                      }}
                      getOptionLabel={function (item) {
                        return (
                          item.competitionName +
                          " · " +
                          formatDate(item.competitionStartDate) +
                          " - " +
                          formatDate(item.competitionEndDate)
                        );
                      }}
                      onChange={handleSourceChange}
                    />
                  </div>

                  <div className="rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm text-[#6D4C41]">
                    <div className="font-bold text-[#3F312B]">סיכום מקור</div>
                    <div className="mt-2">
                      ענף:{" "}
                      {selectedSourceCompetition?.fieldName ||
                        props.fieldName ||
                        "-"}
                    </div>
                    <div>
                      תאריכים:{" "}
                      {formatDate(
                        selectedSourceCompetition?.competitionStartDate,
                      )}{" "}
                      -{" "}
                      {formatDate(
                        selectedSourceCompetition?.competitionEndDate,
                      )}
                    </div>
                    <div>
                      משך מקור:{" "}
                      {sourceDuration ? sourceDuration + " ימים" : "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#E8DDD7] bg-white p-5">
                <h3 className="mb-4 text-lg font-bold text-[#3F312B]">
                  2. פרטי התחרות החדשה
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                      שם תחרות חדשה
                    </label>
                    <input
                      type="text"
                      value={formData.newCompetitionName}
                      onChange={function (e) {
                        handleChange("newCompetitionName", e.target.value);
                      }}
                      className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                      תאריך התחלה
                    </label>
                    <input
                      type="date"
                      value={formData.newCompetitionStartDate}
                      onChange={function (e) {
                        handleChange("newCompetitionStartDate", e.target.value);
                      }}
                      className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                      תאריך סיום
                    </label>
                    <input
                      type="date"
                      value={formData.newCompetitionEndDate}
                      onChange={function (e) {
                        handleChange("newCompetitionEndDate", e.target.value);
                      }}
                      className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                    />
                  </div>

                  {hasDifferentDuration ? (
                    <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
                      משך התחרות החדשה שונה ממשך תחרות המקור. המערכת תזיז את
                      תאריכי המקצים והפייד־טיים לפי תאריך ההתחלה החדש, אבל לאחר
                      השכפול מומלץ לעבור על המקצים והפייד־טיים ולסדר ידנית את
                      החלוקה לימים.
                    </div>
                  ) : null}

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
                      className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
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
                      className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                      פתיחת הרשמת פייד־טיים
                    </label>
                    <input
                      type="date"
                      value={formData.paidTimeRegistrationDate}
                      onChange={function (e) {
                        handleChange(
                          "paidTimeRegistrationDate",
                          e.target.value,
                        );
                      }}
                      className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                      פרסום לו״ז פייד־טיים
                    </label>
                    <input
                      type="date"
                      value={formData.paidTimePublicationDate}
                      onChange={function (e) {
                        handleChange("paidTimePublicationDate", e.target.value);
                      }}
                      className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                      הערות
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={function (e) {
                        handleChange("notes", e.target.value);
                      }}
                      className="w-full rounded-xl border border-[#D7CCC8] bg-white px-4 py-3 text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#E8DDD7] bg-[#FFFCFA] p-5">
                <h3 className="mb-4 text-lg font-bold text-[#3F312B]">
                  3. החלטות שכפול
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm font-semibold text-[#5D4037]">
                    <input
                      type="checkbox"
                      checked={formData.copyClasses}
                      onChange={function () {
                        toggleBoolean("copyClasses");
                      }}
                    />
                    שכפל מקצים
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm font-semibold text-[#5D4037]">
                    <input
                      type="checkbox"
                      checked={formData.copyClassPrices}
                      onChange={function () {
                        toggleBoolean("copyClassPrices");
                      }}
                      disabled={!formData.copyClasses}
                    />
                    שכפל מחירי מקצים
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm font-semibold text-[#5D4037]">
                    <input
                      type="checkbox"
                      checked={formData.copyClassPrizes}
                      onChange={function () {
                        toggleBoolean("copyClassPrizes");
                      }}
                      disabled={!formData.copyClasses}
                    />
                    שכפל פרסים
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm font-semibold text-[#5D4037]">
                    <input
                      type="checkbox"
                      checked={formData.copyReiningPatterns}
                      onChange={function () {
                        toggleBoolean("copyReiningPatterns");
                      }}
                      disabled={!formData.copyClasses}
                    />
                    שכפל מסלולי ריינינג
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm font-semibold text-[#5D4037] md:col-span-2">
                    <input
                      type="checkbox"
                      checked={formData.copyPaidTimeSlots}
                      onChange={function () {
                        toggleBoolean("copyPaidTimeSlots");
                      }}
                    />
                    שכפל לו״ז פייד־טיים
                  </label>
                </div>
              </div>

              {formData.copyClasses ? (
                <div className="rounded-3xl border border-[#E8DDD7] bg-white p-5">
                  <h3 className="mb-2 text-lg font-bold text-[#3F312B]">
                    4. שופטים לתחרות החדשה
                  </h3>
                  <p className="mb-4 text-sm text-[#8A7268]">
                    השופטים שתבחרי כאן יחולו על כל המקצים המשוכפלים. לאחר מכן
                    ניתן לערוך שופטים למקצה ספציפי במסך המקצים.
                  </p>

                  {judges.length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
                      לא נטענו שופטים לענף הנבחר. ודאי שנבחר ענף במסך פרטי
                      התחרות לפני פתיחת השכפול.
                    </div>
                  ) : (
                    <MultiSelectPicker
                      options={judges}
                      selectedValues={formData.classJudgeIds}
                      onToggleValue={toggleJudge}
                      getOptionValue={function (judge) {
                        return judge.judgeId;
                      }}
                      getOptionLabel={function (judge) {
                        return [judge.firstNameHebrew, judge.lastNameHebrew]
                          .filter(Boolean)
                          .join(" ");
                      }}
                      getOptionSearchText={function (judge) {
                        return [
                          judge.firstNameHebrew,
                          judge.lastNameHebrew,
                          judge.firstNameEnglish,
                          judge.lastNameEnglish,
                          judge.country,
                          judge.qualifiedFields,
                        ]
                          .filter(Boolean)
                          .join(" ");
                      }}
                      renderOptionMeta={function (judge) {
                        return [judge.country, judge.qualifiedFields]
                          .filter(Boolean)
                          .join(" • ");
                      }}
                      searchPlaceholder="חיפוש שופט לפי שם, מדינה או ענף"
                      emptySelectionText="לא נבחרו שופטים"
                      noResultsText="לא נמצאו שופטים להצגה"
                    />
                  )}
                </div>
              ) : null}

              <div className="rounded-3xl border border-[#E8DDD7] bg-[#FCFAF8] p-5 text-right text-sm text-[#6D4C41]">
                <div className="font-bold text-[#3F312B]">לא ישוכפלו:</div>
                <div className="mt-2">
                  הרשמות, חיובים, תשלומים, הזמנות תאים, שיבוץ תאים, נסורת, בקשות
                  פייד־טיים, סדרי כניסה ופרסומים.
                </div>
              </div>
            </div>
          )}

          {localError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
              {localError}
            </div>
          ) : null}

          {props.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
              {props.error}
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-start gap-3 border-t border-[#EFE5DF] pt-5">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[#D7CCC8] px-5 py-3 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
            >
              ביטול
            </button>

            <button
              type="submit"
              disabled={props.saving || sourceCompetitions.length === 0}
              className="rounded-xl bg-[#8B6352] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547] disabled:opacity-70"
            >
              {props.saving ? "משכפל..." : "צור תחרות משוכפלת"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
