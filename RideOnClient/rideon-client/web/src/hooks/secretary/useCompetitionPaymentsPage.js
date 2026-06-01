import { useEffect, useMemo, useState } from "react";
import {
  allocateFederationCreditToCharge,
  createCompetitionPayment,
  createFederationExternalCredit,
  getCompetitionPayerAccountSummary,
  getCompetitionPayerCategorySummary,
  getCompetitionPayerCharges,
  getCompetitionPaymentMethods,
  getCompetitionPaymentPayers,
  getFederationCoverageStatusForPayer,
  getFederationChargesForPayer,
  getFederationCreditAllocations,
  searchFederationExternalCredits,
  validateFederationCoverageBeforeOrganizerPayment,
} from "../../services/competitionPaymentsService";

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

function getErrorMessage(error, fallbackMessage) {
  if (error?.response?.data) {
    if (typeof error.response.data === "string") {
      return error.response.data;
    }

    if (error.response.data.message) {
      return error.response.data.message;
    }
  }

  return fallbackMessage;
}

function getChargeId(charge) {
  return getValue(charge, "billChargeId", "BillChargeId", 0);
}

function getDisplayRowKey(charge) {
  return String(
    getValue(charge, "displayRowKey", "DisplayRowKey", getChargeId(charge)),
  );
}

function getChargeOwner(charge) {
  return getValue(charge, "chargeOwner", "ChargeOwner", "");
}

function getUniqueBillChargeIdsFromRows(rows) {
  var ids = [];

  rows.forEach(function (charge) {
    var id = getChargeId(charge);

    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  });

  return ids;
}

function isChargeOpen(charge) {
  var status = getValue(charge, "chargeStatus", "ChargeStatus", "");
  var canSelect = getValue(
    charge,
    "canSelectForPayment",
    "CanSelectForPayment",
    false,
  );

  return status === "Open" && canSelect === true;
}

function getCreditAvailableAmount(credit) {
  return Number(getValue(credit, "availableAmount", "AvailableAmount", 0));
}

function getCreditId(credit) {
  return getValue(
    credit,
    "federationExternalCreditId",
    "FederationExternalCreditId",
    0,
  );
}

