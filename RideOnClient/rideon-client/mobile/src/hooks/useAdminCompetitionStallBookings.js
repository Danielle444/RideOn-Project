import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getCompetitionInvitationDetails } from "../services/competitionService";
import {
  getHorsesForStallBooking,
  getHorsePayersForCompetition,
  createStallBooking,
} from "../services/stallBookingsService";

function normalizeHorseItem(item) {
  if (!item) {
    return null;
  }

  return {
    horseId: item.horseId || item.HorseId || null,
    horseName: item.horseName || item.HorseName || "",
    barnName: item.barnName || item.BarnName || "",
    federationNumber: item.federationNumber || item.FederationNumber || "",
  };
}

function normalizePayerItem(item) {
  if (!item) {
    return null;
  }

  return {
    horseId: item.horseId || item.HorseId || null,
    paidByPersonId: item.paidByPersonId || item.PaidByPersonId || null,
    payerFullName:
      item.payerFullName ||
      item.PayerFullName ||
      item.fullName ||
      item.FullName ||
      (
        (item.firstName || item.FirstName || "") +
        " " +
        (item.lastName || item.LastName || "")
      ).trim(),
    billId: item.billId || item.BillId || null,
  };
}

function normalizePriceCatalogItem(item) {
  if (!item) {
    return null;
  }

  return {
    priceCatalogId:
      item.priceCatalogId ||
      item.PriceCatalogId ||
      item.catalogItemId ||
      item.CatalogItemId ||
      null,
    productId: item.productId || item.ProductId || null,
    itemPrice: item.itemPrice || item.ItemPrice || null,
    productName: item.productName || item.ProductName || "",
    categoryName: item.categoryName || item.CategoryName || "",
  };
}

function getServicePriceSectionsFromInvitation(invitationResponse) {
  return Array.isArray(invitationResponse?.data?.servicePriceSections)
    ? invitationResponse.data.servicePriceSections
    : [];
}

function extractStallPriceItems(sections) {
  var flatItems = [];

  sections.forEach(function (section) {
    var categoryName = String(section?.categoryName || "").trim();
    var items = Array.isArray(section?.items) ? section.items : [];

    items.forEach(function (item) {
      flatItems.push({
        ...item,
        categoryName: categoryName,
      });
    });
  });

  return flatItems
    .map(function (item) {
      return normalizePriceCatalogItem(item);
    })
    .filter(Boolean)
    .filter(function (item) {
      var categoryName = String(item.categoryName || "").trim();
      var productName = String(item.productName || "").trim();

      return (
        categoryName.includes("תא") ||
        productName.includes("תא") ||
        productName.toLowerCase().includes("stall")
      );
    });
}

function formatHorseLabel(item) {
  if (!item) {
    return "";
  }

  var horseName = String(item.horseName || "").trim();
  var barnName = String(item.barnName || "").trim();

  if (barnName) {
    return horseName + " (" + barnName + ")";
  }

  return horseName;
}

function formatPayerLabel(item) {
  if (!item) {
    return "";
  }

  return String(item.payerFullName || "").trim();
}

function formatStallTypeLabel(item) {
  if (!item) {
    return "";
  }

  var productName = String(item.productName || "").trim();
  var price = item.itemPrice ? String(item.itemPrice) + " ₪" : "";

  return [productName, price].filter(Boolean).join(" • ");
}

