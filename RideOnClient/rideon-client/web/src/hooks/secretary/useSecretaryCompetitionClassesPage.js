import { useEffect, useMemo, useState } from "react";
import {
  getClassesByCompetitionId,
  getPredictionsByCompetitionId,
  getClassById,
  updateClassInCompetition,
  deleteClassInCompetition,
} from "../../services/classInCompetitionService";
import {
  getSecretaryCompetitionEntries,
  updateGroupEntriesDrawOrder,
  previewGroupEntriesDrawOrder,
  clearGroupEntriesDrawOrder,
  secretaryDeleteEntry,
} from "../../services/entryService";
import { getCompetitionById } from "../../services/competitionService";
import {
  getAllFields,
  getAllClassTypes,
  getAllJudges,
  getAllPrizeTypes,
  getAllPatternsWithManeuvers,
} from "../../services/superUserService";
import { getArenasByRanchId } from "../../services/arenaService";
import { getScheduleConfigByFieldId } from "../../services/scheduleConfigService";
import {
  getErrorMessage,
  toInputDate,
  normalizeTimeForServer,
} from "../../utils/competitionForm.utils";
import {
  computeScheduleColumn,
  getScheduleCellForClass,
  getScheduleDayResult,
  isScheduleExempt,
} from "../../utils/classSchedule.utils";
import {
  isClassesViewAvailable,
  resolveDefaultClassesView,
} from "../../utils/classesView.utils";
import {
  compareClassToPrediction,
  summarizePlannedVsActual,
} from "../../utils/plannedVsActual.utils";

function normalizeDateOnly(value) {
  if (!value) {
    return "";
  }

  return String(value).substring(0, 10);
}

function getClassDate(item) {
  return normalizeDateOnly(item.classDateTime || item.ClassDateTime);
}

function getEntryClassDate(item) {
  return normalizeDateOnly(item.classDate || item.ClassDate);
}

function getClassInCompId(item) {
  return item.classInCompId || item.ClassInCompId;
}

function getEntryClassInCompId(item) {
  return item.classInCompId || item.ClassInCompId;
}

function getPredictionClassInCompId(item) {
  return item.classInCompId || item.ClassInCompId;
}

function getOrderInDay(item) {
  return item.orderInDay || item.OrderInDay;
}

function getEntryId(item) {
  return item.entryId || item.EntryId;
}

function getEntryDrawOrder(item) {
  var value = item.drawOrder;

  if (value === null || value === undefined || value === "") {
    value = item.DrawOrder;
  }

  return value;
}

function getEntryIsPaid(item) {
  return !!(item.isPaid || item.IsPaid);
}

function getEntryAmount(item) {
  return Number(item.amountToPay || item.AmountToPay || 0);
}

function getClassPrizesDisplay(item) {
  return item.prizesDisplay || item.PrizesDisplay || "";
}

