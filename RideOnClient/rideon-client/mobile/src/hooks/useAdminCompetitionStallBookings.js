import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getCompetitionInvitationDetails } from "../services/competitionService";
import { getManagedPayers } from "../services/payerService";
import {
  getHorsesForStallBooking,
  getHorsePayersForCompetition,
  getStallBookingsForCompetitionAndRanch,
} from "../services/stallBookingsService";
import useAdminHorseStallBookings from "./useAdminHorseStallBookings";
import useAdminEquipmentStallBookings from "./useAdminEquipmentStallBookings";

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

function normalizeHorsePayerItem(item) {
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

function normalizeManagedPayerItem(item) {
  if (!item) {
    return null;
  }

  return {
    paidByPersonId:
      item.paidByPersonId ||
      item.PaidByPersonId ||
      item.personId ||
      item.PersonId ||
      item.payerPersonId ||
      item.PayerPersonId ||
      null,
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
    itemPrice: Number(item.itemPrice || item.ItemPrice || 0),
    productName: item.productName || item.ProductName || "",
    categoryName: item.categoryName || item.CategoryName || "",
  };
}

function normalizeDateString(value) {
  if (!value) {
    return "";
  }

  var text = String(value).trim();

  if (!text) {
    return "";
  }

  if (text.includes("T")) {
    return text.split("T")[0];
  }

  if (text.length >= 10) {
    return text.slice(0, 10);
  }

  return text;
}

function normalizeExistingStallBooking(item) {
  if (!item) {
    return null;
  }

  return {
    stallBookingId:
      item.stallBookingId || item.StallBookingId || item.stallbookingid || null,
    horseId: item.horseId || item.HorseId || item.horseid || null,
    isForTack:
      typeof item.isForTack === "boolean"
        ? item.isForTack
        : typeof item.IsForTack === "boolean"
          ? item.IsForTack
          : typeof item.isfortack === "boolean"
            ? item.isfortack
            : false,
    catalogItemId:
      item.catalogItemId ||
      item.CatalogItemId ||
      item.catalogitemid ||
      item.priceCatalogId ||
      item.PriceCatalogId ||
      null,
    startDate: normalizeDateString(
      item.startDate ||
        item.StartDate ||
        item.startdate ||
        item.checkInDate ||
        item.CheckInDate,
    ),
    endDate: normalizeDateString(
      item.endDate ||
        item.EndDate ||
        item.enddate ||
        item.checkOutDate ||
        item.CheckOutDate,
    ),
  };
}

function getServicePriceSectionsFromInvitation(invitationResponse) {
  return Array.isArray(invitationResponse?.data?.servicePriceSections)
    ? invitationResponse.data.servicePriceSections
    : [];
}

function extractHorseStallPriceItems(sections) {
  var flatItems = [];

  sections.forEach(function (section) {
    var categoryName = String(section?.categoryName || "").trim();
    var items = Array.isArray(section?.items) ? section.items : [];

    items.forEach(function (item) {
      flatItems.push({
        categoryName: categoryName,
        item: item,
      });
    });
  });

  return flatItems
    .map(function (entry) {
      var normalized = normalizePriceCatalogItem(entry.item);
      if (!normalized) {
        return null;
      }

      normalized.categoryName = entry.categoryName;
      return normalized;
    })
    .filter(Boolean)
    .filter(function (item) {
      var categoryName = String(item.categoryName || "").trim();
      var productName = String(item.productName || "").trim();

      var mentionsStall =
        categoryName.includes("תא") ||
        productName.includes("תא") ||
        productName.toLowerCase().includes("stall");

      var mentionsEquipment =
        categoryName.includes("ציוד") ||
        productName.includes("ציוד") ||
        productName.toLowerCase().includes("equipment") ||
        productName.toLowerCase().includes("tack");

      return mentionsStall && !mentionsEquipment;
    });
}

function extractEquipmentStallPriceItems(sections) {
  var flatItems = [];

  sections.forEach(function (section) {
    var categoryName = String(section?.categoryName || "").trim();
    var items = Array.isArray(section?.items) ? section.items : [];

    items.forEach(function (item) {
      flatItems.push({
        categoryName: categoryName,
        item: item,
      });
    });
  });

  return flatItems
    .map(function (entry) {
      var normalized = normalizePriceCatalogItem(entry.item);
      if (!normalized) {
        return null;
      }

      normalized.categoryName = entry.categoryName;
      return normalized;
    })
    .filter(Boolean)
    .filter(function (item) {
      var categoryName = String(item.categoryName || "").trim();
      var productName = String(item.productName || "").trim();

      return (
        categoryName.includes("ציוד") ||
        productName.includes("ציוד") ||
        productName.toLowerCase().includes("equipment") ||
        productName.toLowerCase().includes("tack")
      );
    });
}

function formatDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    var date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  } catch (error) {
    return "";
  }
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

