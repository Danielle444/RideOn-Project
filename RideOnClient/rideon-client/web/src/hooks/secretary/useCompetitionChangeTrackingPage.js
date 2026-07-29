import { useEffect, useMemo, useState } from "react";
import {
  getCompetitionChangeRequests,
  getPendingChangeRequestsCount,
  answerChangeRequest,
} from "../../services/changeTrackingService";
import { getErrorMessage } from "../../utils/competitionForm.utils";
import { getAnswerErrorMessage } from "../../utils/changeTracking.utils";

const CHANGE_REQUEST_TABS = [
  {
    key: "Pending",
    label: "ממתינות לאישור",
  },
  {
    key: "Approved",
    label: "אושרו",
  },
  {
    key: "Rejected",
    label: "נדחו",
  },
];

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).toLowerCase();
}

// #52: these endpoints serialize camelCase (MVC default naming policy), so
// this reads the one live key. The PascalCase fallback it replaced was dead.
function getValue(item, camelKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  return fallback;
}

function getRequestId(item) {
  return getValue(item, "requestId", 0);
}

function getRequestSource(item) {
  return getValue(item, "requestSource", "");
}

function getRequestKey(item) {
  return getRequestSource(item) + "-" + getRequestId(item);
}

function getRequestSearchText(item) {
  return [
    item.requestType,
    item.requestSource,
    item.requestedByName,
    item.entityType,
    item.entityName,
    item.beforeText,
    item.afterText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function useCompetitionChangeTrackingPage(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;

  var [activeStatus, setActiveStatus] = useState("Pending");
  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");

  var [pendingCount, setPendingCount] = useState(0);
  var [loadingCount, setLoadingCount] = useState(false);

  var [searchText, setSearchText] = useState("");
  var [sourceFilter, setSourceFilter] = useState("all");
  var [typeFilter, setTypeFilter] = useState("all");

  var [selectedRequest, setSelectedRequest] = useState(null);

  var [answeringRequestKey, setAnsweringRequestKey] = useState(null);
  var [answeringAction, setAnsweringAction] = useState(null);
  var [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  var [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  function closeConfirmDialog() {
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  }

  function showToast(type, message) {
    setToast({ isOpen: true, type: type, message: message });
  }

  function closeToast() {
    setToast(function (current) {
      return { ...current, isOpen: false };
    });
  }

  useEffect(
    function () {
      loadPageData();
    },
    [competitionId, ranchId, activeStatus],
  );

  async function loadPageData() {
    if (!competitionId || !ranchId) {
      return;
    }

    await Promise.all([loadRequests(), loadPendingCount()]);
  }

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      var response = await getCompetitionChangeRequests(
        competitionId,
        ranchId,
        activeStatus,
      );

      var data = Array.isArray(response.data) ? response.data : [];

      setItems(data);
    } catch (error) {
      console.error(error);
      setError(getErrorMessage(error, "שגיאה בטעינת בקשות שינוי"));
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingCount() {
    try {
      setLoadingCount(true);

      var response = await getPendingChangeRequestsCount(ranchId);
      // The controller returns Ok(new { PendingCount }); MVC's default camelCase
      // naming policy puts it on the wire as pendingCount.
      var count = response.data?.pendingCount || 0;

      setPendingCount(Number(count));
    } catch (error) {
      console.error(error);
      setPendingCount(0);
    } finally {
      setLoadingCount(false);
    }
  }

  var visibleItems = useMemo(
    function () {
      var result = Array.isArray(items) ? items : [];

      if (sourceFilter !== "all") {
        result = result.filter(function (item) {
          return getRequestSource(item) === sourceFilter;
        });
      }

      // CAP-2: the type filter is a change-vs-cancel axis across BOTH sources.
      // Match on the IsCancelled boolean, not the localized RequestType string
      // (which is entry-only and silently hid every product request).
      if (typeFilter !== "all") {
        result = result.filter(function (item) {
          var isCancelled = getValue(item, "isCancelled", false);
          return typeFilter === "cancel" ? Boolean(isCancelled) : !isCancelled;
        });
      }

      if (searchText.trim()) {
        var normalizedSearch = normalizeText(searchText.trim());

        result = result.filter(function (item) {
          return getRequestSearchText(item).includes(normalizedSearch);
        });
      }

      return result;
    },
    [items, sourceFilter, typeFilter, searchText],
  );

  var summary = useMemo(
    function () {
      var total = items.length;
      var entryCount = 0;
      var productCount = 0;
      var cancellationCount = 0;
      var changeCount = 0;

      items.forEach(function (item) {
        var source = getRequestSource(item);
        var isCancelled = getValue(item, "isCancelled", false);

        if (source === "Entry") {
          entryCount += 1;
        }

        if (source === "Product") {
          productCount += 1;
        }

        if (isCancelled) {
          cancellationCount += 1;
        } else {
          changeCount += 1;
        }
      });

      return {
        total: total,
        entryCount: entryCount,
        productCount: productCount,
        cancellationCount: cancellationCount,
        changeCount: changeCount,
      };
    },
    [items],
  );

  function changeStatus(status) {
    setActiveStatus(status);
    setSearchText("");
    setSourceFilter("all");
    setTypeFilter("all");
    setSelectedRequest(null);
    closeToast();
  }

  function clearFilters() {
    setSearchText("");
    setSourceFilter("all");
    setTypeFilter("all");
  }

  function openRequestDetails(item) {
    setSelectedRequest(item);
  }

  function closeRequestDetails() {
    setSelectedRequest(null);
  }

  async function answerRequest(item, answerStatus) {
    var requestId = getRequestId(item);
    var requestSource = getRequestSource(item);
    var requestKey = getRequestKey(item);

    if (!requestId || !requestSource) {
      showToast("error", "לא ניתן לזהות את בקשת השינוי");
      return;
    }

    if (answerStatus !== "Approved" && answerStatus !== "Rejected") {
      showToast("error", "סטטוס טיפול לא תקין");
      return;
    }

    try {
      setAnsweringRequestKey(requestKey);
      setAnsweringAction(answerStatus);

      await answerChangeRequest({
        competitionId: Number(competitionId),
        ranchId: Number(ranchId),
        requestId: requestId,
        requestSource: requestSource,
        answerStatus: answerStatus,
        notes: null,
      });

      if (answerStatus === "Approved") {
        showToast("success", "הבקשה אושרה והשינוי עודכן במערכת");
      } else {
        showToast("success", "הבקשה נדחתה");
      }

      setSelectedRequest(null);

      await loadPageData();
    } catch (error) {
      console.error(error);
      // CAP-4: never surface raw proc/exception text; map to Hebrew.
      showToast("error", getAnswerErrorMessage(error));
    } finally {
      setAnsweringRequestKey(null);
      setAnsweringAction(null);
    }
  }

  // CAP-7: both answering actions are irreversible (approval moves money / can
  // auto-create a fine), so each opens its own confirmation before committing.
  function approveRequest(item) {
    setConfirmDialog({
      isOpen: true,
      title: "אישור בקשה",
      message: "אישור הבקשה יעדכן את החיובים במערכת ועשוי להוסיף קנס. להמשיך?",
      onConfirm: function () {
        closeConfirmDialog();
        answerRequest(item, "Approved");
      },
    });
  }

  function rejectRequest(item) {
    setConfirmDialog({
      isOpen: true,
      title: "דחיית בקשה",
      message: "לדחות את הבקשה? לא ניתן לשחזר פעולה זו.",
      onConfirm: function () {
        closeConfirmDialog();
        answerRequest(item, "Rejected");
      },
    });
  }

  // CAP-6: distinguish "no requests exist" from "none match the active filters".
  var hasActiveFilters =
    sourceFilter !== "all" || typeFilter !== "all" || searchText.trim() !== "";

  return {
    tabs: CHANGE_REQUEST_TABS,

    activeStatus: activeStatus,
    items: items,
    visibleItems: visibleItems,
    summary: summary,
    pendingCount: pendingCount,
    hasRequests: items.length > 0,
    hasActiveFilters: hasActiveFilters,

    loading: loading,
    loadingCount: loadingCount,
    error: error,

    toast: toast,
    closeToast: closeToast,
    answeringRequestKey: answeringRequestKey,
    answeringAction: answeringAction,

    confirmDialog: confirmDialog,
    closeConfirmDialog: closeConfirmDialog,

    searchText: searchText,
    sourceFilter: sourceFilter,
    typeFilter: typeFilter,
    selectedRequest: selectedRequest,

    setSearchText: setSearchText,
    setSourceFilter: setSourceFilter,
    setTypeFilter: setTypeFilter,

    changeStatus: changeStatus,
    clearFilters: clearFilters,
    openRequestDetails: openRequestDetails,
    closeRequestDetails: closeRequestDetails,
    loadPageData: loadPageData,

    answerRequest: answerRequest,
    approveRequest: approveRequest,
    rejectRequest: rejectRequest,
  };
}