function getClassSearchText(item) {
  return [
    item.className || item.ClassName,
    item.arenaName || item.ArenaName,
    item.judgesDisplay || item.JudgesDisplay,
    item.patternNumber || item.PatternNumber,
    getClassPrizesDisplay(item),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildEntriesSummary(items) {
  var entries = Array.isArray(items) ? items : [];

  var paidCount = 0;
  var unpaidCount = 0;
  var totalAmount = 0;
  var paidAmount = 0;
  var unpaidAmount = 0;

  entries.forEach(function (entry) {
    var amount = getEntryAmount(entry);
    var isPaid = getEntryIsPaid(entry);

    totalAmount += amount;

    if (isPaid) {
      paidCount += 1;
      paidAmount += amount;
    } else {
      unpaidCount += 1;
      unpaidAmount += amount;
    }
  });

  return {
    totalCount: entries.length,
    paidCount: paidCount,
    unpaidCount: unpaidCount,
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    unpaidAmount: unpaidAmount,
  };
}

function sortClasses(items) {
  return [...items].sort(function (a, b) {
    var aDate = getClassDate(a);
    var bDate = getClassDate(b);

    if (aDate !== bDate) {
      return aDate.localeCompare(bDate);
    }

    var aOrder = Number(getOrderInDay(a) || 0);
    var bOrder = Number(getOrderInDay(b) || 0);

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    var aTime = String(a.startTime || a.StartTime || "");
    var bTime = String(b.startTime || b.StartTime || "");

    return aTime.localeCompare(bTime);
  });
}

function sortEntries(items) {
  return [...items].sort(function (a, b) {
    var aDraw = getEntryDrawOrder(a);
    var bDraw = getEntryDrawOrder(b);

    if (aDraw && bDraw && Number(aDraw) !== Number(bDraw)) {
      return Number(aDraw) - Number(bDraw);
    }

    if (aDraw && !bDraw) {
      return -1;
    }

    if (!aDraw && bDraw) {
      return 1;
    }

    var aCreated = String(a.createdAt || a.CreatedAt || "");
    var bCreated = String(b.createdAt || b.CreatedAt || "");

    return aCreated.localeCompare(bCreated);
  });
}

function normalizeDraftEntries(items) {
  return items.map(function (entry, index) {
    return {
      ...entry,
      drawOrder: index + 1,
      DrawOrder: index + 1,
    };
  });
}

function moveItemInArray(items, fromIndex, toIndex) {
  var nextItems = [...items];
  var item = nextItems.splice(fromIndex, 1)[0];

  nextItems.splice(toIndex, 0, item);

  return nextItems;
}

function validateDrawOrderDraft(items) {
  if (!items || items.length === 0) {
    return "אין כניסות לשמירה";
  }

  var usedNumbers = {};

  for (var i = 0; i < items.length; i++) {
    var entry = items[i];
    var drawOrder = Number(getEntryDrawOrder(entry));

    if (!drawOrder || drawOrder <= 0) {
      return "יש להזין מספר הגרלה תקין לכל כניסה";
    }

    if (usedNumbers[drawOrder]) {
      return "יש מספר הגרלה שמופיע יותר מפעם אחת";
    }

    usedNumbers[drawOrder] = true;
  }

  return "";
}

export default function useSecretaryCompetitionClassesPage(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;

  var [classes, setClasses] = useState([]);
  var [entries, setEntries] = useState([]);
  var [predictions, setPredictions] = useState([]);

  var [loadingClasses, setLoadingClasses] = useState(false);
  var [loadingEntries, setLoadingEntries] = useState(false);

  var [error, setError] = useState("");

  var [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  function showToast(type, message) {
    setToast({
      isOpen: true,
      type: type,
      message: message,
    });
  }

  function closeToast() {
    setToast({
      isOpen: false,
      type: "success",
      message: "",
    });
  }

  var [selectedDate, setSelectedDate] = useState("");
  var [viewMode, setViewMode] = useState("classes");
  var [selectedClass, setSelectedClass] = useState(null);
  var [selectedGroup, setSelectedGroup] = useState(null);
  var [searchText, setSearchText] = useState("");
  var [paymentFilter, setPaymentFilter] = useState("all");

  var [classSearchText, setClassSearchText] = useState("");
  var [classPrizeFilter, setClassPrizeFilter] = useState("all");
  var [classEntriesFilter, setClassEntriesFilter] = useState("all");
  var [classDrawFilter, setClassDrawFilter] = useState("all");

  // Cancelled-entries toggle (Task 7): "hide" | "only" | "all"
  var [cancelledFilter, setCancelledFilter] = useState("hide");

  var [drawOrderEditMode, setDrawOrderEditMode] = useState(false);
  var [drawOrderDraftEntries, setDrawOrderDraftEntries] = useState([]);
  var [savingDrawOrder, setSavingDrawOrder] = useState(false);
  var [drawOrderError, setDrawOrderError] = useState("");

  var [minimumGap, setMinimumGap] = useState(7);
  var [drawOrderWarnings, setDrawOrderWarnings] = useState([]);
  var [drawOrderSummaryMessage, setDrawOrderSummaryMessage] = useState("");
  var [generatingDrawPreview, setGeneratingDrawPreview] = useState(false);

  // Class edit/delete state (Task 1a)
  var [classModalOpen, setClassModalOpen] = useState(false);
  var [editClassItem, setEditClassItem] = useState(null);
  var [savingClass, setSavingClass] = useState(false);
  var [classModalError, setClassModalError] = useState("");
  var [deletingClassId, setDeletingClassId] = useState(null);

  // Lookups for ClassInCompetitionModal
  var [competitionDetails, setCompetitionDetails] = useState(null);
  var [arenas, setArenas] = useState([]);
  var [classTypes, setClassTypes] = useState([]);
  var [judges, setJudges] = useState([]);
  var [prizeTypes, setPrizeTypes] = useState([]);
  var [patterns, setPatterns] = useState([]);
  var [fields, setFields] = useState([]);

  // Schedule view (Phase 7): predicted/live schedule columns on the classes page
  var [scheduleConfig, setScheduleConfig] = useState(null);
  var [scheduleViewMode, setScheduleViewMode] = useState("avg");
  var [applyingSuggestionClassId, setApplyingSuggestionClassId] = useState(null);

  // Three-view tabs. `null` means "not resolved yet" -- the default is DERIVED from the
  // competition's registration window, so it cannot be chosen until the competition loads.
  // Once the secretary picks a tab herself the derived default stops applying.
  var [activeView, setActiveView] = useState(null);
  var [hasChosenView, setHasChosenView] = useState(false);

  useEffect(
    function () {
      if (!competitionDetails || hasChosenView) {
        return;
      }

      setActiveView(resolveDefaultClassesView(competitionDetails));
    },
    [competitionDetails, hasChosenView],
  );

  function changeActiveView(viewKey) {
    if (!isClassesViewAvailable(viewKey, competitionDetails)) {
      return;
    }

    setHasChosenView(true);
    setActiveView(viewKey);
  }

  function isViewAvailable(viewKey) {
    return isClassesViewAvailable(viewKey, competitionDetails);
  }

  useEffect(
    function () {
      loadPageData();
      loadLookups();
    },
    [competitionId, ranchId],
  );

  async function loadLookups() {
    if (!competitionId || !ranchId) return;

    try {
      var compRes = await getCompetitionById(competitionId, ranchId);
      var comp = compRes.data || null;
      setCompetitionDetails(comp);

      var fieldId = comp ? (comp.fieldId || comp.FieldId) : null;

      var results = await Promise.all([
        getAllFields(),
        getArenasByRanchId(ranchId),
        getAllPrizeTypes(),
        getAllPatternsWithManeuvers(),
        fieldId ? getAllClassTypes(fieldId) : Promise.resolve({ data: [] }),
        fieldId ? getAllJudges(fieldId) : Promise.resolve({ data: [] }),
      ]);

      setFields(Array.isArray(results[0].data) ? results[0].data : []);
      setArenas(Array.isArray(results[1].data) ? results[1].data : []);
      setPrizeTypes(Array.isArray(results[2].data) ? results[2].data : []);
      setPatterns(Array.isArray(results[3].data) ? results[3].data : []);
      setClassTypes(Array.isArray(results[4].data) ? results[4].data : []);
      setJudges(Array.isArray(results[5].data) ? results[5].data : []);
    } catch (err) {
      console.error("loadLookups error", err);
    }
  }

  // A competition has exactly one field, so the schedule config is fetched once per
  // competition load, not per class.
  useEffect(
    function () {
      var fieldId =
        competitionDetails &&
        (competitionDetails.fieldId || competitionDetails.FieldId);

      if (!fieldId) {
        return;
      }

      loadScheduleConfig(fieldId);
    },
    [competitionDetails],
  );

  // Best-effort only, same convention as loadPredictions: never sets `error`, never shows
  // a toast. A failed fetch just means the schedule columns don't render.
  async function loadScheduleConfig(fieldId) {
    try {
      var response = await getScheduleConfigByFieldId(fieldId);
      setScheduleConfig(response.data || null);
    } catch (err) {
      console.error("loadScheduleConfig error", err);
      setScheduleConfig(null);
    }
  }

  function openEditClassModal(item) {
    setEditClassItem(item);
    setClassModalError("");
    setClassModalOpen(true);
  }

  function closeClassModal() {
    setClassModalOpen(false);
    setEditClassItem(null);
    setClassModalError("");
  }

  async function handleSubmitClass(formData) {
    if (!editClassItem) return;

    var classInCompId =
      editClassItem.classInCompId || editClassItem.ClassInCompId;

    var hostRanchId =
      (competitionDetails &&
        (competitionDetails.hostRanchId || competitionDetails.HostRanchId)) ||
      ranchId;

    // Build payload matching the existing creation flow (useCompetitionClassesStep)
    // so the backend DTO is fully populated. ArenaRanchId is required.
    var payload = {
      classInCompId: classInCompId,
      competitionId: competitionId,
      hostRanchId: hostRanchId,
      classTypeId: formData.classTypeId,
      arenaRanchId: hostRanchId,
      arenaId: formData.arenaId,
      classDateTime: formData.classDateTime,
      startTime: formData.startTime,
      orderInDay: formData.orderInDay,
      organizerCost: formData.organizerCost,
      federationCost: formData.federationCost,
      classNotes: formData.classNotes,
      judgeIds: Array.isArray(formData.judgeIds) ? formData.judgeIds : [],
      prizes: Array.isArray(formData.prizes) ? formData.prizes : [],
      patternNumber: formData.patternNumber,
    };

    try {
      setSavingClass(true);
      setClassModalError("");
      await updateClassInCompetition(classInCompId, payload);
      await loadClasses();
      closeClassModal();
      showToast("success", "המקצה עודכן בהצלחה");
    } catch (err) {
      var errorMessage = getErrorMessage(err, "שגיאה בעדכון מקצה");
      setClassModalError(errorMessage);
      showToast("error", errorMessage);
    } finally {
      setSavingClass(false);
    }
  }

  async function handleDeleteClass(item) {
    var classInCompId = item.classInCompId || item.ClassInCompId;
    if (!classInCompId) return;

    var confirmed = window.confirm(
      "האם למחוק את המקצה? פעולה זו אינה הפיכה.",
    );
    if (!confirmed) return;

    try {
      setDeletingClassId(classInCompId);
      await deleteClassInCompetition(classInCompId, competitionId, ranchId);
      await loadClasses();
    } catch (err) {
      alert(getErrorMessage(err, "שגיאה במחיקת מקצה"));
    } finally {
      setDeletingClassId(null);
    }
  }

  async function handleDeleteEntry(item) {
    var entryId = item.entryId || item.EntryId;
    if (!entryId) return;

    var confirmed = window.confirm(
      "האם לבטל את ההרשמה? הפעולה תסומן כביטול מאושר.",
    );
    if (!confirmed) return;

    try {
      await secretaryDeleteEntry(entryId, ranchId);
      await loadEntries();
    } catch (err) {
      alert(getErrorMessage(err, "שגיאה בביטול הרשמה"));
    }
  }

  var selectedFieldName = useMemo(
    function () {
      var fieldId =
        competitionDetails &&
        (competitionDetails.fieldId || competitionDetails.FieldId);
      if (!fieldId || !fields.length) return "";
      var match = fields.find(function (f) {
        return (f.fieldId || f.FieldId) === fieldId;
      });
      return match ? match.fieldName || match.FieldName || "" : "";
    },
    [competitionDetails, fields],
  );

  var isReiningField = useMemo(
    function () {
      return String(selectedFieldName || "").indexOf("ריינינג") >= 0;
    },
    [selectedFieldName],
  );

  var competitionStartDate = useMemo(
    function () {
      return toInputDate(
        competitionDetails &&
          (competitionDetails.competitionStartDate ||
            competitionDetails.CompetitionStartDate),
      );
    },
    [competitionDetails],
  );

  var competitionEndDate = useMemo(
    function () {
      return toInputDate(
        competitionDetails &&
          (competitionDetails.competitionEndDate ||
            competitionDetails.CompetitionEndDate),
      );
    },
    [competitionDetails],
  );

  var selectedCompetitionJudgeIds = useMemo(
    function () {
      if (!competitionDetails) return [];
      var ids =
        competitionDetails.competitionJudgeIds ||
        competitionDetails.CompetitionJudgeIds ||
        [];
      return Array.isArray(ids) ? ids : [];
    },
    [competitionDetails],
  );

  async function loadPageData() {
    if (!competitionId || !ranchId) {
      return;
    }

    await Promise.all([loadClasses(), loadEntries(), loadPredictions()]);
  }

  // Best-effort only: never sets `error`, never shows a toast, never blocks the classes/entries
  // load. A failed or empty fetch just means no class shows a prediction.
  async function loadPredictions() {
    try {
      var response = await getPredictionsByCompetitionId(competitionId, ranchId);
      var items = Array.isArray(response.data) ? response.data : [];
      setPredictions(items);
    } catch (error) {
      console.error(error);
    }
  }

  function getPredictionForClass(item) {
    var classId = getClassInCompId(item);

    return (
      predictions.find(function (prediction) {
        return (
          Number(getPredictionClassInCompId(prediction)) === Number(classId)
        );
      }) || null
    );
  }

  async function loadClasses() {
    try {
      setLoadingClasses(true);
      setError("");

      var response = await getClassesByCompetitionId(competitionId, ranchId);
      var items = Array.isArray(response.data) ? response.data : [];
      var sortedItems = sortClasses(items);

      setClasses(sortedItems);

      if (!selectedDate && sortedItems.length > 0) {
        setSelectedDate(getClassDate(sortedItems[0]));
      }
    } catch (error) {
      console.error(error);
      setError(getErrorMessage(error, "שגיאה בטעינת המקצים"));
    } finally {
      setLoadingClasses(false);
    }
  }

  async function loadEntries() {
    try {
      setLoadingEntries(true);
      setError("");

      var response = await getSecretaryCompetitionEntries(
        competitionId,
        ranchId,
      );

      var items = Array.isArray(response.data) ? response.data : [];

      setEntries(sortEntries(items));
    } catch (error) {
      console.error(error);
      setError(getErrorMessage(error, "שגיאה בטעינת הכניסות למקצים"));
    } finally {
      setLoadingEntries(false);
    }
  }

  var availableDates = useMemo(
    function () {
      var dates = [];

      classes.forEach(function (item) {
        var date = getClassDate(item);

        if (date && !dates.includes(date)) {
          dates.push(date);
        }
      });

      return dates.sort();
    },
    [classes],
  );

  function getEntriesForClass(item) {
    var classId = getClassInCompId(item);

    return entries.filter(function (entry) {
      return Number(getEntryClassInCompId(entry)) === Number(classId);
    });
  }

  function getHasDrawForClass(item) {
    var classEntries = getEntriesForClass(item);

    return classEntries.some(function (entry) {
      var drawOrder = getEntryDrawOrder(entry);

      return drawOrder !== null && drawOrder !== undefined && drawOrder !== "";
    });
  }

  // QA 41. The כניסות column must count Active entries only, matching the system-wide
  // convention and the live schedule column beside it, which has always filtered. `entries`
  // deliberately holds cancelled rows -- the cancelled show/hide/only toggle depends on it --
  // so the filter belongs here rather than in getEntriesForClass, whose other caller
  // (getHasDrawForClass) is left seeing the full set on purpose; narrowing that would change
  // draw-order behaviour, which is out of scope.
  function getEntriesCountForClass(item) {
    return getEntriesForClass(item).filter(function (entry) {
      var status = entry.entryStatus || entry.EntryStatus || "Active";

      return status === "Active";
    }).length;
  }

  function getEntriesCountForGroup(item) {
    var classDate = getClassDate(item);
    var orderInDay = getOrderInDay(item);

    return entries.filter(function (entry) {
      return (
        getEntryClassDate(entry) === classDate &&
        Number(entry.orderInDay || entry.OrderInDay) === Number(orderInDay)
      );
    }).length;
  }

  function getClassStatus(item) {
    var count = getEntriesCountForClass(item);

    if (count === 0) {
      return {
        key: "empty",
        label: "אין כניסות",
      };
    }

    if (getHasDrawForClass(item)) {
      return {
        key: "drawn",
        label: "יש הגרלה",
      };
    }

    return {
      key: "hasEntries",
      label: "יש כניסות",
    };
  }

  var visibleClasses = useMemo(
    function () {
      return classes.filter(function (item) {
        if (selectedDate && getClassDate(item) !== selectedDate) {
          return false;
        }

        if (classSearchText.trim()) {
          var normalizedSearch = classSearchText.trim().toLowerCase();

          if (!getClassSearchText(item).includes(normalizedSearch)) {
            return false;
          }
        }

        if (classPrizeFilter !== "all") {
          var hasPrize = !!getClassPrizesDisplay(item);

          if (classPrizeFilter === "withPrize" && !hasPrize) {
            return false;
          }

          if (classPrizeFilter === "withoutPrize" && hasPrize) {
            return false;
          }
        }

        if (classEntriesFilter !== "all") {
          var entriesCount = getEntriesCountForClass(item);

          if (classEntriesFilter === "withEntries" && entriesCount === 0) {
            return false;
          }

          if (classEntriesFilter === "withoutEntries" && entriesCount > 0) {
            return false;
          }
        }

        if (classDrawFilter !== "all") {
          var hasDraw = getHasDrawForClass(item);

          if (classDrawFilter === "withDraw" && !hasDraw) {
            return false;
          }

          if (classDrawFilter === "withoutDraw" && hasDraw) {
            return false;
          }
        }

        return true;
      });
    },
    [
      classes,
      entries,
      selectedDate,
      classSearchText,
      classPrizeFilter,
      classEntriesFilter,
      classDrawFilter,
    ],
  );

  var visibleClassesSummary = useMemo(
    function () {
      var visibleClassIds = visibleClasses.map(function (item) {
        return Number(getClassInCompId(item));
      });

      var dayEntries = entries.filter(function (entry) {
        return visibleClassIds.includes(Number(getEntryClassInCompId(entry)));
      });

      return buildEntriesSummary(dayEntries);
    },
    [visibleClasses, entries],
  );

  var selectedEntriesBase = useMemo(
    function () {
      var items = entries;

      if (viewMode === "class" && selectedClass) {
        var classId = getClassInCompId(selectedClass);

        items = items.filter(function (entry) {
          return Number(getEntryClassInCompId(entry)) === Number(classId);
        });
      }

      if (viewMode === "group" && selectedGroup) {
        items = items.filter(function (entry) {
          return (
            getEntryClassDate(entry) === selectedGroup.classDate &&
            Number(entry.orderInDay || entry.OrderInDay) ===
              Number(selectedGroup.orderInDay)
          );
        });
      }

      return sortEntries(items);
    },
    [entries, viewMode, selectedClass, selectedGroup],
  );

  var selectedGroupHasDrawOrder = useMemo(
    function () {
      return selectedEntriesBase.some(function (entry) {
        var drawOrder = getEntryDrawOrder(entry);

        return (
          drawOrder !== null && drawOrder !== undefined && drawOrder !== ""
        );
      });
    },
    [selectedEntriesBase],
  );

  var entriesSummary = useMemo(
    function () {
      return buildEntriesSummary(selectedEntriesBase);
    },
    [selectedEntriesBase],
  );

  var selectedEntries = useMemo(
    function () {
      if (drawOrderEditMode) {
        return drawOrderDraftEntries;
      }

      var items = selectedEntriesBase;

      // Cancelled toggle (Task 7)
      if (cancelledFilter === "hide") {
        items = items.filter(function (entry) {
          var status = String(
            entry.entryStatus || entry.EntryStatus || "Active",
          ).toLowerCase();
          return status !== "cancelled" && status !== "cancelledafterstart";
        });
      } else if (cancelledFilter === "only") {
        items = items.filter(function (entry) {
          var status = String(
            entry.entryStatus || entry.EntryStatus || "Active",
          ).toLowerCase();
          return status === "cancelled" || status === "cancelledafterstart";
        });
      }

      if (paymentFilter === "paid") {
        items = items.filter(function (entry) {
          return getEntryIsPaid(entry);
        });
      }

      if (paymentFilter === "unpaid") {
        items = items.filter(function (entry) {
          return !getEntryIsPaid(entry);
        });
      }

      if (searchText.trim()) {
        var normalizedSearch = searchText.trim().toLowerCase();

        items = items.filter(function (entry) {
          var text = [
            entry.className || entry.ClassName,
            entry.horseName || entry.HorseName,
            entry.barnName || entry.BarnName,
            entry.riderName || entry.RiderName,
            entry.coachName || entry.CoachName,
            entry.payerName || entry.PayerName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(normalizedSearch);
        });
      }

      return sortEntries(items);
    },
    [
      selectedEntriesBase,
      paymentFilter,
      cancelledFilter,
      searchText,
      drawOrderEditMode,
      drawOrderDraftEntries,
    ],
  );

  function openClassEntries(item) {
    setSelectedClass(item);
    setSelectedGroup(null);
    setSearchText("");
    setPaymentFilter("all");
    cancelDrawOrderEditMode();
    setViewMode("class");
  }

  function openGroupEntries(item) {
    setSelectedClass(null);
    setSelectedGroup({
      classDate: getClassDate(item),
      orderInDay: getOrderInDay(item),
    });
    setSearchText("");
    setPaymentFilter("all");
    cancelDrawOrderEditMode();
    setViewMode("group");
  }

  function backToClasses() {
    setViewMode("classes");
    setSelectedClass(null);
    setSelectedGroup(null);
    setSearchText("");
    setPaymentFilter("all");
    cancelDrawOrderEditMode();
  }

  function changeSelectedDate(date) {
    setSelectedDate(date);
    backToClasses();
  }

  function clearClassFilters() {
    setClassSearchText("");
    setClassPrizeFilter("all");
    setClassEntriesFilter("all");
    setClassDrawFilter("all");
  }

  function startDrawOrderEditMode() {
    if (!selectedGroup) {
      setDrawOrderError("הגרלה אפשרית רק במסך שנפתח דרך מספר המקצה");
      return;
    }

    if (selectedEntriesBase.length === 0) {
      setDrawOrderError("אין כניסות לעריכת סדר");
      return;
    }

    if (!selectedGroupHasDrawOrder) {
      setDrawOrderError("אין הגרלה קיימת לעריכה. קודם יש ליצור הגרלה חכמה.");
      return;
    }

    setDrawOrderError("");
    setDrawOrderWarnings([]);
    setDrawOrderSummaryMessage("");
    setSearchText("");
    setPaymentFilter("all");
    setDrawOrderDraftEntries(normalizeDraftEntries(selectedEntriesBase));
    setDrawOrderEditMode(true);
  }

  function cancelDrawOrderEditMode() {
    setDrawOrderEditMode(false);
    setDrawOrderDraftEntries([]);
    setSavingDrawOrder(false);
    setDrawOrderError("");
    setDrawOrderWarnings([]);
    setDrawOrderSummaryMessage("");
    setGeneratingDrawPreview(false);
  }

  function moveDrawOrderEntry(entryId, direction) {
    setDrawOrderDraftEntries(function (prev) {
      var currentIndex = prev.findIndex(function (entry) {
        return Number(getEntryId(entry)) === Number(entryId);
      });

      if (currentIndex < 0) {
        return prev;
      }

      var targetIndex = currentIndex + direction;

      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      return normalizeDraftEntries(
        moveItemInArray(prev, currentIndex, targetIndex),
      );
    });
  }

  function moveDrawOrderEntryToEntry(activeEntryId, overEntryId) {
    if (!activeEntryId || !overEntryId) {
      return;
    }

    if (Number(activeEntryId) === Number(overEntryId)) {
      return;
    }

    setDrawOrderDraftEntries(function (prev) {
      var activeIndex = prev.findIndex(function (entry) {
        return Number(getEntryId(entry)) === Number(activeEntryId);
      });

      var overIndex = prev.findIndex(function (entry) {
        return Number(getEntryId(entry)) === Number(overEntryId);
      });

      if (activeIndex < 0 || overIndex < 0) {
        return prev;
      }

      return normalizeDraftEntries(
        moveItemInArray(prev, activeIndex, overIndex),
      );
    });
  }

  function updateDraftDrawOrder(entryId, value) {
    var targetDrawOrder = Number(value);

    if (!targetDrawOrder || targetDrawOrder <= 0) {
      return;
    }

    setDrawOrderDraftEntries(function (prev) {
      var currentIndex = prev.findIndex(function (entry) {
        return Number(getEntryId(entry)) === Number(entryId);
      });

      if (currentIndex < 0) {
        return prev;
      }

      var targetIndex = Math.min(
        Math.max(targetDrawOrder - 1, 0),
        prev.length - 1,
      );

      if (currentIndex === targetIndex) {
        return normalizeDraftEntries(prev);
      }

      return normalizeDraftEntries(
        moveItemInArray(prev, currentIndex, targetIndex),
      );
    });
  }

  async function generateSmartDrawOrderPreview() {
    if (!selectedGroup) {
      setDrawOrderError("הגרלה אפשרית רק במסך שנפתח דרך מספר המקצה");
      return;
    }

    if (selectedEntriesBase.length === 0) {
      setDrawOrderError("אין כניסות להגרלה");
      return;
    }

    if (!competitionId || !ranchId) {
      setDrawOrderError("חסרים פרטי תחרות או חווה");
      return;
    }

    var normalizedMinimumGap = Number(minimumGap || 7);

    if (!normalizedMinimumGap || normalizedMinimumGap <= 0) {
      normalizedMinimumGap = 7;
    }

    try {
      setGeneratingDrawPreview(true);
      setDrawOrderError("");
      setDrawOrderWarnings([]);
      setDrawOrderSummaryMessage("");
      setSearchText("");
      setPaymentFilter("all");

      var payload = {
        competitionId: Number(competitionId),
        classDate: selectedGroup.classDate,
        orderInDay: Number(selectedGroup.orderInDay),
        ranchId: Number(ranchId),
        minimumGap: normalizedMinimumGap,
      };

      var response = await previewGroupEntriesDrawOrder(payload);
      var data = response.data || {};
      var previewEntries = data.entries || data.Entries || [];
      var warnings = data.warnings || data.Warnings || [];
      var summaryMessage = data.summaryMessage || data.SummaryMessage || "";

      if (!Array.isArray(previewEntries) || previewEntries.length === 0) {
        setDrawOrderError("השרת לא החזיר כניסות לתצוגת ההגרלה");
        return;
      }

      setDrawOrderDraftEntries(normalizeDraftEntries(previewEntries));
      setDrawOrderWarnings(Array.isArray(warnings) ? warnings : []);
      setDrawOrderSummaryMessage(summaryMessage);
      setDrawOrderEditMode(true);
    } catch (error) {
      console.error(error);
      setDrawOrderError(getErrorMessage(error, "שגיאה ביצירת הגרלה חכמה"));
    } finally {
      setGeneratingDrawPreview(false);
    }
  }

  async function saveDrawOrderWithEntries(itemsToSave) {
    if (!selectedGroup) {
      setDrawOrderError("לא נבחרה קבוצת מקצים לשמירת הגרלה");
      return;
    }

    if (!competitionId || !ranchId) {
      setDrawOrderError("חסרים פרטי תחרות או חווה");
      return;
    }

    var validationError = validateDrawOrderDraft(itemsToSave);

    if (validationError) {
      setDrawOrderError(validationError);
      return;
    }

    try {
      setSavingDrawOrder(true);
      setDrawOrderError("");

      var payload = {
        competitionId: Number(competitionId),
        classDate: selectedGroup.classDate,
        orderInDay: Number(selectedGroup.orderInDay),
        ranchId: Number(ranchId),
        entries: itemsToSave.map(function (entry) {
          return {
            entryId: Number(getEntryId(entry)),
            drawOrder: Number(getEntryDrawOrder(entry)),
          };
        }),
      };

      await updateGroupEntriesDrawOrder(payload);
      await loadEntries();

      setDrawOrderEditMode(false);
      setDrawOrderDraftEntries([]);
      setDrawOrderWarnings([]);
      setDrawOrderSummaryMessage("");
    } catch (error) {
      console.error(error);
      setDrawOrderError(getErrorMessage(error, "שגיאה בשמירת סדר ההגרלה"));
    } finally {
      setSavingDrawOrder(false);
    }
  }

  async function saveDrawOrder() {
    await saveDrawOrderWithEntries(drawOrderDraftEntries);
  }

  async function clearDrawOrder() {
    if (!selectedGroup) {
      setDrawOrderError("מחיקת הגרלה אפשרית רק במסך שנפתח דרך מספר המקצה");
      return;
    }

    if (!competitionId || !ranchId) {
      setDrawOrderError("חסרים פרטי תחרות או חווה");
      return;
    }

    if (!selectedGroupHasDrawOrder) {
      setDrawOrderError("אין הגרלה קיימת למחיקה");
      return;
    }

    var confirmed = window.confirm(
      "האם למחוק את ההגרלה לכל המקצים באותו יום ובאותו מספר? פעולה זו תאפס את סדר ההגרלה.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingDrawOrder(true);
      setDrawOrderError("");
      setDrawOrderWarnings([]);
      setDrawOrderSummaryMessage("");

      var payload = {
        competitionId: Number(competitionId),
        classDate: selectedGroup.classDate,
        orderInDay: Number(selectedGroup.orderInDay),
        ranchId: Number(ranchId),
      };

      await clearGroupEntriesDrawOrder(payload);
      await loadEntries();

      setDrawOrderEditMode(false);
      setDrawOrderDraftEntries([]);
    } catch (error) {
      console.error(error);
      setDrawOrderError(getErrorMessage(error, "שגיאה במחיקת ההגרלה"));
    } finally {
      setSavingDrawOrder(false);
    }
  }

  // Schedule view (Phase 7). Deliberately its own explicit Active-only filter rather than
  // reusing getEntriesCountForClass, which counts every status -- the documented system-wide
  // convention for "entries" is Active-only, and the live schedule column must match it.
  function getActiveEntriesCountForClass(item) {
    var classId = getClassInCompId(item);

    return entries.filter(function (entry) {
      if (Number(getEntryClassInCompId(entry)) !== Number(classId)) {
        return false;
      }

      var status = entry.entryStatus || entry.EntryStatus || "Active";
      return status === "Active";
    }).length;
  }

  function getPredictedEntriesForClass(item) {
    var prediction = getPredictionForClass(item);

    if (!prediction) {
      return 0;
    }

    var value = prediction.predictedEntries;

    if (value === null || value === undefined) {
      value = prediction.PredictedEntries;
    }

    return Number(value) || 0;
  }

  // Computed over the full unfiltered `classes` list (not `visibleClasses`) so a search or
  // entries/prize/draw filter never changes the objective rolled-forward schedule -- only
  // which rows get rendered changes.
  var predictedScheduleColumn = useMemo(
    function () {
      return computeScheduleColumn(
        classes,
        scheduleConfig,
        scheduleViewMode,
        getPredictedEntriesForClass,
      );
    },
    [classes, predictions, scheduleConfig, scheduleViewMode],
  );

  var liveScheduleColumn = useMemo(
    function () {
      return computeScheduleColumn(
        classes,
        scheduleConfig,
        scheduleViewMode,
        getActiveEntriesCountForClass,
      );
    },
    [classes, entries, scheduleConfig, scheduleViewMode],
  );

  var showScheduleColumns = !!scheduleConfig && !isScheduleExempt(scheduleConfig);

  function getScheduleForClass(item) {
    return {
      predicted: getScheduleCellForClass(predictedScheduleColumn, item),
      live: getScheduleCellForClass(liveScheduleColumn, item),
    };
  }

  // Day-level schedule facts for the day currently selected, so the notices panel can state
  // them once above the table instead of squeezing them into a cell. Keyed off the full
  // `classes` list, not `visibleClasses`: a search filter must not silence a day's warning.
  var scheduleDayNotices = useMemo(
    function () {
      if (!showScheduleColumns || !selectedDate) {
        return null;
      }

      var dayClass = classes.find(function (item) {
        return getClassDate(item) === selectedDate;
      });

      if (!dayClass) {
        return null;
      }

      return {
        predicted: getScheduleDayResult(predictedScheduleColumn, dayClass),
        live: getScheduleDayResult(liveScheduleColumn, dayClass),
      };
    },
    [
      showScheduleColumns,
      selectedDate,
      classes,
      predictedScheduleColumn,
      liveScheduleColumn,
    ],
  );

  // Planned-vs-actual diagnosis for the selected day. Scoped to the day rather than the whole
  // competition because that is the unit the secretary is looking at, and a three-day
  // competition can easily have one day the forecast got right and one it did not.
  var plannedVsActualSummary = useMemo(
    function () {
      var dayClasses = classes.filter(function (item) {
        return !selectedDate || getClassDate(item) === selectedDate;
      });

      return summarizePlannedVsActual(
        dayClasses,
        getActiveEntriesCountForClass,
        getPredictionForClass,
      );
    },
    [classes, entries, predictions, selectedDate],
  );

  function getPlannedVsActualForClass(item) {
    return compareClassToPrediction(
      getActiveEntriesCountForClass(item),
      getPredictionForClass(item),
    );
  }

  // Reuses the single existing class-update path (updateClassInCompetition). Fetches the
  // class's current full row first so every other field -- including judges and prizes,
  // which the update proc fully overwrites on every call -- is resent unchanged alongside
  // the new starttime.
  async function applyStartTimeSuggestion(targetClassId, newStartTime) {
    if (!targetClassId || !newStartTime) {
      return;
    }

    try {
      setApplyingSuggestionClassId(targetClassId);

      var freshResponse = await getClassById(targetClassId, competitionId, ranchId);
      var freshItem = freshResponse.data;

      var hostRanchId =
        (competitionDetails &&
          (competitionDetails.hostRanchId || competitionDetails.HostRanchId)) ||
        ranchId;

      var payload = {
        classInCompId: targetClassId,
        competitionId: competitionId,
        hostRanchId: hostRanchId,
        classTypeId: freshItem.classTypeId,
        arenaRanchId: hostRanchId,
        arenaId: freshItem.arenaId,
        classDateTime: freshItem.classDateTime,
        startTime: normalizeTimeForServer(newStartTime),
        orderInDay: freshItem.orderInDay,
        organizerCost: freshItem.organizerCost,
        federationCost: freshItem.federationCost,
        classNotes: freshItem.classNotes,
        judgeIds: Array.isArray(freshItem.judgeIds) ? freshItem.judgeIds : [],
        prizes: Array.isArray(freshItem.prizes) ? freshItem.prizes : [],
        patternNumber: freshItem.patternNumber,
      };

      await updateClassInCompetition(targetClassId, payload);
      await loadClasses();
      showToast("success", "שעת ההתחלה עודכנה בהצלחה");
    } catch (err) {
      console.error(err);
      showToast("error", getErrorMessage(err, "שגיאה בעדכון שעת ההתחלה"));
    } finally {
      setApplyingSuggestionClassId(null);
    }
  }

  return {
    classes,
    entries,
    predictions,
    getPredictionForClass,
    visibleClasses,
    selectedEntries,
    entriesSummary,
    visibleClassesSummary,
    availableDates,

    loadingClasses,
    loadingEntries,
    error,

    toast,
    showToast,
    closeToast,

    selectedDate,
    viewMode,
    selectedClass,
    selectedGroup,
    selectedGroupHasDrawOrder,
    searchText,
    paymentFilter,

    classSearchText,
    classPrizeFilter,
    classEntriesFilter,
    classDrawFilter,

    drawOrderEditMode,
    savingDrawOrder,
    drawOrderError,

    minimumGap,
    drawOrderWarnings,
    drawOrderSummaryMessage,
    generatingDrawPreview,

    setSearchText,
    setPaymentFilter,
    cancelledFilter,
    setCancelledFilter,
    setClassSearchText,
    setClassPrizeFilter,
    setClassEntriesFilter,
    setClassDrawFilter,
    setMinimumGap,

    changeSelectedDate,
    openClassEntries,
    openGroupEntries,
    backToClasses,
    clearClassFilters,
    loadPageData,
    getEntriesCountForClass,
    getEntriesCountForGroup,
    getHasDrawForClass,
    getClassStatus,

    startDrawOrderEditMode,
    cancelDrawOrderEditMode,
    moveDrawOrderEntry,
    moveDrawOrderEntryToEntry,
    updateDraftDrawOrder,
    generateSmartDrawOrderPreview,
    saveDrawOrder,
    clearDrawOrder,

    // Class edit/delete (Task 1a)
    classModalOpen,
    editClassItem,
    savingClass,
    classModalError,
    deletingClassId,
    arenas,
    classTypes,
    judges,
    prizeTypes,
    patterns,
    selectedFieldName,
    isReiningField,
    competitionStartDate,
    competitionEndDate,
    selectedCompetitionJudgeIds,
    openEditClassModal,
    closeClassModal,
    handleSubmitClass,
    handleDeleteClass,
    handleDeleteEntry,

    // Schedule view (Phase 7)
    scheduleViewMode,
    setScheduleViewMode,
    showScheduleColumns,
    getScheduleForClass,
    scheduleDayNotices,
    applyStartTimeSuggestion,
    applyingSuggestionClassId,

    // Three-view tabs (Phase 7)
    activeView,
    changeActiveView,
    isViewAvailable,
    plannedVsActualSummary,
    getPlannedVsActualForClass,
  };
}