export default function useAdminCompetitionStallBookings(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;

  var [horses, setHorses] = useState([]);
  var [allPayers, setAllPayers] = useState([]);
  var [stallTypeOptions, setStallTypeOptions] = useState([]);

  var [selectedHorse, setSelectedHorse] = useState(null);
  var [selectedPayers, setSelectedPayers] = useState([]);
  var [selectedStallType, setSelectedStallType] = useState(null);

  var [checkInDate, setCheckInDate] = useState("");
  var [checkOutDate, setCheckOutDate] = useState("");
  var [notes, setNotes] = useState("");

  var [loading, setLoading] = useState(false);
  var [isSaving, setIsSaving] = useState(false);
  var [screenError, setScreenError] = useState("");

  useFocusEffect(
    useCallback(
      function () {
        if (!activeRole || !activeRole.ranchId || !competitionId) {
          return;
        }

        loadData();
      },
      [activeRole, competitionId],
    ),
  );

  async function loadData() {
    try {
      setLoading(true);
      setScreenError("");

      var results = await Promise.all([
        getCompetitionInvitationDetails(
          competitionId,
          activeRole.roleId,
          activeRole.ranchId,
        ),
        getHorsesForStallBooking(competitionId, activeRole.ranchId),
        getHorsePayersForCompetition(competitionId, activeRole.ranchId),
      ]);

      var invitationResponse = results[0];
      var horsesResponse = results[1];
      var payersResponse = results[2];

      var sections = getServicePriceSectionsFromInvitation(invitationResponse);

      setStallTypeOptions(extractStallPriceItems(sections));

      setHorses(
        (Array.isArray(horsesResponse?.data) ? horsesResponse.data : [])
          .map(function (item) {
            return normalizeHorseItem(item);
          })
          .filter(Boolean),
      );

      setAllPayers(
        (Array.isArray(payersResponse?.data) ? payersResponse.data : [])
          .map(function (item) {
            return normalizePayerItem(item);
          })
          .filter(Boolean),
      );
    } catch (error) {
      setScreenError(
        String(error?.response?.data || "אירעה שגיאה בטעינת נתוני התאים"),
      );
    } finally {
      setLoading(false);
    }
  }

  var availablePayersForSelectedHorse = useMemo(
    function () {
      if (!selectedHorse || !selectedHorse.horseId) {
        return [];
      }

      return allPayers.filter(function (payer) {
        return payer.horseId === selectedHorse.horseId;
      });
    },
    [allPayers, selectedHorse],
  );

  function togglePayerSelection(payerItem) {
    if (!payerItem || !payerItem.paidByPersonId) {
      return;
    }

    setSelectedPayers(function (prev) {
      var exists = prev.some(function (item) {
        return item.paidByPersonId === payerItem.paidByPersonId;
      });

      if (exists) {
        return prev.filter(function (item) {
          return item.paidByPersonId !== payerItem.paidByPersonId;
        });
      }

      return prev.concat([payerItem]);
    });
  }

  function clearForm() {
    setSelectedHorse(null);
    setSelectedPayers([]);
    setSelectedStallType(null);
    setCheckInDate("");
    setCheckOutDate("");
    setNotes("");
  }

  function validateForm() {
    if (!selectedHorse || !selectedHorse.horseId) {
      return "יש לבחור סוס";
    }

    if (!selectedStallType || !selectedStallType.priceCatalogId) {
      return "יש לבחור סוג תא";
    }

    if (!selectedPayers || selectedPayers.length === 0) {
      return "יש לבחור לפחות משלם אחד";
    }

    if (!checkInDate || !checkOutDate) {
      return "יש לבחור תאריכי כניסה ויציאה";
    }

    if (!user || !user.personId) {
      return "לא נמצאו פרטי משתמש מחובר";
    }

    if (!activeRole || !activeRole.ranchId) {
      return "לא נמצאה חווה פעילה";
    }

    return "";
  }

  async function handleCreateStallBooking() {
    var validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return;
    }

    try {
      setIsSaving(true);

      var payload = {
        competitionId: competitionId,
        orderedBySystemUserId: user.personId,
        catalogItemId: selectedStallType.priceCatalogId,
        notes: notes ? notes.trim() : null,
        ranchId: activeRole.ranchId,
        horseId: selectedHorse.horseId,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        isForTack: false,
        payers: selectedPayers.map(function (payer) {
          return {
            payerPersonId: payer.paidByPersonId,
          };
        }),
      };

      await createStallBooking(payload);

      Alert.alert("נשמר", "התא הוזמן בהצלחה");
      clearForm();
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשמירת הזמנת התא"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return {
    horses,
    stallTypeOptions,
    availablePayersForSelectedHorse,

    selectedHorse,
    setSelectedHorse,
    selectedPayers,
    togglePayerSelection,
    selectedStallType,
    setSelectedStallType,

    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    notes,
    setNotes,

    loading,
    isSaving,
    screenError,

    handleCreateStallBooking,

    formatHorseLabel,
    formatPayerLabel,
    formatStallTypeLabel,
  };
}