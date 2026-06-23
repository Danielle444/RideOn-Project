import { useEffect, useMemo, useState } from "react";
import SectionCard from "./SectionCard";
import CustomDropdown from "../../common/CustomDropdown";
import MultiSelectPicker from "../../common/MultiSelectPicker";
import JudgeModal from "../../common/JudgeModal";
import useJudgeCreation from "../../../hooks/common/useJudgeCreation";
import { getAllJudges } from "../../../services/superUserService";
import { getClassesByCompetitionId } from "../../../services/classInCompetitionService";
import { getPaidTimeSlotsByCompetitionId } from "../../../services/paidTimeSlotInCompetitionService";

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

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 5);
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return "₪" + value;
}

function getDaysBetween(baseDate, targetDate) {
  if (!baseDate || !targetDate) {
    return null;
  }

  var base = new Date(baseDate);
  var target = new Date(targetDate);

  if (Number.isNaN(base.getTime()) || Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.round(
    (target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getDaysDuration(startDate, endDate) {
  var daysBetween = getDaysBetween(startDate, endDate);

  if (daysBetween === null) {
    return null;
  }

  return daysBetween + 1;
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

function shiftDateFromSource(sourceStartDate, sourceDate, newStartDate) {
  var sourceStart = toInputDate(sourceStartDate);
  var sourceTarget = toInputDate(sourceDate);
  var newStart = toInputDate(newStartDate);

  if (!sourceStart || !sourceTarget || !newStart) {
    return "";
  }

  var offset = getDaysBetween(sourceStart, sourceTarget);

  if (offset === null) {
    return "";
  }

  return addDaysToInputDate(newStart, offset);
}

function buildEmptyForm() {
  return {
    fieldId: "",
    sourceCompetitionId: "",
    newCompetitionName: "",
    newCompetitionStartDate: "",
    newCompetitionEndDate: "",
    registrationOpenDate: "",
    registrationEndDate: "",
    paidTimeRegistrationDate: "",
    paidTimePublicationDate: "",
    notes: "",
    copyClasses: true,
    copyClassPrices: true,
    copyClassPrizes: true,
    copyReiningPatterns: false,
    copyPaidTimeSlots: false,
    classJudgeIds: [],
  };
}

function buildFormFromSource(sourceCompetition, fieldId, newStartDate) {
  var sourceStart = toInputDate(sourceCompetition?.competitionStartDate);
  var effectiveNewStart = newStartDate || sourceStart || "";

  return {
    fieldId:
      fieldId ||
      (sourceCompetition?.fieldId ? String(sourceCompetition.fieldId) : ""),
    sourceCompetitionId: sourceCompetition?.competitionId
      ? String(sourceCompetition.competitionId)
      : "",
    newCompetitionName: sourceCompetition?.competitionName
      ? sourceCompetition.competitionName + " - עותק"
      : "",
    newCompetitionStartDate: effectiveNewStart,
    newCompetitionEndDate: shiftDateFromSource(
      sourceCompetition?.competitionStartDate,
      sourceCompetition?.competitionEndDate,
      effectiveNewStart,
    ),
    registrationOpenDate: shiftDateFromSource(
      sourceCompetition?.competitionStartDate,
      sourceCompetition?.registrationOpenDate,
      effectiveNewStart,
    ),
    registrationEndDate: shiftDateFromSource(
      sourceCompetition?.competitionStartDate,
      sourceCompetition?.registrationEndDate,
      effectiveNewStart,
    ),
    paidTimeRegistrationDate: shiftDateFromSource(
      sourceCompetition?.competitionStartDate,
      sourceCompetition?.paidTimeRegistrationDate,
      effectiveNewStart,
    ),
    paidTimePublicationDate: shiftDateFromSource(
      sourceCompetition?.competitionStartDate,
      sourceCompetition?.paidTimePublicationDate,
      effectiveNewStart,
    ),
    notes: "",
    copyClasses: true,
    copyClassPrices: true,
    copyClassPrizes: true,
    copyReiningPatterns: false,
    copyPaidTimeSlots: false,
    classJudgeIds: [],
  };
}

function getClassSourceDate(item) {
  return item.classDateTime || item.classdatetime || item.classDate || null;
}

function getPaidTimeSlotInCompId(item) {
  return (
    item.paidTimeSlotInCompId ||
    item.PaidTimeSlotInCompId ||
    item.paidtimeslotincompid ||
    item.paidTimeSlotInCompetitionId ||
    null
  );
}

function buildClassesPreview(classes, sourceCompetition, newStartDate) {
  if (!Array.isArray(classes) || !sourceCompetition || !newStartDate) {
    return [];
  }

  return classes.map(function (item) {
    var sourceDate = getClassSourceDate(item);
    var newDate = shiftDateFromSource(
      sourceCompetition.competitionStartDate,
      sourceDate,
      newStartDate,
    );

    return {
      classInCompId: item.classInCompId,
      className: item.className || "-",
      sourceDate: sourceDate,
      newDate: newDate,
      startTime: item.startTime,
      arenaName: item.arenaName || "-",
      organizerCost: item.organizerCost,
      federationCost: item.federationCost,
      prizeTypeName: item.prizeTypeName,
      prizeAmount: item.prizeAmount,
      patternNumber: item.patternNumber,
    };
  });
}

function buildPaidTimePreview(slots, sourceCompetition, newStartDate) {
  if (!Array.isArray(slots) || !sourceCompetition || !newStartDate) {
    return [];
  }

  return slots.map(function (item) {
    var sourceDate = item.slotDate || item.slotdate || null;
    var newDate = shiftDateFromSource(
      sourceCompetition.competitionStartDate,
      sourceDate,
      newStartDate,
    );

    return {
      paidTimeSlotInCompId: getPaidTimeSlotInCompId(item),
      sourceDate: sourceDate,
      newDate: newDate,
      startTime: item.startTime,
      endTime: item.endTime,
      arenaName: item.arenaName || "-",
      paidTimeSlotName: item.paidTimeSlotName || item.productName || "-",
    };
  });
}

function buildClassSelectionRows(classes, defaultValues) {
  if (!Array.isArray(classes)) {
    return [];
  }

  return classes.map(function (item) {
    return {
      sourceClassInCompId: item.classInCompId,
      copyClass: !!defaultValues.copyClasses,
      copyClassPrices: !!defaultValues.copyClassPrices,
      copyClassPrizes: !!defaultValues.copyClassPrizes,
      copyReiningPattern:
        !!defaultValues.copyReiningPatterns &&
        item.patternNumber !== null &&
        item.patternNumber !== undefined &&
        item.patternNumber !== "",
    };
  });
}

function buildPaidTimeSelectionRows(slots, shouldCopy) {
  if (!Array.isArray(slots)) {
    return [];
  }

  return slots.map(function (item) {
    return {
      sourcePaidTimeSlotInCompId: getPaidTimeSlotInCompId(item),
      copyPaidTimeSlot: !!shouldCopy,
    };
  });
}

export default function DuplicateCompetitionSetupSection(props) {
  var fields = Array.isArray(props.fields) ? props.fields : [];
  var sourceCompetitions = Array.isArray(props.sourceCompetitions)
    ? props.sourceCompetitions
    : [];

  var [openDropdownKey, setOpenDropdownKey] = useState("");
  var [localError, setLocalError] = useState("");
  var [formData, setFormData] = useState(buildEmptyForm());

  var [fieldJudges, setFieldJudges] = useState([]);
  var [judgesLoading, setJudgesLoading] = useState(false);
  var [judgesError, setJudgesError] = useState("");

  var [sourceDetailsLoading, setSourceDetailsLoading] = useState(false);
  var [sourceHasReiningPatterns, setSourceHasReiningPatterns] = useState(false);
  var [sourceHasPaidTimeSlots, setSourceHasPaidTimeSlots] = useState(false);
  var [sourceDetailsError, setSourceDetailsError] = useState("");
  var [sourceClasses, setSourceClasses] = useState([]);
  var [sourcePaidTimeSlots, setSourcePaidTimeSlots] = useState([]);

  var [classSelectionRows, setClassSelectionRows] = useState([]);
  var [paidTimeSelectionRows, setPaidTimeSelectionRows] = useState([]);

  var selectedField = useMemo(
    function () {
      return fields.find(function (field) {
        return String(field.fieldId) === String(formData.fieldId);
      });
    },
    [fields, formData.fieldId],
  );

  var filteredSourceCompetitions = useMemo(
    function () {
      if (!formData.fieldId) {
        return [];
      }

      return sourceCompetitions.filter(function (item) {
        return String(item.fieldId) === String(formData.fieldId);
      });
    },
    [sourceCompetitions, formData.fieldId],
  );

  var selectedSourceCompetition = useMemo(
    function () {
      return filteredSourceCompetitions.find(function (item) {
        return (
          String(item.competitionId) === String(formData.sourceCompetitionId)
        );
      });
    },
    [filteredSourceCompetitions, formData.sourceCompetitionId],
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

  var classesPreview = useMemo(
    function () {
      return buildClassesPreview(
        sourceClasses,
        selectedSourceCompetition,
        formData.newCompetitionStartDate,
      );
    },
    [
      sourceClasses,
      selectedSourceCompetition,
      formData.newCompetitionStartDate,
    ],
  );

  var paidTimePreview = useMemo(
    function () {
      return buildPaidTimePreview(
        sourcePaidTimeSlots,
        selectedSourceCompetition,
        formData.newCompetitionStartDate,
      );
    },
    [
      sourcePaidTimeSlots,
      selectedSourceCompetition,
      formData.newCompetitionStartDate,
    ],
  );

  var selectedClassesCount = classSelectionRows.filter(function (item) {
    return item.copyClass;
  }).length;

  var selectedPrizesCount = classSelectionRows.filter(function (item) {
    return item.copyClass && item.copyClassPrizes;
  }).length;

  var selectedPatternsCount = classSelectionRows.filter(function (item) {
    return item.copyClass && item.copyReiningPattern;
  }).length;

  var selectedPaidTimeCount = paidTimeSelectionRows.filter(function (item) {
    return item.copyPaidTimeSlot;
  }).length;

  var judgeCreation = useJudgeCreation({
    fieldId: formData.fieldId,
    onJudgesUpdated: function (refreshedJudges) {
      setFieldJudges(Array.isArray(refreshedJudges) ? refreshedJudges : []);
    },
    onJudgeCreated: function (createdJudge) {
      if (!createdJudge || !createdJudge.judgeId) {
        return;
      }

      setFormData(function (prev) {
        var current = Array.isArray(prev.classJudgeIds)
          ? prev.classJudgeIds
          : [];

        var exists = current.some(function (id) {
          return String(id) === String(createdJudge.judgeId);
        });

        if (exists) {
          return prev;
        }

        return {
          ...prev,
          classJudgeIds: [...current, createdJudge.judgeId],
        };
      });
    },
  });

  useEffect(
    function () {
      if (!formData.fieldId) {
        setFieldJudges([]);
        setJudgesError("");
        return;
      }

      loadJudgesByField(Number(formData.fieldId));
    },
    [formData.fieldId],
  );

  useEffect(
    function () {
      if (!formData.sourceCompetitionId || !props.currentRanchId) {
        setSourceDetailsError("");
        setSourceHasReiningPatterns(false);
        setSourceHasPaidTimeSlots(false);
        setSourceClasses([]);
        setSourcePaidTimeSlots([]);
        setClassSelectionRows([]);
        setPaidTimeSelectionRows([]);

        setFormData(function (prev) {
          return {
            ...prev,
            copyReiningPatterns: false,
            copyPaidTimeSlots: false,
          };
        });

        return;
      }

      loadSourceCompetitionDetails(
        Number(formData.sourceCompetitionId),
        props.currentRanchId,
      );
    },
    [formData.sourceCompetitionId, props.currentRanchId],
  );

  async function loadJudgesByField(fieldId) {
    try {
      setJudgesLoading(true);
      setJudgesError("");
      setFieldJudges([]);

      var response = await getAllJudges(fieldId);

      setFieldJudges(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setFieldJudges([]);
      setJudgesError("שגיאה בטעינת שופטים לענף שנבחר");
    } finally {
      setJudgesLoading(false);
    }
  }

  async function loadSourceCompetitionDetails(sourceCompetitionId, ranchId) {
    try {
      setSourceDetailsLoading(true);
      setSourceDetailsError("");

      var classesResponse = await getClassesByCompetitionId(
        sourceCompetitionId,
        ranchId,
      );

      var classes = Array.isArray(classesResponse.data)
        ? classesResponse.data
        : [];

      var hasPatterns = classes.some(function (item) {
        return (
          item.patternNumber !== null &&
          item.patternNumber !== undefined &&
          item.patternNumber !== ""
        );
      });

      var paidTimeResponse = await getPaidTimeSlotsByCompetitionId(
        sourceCompetitionId,
        ranchId,
      );

      var paidTimeSlots = Array.isArray(paidTimeResponse.data)
        ? paidTimeResponse.data
        : [];

      setSourceClasses(classes);
      setSourcePaidTimeSlots(paidTimeSlots);
      setSourceHasReiningPatterns(hasPatterns);
      setSourceHasPaidTimeSlots(paidTimeSlots.length > 0);

      setClassSelectionRows(
        buildClassSelectionRows(classes, {
          copyClasses: true,
          copyClassPrices: true,
          copyClassPrizes: true,
          copyReiningPatterns: false,
        }),
      );

      setPaidTimeSelectionRows(
        buildPaidTimeSelectionRows(paidTimeSlots, paidTimeSlots.length > 0),
      );

      setFormData(function (prev) {
        return {
          ...prev,
          copyClasses: true,
          copyClassPrices: true,
          copyClassPrizes: true,
          copyReiningPatterns: false,
          copyPaidTimeSlots: paidTimeSlots.length > 0,
        };
      });
    } catch (error) {
      console.error(error);

      setSourceClasses([]);
      setSourcePaidTimeSlots([]);
      setClassSelectionRows([]);
      setPaidTimeSelectionRows([]);
      setSourceHasReiningPatterns(false);
      setSourceHasPaidTimeSlots(false);
      setSourceDetailsError(
        "לא הצלחנו לבדוק האם קיימים מסלולי ריינינג או פייד־טיים בתחרות המקור",
      );

      setFormData(function (prev) {
        return {
          ...prev,
          copyReiningPatterns: false,
          copyPaidTimeSlots: false,
        };
      });
    } finally {
      setSourceDetailsLoading(false);
    }
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

  function handleFieldChange(e) {
    var fieldId = e.target.value;

    setLocalError("");
    setSourceDetailsError("");
    setJudgesError("");
    setSourceHasReiningPatterns(false);
    setSourceHasPaidTimeSlots(false);
    setSourceClasses([]);
    setSourcePaidTimeSlots([]);
    setClassSelectionRows([]);
    setPaidTimeSelectionRows([]);
    setFieldJudges([]);

    setFormData(function (prev) {
      return {
        ...buildEmptyForm(),
        fieldId: fieldId,
        newCompetitionStartDate: prev.newCompetitionStartDate,
      };
    });
  }

  function handleSourceChange(e) {
    var sourceCompetitionId = e.target.value;

    var sourceCompetition = filteredSourceCompetitions.find(function (item) {
      return String(item.competitionId) === String(sourceCompetitionId);
    });

    setLocalError("");
    setSourceDetailsError("");
    setSourceHasReiningPatterns(false);
    setSourceHasPaidTimeSlots(false);
    setSourceClasses([]);
    setSourcePaidTimeSlots([]);
    setClassSelectionRows([]);
    setPaidTimeSelectionRows([]);

    if (!sourceCompetition) {
      setFormData(function (prev) {
        return {
          ...prev,
          sourceCompetitionId: "",
          copyReiningPatterns: false,
          copyPaidTimeSlots: false,
        };
      });
      return;
    }

    setFormData(function (prev) {
      return buildFormFromSource(
        sourceCompetition,
        prev.fieldId,
        prev.newCompetitionStartDate ||
          toInputDate(sourceCompetition.competitionStartDate),
      );
    });
  }

  function handleNewStartDateChange(value) {
    setLocalError("");

    setFormData(function (prev) {
      if (!selectedSourceCompetition) {
        return {
          ...prev,
          newCompetitionStartDate: value,
        };
      }

      return {
        ...prev,
        newCompetitionStartDate: value,
        newCompetitionEndDate: shiftDateFromSource(
          selectedSourceCompetition.competitionStartDate,
          selectedSourceCompetition.competitionEndDate,
          value,
        ),
        registrationOpenDate: shiftDateFromSource(
          selectedSourceCompetition.competitionStartDate,
          selectedSourceCompetition.registrationOpenDate,
          value,
        ),
        registrationEndDate: shiftDateFromSource(
          selectedSourceCompetition.competitionStartDate,
          selectedSourceCompetition.registrationEndDate,
          value,
        ),
        paidTimeRegistrationDate: shiftDateFromSource(
          selectedSourceCompetition.competitionStartDate,
          selectedSourceCompetition.paidTimeRegistrationDate,
          value,
        ),
        paidTimePublicationDate: shiftDateFromSource(
          selectedSourceCompetition.competitionStartDate,
          selectedSourceCompetition.paidTimePublicationDate,
          value,
        ),
      };
    });
  }

  function setAllClassesFlag(fieldName, value) {
    setClassSelectionRows(function (prev) {
      return prev.map(function (item) {
        var nextItem = {
          ...item,
          [fieldName]: value,
        };

        if (fieldName === "copyClass" && value === false) {
          nextItem.copyClassPrices = false;
          nextItem.copyClassPrizes = false;
          nextItem.copyReiningPattern = false;
        }

        return nextItem;
      });
    });
  }

  function toggleBoolean(fieldName) {
    setLocalError("");

    setFormData(function (prev) {
      var nextValue = !prev[fieldName];

      if (fieldName === "copyClasses") {
        setAllClassesFlag("copyClass", nextValue);

        return {
          ...prev,
          copyClasses: nextValue,
          copyClassPrices: nextValue ? prev.copyClassPrices : false,
          copyClassPrizes: nextValue ? prev.copyClassPrizes : false,
          copyReiningPatterns: nextValue ? prev.copyReiningPatterns : false,
        };
      }

      if (fieldName === "copyClassPrices") {
        setAllClassesFlag("copyClassPrices", nextValue);

        return {
          ...prev,
          copyClassPrices: nextValue,
        };
      }

      if (fieldName === "copyClassPrizes") {
        setAllClassesFlag("copyClassPrizes", nextValue);

        return {
          ...prev,
          copyClassPrizes: nextValue,
        };
      }

      if (fieldName === "copyReiningPatterns") {
        setClassSelectionRows(function (rows) {
          return rows.map(function (item) {
            var classPreviewItem = classesPreview.find(function (previewItem) {
              return (
                String(previewItem.classInCompId) ===
                String(item.sourceClassInCompId)
              );
            });

            var hasPattern =
              classPreviewItem &&
              classPreviewItem.patternNumber !== null &&
              classPreviewItem.patternNumber !== undefined &&
              classPreviewItem.patternNumber !== "";

            return {
              ...item,
              copyReiningPattern: nextValue && hasPattern,
            };
          });
        });

        return {
          ...prev,
          copyReiningPatterns: nextValue,
        };
      }

      if (fieldName === "copyPaidTimeSlots") {
        setPaidTimeSelectionRows(function (rows) {
          return rows.map(function (item) {
            return {
              ...item,
              copyPaidTimeSlot: nextValue,
            };
          });
        });

        return {
          ...prev,
          copyPaidTimeSlots: nextValue,
        };
      }

      return {
        ...prev,
        [fieldName]: nextValue,
      };
    });
  }

  function toggleClassRow(classInCompId) {
    setLocalError("");

    setClassSelectionRows(function (prev) {
      return prev.map(function (item) {
        if (String(item.sourceClassInCompId) !== String(classInCompId)) {
          return item;
        }

        var nextCopyClass = !item.copyClass;

        return {
          ...item,
          copyClass: nextCopyClass,
          copyClassPrices: nextCopyClass ? item.copyClassPrices : false,
          copyClassPrizes: nextCopyClass ? item.copyClassPrizes : false,
          copyReiningPattern: nextCopyClass ? item.copyReiningPattern : false,
        };
      });
    });
  }

  function toggleClassRowFlag(classInCompId, fieldName) {
    setLocalError("");

    setClassSelectionRows(function (prev) {
      return prev.map(function (item) {
        if (String(item.sourceClassInCompId) !== String(classInCompId)) {
          return item;
        }

        if (!item.copyClass) {
          return item;
        }

        return {
          ...item,
          [fieldName]: !item[fieldName],
        };
      });
    });
  }

  function togglePaidTimeRow(paidTimeSlotInCompId) {
    setLocalError("");

    setPaidTimeSelectionRows(function (prev) {
      return prev.map(function (item) {
        if (
          String(item.sourcePaidTimeSlotInCompId) !==
          String(paidTimeSlotInCompId)
        ) {
          return item;
        }

        return {
          ...item,
          copyPaidTimeSlot: !item.copyPaidTimeSlot,
        };
      });
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

  function getClassSelection(classInCompId) {
    return classSelectionRows.find(function (item) {
      return String(item.sourceClassInCompId) === String(classInCompId);
    });
  }

  function getPaidTimeSelection(paidTimeSlotInCompId) {
    return paidTimeSelectionRows.find(function (item) {
      return (
        String(item.sourcePaidTimeSlotInCompId) === String(paidTimeSlotInCompId)
      );
    });
  }

  function validateForm() {
    if (!formData.fieldId) {
      return "יש לבחור ענף";
    }

    if (!formData.sourceCompetitionId) {
      return "יש לבחור תחרות מקור לשכפול";
    }

    if (sourceDetailsLoading) {
      return "רגע, המערכת עדיין בודקת את נתוני תחרות המקור";
    }

    if (judgesLoading) {
      return "רגע, המערכת עדיין טוענת שופטים לענף שנבחר";
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

    if (selectedClassesCount > 0 && formData.classJudgeIds.length === 0) {
      return "אם משכפלים מקצים, חובה לבחור לפחות שופט אחד לתחרות החדשה";
    }

    if (selectedClassesCount === 0 && selectedPaidTimeCount === 0) {
      return "יש לבחור לפחות מקצה אחד או פייד־טיים אחד לשכפול";
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
      classJudgeIds: selectedClassesCount > 0 ? formData.classJudgeIds : [],
      classes: classSelectionRows,
      paidTimeSlots: paidTimeSelectionRows,
    });
  }

  return (
    <SectionCard
      title="הקמה משכפול תחרות קיימת"
      isOpen={true}
      onToggle={function () {}}
      statusText="טיוטה חדשה"
    >
      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="rounded-3xl border border-[#E8DDD7] bg-[#FFFCFA] p-5">
          <h3 className="mb-4 text-lg font-bold text-[#3F312B]">
            1. בחירת ענף ותחרות מקור
          </h3>

          {props.loading ? (
            <div className="rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm text-[#8A7268]">
              טוען תחרויות מקור...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                  ענף
                </label>

                <CustomDropdown
                  dropdownKey="duplicate-field"
                  openDropdownKey={openDropdownKey}
                  setOpenDropdownKey={setOpenDropdownKey}
                  options={fields}
                  value={formData.fieldId}
                  placeholder="בחרי ענף"
                  searchable={true}
                  getOptionValue={function (item) {
                    return item.fieldId;
                  }}
                  getOptionLabel={function (item) {
                    return item.fieldName;
                  }}
                  onChange={handleFieldChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                  תחרות מקור
                </label>

                <CustomDropdown
                  dropdownKey="duplicate-source-competition"
                  openDropdownKey={openDropdownKey}
                  setOpenDropdownKey={setOpenDropdownKey}
                  options={filteredSourceCompetitions}
                  value={formData.sourceCompetitionId}
                  placeholder={
                    formData.fieldId ? "בחרי תחרות מקור" : "בחרי קודם ענף"
                  }
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

              {formData.fieldId && filteredSourceCompetitions.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
                  לא נמצאו תחרויות קודמות בענף {selectedField?.fieldName || ""}.
                </div>
              ) : null}
            </div>
          )}
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
                  handleNewStartDateChange(e.target.value);
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
                משך התחרות החדשה שונה ממשך תחרות המקור. לאחר השכפול מומלץ לעבור
                על המקצים והפייד־טיים ולסדר ידנית את החלוקה לימים.
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
                  handleChange("paidTimeRegistrationDate", e.target.value);
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
            3. החלטות שכפול כלליות
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
              סמן את כל המקצים לשכפול
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
              סמן מחירים לכל המקצים
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
              סמן פרסים לכל המקצים
            </label>

            {sourceHasReiningPatterns ? (
              <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm font-semibold text-[#5D4037]">
                <input
                  type="checkbox"
                  checked={formData.copyReiningPatterns}
                  onChange={function () {
                    toggleBoolean("copyReiningPatterns");
                  }}
                  disabled={!formData.copyClasses}
                />
                סמן מסלולי ריינינג קיימים
              </label>
            ) : null}

            {sourceHasPaidTimeSlots ? (
              <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDD7] bg-white px-4 py-3 text-right text-sm font-semibold text-[#5D4037] md:col-span-2">
                <input
                  type="checkbox"
                  checked={formData.copyPaidTimeSlots}
                  onChange={function () {
                    toggleBoolean("copyPaidTimeSlots");
                  }}
                />
                סמן את כל לו״ז הפייד־טיים לשכפול
              </label>
            ) : null}
          </div>
        </div>

        {selectedSourceCompetition && !sourceDetailsLoading ? (
          <div className="rounded-3xl border border-[#E8DDD7] bg-white p-5">
            <h3 className="mb-4 text-lg font-bold text-[#3F312B]">
              4. בחירת נתונים לשכפול
            </h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="rounded-2xl bg-[#F8F5F2] px-4 py-3 text-center">
                <div className="text-xs text-[#8A7268]">מקצים</div>
                <div className="text-xl font-bold text-[#3F312B]">
                  {selectedClassesCount}
                </div>
              </div>

              <div className="rounded-2xl bg-[#F8F5F2] px-4 py-3 text-center">
                <div className="text-xs text-[#8A7268]">פרסים</div>
                <div className="text-xl font-bold text-[#3F312B]">
                  {selectedPrizesCount}
                </div>
              </div>

              <div className="rounded-2xl bg-[#F8F5F2] px-4 py-3 text-center">
                <div className="text-xs text-[#8A7268]">מסלולים</div>
                <div className="text-xl font-bold text-[#3F312B]">
                  {selectedPatternsCount}
                </div>
              </div>

              <div className="rounded-2xl bg-[#F8F5F2] px-4 py-3 text-center">
                <div className="text-xs text-[#8A7268]">פייד־טיים</div>
                <div className="text-xl font-bold text-[#3F312B]">
                  {selectedPaidTimeCount}
                </div>
              </div>

              <div className="rounded-2xl bg-[#F8F5F2] px-4 py-3 text-center">
                <div className="text-xs text-[#8A7268]">שופטים</div>
                <div className="text-xl font-bold text-[#3F312B]">
                  {formData.classJudgeIds.length}
                </div>
              </div>
            </div>

            {classesPreview.length > 0 ? (
              <div className="mt-6">
                <h4 className="mb-3 font-bold text-[#3F312B]">מקצים לבחירה</h4>

                <div className="max-h-[360px] overflow-auto rounded-2xl border border-[#E8DDD7]">
                  <table className="w-full min-w-[1180px] text-right text-sm">
                    <thead className="sticky top-0 bg-[#FAF7F5] text-[#4E342E]">
                      <tr>
                        <th className="px-4 py-3">שכפל</th>
                        <th className="px-4 py-3">מקצה</th>
                        <th className="px-4 py-3">תאריך מקור</th>
                        <th className="px-4 py-3">תאריך חדש</th>
                        <th className="px-4 py-3">שעה</th>
                        <th className="px-4 py-3">מגרש</th>
                        <th className="px-4 py-3">מחירים</th>
                        <th className="px-4 py-3">פרס</th>
                        <th className="px-4 py-3">מסלול</th>
                      </tr>
                    </thead>

                    <tbody>
                      {classesPreview.map(function (item, index) {
                        var selection = getClassSelection(item.classInCompId);
                        var isClassSelected = !!selection?.copyClass;
                        var hasPattern =
                          item.patternNumber !== null &&
                          item.patternNumber !== undefined &&
                          item.patternNumber !== "";

                        return (
                          <tr
                            key={item.classInCompId || index}
                            className={
                              "border-t border-[#F1E8E3] " +
                              (isClassSelected
                                ? "bg-white"
                                : "bg-[#FAFAFA] opacity-70")
                            }
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isClassSelected}
                                onChange={function () {
                                  toggleClassRow(item.classInCompId);
                                }}
                              />
                            </td>

                            <td className="px-4 py-3 font-semibold">
                              {item.className}
                            </td>

                            <td className="px-4 py-3">
                              {formatDate(item.sourceDate)}
                            </td>

                            <td className="px-4 py-3">
                              {formatDate(item.newDate)}
                            </td>

                            <td className="px-4 py-3">
                              {formatTime(item.startTime)}
                            </td>

                            <td className="px-4 py-3">{item.arenaName}</td>

                            <td className="px-4 py-3">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!selection?.copyClassPrices}
                                  disabled={!isClassSelected}
                                  onChange={function () {
                                    toggleClassRowFlag(
                                      item.classInCompId,
                                      "copyClassPrices",
                                    );
                                  }}
                                />
                                <span>
                                  {formatMoney(item.organizerCost)} /{" "}
                                  {formatMoney(item.federationCost)}
                                </span>
                              </label>
                            </td>

                            <td className="px-4 py-3">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!selection?.copyClassPrizes}
                                  disabled={!isClassSelected}
                                  onChange={function () {
                                    toggleClassRowFlag(
                                      item.classInCompId,
                                      "copyClassPrizes",
                                    );
                                  }}
                                />
                                <span>
                                  {[
                                    item.prizeTypeName,
                                    formatMoney(item.prizeAmount),
                                  ]
                                    .filter(function (value) {
                                      return value && value !== "-";
                                    })
                                    .join(" · ") || "-"}
                                </span>
                              </label>
                            </td>

                            <td className="px-4 py-3">
                              {hasPattern ? (
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!selection?.copyReiningPattern}
                                    disabled={!isClassSelected}
                                    onChange={function () {
                                      toggleClassRowFlag(
                                        item.classInCompId,
                                        "copyReiningPattern",
                                      );
                                    }}
                                  />
                                  <span>מסלול {item.patternNumber}</span>
                                </label>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {paidTimePreview.length > 0 ? (
              <div className="mt-6">
                <h4 className="mb-3 font-bold text-[#3F312B]">
                  פייד־טיים לבחירה
                </h4>

                <div className="max-h-[280px] overflow-auto rounded-2xl border border-[#E8DDD7]">
                  <table className="w-full min-w-[920px] text-right text-sm">
                    <thead className="sticky top-0 bg-[#FAF7F5] text-[#4E342E]">
                      <tr>
                        <th className="px-4 py-3">שכפל</th>
                        <th className="px-4 py-3">תאריך מקור</th>
                        <th className="px-4 py-3">תאריך חדש</th>
                        <th className="px-4 py-3">שעה</th>
                        <th className="px-4 py-3">סיום</th>
                        <th className="px-4 py-3">מגרש</th>
                        <th className="px-4 py-3">סוג סלוט</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paidTimePreview.map(function (item, index) {
                        var selection = getPaidTimeSelection(
                          item.paidTimeSlotInCompId,
                        );

                        var isPaidTimeSelected = !!selection?.copyPaidTimeSlot;

                        return (
                          <tr
                            key={item.paidTimeSlotInCompId || index}
                            className={
                              "border-t border-[#F1E8E3] " +
                              (isPaidTimeSelected
                                ? "bg-white"
                                : "bg-[#FAFAFA] opacity-70")
                            }
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isPaidTimeSelected}
                                onChange={function () {
                                  togglePaidTimeRow(item.paidTimeSlotInCompId);
                                }}
                              />
                            </td>

                            <td className="px-4 py-3">
                              {formatDate(item.sourceDate)}
                            </td>

                            <td className="px-4 py-3">
                              {formatDate(item.newDate)}
                            </td>

                            <td className="px-4 py-3">
                              {formatTime(item.startTime)}
                            </td>

                            <td className="px-4 py-3">
                              {formatTime(item.endTime)}
                            </td>

                            <td className="px-4 py-3">{item.arenaName}</td>

                            <td className="px-4 py-3">
                              {item.paidTimeSlotName}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {selectedClassesCount > 0 ? (
          <div className="rounded-3xl border border-[#E8DDD7] bg-white p-5">
            <h3 className="mb-2 text-lg font-bold text-[#3F312B]">
              5. שופטים לתחרות החדשה
            </h3>

            <p className="mb-4 text-sm text-[#8A7268]">
              השופטים שתבחרי כאן יחולו על כל המקצים המשוכפלים. לאחר מכן ניתן
              לערוך שופטים למקצה ספציפי במסך המקצים.
            </p>

            {judgesLoading ? (
              <div className="rounded-2xl border border-[#E8DDD7] bg-[#FAF7F5] px-4 py-3 text-right text-sm text-[#8A7268]">
                טוען שופטים לענף שנבחר...
              </div>
            ) : null}

            {!judgesLoading && judgesError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                {judgesError}
              </div>
            ) : null}

            {!judgesLoading && !judgesError && fieldJudges.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
                לא נמצאו שופטים לענף שנבחר.
              </div>
            ) : null}

            {!judgesLoading && !judgesError && fieldJudges.length > 0 ? (
              <MultiSelectPicker
                options={fieldJudges}
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
                actionButtonLabel="+ הוספת שופט"
                onActionButtonClick={judgeCreation.handleOpenJudgeModal}
              />
            ) : null}
          </div>
        ) : null}

        <div className="rounded-3xl border border-[#E8DDD7] bg-[#FCFAF8] p-5 text-right text-sm text-[#6D4C41]">
          <div className="font-bold text-[#3F312B]">לא ישוכפלו:</div>
          <div className="mt-2">
            הרשמות, חיובים, תשלומים, הזמנות תאים, שיבוץ תאים, נסורת, בקשות
            פייד־טיים, סדרי כניסה ופרסומים.
          </div>
        </div>

        {localError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
            {localError}
          </div>
        ) : null}

        {sourceDetailsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
            {sourceDetailsError}
          </div>
        ) : null}

        {props.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
            {props.error}
          </div>
        ) : null}

        <div className="flex items-center gap-3 border-t border-[#EFE5DF] pt-5">
          <button
            type="submit"
            disabled={
              props.saving ||
              props.loading ||
              sourceDetailsLoading ||
              judgesLoading
            }
            className="rounded-xl bg-[#8B6352] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547] disabled:opacity-70"
          >
            {props.saving
              ? "משכפל..."
              : sourceDetailsLoading
                ? "בודקת נתוני מקור..."
                : judgesLoading
                  ? "טוענת שופטים..."
                  : "צור תחרות משוכפלת"}
          </button>
        </div>
      </form>

      <JudgeModal
        isOpen={judgeCreation.judgeModalOpen}
        onClose={judgeCreation.handleCloseJudgeModal}
        onSubmit={judgeCreation.handleCreateJudge}
        initialJudge={null}
        fields={judgeCreation.judgeFields}
        error={judgeCreation.judgeModalError}
      />
    </SectionCard>
  );
}
