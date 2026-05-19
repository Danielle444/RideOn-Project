import { useEffect, useState } from "react";
import {
  getCompetitionSummary,
  getCompetitionSummaryClassDetails,
  getCompetitionSummaryClassEntries,
  getCompetitionSummaryPaidTimeDetails,
  getCompetitionSummaryPaidTimeEntries,
  getCompetitionSummaryStallDetails,
  getCompetitionSummaryStallEntries,
  getCompetitionSummaryShavingsDetails,
  getCompetitionSummaryShavingsEntries,
  getCompetitionSummaryCashDetails,
} from "../../services/competitionSummaryService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

function getEmptySummary() {
  return {
    organizer: {
      expectedAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    },
    federation: {
      expectedAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    },
    organizerCategories: [],
    federationCategories: [],
  };
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

function buildDetailsTitle(type, sectionKey) {
  if (type === "classes" && sectionKey === "federation") {
    return "פירוט הכנסות התאחדות ממקצים";
  }

  if (type === "classes") {
    return "פירוט מקצים";
  }

  if (type === "paid-time") {
    return "פירוט פייד־טיים";
  }

  if (type === "stalls") {
    return "פירוט תאים";
  }

  if (type === "shavings") {
    return "פירוט נסורת";
  }

  if (type === "cash") {
    return "פירוט קופה";
  }

  return "פירוט";
}

export default function useCompetitionSummaryPage(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;

  var [summary, setSummary] = useState(getEmptySummary());
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");

  var [detailsModal, setDetailsModal] = useState(null);
  var [detailsItems, setDetailsItems] = useState([]);
  var [detailsLoading, setDetailsLoading] = useState(false);
  var [detailsError, setDetailsError] = useState("");

  var [selectedDetailItem, setSelectedDetailItem] = useState(null);
  var [entryItems, setEntryItems] = useState([]);
  var [entriesLoading, setEntriesLoading] = useState(false);
  var [entriesError, setEntriesError] = useState("");

  useEffect(
    function () {
      loadSummary();
    },
    [competitionId, ranchId],
  );

  async function loadSummary() {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      var response = await getCompetitionSummary(competitionId, ranchId);
      var data = response.data || getEmptySummary();

      setSummary({
        organizer:
          data.organizer || data.Organizer || getEmptySummary().organizer,
        federation:
          data.federation || data.Federation || getEmptySummary().federation,
        organizerCategories:
          data.organizerCategories || data.OrganizerCategories || [],
        federationCategories:
          data.federationCategories || data.FederationCategories || [],
      });
    } catch (error) {
      console.error(error);
      setError(getErrorMessage(error, "שגיאה בטעינת סיכום התחרות"));
      setSummary(getEmptySummary());
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(type, sectionKey) {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setDetailsLoading(true);
      setDetailsError("");
      setSelectedDetailItem(null);
      setEntryItems([]);
      setEntriesError("");

      setDetailsModal({
        type: type,
        sectionKey: sectionKey || "organizer",
        title: buildDetailsTitle(type, sectionKey || "organizer"),
      });

      var response = null;

      if (type === "classes") {
        response = await getCompetitionSummaryClassDetails(
          competitionId,
          ranchId,
          sectionKey || "organizer",
        );
      }

      if (type === "paid-time") {
        response = await getCompetitionSummaryPaidTimeDetails(
          competitionId,
          ranchId,
        );
      }

      if (type === "stalls") {
        response = await getCompetitionSummaryStallDetails(
          competitionId,
          ranchId,
        );
      }

      if (type === "shavings") {
        response = await getCompetitionSummaryShavingsDetails(
          competitionId,
          ranchId,
        );
      }

      if (type === "cash") {
        response = await getCompetitionSummaryCashDetails(
          competitionId,
          ranchId,
        );
      }

      setDetailsItems(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setDetailsError(getErrorMessage(error, "שגיאה בטעינת הפירוט"));
      setDetailsItems([]);
    } finally {
      setDetailsLoading(false);
    }
  }

  function openOrganizerCategoryDetails(item) {
    var categoryKey = getValue(item, "categoryKey", "CategoryKey", "");

    if (categoryKey === "classes") {
      openDetails("classes", "organizer");
      return;
    }

    if (categoryKey === "paid-time") {
      openDetails("paid-time", "organizer");
      return;
    }

    if (categoryKey === "stalls") {
      openDetails("stalls", "organizer");
      return;
    }

    if (categoryKey === "shavings") {
      openDetails("shavings", "organizer");
    }
  }

  function openFederationClassesDetails() {
    openDetails("classes", "federation");
  }

  function openCashDetails() {
    openDetails("cash", "organizer");
  }

  function closeDetailsModal() {
    setDetailsModal(null);
    setDetailsItems([]);
    setDetailsError("");
    setSelectedDetailItem(null);
    setEntryItems([]);
    setEntriesError("");
  }

  function backToDetailsList() {
    setSelectedDetailItem(null);
    setEntryItems([]);
    setEntriesError("");
  }

  async function openEntriesForDetail(item) {
    if (!detailsModal || !competitionId || !ranchId) {
      return;
    }

    if (detailsModal.type === "cash") {
      return;
    }

    try {
      setEntriesLoading(true);
      setEntriesError("");
      setSelectedDetailItem(item);
      setEntryItems([]);

      var response = null;

      if (detailsModal.type === "classes") {
        var classInCompId = getValue(item, "classInCompId", "ClassInCompId", 0);

        response = await getCompetitionSummaryClassEntries(
          competitionId,
          ranchId,
          classInCompId,
          detailsModal.sectionKey,
        );
      }

      if (detailsModal.type === "paid-time") {
        var paidTimeSlotInCompId = getValue(
          item,
          "paidTimeSlotInCompId",
          "PaidTimeSlotInCompId",
          0,
        );

        var productId = getValue(item, "productId", "ProductId", 0);

        response = await getCompetitionSummaryPaidTimeEntries(
          competitionId,
          ranchId,
          paidTimeSlotInCompId,
          productId,
        );
      }

      if (detailsModal.type === "stalls") {
        var bookingRanchId = getValue(
          item,
          "bookingRanchId",
          "BookingRanchId",
          0,
        );

        var stallProductId = getValue(item, "productId", "ProductId", 0);
        var isForTack = getValue(item, "isForTack", "IsForTack", false);

        response = await getCompetitionSummaryStallEntries(
          competitionId,
          ranchId,
          bookingRanchId,
          stallProductId,
          isForTack,
        );
      }

      if (detailsModal.type === "shavings") {
        var shavingsBookingRanchId = getValue(
          item,
          "bookingRanchId",
          "BookingRanchId",
          0,
        );

        response = await getCompetitionSummaryShavingsEntries(
          competitionId,
          ranchId,
          shavingsBookingRanchId,
        );
      }

      setEntryItems(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setEntriesError(getErrorMessage(error, "שגיאה בטעינת הרשומות"));
      setEntryItems([]);
    } finally {
      setEntriesLoading(false);
    }
  }

  return {
    summary: summary,
    loading: loading,
    error: error,
    loadSummary: loadSummary,

    detailsModal: detailsModal,
    detailsItems: detailsItems,
    detailsLoading: detailsLoading,
    detailsError: detailsError,

    selectedDetailItem: selectedDetailItem,
    entryItems: entryItems,
    entriesLoading: entriesLoading,
    entriesError: entriesError,

    openOrganizerCategoryDetails: openOrganizerCategoryDetails,
    openFederationClassesDetails: openFederationClassesDetails,
    openCashDetails: openCashDetails,
    closeDetailsModal: closeDetailsModal,
    openEntriesForDetail: openEntriesForDetail,
    backToDetailsList: backToDetailsList,
  };
}
