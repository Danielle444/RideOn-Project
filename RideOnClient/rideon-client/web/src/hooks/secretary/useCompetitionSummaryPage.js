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
  getCompetitionSummaryPaymentMethodBreakdown,
  getCompetitionSummaryPaymentBatches,
  getCompetitionSummaryPaymentBatchMethods,
  getCompetitionSummaryPaymentBatchCharges,
  getCompetitionCashDeskOverview,
  saveCompetitionCashCount,
  saveCompetitionCashSafeTransfer,
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
  var systemUserId = options.systemUserId || null;

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

  var [paymentsModal, setPaymentsModal] = useState(null);
  var [paymentBreakdownItems, setPaymentBreakdownItems] = useState([]);
  var [paymentBatchItems, setPaymentBatchItems] = useState([]);
  var [paymentBatchMethods, setPaymentBatchMethods] = useState([]);
  var [paymentBatchCharges, setPaymentBatchCharges] = useState([]);
  var [paymentsLoading, setPaymentsLoading] = useState(false);
  var [paymentsError, setPaymentsError] = useState("");

  var [cashDeskOpen, setCashDeskOpen] = useState(false);
  var [cashDeskOverview, setCashDeskOverview] = useState(null);
  var [cashDeskLoading, setCashDeskLoading] = useState(false);
  var [cashDeskSaving, setCashDeskSaving] = useState(false);
  var [cashDeskError, setCashDeskError] = useState("");
  var [cashDeskSuccess, setCashDeskSuccess] = useState("");

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

  async function openCashDetails() {
    if (!competitionId || !ranchId) {
      return;
    }

    setCashDeskOpen(true);
    await loadCashDeskOverview();
  }

  async function loadCashDeskOverview() {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setCashDeskLoading(true);
      setCashDeskError("");
      setCashDeskSuccess("");

      var response = await getCompetitionCashDeskOverview(
        competitionId,
        ranchId,
      );

      setCashDeskOverview(response.data || null);
    } catch (error) {
      console.error(error);
      setCashDeskError(getErrorMessage(error, "שגיאה בטעינת נתוני קופה"));
      setCashDeskOverview(null);
    } finally {
      setCashDeskLoading(false);
    }
  }

  function closeCashDesk() {
    if (cashDeskSaving) {
      return;
    }

    setCashDeskOpen(false);
    setCashDeskOverview(null);
    setCashDeskError("");
    setCashDeskSuccess("");
  }

  async function saveCashCount(formData) {
    if (!competitionId || !ranchId) {
      return;
    }

    if (!systemUserId) {
      setCashDeskError("לא נמצא מזהה משתמש מחובר לשמירת ספירת קופה");
      return;
    }

    try {
      setCashDeskSaving(true);
      setCashDeskError("");
      setCashDeskSuccess("");

      await saveCompetitionCashCount({
        competitionId: Number(competitionId),
        ranchId: Number(ranchId),
        countedBySystemUserId: Number(systemUserId),
        lines: formData.lines || [],
        notes: formData.notes || null,
      });

      setCashDeskSuccess("ספירת הקופה נשמרה בהצלחה");
      await loadCashDeskOverview();
      await loadSummary();
    } catch (error) {
      console.error(error);
      setCashDeskError(getErrorMessage(error, "שגיאה בשמירת ספירת קופה"));
    } finally {
      setCashDeskSaving(false);
    }
  }

  async function saveCashSafeTransfer(formData) {
    if (!competitionId || !ranchId) {
      return;
    }

    if (!systemUserId) {
      setCashDeskError("לא נמצא מזהה משתמש מחובר לשמירת העברה לכספת");
      return;
    }

    try {
      setCashDeskSaving(true);
      setCashDeskError("");
      setCashDeskSuccess("");

      await saveCompetitionCashSafeTransfer({
        competitionId: Number(competitionId),
        ranchId: Number(ranchId),
        transferredBySystemUserId: Number(systemUserId),
        amount: Number(formData.amount || 0),
        notes: formData.notes || null,
      });

      setCashDeskSuccess(
        "העברה לכספת נשמרה בהצלחה. מומלץ לבצע ספירת קופה חדשה.",
      );
      await loadCashDeskOverview();
      await loadSummary();
    } catch (error) {
      console.error(error);
      setCashDeskError(getErrorMessage(error, "שגיאה בשמירת העברה לכספת"));
    } finally {
      setCashDeskSaving(false);
    }
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

  async function openOrganizerPaidBreakdown() {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setPaymentsLoading(true);
      setPaymentsError("");
      setPaymentBreakdownItems([]);
      setPaymentBatchItems([]);
      setPaymentBatchMethods([]);
      setPaymentBatchCharges([]);

      setPaymentsModal({
        mode: "breakdown",
        chargeOwner: "Organizer",
        selectedPaymentMethod: null,
        selectedPaymentBatch: null,
      });

      var response = await getCompetitionSummaryPaymentMethodBreakdown(
        competitionId,
        ranchId,
        "Organizer",
      );

      setPaymentBreakdownItems(
        Array.isArray(response.data) ? response.data : [],
      );
    } catch (error) {
      console.error(error);
      setPaymentsError(getErrorMessage(error, "שגיאה בטעינת פילוח תשלומים"));
      setPaymentBreakdownItems([]);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function openPaymentBatches(paymentMethodItem) {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setPaymentsLoading(true);
      setPaymentsError("");
      setPaymentBatchItems([]);
      setPaymentBatchMethods([]);
      setPaymentBatchCharges([]);

      var paymentMethodId = null;

      if (paymentMethodItem) {
        paymentMethodId = getValue(
          paymentMethodItem,
          "paymentMethodId",
          "PaymentMethodId",
          null,
        );
      }

      setPaymentsModal({
        mode: "batches",
        chargeOwner: "Organizer",
        selectedPaymentMethod: paymentMethodItem || null,
        selectedPaymentBatch: null,
      });

      var response = await getCompetitionSummaryPaymentBatches(
        competitionId,
        ranchId,
        "Organizer",
        paymentMethodId,
      );

      setPaymentBatchItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setPaymentsError(getErrorMessage(error, "שגיאה בטעינת חשבוניות"));
      setPaymentBatchItems([]);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function openPaymentBatchDetails(batchItem) {
    if (!competitionId || !ranchId) {
      return;
    }

    var paymentBatchId = getValue(
      batchItem,
      "paymentBatchId",
      "PaymentBatchId",
      0,
    );

    if (!paymentBatchId) {
      return;
    }

    try {
      setPaymentsLoading(true);
      setPaymentsError("");
      setPaymentBatchMethods([]);
      setPaymentBatchCharges([]);

      setPaymentsModal({
        mode: "batch-details",
        chargeOwner: "Organizer",
        selectedPaymentMethod: paymentsModal?.selectedPaymentMethod || null,
        selectedPaymentBatch: batchItem,
      });

      var methodsResponse = await getCompetitionSummaryPaymentBatchMethods(
        competitionId,
        ranchId,
        paymentBatchId,
      );

      var chargesResponse = await getCompetitionSummaryPaymentBatchCharges(
        competitionId,
        ranchId,
        paymentBatchId,
      );

      setPaymentBatchMethods(
        Array.isArray(methodsResponse.data) ? methodsResponse.data : [],
      );

      setPaymentBatchCharges(
        Array.isArray(chargesResponse.data) ? chargesResponse.data : [],
      );
    } catch (error) {
      console.error(error);
      setPaymentsError(getErrorMessage(error, "שגיאה בטעינת פירוט חשבונית"));
      setPaymentBatchMethods([]);
      setPaymentBatchCharges([]);
    } finally {
      setPaymentsLoading(false);
    }
  }

  function backInPaymentsModal() {
    if (!paymentsModal) {
      return;
    }

    if (paymentsModal.mode === "batch-details") {
      setPaymentsModal({
        mode: "batches",
        chargeOwner: "Organizer",
        selectedPaymentMethod: paymentsModal.selectedPaymentMethod || null,
        selectedPaymentBatch: null,
      });

      setPaymentBatchMethods([]);
      setPaymentBatchCharges([]);
      return;
    }

    if (paymentsModal.mode === "batches") {
      setPaymentsModal({
        mode: "breakdown",
        chargeOwner: "Organizer",
        selectedPaymentMethod: null,
        selectedPaymentBatch: null,
      });

      setPaymentBatchItems([]);
      return;
    }
  }

  function closePaymentsModal() {
    setPaymentsModal(null);
    setPaymentBreakdownItems([]);
    setPaymentBatchItems([]);
    setPaymentBatchMethods([]);
    setPaymentBatchCharges([]);
    setPaymentsError("");
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

    paymentsModal: paymentsModal,
    paymentBreakdownItems: paymentBreakdownItems,
    paymentBatchItems: paymentBatchItems,
    paymentBatchMethods: paymentBatchMethods,
    paymentBatchCharges: paymentBatchCharges,
    paymentsLoading: paymentsLoading,
    paymentsError: paymentsError,

    cashDeskOpen: cashDeskOpen,
    cashDeskOverview: cashDeskOverview,
    cashDeskLoading: cashDeskLoading,
    cashDeskSaving: cashDeskSaving,
    cashDeskError: cashDeskError,
    cashDeskSuccess: cashDeskSuccess,
    systemUserId: systemUserId,

    openOrganizerCategoryDetails: openOrganizerCategoryDetails,
    openFederationClassesDetails: openFederationClassesDetails,
    openCashDetails: openCashDetails,
    closeCashDesk: closeCashDesk,
    loadCashDeskOverview: loadCashDeskOverview,
    saveCashCount: saveCashCount,
    saveCashSafeTransfer: saveCashSafeTransfer,

    closeDetailsModal: closeDetailsModal,
    openEntriesForDetail: openEntriesForDetail,
    backToDetailsList: backToDetailsList,

    openOrganizerPaidBreakdown: openOrganizerPaidBreakdown,
    openPaymentBatches: openPaymentBatches,
    openPaymentBatchDetails: openPaymentBatchDetails,
    backInPaymentsModal: backInPaymentsModal,
    closePaymentsModal: closePaymentsModal,
  };
}