export default function useCompetitionPaymentsPage(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;

  var [payers, setPayers] = useState([]);
  var [payersLoading, setPayersLoading] = useState(false);
  var [payersError, setPayersError] = useState("");

  var [selectedPayer, setSelectedPayer] = useState(null);

  var [accountSummary, setAccountSummary] = useState([]);
  var [categorySummary, setCategorySummary] = useState([]);
  var [charges, setCharges] = useState([]);
  var [paymentMethods, setPaymentMethods] = useState([]);

  var [accountLoading, setAccountLoading] = useState(false);
  var [accountError, setAccountError] = useState("");

  var [selectedOwner, setSelectedOwner] = useState("Organizer");
  var [selectedCategoryKey, setSelectedCategoryKey] = useState("");

  var [selectedChargeIds, setSelectedChargeIds] = useState([]);
  var [paymentModalOpen, setPaymentModalOpen] = useState(false);
  var [creatingPayment, setCreatingPayment] = useState(false);
  var [paymentError, setPaymentError] = useState("");
  var [paymentSuccess, setPaymentSuccess] = useState("");

  var [federationCoverageStatus, setFederationCoverageStatus] = useState(null);
  var [federationCharges, setFederationCharges] = useState([]);
  var [federationCoverageLoading, setFederationCoverageLoading] =
    useState(false);
  var [federationCoverageError, setFederationCoverageError] = useState("");
  var [federationValidation, setFederationValidation] = useState(null);

  var [federationApplyModalOpen, setFederationApplyModalOpen] = useState(false);
  var [federationCredits, setFederationCredits] = useState([]);
  var [federationCreditSearchText, setFederationCreditSearchText] =
    useState("");
  var [federationOnlyAvailable, setFederationOnlyAvailable] = useState(false);
  var [federationCreditsSearching, setFederationCreditsSearching] =
    useState(false);
  var [selectedFederationCredit, setSelectedFederationCredit] = useState(null);
  var [federationApplyLoading, setFederationApplyLoading] = useState(false);
  var [federationApplyError, setFederationApplyError] = useState("");
  var [federationApplySuccess, setFederationApplySuccess] = useState("");

  var [selectedCreditAllocations, setSelectedCreditAllocations] = useState([]);
  var [creditAllocationsLoading, setCreditAllocationsLoading] = useState(false);
  var [creditAllocationsError, setCreditAllocationsError] = useState("");
  var [allocationsCreditId, setAllocationsCreditId] = useState(0);

  var [manualCreditOpen, setManualCreditOpen] = useState(false);
  var [creatingManualCredit, setCreatingManualCredit] = useState(false);

  var [manualCreditForm, setManualCreditForm] = useState({
    sourceType: "BankTransfer",
    externalReference: "",
    externalName: "",
    externalClubName: "",
    externalIdNumber: "",
    originalAmount: "",
    notes: "",
  });

  useEffect(
    function () {
      loadPayers();
      loadPaymentMethods();
    },
    [competitionId, ranchId],
  );

  var visibleCharges = useMemo(
    function () {
      return charges.filter(function (charge) {
        var owner = getChargeOwner(charge);
        var categoryKey = getValue(charge, "categoryKey", "CategoryKey", "");

        if (selectedOwner && owner !== selectedOwner) {
          return false;
        }

        if (selectedCategoryKey && categoryKey !== selectedCategoryKey) {
          return false;
        }

        return true;
      });
    },
    [charges, selectedOwner, selectedCategoryKey],
  );

  var selectedCharges = useMemo(
    function () {
      var selectedRowKeys = [];

      return charges.filter(function (charge) {
        var billChargeId = getChargeId(charge);
        var rowKey = getDisplayRowKey(charge);

        if (!selectedChargeIds.includes(billChargeId)) {
          return false;
        }

        if (getChargeOwner(charge) !== selectedOwner) {
          return false;
        }

        if (selectedRowKeys.includes(rowKey)) {
          return false;
        }

        selectedRowKeys.push(rowKey);
        return true;
      });
    },
    [charges, selectedChargeIds, selectedOwner],
  );

  var selectedTotal = useMemo(
    function () {
      return selectedCharges.reduce(function (sum, charge) {
        return sum + Number(getValue(charge, "amountToPay", "AmountToPay", 0));
      }, 0);
    },
    [selectedCharges],
  );

  var selectedFederationCharges = useMemo(
    function () {
      if (selectedOwner !== "Federation") {
        return [];
      }

      return federationCharges.filter(function (charge) {
        var billChargeId = getValue(charge, "billChargeId", "BillChargeId", 0);
        var missingAmount = Number(
          getValue(charge, "missingAmount", "MissingAmount", 0),
        );

        return selectedChargeIds.includes(billChargeId) && missingAmount > 0;
      });
    },
    [selectedOwner, federationCharges, selectedChargeIds],
  );

  var selectedFederationMissingAmount = useMemo(
    function () {
      return selectedFederationCharges.reduce(function (sum, charge) {
        return (
          sum + Number(getValue(charge, "missingAmount", "MissingAmount", 0))
        );
      }, 0);
    },
    [selectedFederationCharges],
  );

  var visibleSelectableChargeIds = useMemo(
    function () {
      return getUniqueBillChargeIdsFromRows(
        visibleCharges.filter(function (charge) {
          return isChargeOpen(charge);
        }),
      );
    },
    [visibleCharges],
  );

  var allVisibleChargesSelected = useMemo(
    function () {
      if (visibleSelectableChargeIds.length === 0) {
        return false;
      }

      return visibleSelectableChargeIds.every(function (id) {
        return selectedChargeIds.includes(id);
      });
    },
    [visibleSelectableChargeIds, selectedChargeIds],
  );

  async function loadPayers() {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setPayersLoading(true);
      setPayersError("");

      var response = await getCompetitionPaymentPayers(competitionId, ranchId);

      setPayers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setPayersError(getErrorMessage(error, "שגיאה בטעינת רשימת משלמים"));
      setPayers([]);
    } finally {
      setPayersLoading(false);
    }
  }

  async function loadPaymentMethods() {
    try {
      var response = await getCompetitionPaymentMethods();

      setPaymentMethods(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setPaymentMethods([]);
    }
  }

  async function loadFederationCoverageData(payerPersonId) {
    if (!competitionId || !ranchId || !payerPersonId) {
      return;
    }

    try {
      setFederationCoverageLoading(true);
      setFederationCoverageError("");
      setFederationCoverageStatus(null);
      setFederationCharges([]);
      setFederationValidation(null);

      var coverageResponse = await getFederationCoverageStatusForPayer(
        competitionId,
        ranchId,
        payerPersonId,
      );

      var chargesResponse = await getFederationChargesForPayer(
        competitionId,
        ranchId,
        payerPersonId,
      );

      var validationResponse =
        await validateFederationCoverageBeforeOrganizerPayment(
          competitionId,
          ranchId,
          payerPersonId,
        );

      setFederationCoverageStatus(coverageResponse.data || null);
      setFederationCharges(
        Array.isArray(chargesResponse.data) ? chargesResponse.data : [],
      );
      setFederationValidation(validationResponse.data || null);
    } catch (error) {
      console.error(error);
      setFederationCoverageError(
        getErrorMessage(error, "שגיאה בטעינת נתוני התאחדות"),
      );
      setFederationCoverageStatus(null);
      setFederationCharges([]);
      setFederationValidation(null);
    } finally {
      setFederationCoverageLoading(false);
    }
  }

  async function reloadSelectedPayerData(payerPersonId) {
    await loadPayers();

    var updatedPayer = {
      payerPersonId: payerPersonId,
    };

    await openPayerAccount(updatedPayer);
  }

  async function openPayerAccount(payer) {
    var payerPersonId = getValue(payer, "payerPersonId", "PayerPersonId", 0);

    if (!competitionId || !ranchId || !payerPersonId) {
      return;
    }

    try {
      setSelectedPayer(payer);
      setAccountLoading(true);
      setAccountError("");
      setPaymentError("");
      setPaymentSuccess("");
      setSelectedChargeIds([]);
      setSelectedOwner("Organizer");
      setSelectedCategoryKey("");
      setFederationCoverageStatus(null);
      setFederationCharges([]);
      setFederationCoverageError("");
      setFederationValidation(null);

      var accountResponse = await getCompetitionPayerAccountSummary(
        competitionId,
        ranchId,
        payerPersonId,
      );

      var categoryResponse = await getCompetitionPayerCategorySummary(
        competitionId,
        ranchId,
        payerPersonId,
      );

      var chargesResponse = await getCompetitionPayerCharges(
        competitionId,
        ranchId,
        payerPersonId,
        null,
        null,
      );

      setAccountSummary(
        Array.isArray(accountResponse.data) ? accountResponse.data : [],
      );
      setCategorySummary(
        Array.isArray(categoryResponse.data) ? categoryResponse.data : [],
      );
      setCharges(
        Array.isArray(chargesResponse.data) ? chargesResponse.data : [],
      );

      await loadFederationCoverageData(payerPersonId);
    } catch (error) {
      console.error(error);
      setAccountError(getErrorMessage(error, "שגיאה בטעינת חשבון משלם"));
      setAccountSummary([]);
      setCategorySummary([]);
      setCharges([]);
    } finally {
      setAccountLoading(false);
    }
  }

  function closePayerAccount() {
    setSelectedPayer(null);
    setAccountSummary([]);
    setCategorySummary([]);
    setCharges([]);
    setSelectedChargeIds([]);
    setPaymentError("");
    setPaymentSuccess("");
    setFederationCoverageStatus(null);
    setFederationCharges([]);
    setFederationCoverageError("");
    setFederationValidation(null);
    closeFederationCoverageModal();
  }

  function selectOwner(owner) {
    if (owner !== selectedOwner) {
      setSelectedChargeIds([]);
    }

    setSelectedOwner(owner);
    setSelectedCategoryKey("");
  }

  function selectCategory(owner, categoryKey) {
    if (owner !== selectedOwner) {
      setSelectedChargeIds([]);
    }

    setSelectedOwner(owner);
    setSelectedCategoryKey(categoryKey || "");
  }

  function getRelatedChargeIds(charge) {
    var sourceType = getValue(charge, "sourceType", "SourceType", "");
    var sourceId = getValue(charge, "sourceId", "SourceId", 0);
    var categoryKey = getValue(charge, "categoryKey", "CategoryKey", "");
    var chargeOwner = getChargeOwner(charge);

    if (sourceType === "Entry" && categoryKey === "classes") {
      return charges
        .filter(function (candidate) {
          var candidateSourceType = getValue(
            candidate,
            "sourceType",
            "SourceType",
            "",
          );

          var candidateSourceId = getValue(
            candidate,
            "sourceId",
            "SourceId",
            0,
          );

          var candidateCategoryKey = getValue(
            candidate,
            "categoryKey",
            "CategoryKey",
            "",
          );

          return (
            candidateSourceType === "Entry" &&
            candidateCategoryKey === "classes" &&
            candidateSourceId === sourceId &&
            getChargeOwner(candidate) === chargeOwner &&
            isChargeOpen(candidate)
          );
        })
        .map(function (candidate) {
          return getChargeId(candidate);
        });
    }

    return [getChargeId(charge)];
  }

  function toggleCharge(charge) {
    if (!isChargeOpen(charge)) {
      return;
    }

    if (getChargeOwner(charge) !== selectedOwner) {
      return;
    }

    var relatedIds = getRelatedChargeIds(charge);
    var billChargeId = getChargeId(charge);
    var categoryKey = getValue(charge, "categoryKey", "CategoryKey", "");

    if (categoryKey === "shavings") {
      relatedIds = [billChargeId];
    }

    setSelectedChargeIds(function (previous) {
      var allSelected = relatedIds.every(function (id) {
        return previous.includes(id);
      });

      if (allSelected) {
        return previous.filter(function (id) {
          return !relatedIds.includes(id);
        });
      }

      var next = previous.slice();

      relatedIds.forEach(function (id) {
        if (!next.includes(id)) {
          next.push(id);
        }
      });

      return next;
    });
  }

  function toggleSelectAllVisibleCharges() {
    if (visibleSelectableChargeIds.length === 0) {
      return;
    }

    setSelectedChargeIds(function (previous) {
      var allSelected = visibleSelectableChargeIds.every(function (id) {
        return previous.includes(id);
      });

      if (allSelected) {
        return previous.filter(function (id) {
          return !visibleSelectableChargeIds.includes(id);
        });
      }

      var next = previous.slice();

      visibleSelectableChargeIds.forEach(function (id) {
        if (!next.includes(id)) {
          next.push(id);
        }
      });

      return next;
    });
  }

  function clearSelectedCharges() {
    setSelectedChargeIds([]);
  }

  function openPaymentModal() {
    if (selectedChargeIds.length === 0 || selectedCharges.length === 0) {
      return;
    }

    if (selectedOwner === "Federation") {
      openFederationCoverageModal();
      return;
    }

    setPaymentError("");
    setPaymentSuccess("");
    setPaymentModalOpen(true);
  }

  function closePaymentModal() {
    if (creatingPayment) {
      return;
    }

    setPaymentModalOpen(false);
    setPaymentError("");
  }

  async function searchFederationCredits() {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setFederationCreditsSearching(true);
      setFederationApplyError("");

      var response = await searchFederationExternalCredits(
        competitionId,
        ranchId,
        federationCreditSearchText,
        federationOnlyAvailable,
      );

      setFederationCredits(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setFederationApplyError(
        getErrorMessage(error, "שגיאה בחיפוש יתרות התאחדות"),
      );
      setFederationCredits([]);
    } finally {
      setFederationCreditsSearching(false);
    }
  }

  async function openFederationCoverageModal() {
    if (selectedOwner !== "Federation") {
      return;
    }

    if (selectedFederationCharges.length === 0) {
      setPaymentError("יש לבחור שורות התאחדות פתוחות לכיסוי");
      return;
    }

    setPaymentError("");
    setFederationApplyError("");
    setFederationApplySuccess("");
    setSelectedFederationCredit(null);
    setFederationApplyModalOpen(true);

    await searchFederationCredits();
  }

  function closeFederationCoverageModal() {
    if (federationApplyLoading || creatingManualCredit) {
      return;
    }

    setFederationApplyModalOpen(false);
    setFederationApplyError("");
    setFederationApplySuccess("");
    setSelectedFederationCredit(null);
    setManualCreditOpen(false);
    resetManualCreditForm();
    clearFederationCreditAllocations();
  }

  function changeFederationCreditSearchText(value) {
    setFederationCreditSearchText(value);
  }

  function changeFederationOnlyAvailable(value) {
    setFederationOnlyAvailable(value === true);
  }

  function selectFederationCredit(credit) {
    if (getCreditAvailableAmount(credit) <= 0) {
      return;
    }

    setSelectedFederationCredit(credit);
    setFederationApplyError("");
  }

  async function loadFederationCreditAllocations(credit) {
    if (!competitionId || !ranchId || !credit) {
      return;
    }

    var creditId = getCreditId(credit);

    if (!creditId) {
      return;
    }

    try {
      setCreditAllocationsLoading(true);
      setCreditAllocationsError("");
      setSelectedCreditAllocations([]);
      setAllocationsCreditId(creditId);

      var response = await getFederationCreditAllocations(
        competitionId,
        ranchId,
        creditId,
      );

      setSelectedCreditAllocations(
        Array.isArray(response.data) ? response.data : [],
      );
    } catch (error) {
      console.error(error);
      setCreditAllocationsError(
        getErrorMessage(error, "שגיאה בשליפת שיוכי יתרה"),
      );
      setSelectedCreditAllocations([]);
    } finally {
      setCreditAllocationsLoading(false);
    }
  }

  function clearFederationCreditAllocations() {
    setSelectedCreditAllocations([]);
    setCreditAllocationsError("");
    setAllocationsCreditId(0);
  }

  function toggleManualCreditForm() {
    setManualCreditOpen(function (previous) {
      return !previous;
    });

    setFederationApplyError("");
    setFederationApplySuccess("");
  }

  function updateManualCreditField(fieldName, value) {
    setManualCreditForm(function (previous) {
      return {
        ...previous,
        [fieldName]: value,
      };
    });
  }

  function resetManualCreditForm() {
    setManualCreditForm({
      sourceType: "BankTransfer",
      externalReference: "",
      externalName: "",
      externalClubName: "",
      externalIdNumber: "",
      originalAmount: "",
      notes: "",
    });
  }

  async function submitManualFederationCredit() {
    if (!competitionId || !ranchId) {
      return;
    }

    var amount = Number(manualCreditForm.originalAmount);

    if (!manualCreditForm.sourceType) {
      setFederationApplyError("יש לבחור מקור יתרה");
      return;
    }

    if (!amount || amount <= 0) {
      setFederationApplyError("יש להזין סכום יתרה תקין");
      return;
    }

    try {
      setCreatingManualCredit(true);
      setFederationApplyError("");
      setFederationApplySuccess("");

      var response = await createFederationExternalCredit({
        competitionId: Number(competitionId),
        ranchId: Number(ranchId),
        sourceType: manualCreditForm.sourceType,
        externalReference: manualCreditForm.externalReference || null,
        externalName: manualCreditForm.externalName || null,
        externalClubName: manualCreditForm.externalClubName || null,
        externalIdNumber: manualCreditForm.externalIdNumber || null,
        originalAmount: amount,
        notes: manualCreditForm.notes || null,
      });

      var createdCredit = response.data || null;

      if (createdCredit) {
        setSelectedFederationCredit(createdCredit);

        setFederationCredits(function (previous) {
          return [createdCredit].concat(previous || []);
        });
      }

      setFederationApplySuccess("היתרה הידנית נוצרה ונבחרה לשיוך");
      setManualCreditOpen(false);
      resetManualCreditForm();

      await searchFederationCredits();
    } catch (error) {
      console.error(error);
      setFederationApplyError(
        getErrorMessage(error, "שגיאה ביצירת יתרת התאחדות ידנית"),
      );
    } finally {
      setCreatingManualCredit(false);
    }
  }

  async function submitFederationCoverageAllocation() {
    if (!selectedPayer) {
      return;
    }

    if (!selectedFederationCredit) {
      setFederationApplyError("יש לבחור יתרה או קבלה לשיוך");
      return;
    }

    if (selectedFederationCharges.length === 0) {
      setFederationApplyError("יש לבחור לפחות שורת התאחדות אחת לכיסוי");
      return;
    }

    var payerPersonId = getValue(
      selectedPayer,
      "payerPersonId",
      "PayerPersonId",
      0,
    );

    var creditId = getCreditId(selectedFederationCredit);
    var remainingCredit = getCreditAvailableAmount(selectedFederationCredit);

    if (!creditId || remainingCredit <= 0) {
      setFederationApplyError("ליתרה שנבחרה אין סכום זמין לשיוך");
      return;
    }

    try {
      setFederationApplyLoading(true);
      setFederationApplyError("");
      setFederationApplySuccess("");

      for (var i = 0; i < selectedFederationCharges.length; i++) {
        if (remainingCredit <= 0) {
          break;
        }

        var charge = selectedFederationCharges[i];

        var billChargeId = getValue(charge, "billChargeId", "BillChargeId", 0);

        var missingAmount = Number(
          getValue(charge, "missingAmount", "MissingAmount", 0),
        );

        if (!billChargeId || missingAmount <= 0) {
          continue;
        }

        var amountToAllocate = Math.min(remainingCredit, missingAmount);

        await allocateFederationCreditToCharge({
          competitionId: Number(competitionId),
          ranchId: Number(ranchId),
          federationExternalCreditId: creditId,
          billChargeId: billChargeId,
          allocatedAmount: amountToAllocate,
          notes: "שיוך כיסוי התאחדות דרך מסך תשלומים",
        });

        remainingCredit = remainingCredit - amountToAllocate;
      }

      setFederationApplySuccess("כיסוי ההתאחדות שויך בהצלחה");
      setSelectedChargeIds([]);
      setSelectedFederationCredit(null);
      setFederationApplyModalOpen(false);
      setFederationApplyError("");
      setManualCreditOpen(false);
      resetManualCreditForm();

      await reloadSelectedPayerData(payerPersonId);
    } catch (error) {
      console.error(error);
      setFederationApplyError(
        getErrorMessage(error, "שגיאה בשיוך כיסוי התאחדות"),
      );
    } finally {
      setFederationApplyLoading(false);
    }
  }

  async function submitPayment(formData) {
    if (!selectedPayer) {
      return;
    }

    var payerPersonId = getValue(
      selectedPayer,
      "payerPersonId",
      "PayerPersonId",
      0,
    );

    try {
      setCreatingPayment(true);
      setPaymentError("");
      setPaymentSuccess("");

      var uniqueBillChargeIds = getUniqueBillChargeIdsFromRows(selectedCharges);

      var request = {
        competitionId: Number(competitionId),
        ranchId: Number(ranchId),
        payerPersonId: payerPersonId,
        chargeOwner: selectedOwner,
        invoiceNumber: formData.invoiceNumber,
        notes: formData.notes || null,
        selectedCharges: uniqueBillChargeIds.map(function (id) {
          return {
            billChargeId: id,
          };
        }),
        paymentMethods: formData.paymentMethods.map(function (method) {
          return {
            paymentMethodId: Number(method.paymentMethodId),
            amount: Number(method.amount),
          };
        }),
      };

      await createCompetitionPayment(request);

      setPaymentModalOpen(false);
      setPaymentSuccess("התשלום נשמר בהצלחה");
      setSelectedChargeIds([]);

      await reloadSelectedPayerData(payerPersonId);
    } catch (error) {
      console.error(error);
      setPaymentError(getErrorMessage(error, "שגיאה ביצירת תשלום"));
    } finally {
      setCreatingPayment(false);
    }
  }

  return {
    payers: payers,
    payersLoading: payersLoading,
    payersError: payersError,
    loadPayers: loadPayers,

    selectedPayer: selectedPayer,
    accountSummary: accountSummary,
    categorySummary: categorySummary,
    charges: charges,
    visibleCharges: visibleCharges,
    accountLoading: accountLoading,
    accountError: accountError,

    selectedOwner: selectedOwner,
    selectedCategoryKey: selectedCategoryKey,
    selectOwner: selectOwner,
    selectCategory: selectCategory,

    selectedChargeIds: selectedChargeIds,
    selectedCharges: selectedCharges,
    selectedTotal: selectedTotal,
    visibleSelectableChargeIds: visibleSelectableChargeIds,
    allVisibleChargesSelected: allVisibleChargesSelected,
    toggleCharge: toggleCharge,
    toggleSelectAllVisibleCharges: toggleSelectAllVisibleCharges,
    clearSelectedCharges: clearSelectedCharges,

    paymentMethods: paymentMethods,
    paymentModalOpen: paymentModalOpen,
    creatingPayment: creatingPayment,
    paymentError: paymentError,
    paymentSuccess: paymentSuccess,
    openPaymentModal: openPaymentModal,
    closePaymentModal: closePaymentModal,
    submitPayment: submitPayment,

    federationCoverageStatus: federationCoverageStatus,
    federationCharges: federationCharges,
    federationCoverageLoading: federationCoverageLoading,
    federationCoverageError: federationCoverageError,
    federationValidation: federationValidation,
    loadFederationCoverageData: loadFederationCoverageData,

    federationApplyModalOpen: federationApplyModalOpen,
    federationCredits: federationCredits,
    federationCreditSearchText: federationCreditSearchText,
    federationOnlyAvailable: federationOnlyAvailable,
    federationCreditsSearching: federationCreditsSearching,
    selectedFederationCredit: selectedFederationCredit,
    federationApplyLoading: federationApplyLoading,
    federationApplyError: federationApplyError,
    federationApplySuccess: federationApplySuccess,
    selectedFederationCharges: selectedFederationCharges,
    selectedFederationMissingAmount: selectedFederationMissingAmount,
    openFederationCoverageModal: openFederationCoverageModal,
    closeFederationCoverageModal: closeFederationCoverageModal,
    searchFederationCredits: searchFederationCredits,
    changeFederationCreditSearchText: changeFederationCreditSearchText,
    changeFederationOnlyAvailable: changeFederationOnlyAvailable,
    selectFederationCredit: selectFederationCredit,
    submitFederationCoverageAllocation: submitFederationCoverageAllocation,

    openPayerAccount: openPayerAccount,
    closePayerAccount: closePayerAccount,

    manualCreditOpen: manualCreditOpen,
    creatingManualCredit: creatingManualCredit,
    manualCreditForm: manualCreditForm,
    toggleManualCreditForm: toggleManualCreditForm,
    updateManualCreditField: updateManualCreditField,
    submitManualFederationCredit: submitManualFederationCredit,

    selectedCreditAllocations: selectedCreditAllocations,
    creditAllocationsLoading: creditAllocationsLoading,
    creditAllocationsError: creditAllocationsError,
    allocationsCreditId: allocationsCreditId,
    loadFederationCreditAllocations: loadFederationCreditAllocations,
    clearFederationCreditAllocations: clearFederationCreditAllocations,
  };
}
