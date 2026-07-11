import { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import CustomDropdown from "../common/CustomDropdown";
import MultiSelectPicker from "../common/MultiSelectPicker";
import {
  toInputDate,
  normalizeTimeForInput,
  normalizeTimeForServer,
} from "../../utils/competitionForm.utils";

// Required-field rules for the class type / arena / cost fields. Adding another
// mandatory field later (pending customer confirmation) is a one-line addition here.
var FIELD_VALIDATION_RULES = [
  {
    key: "classTypeId",
    message: "יש לבחור סוג מקצה",
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
    key: "organizerCost",
    message: "יש להזין עלות מארגן (0 ומעלה)",
    isValid: function (value) {
      if (value === "" || value === null || value === undefined) {
        return false;
      }

      var numericValue = Number(value);
      return !Number.isNaN(numericValue) && numericValue >= 0;
    },
  },
  {
    key: "federationCost",
    message: "יש להזין עלות התאחדות (0 ומעלה)",
    isValid: function (value) {
      if (value === "" || value === null || value === undefined) {
        return false;
      }

      var numericValue = Number(value);
      return !Number.isNaN(numericValue) && numericValue >= 0;
    },
  },
  {
    key: "classDate",
    message: "תאריך המקצה חייב להיות בטווח תאריכי התחרות",
    isValid: function (value, context) {
      if (!value) {
        return true;
      }

      var competitionStartDate = context?.competitionStartDate;
      var competitionEndDate = context?.competitionEndDate;

      if (competitionStartDate && value < competitionStartDate) {
        return false;
      }

      if (competitionEndDate && value > competitionEndDate) {
        return false;
      }

      return true;
    },
  },
];

function getFieldErrors(formData, context) {
  var errors = {};

  FIELD_VALIDATION_RULES.forEach(function (rule) {
    if (!rule.isValid(formData[rule.key], context)) {
      errors[rule.key] = rule.message;
    }
  });

  return errors;
}

function isPrizeRowEmpty(row) {
  var hasType = !!row.prizeTypeId;
  var hasAmount = row.prizeAmount !== "" && row.prizeAmount !== null && row.prizeAmount !== undefined;

  return !hasType && !hasAmount;
}

function validatePrizeRows(rows) {
  var rowErrors = {};
  var seenTypeIds = {};
  var duplicateError = "";

  rows.forEach(function (row) {
    if (isPrizeRowEmpty(row)) {
      return;
    }

    var hasType = !!row.prizeTypeId;
    var hasAmount = row.prizeAmount !== "" && row.prizeAmount !== null && row.prizeAmount !== undefined;
    var errors = {};

    if (!hasType) {
      errors.prizeTypeId = "יש לבחור סוג פרס";
    }

    if (!hasAmount) {
      errors.prizeAmount = "יש להזין סכום פרס";
    } else if (Number(row.prizeAmount) < 0) {
      errors.prizeAmount = "סכום הפרס אינו יכול להיות שלילי";
    }

    if (Object.keys(errors).length > 0) {
      rowErrors[row.rowId] = errors;
    }

    if (hasType) {
      if (seenTypeIds[row.prizeTypeId]) {
        duplicateError = "לא ניתן לבחור אותו סוג פרס יותר מפעם אחת באותו מקצה";
      }

      seenTypeIds[row.prizeTypeId] = true;
    }
  });

  return { rowErrors: rowErrors, duplicateError: duplicateError };
}

export default function ClassInCompetitionModal(props) {
  var isEdit = !!props.initialValue;

  var classTypes = Array.isArray(props.classTypes) ? props.classTypes : [];
  var arenas = Array.isArray(props.arenas) ? props.arenas : [];
  var judges = Array.isArray(props.judges) ? props.judges : [];
  var prizeTypes = Array.isArray(props.prizeTypes) ? props.prizeTypes : [];
  var patterns = Array.isArray(props.patterns) ? props.patterns : [];

  var [openDropdownKey, setOpenDropdownKey] = useState("");
  var [localError, setLocalError] = useState("");
  var [fieldErrors, setFieldErrors] = useState({});
  var [prizeRowErrors, setPrizeRowErrors] = useState({});
  var [prizeDuplicateError, setPrizeDuplicateError] = useState("");

  var nextRowIdRef = useRef(0);

  function createRowId() {
    nextRowIdRef.current += 1;
    return "prize-row-" + nextRowIdRef.current;
  }

  var normalizedFieldName = String(props.fieldName || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  var shouldShowPatternField =
    !!props.isReiningField ||
    normalizedFieldName.includes("ריינינג") ||
    !!props.initialValue?.patternNumber;

  var [formData, setFormData] = useState({
    classTypeId: "",
    arenaId: "",
    classDate: "",
    startTime: "",
    orderInDay: "",
    organizerCost: "",
    federationCost: "",
    classNotes: "",
    judgeIds: [],
    prizeRows: [],
    patternNumber: "",
  });

  var availableJudges = useMemo(
    function () {
      var defaultJudgeIds = Array.isArray(props.defaultJudgeIds)
        ? props.defaultJudgeIds
        : [];

      if (defaultJudgeIds.length === 0) {
        return [];
      }

      return judges.filter(function (judge) {
        return defaultJudgeIds.some(function (id) {
          return String(id) === String(judge.judgeId);
        });
      });
    },
    [judges, props.defaultJudgeIds],
  );

  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      setLocalError("");
      setFieldErrors({});
      setPrizeRowErrors({});
      setPrizeDuplicateError("");

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
          judgeIds:
            props.defaultJudgeIds && props.defaultJudgeIds.length > 0
              ? props.defaultJudgeIds.length === 1
                ? [props.defaultJudgeIds[0]]
                : []
              : [],
          prizeRows: [],
          patternNumber: "",
        });
        return;
      }

      var initialPrizes = Array.isArray(props.initialValue.prizes)
        ? props.initialValue.prizes
        : [];

      setFormData({
        classTypeId: props.initialValue.classTypeId
          ? String(props.initialValue.classTypeId)
          : "",
        arenaId: props.initialValue.arenaId
          ? String(props.initialValue.arenaId)
          : "",
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
        judgeIds: Array.isArray(props.initialValue.judgeIds)
          ? props.initialValue.judgeIds
          : [],
        prizeRows: initialPrizes.map(function (prize) {
          return {
            rowId: createRowId(),
            prizeTypeId:
              prize.prizeTypeId !== null && prize.prizeTypeId !== undefined
                ? String(prize.prizeTypeId)
                : "",
            prizeAmount:
              prize.prizeAmount !== null && prize.prizeAmount !== undefined
                ? String(prize.prizeAmount)
                : "",
          };
        }),
        patternNumber:
          props.initialValue.patternNumber !== null &&
          props.initialValue.patternNumber !== undefined
            ? String(props.initialValue.patternNumber)
            : "",
      });
    },
    [
      props.isOpen,
      props.initialValue,
      props.defaultDate,
      props.defaultJudgeIds,
    ],
  );

  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      if (isEdit) {
        return;
      }

      if (availableJudges.length === 1) {
        var onlyJudgeId = availableJudges[0].judgeId;

        setFormData(function (prev) {
          return {
            ...prev,
            judgeIds: [onlyJudgeId],
          };
        });
      }
    },
    [props.isOpen, isEdit, availableJudges],
  );

  if (!props.isOpen) {
    return null;
  }

  function handleChange(fieldName, value) {
    setLocalError("");
    setFieldErrors(function (prev) {
      if (!prev[fieldName]) {
        return prev;
      }

      var next = { ...prev };
      delete next[fieldName];
      return next;
    });

    setFormData(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  function toggleJudgeSelection(judgeId) {
    setLocalError("");

    setFormData(function (prev) {
      var currentJudgeIds = Array.isArray(prev.judgeIds) ? prev.judgeIds : [];
      var exists = currentJudgeIds.some(function (id) {
        return String(id) === String(judgeId);
      });

      return {
        ...prev,
        judgeIds: exists
          ? currentJudgeIds.filter(function (id) {
              return String(id) !== String(judgeId);
            })
          : [...currentJudgeIds, judgeId],
      };
    });
  }

  function addPrizeRow() {
    setPrizeDuplicateError("");

    setFormData(function (prev) {
      return {
        ...prev,
        prizeRows: [
          ...prev.prizeRows,
          { rowId: createRowId(), prizeTypeId: "", prizeAmount: "" },
        ],
      };
    });
  }

  function removePrizeRow(rowId) {
    setPrizeDuplicateError("");
    setPrizeRowErrors(function (prev) {
      if (!prev[rowId]) {
        return prev;
      }

      var next = { ...prev };
      delete next[rowId];
      return next;
    });

    setFormData(function (prev) {
      return {
        ...prev,
        prizeRows: prev.prizeRows.filter(function (row) {
          return row.rowId !== rowId;
        }),
      };
    });
  }

  function updatePrizeRow(rowId, fieldName, value) {
    setPrizeDuplicateError("");
    setPrizeRowErrors(function (prev) {
      if (!prev[rowId] || !prev[rowId][fieldName]) {
        return prev;
      }

      var nextRowErrors = { ...prev[rowId] };
      delete nextRowErrors[fieldName];

      var next = { ...prev };

      if (Object.keys(nextRowErrors).length === 0) {
        delete next[rowId];
      } else {
        next[rowId] = nextRowErrors;
      }

      return next;
    });

    setFormData(function (prev) {
      return {
        ...prev,
        prizeRows: prev.prizeRows.map(function (row) {
          if (row.rowId !== rowId) {
            return row;
          }

          return { ...row, [fieldName]: value };
        }),
      };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    var validationContext = {
      competitionStartDate: props.competitionStartDate || "",
      competitionEndDate: props.competitionEndDate || "",
    };

    var nextFieldErrors = getFieldErrors(formData, validationContext);
    var prizeValidation = validatePrizeRows(formData.prizeRows);

    setFieldErrors(nextFieldErrors);
    setPrizeRowErrors(prizeValidation.rowErrors);
    setPrizeDuplicateError(prizeValidation.duplicateError);

    if (
      Object.keys(nextFieldErrors).length > 0 ||
      Object.keys(prizeValidation.rowErrors).length > 0 ||
      prizeValidation.duplicateError
    ) {
      if (props.onShowToast) {
        props.onShowToast("error", "המקצה לא נשמר. יש למלא את השדות המסומנים.");
      }

      return;
    }

    if (shouldShowPatternField && !formData.patternNumber) {
      setLocalError("בענף ריינינג חובה לבחור מסלול");

      if (props.onShowToast) {
        props.onShowToast("error", "המקצה לא נשמר. יש למלא את השדות המסומנים.");
      }

      return;
    }

    var prizes = formData.prizeRows
      .filter(function (row) {
        return !isPrizeRowEmpty(row);
      })
      .map(function (row) {
        return {
          prizeTypeId: row.prizeTypeId ? Number(row.prizeTypeId) : null,
          prizeAmount: row.prizeAmount ? Number(row.prizeAmount) : null,
        };
      });

    props.onSubmit({
      classTypeId: formData.classTypeId ? Number(formData.classTypeId) : "",
      arenaId: formData.arenaId ? Number(formData.arenaId) : "",
      classDateTime: formData.classDate
        ? formData.classDate + "T12:00:00"
        : null,
      startTime: normalizeTimeForServer(formData.startTime),
      orderInDay: formData.orderInDay ? Number(formData.orderInDay) : null,
      organizerCost: formData.organizerCost
        ? Number(formData.organizerCost)
        : null,
      federationCost: formData.federationCost
        ? Number(formData.federationCost)
        : null,
      classNotes: formData.classNotes.trim() || null,
      judgeIds: formData.judgeIds,
      prizes: prizes,
      patternNumber: shouldShowPatternField
        ? formData.patternNumber
          ? Number(formData.patternNumber)
          : null
        : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl">
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

        <form onSubmit={handleSubmit} className="overflow-y-auto px-7 py-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                סוג מקצה
              </label>

              <CustomDropdown
                dropdownKey="class-type"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                options={classTypes}
                value={formData.classTypeId}
                placeholder="בחרי סוג מקצה"
                searchable={true}
                getOptionValue={function (item) {
                  return item.classTypeId;
                }}
                getOptionLabel={function (item) {
                  return item.className;
                }}
                onChange={function (e) {
                  handleChange("classTypeId", e.target.value);
                }}
              />

              {fieldErrors.classTypeId ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.classTypeId}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                מגרש
              </label>

              <CustomDropdown
                dropdownKey="class-arena"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                options={arenas}
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
                תאריך
              </label>
              <input
                type="date"
                value={formData.classDate}
                min={props.competitionStartDate || undefined}
                max={props.competitionEndDate || undefined}
                onChange={function (e) {
                  handleChange("classDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />

              {fieldErrors.classDate ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.classDate}
                </div>
              ) : null}
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

              {fieldErrors.organizerCost ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.organizerCost}
                </div>
              ) : null}
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

              {fieldErrors.federationCost ? (
                <div className="mt-1.5 text-right text-xs text-red-600">
                  {fieldErrors.federationCost}
                </div>
              ) : null}
            </div>

            {shouldShowPatternField ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                  מסלול
                </label>

                <CustomDropdown
                  dropdownKey="class-pattern"
                  openDropdownKey={openDropdownKey}
                  setOpenDropdownKey={setOpenDropdownKey}
                  options={patterns}
                  value={formData.patternNumber}
                  placeholder="בחרי מסלול"
                  searchable={true}
                  getOptionValue={function (item) {
                    return item.patternNumber;
                  }}
                  getOptionLabel={function (item) {
                    return "מסלול " + item.patternNumber;
                  }}
                  onChange={function (e) {
                    handleChange("patternNumber", e.target.value);
                  }}
                />
              </div>
            ) : null}

            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-[#6D4C41]">
                  פרסים
                </label>

                <button
                  type="button"
                  onClick={addPrizeRow}
                  className="flex items-center gap-1 rounded-lg border border-[#D7CCC8] px-3 py-1.5 text-xs font-semibold text-[#6D4C41] transition-colors hover:bg-[#F8F5F2]"
                >
                  <Plus size={14} />
                  הוספת פרס
                </button>
              </div>

              {formData.prizeRows.length === 0 ? (
                <div className="rounded-2xl border border-[#D7CCC8] bg-[#FFFCFA] px-4 py-4 text-right text-sm text-[#8B6A5A]">
                  לא נוספו פרסים למקצה זה.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {formData.prizeRows.map(function (row) {
                    var rowErrors = prizeRowErrors[row.rowId] || {};

                    return (
                      <div
                        key={row.rowId}
                        className="rounded-2xl border border-[#E6DCD5] bg-[#FBF8F6] p-3"
                      >
                        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
                          <div>
                            <CustomDropdown
                              dropdownKey={"prize-type-" + row.rowId}
                              openDropdownKey={openDropdownKey}
                              setOpenDropdownKey={setOpenDropdownKey}
                              options={prizeTypes}
                              value={row.prizeTypeId}
                              placeholder="בחרי סוג פרס"
                              searchable={true}
                              getOptionValue={function (item) {
                                return item.prizeTypeId;
                              }}
                              getOptionLabel={function (item) {
                                return item.prizeTypeName;
                              }}
                              onChange={function (e) {
                                updatePrizeRow(
                                  row.rowId,
                                  "prizeTypeId",
                                  e.target.value,
                                );
                              }}
                            />

                            {rowErrors.prizeTypeId ? (
                              <div className="mt-1.5 text-right text-xs text-red-600">
                                {rowErrors.prizeTypeId}
                              </div>
                            ) : null}
                          </div>

                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="סכום פרס"
                              value={row.prizeAmount}
                              onChange={function (e) {
                                updatePrizeRow(
                                  row.rowId,
                                  "prizeAmount",
                                  e.target.value,
                                );
                              }}
                              className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                            />

                            {rowErrors.prizeAmount ? (
                              <div className="mt-1.5 text-right text-xs text-red-600">
                                {rowErrors.prizeAmount}
                              </div>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={function () {
                              removePrizeRow(row.rowId);
                            }}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E7BABA] text-red-600 transition-colors hover:bg-[#FDF4F4]"
                            title="הסרת פרס"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {prizeDuplicateError ? (
                <div className="mt-2 text-right text-xs text-red-600">
                  {prizeDuplicateError}
                </div>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                שופטים למקצה
              </label>

              {availableJudges.length === 0 ? (
                <div className="rounded-2xl border border-[#D7CCC8] bg-[#FFFCFA] px-4 py-4 text-right text-sm text-[#8B6A5A]">
                  יש לבחור קודם שופטים כלליים בחלק העליון של הגדרת התחרות.
                </div>
              ) : (
                <>
                  <div className="mb-3 text-right text-sm text-[#8B6A5A]">
                    ניתן לבחור רק מבין השופטים שהוגדרו קודם בתחרות.
                  </div>

                  <MultiSelectPicker
                    options={availableJudges}
                    selectedValues={formData.judgeIds}
                    onToggleValue={toggleJudgeSelection}
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
                </>
              )}
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

          {localError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
              {localError}
            </div>
          ) : null}

          {!localError && props.error ? (
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
