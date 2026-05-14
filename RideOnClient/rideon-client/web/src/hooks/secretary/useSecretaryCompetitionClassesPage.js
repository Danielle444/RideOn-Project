import { useEffect, useMemo, useState } from "react";
import { getClassesByCompetitionId } from "../../services/classInCompetitionService";
import {
  getSecretaryCompetitionEntries,
  updateGroupEntriesDrawOrder,
} from "../../services/entryService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

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

function getClassPrizeTypeName(item) {
  return item.prizeTypeName || item.PrizeTypeName || "";
}

function getClassPrizeAmount(item) {
  var value = item.prizeAmount;

  if (value === null || value === undefined) {
    value = item.PrizeAmount;
  }

  return value;
}

function getClassSearchText(item) {
  return [
    item.className || item.ClassName,
    item.arenaName || item.ArenaName,
    item.judgesDisplay || item.JudgesDisplay,
    item.patternNumber || item.PatternNumber,
    item.prizeTypeName || item.PrizeTypeName,
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

function shuffleItems(items) {
  var nextItems = [...items];

  for (var i = nextItems.length - 1; i > 0; i--) {
    var randomIndex = Math.floor(Math.random() * (i + 1));
    var temp = nextItems[i];

    nextItems[i] = nextItems[randomIndex];
    nextItems[randomIndex] = temp;
  }

  return nextItems;
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

  var [loadingClasses, setLoadingClasses] = useState(false);
  var [loadingEntries, setLoadingEntries] = useState(false);

  var [error, setError] = useState("");

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

  var [drawOrderEditMode, setDrawOrderEditMode] = useState(false);
  var [drawOrderDraftEntries, setDrawOrderDraftEntries] = useState([]);
  var [savingDrawOrder, setSavingDrawOrder] = useState(false);
  var [drawOrderError, setDrawOrderError] = useState("");

  useEffect(
    function () {
      loadPageData();
    },
    [competitionId, ranchId],
  );

  async function loadPageData() {
    if (!competitionId || !ranchId) {
      return;
    }

    await Promise.all([loadClasses(), loadEntries()]);
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

  function getEntriesCountForClass(item) {
    return getEntriesForClass(item).length;
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
          var prizeTypeName = getClassPrizeTypeName(item);
          var prizeAmount = getClassPrizeAmount(item);
          var hasPrize =
            !!prizeTypeName ||
            (prizeAmount !== null &&
              prizeAmount !== undefined &&
              Number(prizeAmount) > 0);

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

    setDrawOrderError("");
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

      var nextItems = [...prev];
      var temp = nextItems[currentIndex];

      nextItems[currentIndex] = nextItems[targetIndex];
      nextItems[targetIndex] = temp;

      return normalizeDraftEntries(nextItems);
    });
  }

  function updateDraftDrawOrder(entryId, value) {
    setDrawOrderDraftEntries(function (prev) {
      return prev.map(function (entry) {
        if (Number(getEntryId(entry)) !== Number(entryId)) {
          return entry;
        }

        return {
          ...entry,
          drawOrder: value,
          DrawOrder: value,
        };
      });
    });
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

  async function randomizeAndSaveDrawOrder() {
    if (!selectedGroup) {
      setDrawOrderError("הגרלה אפשרית רק במסך שנפתח דרך מספר המקצה");
      return;
    }

    if (selectedEntriesBase.length === 0) {
      setDrawOrderError("אין כניסות להגרלה");
      return;
    }

    var randomizedItems = normalizeDraftEntries(
      shuffleItems(selectedEntriesBase),
    );

    await saveDrawOrderWithEntries(randomizedItems);
  }

  return {
    classes,
    entries,
    visibleClasses,
    selectedEntries,
    entriesSummary,
    visibleClassesSummary,
    availableDates,

    loadingClasses,
    loadingEntries,
    error,

    selectedDate,
    viewMode,
    selectedClass,
    selectedGroup,
    searchText,
    paymentFilter,

    classSearchText,
    classPrizeFilter,
    classEntriesFilter,
    classDrawFilter,

    drawOrderEditMode,
    savingDrawOrder,
    drawOrderError,

    setSearchText,
    setPaymentFilter,
    setClassSearchText,
    setClassPrizeFilter,
    setClassEntriesFilter,
    setClassDrawFilter,

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
    updateDraftDrawOrder,
    randomizeAndSaveDrawOrder,
    saveDrawOrder,
  };
}
