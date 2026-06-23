import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { getMyCompetitionEntries } from "../services/entriesService";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

function itemMatchesSearch(item, searchText) {
  var search = normalizeText(searchText);

  if (!search) {
    return true;
  }

  var combined = [
    item.className,
    item.horseName,
    item.riderName,
    item.coachName,
    item.payerName,
    item.prizeRecipientName,
    item.barnName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return combined.includes(search);
}

export default function useAdminCompetitionEntriesList(
  params
) {
  var activeRole = params.activeRole;
  var activeCompetition = params.activeCompetition;

  var [items, setItems] = useState([]);

  var [loading, setLoading] = useState(false);

  var [refreshing, setRefreshing] =
    useState(false);

  var [screenError, setScreenError] =
    useState("");

  var [searchText, setSearchText] =
    useState("");

  var [paymentFilter, setPaymentFilter] =
    useState("all");

  var [dateFilter, setDateFilter] =
    useState("all");

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

      var response =
        await getMyCompetitionEntries(
          activeCompetition.competitionId,
          activeRole.ranchId,
        );

      // Dedup by entryId: defensive guard for SPs that may return the same
      // entry multiple times after 1-to-many joins.
      var raw = Array.isArray(response.data) ? response.data : [];
      var seen = new Set();
      var deduped = [];
      raw.forEach(function (it) {
        var k = String(it.entryId);
        if (seen.has(k)) return;
        seen.add(k);
        deduped.push(it);
      });
      setItems(deduped);
    } catch (error) {
      setScreenError(
        String(
          error?.response?.data ||
            "אירעה שגיאה בטעינת המקצים",
        ),
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
    setPaymentFilter("all");
    setDateFilter("all");
    setSearchText("");
  }

  var availableDates = useMemo(
    function () {
      var map = {};

      items.forEach(function (item) {
        if (!item.classDate) {
          return;
        }

        var dateKey = item.classDate
          .split("T")[0];

        map[dateKey] = {
          value: dateKey,
          label: formatDate(dateKey),
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
        if (
          !itemMatchesSearch(
            item,
            searchText,
          )
        ) {
          return false;
        }

        if (
          paymentFilter === "paid" &&
          !item.isPaid
        ) {
          return false;
        }

        if (
          paymentFilter === "unpaid" &&
          item.isPaid
        ) {
          return false;
        }

        if (
          dateFilter !== "all"
        ) {
          var itemDate =
            item.classDate?.split("T")[0];

          if (itemDate !== dateFilter) {
            return false;
          }
        }

        return true;
      });
    },
    [
      items,
      searchText,
      paymentFilter,
      dateFilter,
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

    paymentFilter,
    setPaymentFilter,

    dateFilter,
    setDateFilter,

    availableDates,

    resetFilters,
    handleRefresh,

    formatDate,
  };
}