function uniqByPersonId(items) {
  var map = {};

  items.forEach(function (item) {
    if (item && item.paidByPersonId && !map[item.paidByPersonId]) {
      map[item.paidByPersonId] = item;
    }
  });

  return Object.values(map);
}

export default function useAdminCompetitionStallBookings(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;
  var activeCompetition = params.activeCompetition;

  var [horses, setHorses] = useState([]);
  var [horsePayers, setHorsePayers] = useState([]);
  var [managedPayers, setManagedPayers] = useState([]);
  var [existingStallBookings, setExistingStallBookings] = useState([]);
  var [horseStallTypeOptions, setHorseStallTypeOptions] = useState([]);
  var [equipmentStallTypeOptions, setEquipmentStallTypeOptions] = useState([]);

  var [selectedHorseStallType, setSelectedHorseStallType] = useState(null);
  var [checkInDate, setCheckInDate] = useState("");
  var [checkOutDate, setCheckOutDate] = useState("");
  var [notes, setNotes] = useState("");
  var [mode, setMode] = useState("horse");
  var [loading, setLoading] = useState(false);
  var [screenError, setScreenError] = useState("");

  useEffect(
    function () {
      if (!activeCompetition) {
        return;
      }

      var defaultStart =
        activeCompetition.competitionStartDate ||
        activeCompetition.CompetitionStartDate ||
        "";
      var defaultEnd =
        activeCompetition.competitionEndDate ||
        activeCompetition.CompetitionEndDate ||
        "";

      if (!checkInDate && defaultStart) {
        setCheckInDate(formatDateForInput(defaultStart));
      }

      if (!checkOutDate && defaultEnd) {
        setCheckOutDate(formatDateForInput(defaultEnd));
      }
    },
    [activeCompetition],
  );

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
        getManagedPayers(activeRole.ranchId, null, null),
        getStallBookingsForCompetitionAndRanch(
          competitionId,
          activeRole.ranchId,
        ),
      ]);

      var invitationResponse = results[0];
      var horsesResponse = results[1];
      var horsePayersResponse = results[2];
      var managedPayersResponse = results[3];
      var existingBookingsResponse = results[4];

      var sections = getServicePriceSectionsFromInvitation(invitationResponse);

      setHorseStallTypeOptions(extractHorseStallPriceItems(sections));
      setEquipmentStallTypeOptions(extractEquipmentStallPriceItems(sections));

      setHorses(
        (Array.isArray(horsesResponse?.data) ? horsesResponse.data : [])
          .map(function (item) {
            return normalizeHorseItem(item);
          })
          .filter(Boolean),
      );

      setHorsePayers(
        (Array.isArray(horsePayersResponse?.data)
          ? horsePayersResponse.data
          : []
        )
          .map(function (item) {
            return normalizeHorsePayerItem(item);
          })
          .filter(Boolean),
      );

      setManagedPayers(
        (Array.isArray(managedPayersResponse?.data)
          ? managedPayersResponse.data
          : []
        )
          .map(function (item) {
            return normalizeManagedPayerItem(item);
          })
          .filter(Boolean),
      );

      setExistingStallBookings(
        (Array.isArray(existingBookingsResponse?.data)
          ? existingBookingsResponse.data
          : []
        )
          .map(function (item) {
            return normalizeExistingStallBooking(item);
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

  var horseHook = useAdminHorseStallBookings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    horses: horses,
    horsePayers: horsePayers,
    existingStallBookings: existingStallBookings,
    selectedHorseStallType: selectedHorseStallType,
    checkInDate: checkInDate,
    checkOutDate: checkOutDate,
    notes: notes,
  });

  var allSelectedHorsePayers = useMemo(
    function () {
      var merged = [];

      horseHook.selectedHorseBookings.forEach(function (booking) {
        booking.payers.forEach(function (payer) {
          merged.push(payer);
        });
      });

      var existingPayersForExistingHorseBookings = horsePayers.filter(
        function (payer) {
          return existingStallBookings.some(function (booking) {
            return (
              booking &&
              booking.isForTack === false &&
              booking.horseId === payer.horseId
            );
          });
        },
      );

      return uniqByPersonId(
        merged.concat(existingPayersForExistingHorseBookings),
      );
    },
    [horseHook.selectedHorseBookings, horsePayers, existingStallBookings],
  );

  var equipmentHook = useAdminEquipmentStallBookings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    selectedHorseBookings: horseHook.selectedHorseBookings,
    existingStallBookings: existingStallBookings,
    horseStallTypeOptions: horseStallTypeOptions,
    equipmentStallTypeOptions: equipmentStallTypeOptions,
    selectedHorseStallType: selectedHorseStallType,
    checkInDate: checkInDate,
    checkOutDate: checkOutDate,
    allSelectedHorsePayers: allSelectedHorsePayers,
    activeCompetition: activeCompetition,
  });

  function handleOpenEquipmentMode() {
    if (!horseHook.hasAnyHorseStallBookingsForCompetition) {
      return;
    }

    setMode("equipment");
  }

  function handleBackToHorseMode() {
    setMode("horse");
  }

  return {
    mode: mode,
    loading: loading,
    screenError: screenError,

    horseStallTypeOptions: horseStallTypeOptions,
    equipmentStallTypeOptions: equipmentStallTypeOptions,

    selectedHorseStallType: selectedHorseStallType,
    setSelectedHorseStallType: setSelectedHorseStallType,

    checkInDate: checkInDate,
    setCheckInDate: setCheckInDate,
    checkOutDate: checkOutDate,
    setCheckOutDate: setCheckOutDate,
    notes: notes,
    setNotes: setNotes,

    selectedHorseToAdd: horseHook.selectedHorseToAdd,
    setSelectedHorseToAdd: horseHook.setSelectedHorseToAdd,
    selectedHorseBookings: horseHook.selectedHorseBookings,
    availableHorseOptions: horseHook.availableHorseOptions,
    allEligibleHorsesAlreadyBooked: horseHook.allEligibleHorsesAlreadyBooked,
    hasAnyHorseStallBookingsForCompetition:
      horseHook.hasAnyHorseStallBookingsForCompetition,
    getAvailablePayersForHorse: function (horseId) {
      return horseHook.getAvailablePayersForHorse(horseId, managedPayers);
    },
    handleRemoveHorseBooking: horseHook.handleRemoveHorseBooking,
    toggleHorsePayerSelection: horseHook.toggleHorsePayerSelection,
    expandedHorseEditorId: horseHook.expandedHorseEditorId,
    toggleHorseEditor: horseHook.toggleHorseEditor,
    handleCreateHorseStallBookings: horseHook.handleCreateHorseStallBookings,
    isSaving: horseHook.isSaving || equipmentHook.isSavingEquipment,

    selectedEquipmentStallType: equipmentHook.selectedEquipmentStallType,
    setSelectedEquipmentStallType: equipmentHook.setSelectedEquipmentStallType,
    equipmentQuantity: equipmentHook.equipmentQuantity,
    setEquipmentQuantity: equipmentHook.setEquipmentQuantity,
    equipmentSplitMode: equipmentHook.equipmentSplitMode,
    setEquipmentSplitMode: equipmentHook.setEquipmentSplitMode,
    selectedEquipmentPayers: equipmentHook.selectedEquipmentPayers,
    toggleEquipmentPayerSelection: equipmentHook.toggleEquipmentPayerSelection,
    equipmentNotes: equipmentHook.equipmentNotes,
    setEquipmentNotes: equipmentHook.setEquipmentNotes,
    equipmentStartDate: equipmentHook.equipmentStartDate,
    setEquipmentStartDate: equipmentHook.setEquipmentStartDate,
    equipmentEndDate: equipmentHook.equipmentEndDate,
    setEquipmentEndDate: equipmentHook.setEquipmentEndDate,
    effectiveEquipmentPayers: equipmentHook.effectiveEquipmentPayers,
    equipmentPricingSummary: equipmentHook.equipmentPricingSummary,
    allHorseStallTypes: equipmentHook.allHorseStallTypes,
    allSelectedHorsePayers: allSelectedHorsePayers,

    handleOpenEquipmentMode: handleOpenEquipmentMode,
    handleBackToHorseMode: handleBackToHorseMode,
    handleSubmitEquipmentDraft: equipmentHook.handleSubmitEquipmentDraft,

    formatHorseLabel: formatHorseLabel,
    formatPayerLabel: formatPayerLabel,
    formatStallTypeLabel: formatStallTypeLabel,
  };
}
