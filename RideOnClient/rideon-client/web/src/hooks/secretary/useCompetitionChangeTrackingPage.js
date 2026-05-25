import { useEffect, useMemo, useState } from "react";
import {
  getCompetitionChangeRequests,
  getPendingChangeRequestsCount,
  answerChangeRequest,
} from "../../services/changeTrackingService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

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

function getValue(item, camelKey, pascalKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function getRequestId(item) {
  return getValue(item, "requestId", "RequestId", 0);
}

function getRequestSource(item) {
  return getValue(item, "requestSource", "RequestSource", "");
}

function getRequestType(item) {
  return getValue(item, "requestType", "RequestType", "");
}

function getRequestKey(item) {
  return getRequestSource(item) + "-" + getRequestId(item);
}

function getRequestSearchText(item) {
  return [
    item.requestType,
    item.RequestType,
    item.requestSource,
    item.RequestSource,
    item.requestedByName,
    item.RequestedByName,
    item.entityType,
    item.EntityType,
    item.entityName,
    item.EntityName,
    item.beforeText,
    item.BeforeText,
    item.afterText,
    item.AfterText,
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
  var [actionError, setActionError] = useState("");
  var [actionSuccess, setActionSuccess] = useState("");

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
      var count =
        response.data?.pendingCount || response.data?.PendingCount || 0;

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

      if (typeFilter !== "all") {
        result = result.filter(function (item) {
          return getRequestType(item) === typeFilter;
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
        var isCancelled = getValue(item, "isCancelled", "IsCancelled", false);

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
    setActionError("");
    setActionSuccess("");
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
      setActionError("לא ניתן לזהות את בקשת השינוי");
      return;
    }

    if (answerStatus !== "Approved" && answerStatus !== "Rejected") {
      setActionError("סטטוס טיפול לא תקין");
      return;
    }

    try {
      setAnsweringRequestKey(requestKey);
      setActionError("");
      setActionSuccess("");

      await answerChangeRequest({
        competitionId: Number(competitionId),
        ranchId: Number(ranchId),
        requestId: requestId,
        requestSource: requestSource,
        answerStatus: answerStatus,
        notes: null,
      });

      if (answerStatus === "Approved") {
        setActionSuccess("בקשת השינוי אושרה בהצלחה");
      } else {
        setActionSuccess("בקשת השינוי נדחתה בהצלחה");
      }

      setSelectedRequest(null);

      await loadPageData();
    } catch (error) {
      console.error(error);
      setActionError(getErrorMessage(error, "שגיאה בטיפול בבקשת השינוי"));
    } finally {
      setAnsweringRequestKey(null);
    }
  }

  function approveRequest(item) {
    answerRequest(item, "Approved");
  }

  function rejectRequest(item) {
    answerRequest(item, "Rejected");
  }

  return {
    tabs: CHANGE_REQUEST_TABS,

    activeStatus: activeStatus,
    items: items,
    visibleItems: visibleItems,
    summary: summary,
    pendingCount: pendingCount,

    loading: loading,
    loadingCount: loadingCount,
    error: error,

    actionError: actionError,
    actionSuccess: actionSuccess,
    answeringRequestKey: answeringRequestKey,

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
