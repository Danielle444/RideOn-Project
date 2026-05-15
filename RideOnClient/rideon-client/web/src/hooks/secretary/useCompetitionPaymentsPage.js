import { useEffect, useMemo, useState } from "react";
import {
  createCompetitionPayment,
  getCompetitionPayerAccountSummary,
  getCompetitionPayerCategorySummary,
  getCompetitionPayerCharges,
  getCompetitionPaymentMethods,
  getCompetitionPaymentPayers,
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
        var owner = getValue(charge, "chargeOwner", "ChargeOwner", "");
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
      return charges.filter(function (charge) {
        return selectedChargeIds.includes(getChargeId(charge));
      });
    },
    [charges, selectedChargeIds],
  );

  var selectedTotal = useMemo(
    function () {
      return selectedCharges.reduce(function (sum, charge) {
        return sum + Number(getValue(charge, "amountToPay", "AmountToPay", 0));
      }, 0);
    },
    [selectedCharges],
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
  }

  function selectOwner(owner) {
    setSelectedOwner(owner);
    setSelectedCategoryKey("");
    setSelectedChargeIds([]);
  }

  function selectCategory(owner, categoryKey) {
    setSelectedOwner(owner);
    setSelectedCategoryKey(categoryKey || "");
    setSelectedChargeIds([]);
  }

  function getRelatedChargeIds(charge) {
    var sourceType = getValue(charge, "sourceType", "SourceType", "");
    var sourceId = getValue(charge, "sourceId", "SourceId", 0);
    var categoryKey = getValue(charge, "categoryKey", "CategoryKey", "");

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

    var relatedIds = getRelatedChargeIds(charge);

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

  function clearSelectedCharges() {
    setSelectedChargeIds([]);
  }

  function openPaymentModal() {
    if (selectedChargeIds.length === 0) {
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

      var request = {
        competitionId: Number(competitionId),
        ranchId: Number(ranchId),
        payerPersonId: payerPersonId,
        invoiceNumber: formData.invoiceNumber,
        notes: formData.notes || null,
        selectedCharges: selectedChargeIds.map(function (id) {
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

      await loadPayers();

      var updatedPayer = {
        payerPersonId: payerPersonId,
      };

      await openPayerAccount(updatedPayer);
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
    toggleCharge: toggleCharge,
    clearSelectedCharges: clearSelectedCharges,

    paymentMethods: paymentMethods,
    paymentModalOpen: paymentModalOpen,
    creatingPayment: creatingPayment,
    paymentError: paymentError,
    paymentSuccess: paymentSuccess,
    openPaymentModal: openPaymentModal,
    closePaymentModal: closePaymentModal,
    submitPayment: submitPayment,

    openPayerAccount: openPayerAccount,
    closePayerAccount: closePayerAccount,
  };
}
