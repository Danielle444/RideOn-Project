import { useEffect, useMemo, useState } from "react";
import {
  getCompetitionChangeRequests,
  getPendingChangeRequestsCount,
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

function getRequestSource(item) {
  return item.requestSource || item.RequestSource || "";
}

function getRequestType(item) {
  return item.requestType || item.RequestType || "";
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
        var isCancelled = item.isCancelled || item.IsCancelled;

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

  return {
    tabs: CHANGE_REQUEST_TABS,

    activeStatus,
    items,
    visibleItems,
    summary,
    pendingCount,

    loading,
    loadingCount,
    error,

    searchText,
    sourceFilter,
    typeFilter,
    selectedRequest,

    setSearchText,
    setSourceFilter,
    setTypeFilter,

    changeStatus,
    clearFilters,
    openRequestDetails,
    closeRequestDetails,
    loadPageData,
  };
}
