import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { getMyCompetitionPaidTimeRequests } from "../services/paidTimeRequestsService";

function formatTime(timeValue) {
  if (!timeValue) {
    return "";
  }

  return String(timeValue).slice(0, 5);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    var date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  } catch (error) {
    return String(dateValue);
  }
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getSlotKey(item) {
  return [
    item.displaySlotDate,
    formatTime(item.displayStartTime),
    formatTime(item.displayEndTime),
    item.displayArenaName,
  ]
    .filter(Boolean)
    .join("|");
}

function getSlotLabel(item) {
  return [
    formatTime(item.displayStartTime) + " - " + formatTime(item.displayEndTime),
    item.displayArenaName,
  ]
    .filter(Boolean)
    .join(" • ");
}

function itemMatchesSearch(item, searchText) {
  var search = normalizeText(searchText);

  if (!search) {
    return true;
  }

  var combined = [
    item.horseName,
    item.barnName,
    item.coachName,
    item.payerName,
    item.productName,
    item.displayArenaName,
    item.displayStatus,
    item.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return combined.includes(search);
}

export default function useAdminCompetitionPaidTimesList(params) {
  var activeRole = params.activeRole;
  var activeCompetition = params.activeCompetition;

  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(false);
  var [refreshing, setRefreshing] = useState(false);
  var [screenError, setScreenError] = useState("");
  var [searchText, setSearchText] = useState("");

  var [statusFilter, setStatusFilter] = useState("all");
  var [paymentFilter, setPaymentFilter] = useState("all");
  var [productFilter, setProductFilter] = useState("all");
  var [dateFilter, setDateFilter] = useState("all");
  var [slotFilter, setSlotFilter] = useState("all");

  useFocusEffect(
    useCallback(
      function () {
        if (
          !activeRole ||
          !activeRole.ranchId ||
          !activeCompetition ||
          !activeCompetition.competitionId
        ) {
          return;
        }

        loadItems(false);
      },
      [activeRole, activeCompetition],
    ),
  );

  async function loadItems(isRefresh) {
    try {
      if (
        !activeRole ||
        !activeRole.ranchId ||
        !activeCompetition ||
        !activeCompetition.competitionId
      ) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setScreenError("");

      var response = await getMyCompetitionPaidTimeRequests(
        activeCompetition.competitionId,
        activeRole.ranchId,
      );

      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setScreenError(
        String(error?.response?.data || "אירעה שגיאה בטעינת הפייד טיימים"),
      );
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    await loadItems(true);
  }

  function resetFilters() {
    setStatusFilter("all");
    setPaymentFilter("all");
    setProductFilter("all");
    setDateFilter("all");
    setSlotFilter("all");
    setSearchText("");
  }

  var availableDates = useMemo(
    function () {
      var map = {};

      items.forEach(function (item) {
        if (!item.displaySlotDate) {
          return;
        }

        map[item.displaySlotDate] = {
          value: item.displaySlotDate,
          label: formatDate(item.displaySlotDate),
        };
      });

      return Object.keys(map)
        .sort()
        .map(function (key) {
          return map[key];
        });
    },
    [items],
  );

  var availableSlots = useMemo(
    function () {
      var map = {};

      items.forEach(function (item) {
        var key = getSlotKey(item);

        if (!key) {
          return;
        }

        map[key] = {
          value: key,
          label: getSlotLabel(item),
        };
      });

      return Object.keys(map)
        .sort()
        .map(function (key) {
          return map[key];
        });
    },
    [items],
  );

  var filteredItems = useMemo(
    function () {
      return items.filter(function (item) {
        if (!itemMatchesSearch(item, searchText)) {
          return false;
        }

        if (statusFilter === "assigned" && !item.isAssigned) {
          return false;
        }

        if (statusFilter === "pending" && item.isAssigned) {
          return false;
        }

        if (paymentFilter === "paid" && !item.isPaid) {
          return false;
        }

        if (paymentFilter === "unpaid" && item.isPaid) {
          return false;
        }

        if (
          productFilter === "short" &&
          !String(item.productName || "").includes("קצר")
        ) {
          return false;
        }

        if (
          productFilter === "long" &&
          !String(item.productName || "").includes("ארוך")
        ) {
          return false;
        }

        if (dateFilter !== "all" && item.displaySlotDate !== dateFilter) {
          return false;
        }

        if (slotFilter !== "all" && getSlotKey(item) !== slotFilter) {
          return false;
        }

        return true;
      });
    },
    [
      items,
      searchText,
      statusFilter,
      paymentFilter,
      productFilter,
      dateFilter,
      slotFilter,
    ],
  );

  return {
    items,
    filteredItems,
    loading,
    refreshing,
    screenError,
    searchText,
    setSearchText,

    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    productFilter,
    setProductFilter,
    dateFilter,
    setDateFilter,
    slotFilter,
    setSlotFilter,

    availableDates,
    availableSlots,
    resetFilters,
    handleRefresh,
    formatTime,
    formatDate,
  };
}