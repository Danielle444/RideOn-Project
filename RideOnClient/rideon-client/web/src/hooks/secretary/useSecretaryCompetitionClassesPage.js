import { useEffect, useMemo, useState } from "react";
import { getClassesByCompetitionId } from "../../services/classInCompetitionService";
import { getSecretaryCompetitionEntries } from "../../services/entryService";
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

function getOrderInDay(item) {
  return item.orderInDay || item.OrderInDay;
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
    var aDraw = a.drawOrder || a.DrawOrder;
    var bDraw = b.drawOrder || b.DrawOrder;

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

      var response = await getSecretaryCompetitionEntries(competitionId, ranchId);
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

  var visibleClasses = useMemo(
    function () {
      return classes.filter(function (item) {
        if (!selectedDate) {
          return true;
        }

        return getClassDate(item) === selectedDate;
      });
    },
    [classes, selectedDate],
  );

  var selectedEntries = useMemo(
    function () {
      var items = entries;

      if (viewMode === "class" && selectedClass) {
        var classId = getClassInCompId(selectedClass);

        items = items.filter(function (entry) {
          return Number(entry.classInCompId || entry.ClassInCompId) === Number(classId);
        });
      }

      if (viewMode === "group" && selectedGroup) {
        items = items.filter(function (entry) {
          return (
            getEntryClassDate(entry) === selectedGroup.classDate &&
            Number(entry.orderInDay || entry.OrderInDay) === Number(selectedGroup.orderInDay)
          );
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
    [entries, viewMode, selectedClass, selectedGroup, searchText],
  );

  function openClassEntries(item) {
    setSelectedClass(item);
    setSelectedGroup(null);
    setSearchText("");
    setViewMode("class");
  }

  function openGroupEntries(item) {
    setSelectedClass(null);
    setSelectedGroup({
      classDate: getClassDate(item),
      orderInDay: getOrderInDay(item),
    });
    setSearchText("");
    setViewMode("group");
  }

  function backToClasses() {
    setViewMode("classes");
    setSelectedClass(null);
    setSelectedGroup(null);
    setSearchText("");
  }

  function changeSelectedDate(date) {
    setSelectedDate(date);
    backToClasses();
  }

  function getEntriesCountForClass(item) {
    var classId = getClassInCompId(item);

    return entries.filter(function (entry) {
      return Number(entry.classInCompId || entry.ClassInCompId) === Number(classId);
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

  return {
    classes,
    entries,
    visibleClasses,
    selectedEntries,
    availableDates,

    loadingClasses,
    loadingEntries,
    error,

    selectedDate,
    viewMode,
    selectedClass,
    selectedGroup,
    searchText,

    setSearchText,
    changeSelectedDate,
    openClassEntries,
    openGroupEntries,
    backToClasses,
    loadPageData,
    getEntriesCountForClass,
    getEntriesCountForGroup,
  };
}