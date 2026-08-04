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
import useAdminTackStallBookings from "./useAdminTackStallBookings";

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
    priceCatalogId: item.priceCatalogId || item.PriceCatalogId || null,
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

function parseDateOnlyString(dateString) {
  if (!dateString) {
    return null;
  }

  var parts = String(dateString).split("-");

  if (parts.length !== 3) {
    return null;
  }

  var year = Number(parts[0]);
  var month = Number(parts[1]) - 1;
  var day = Number(parts[2]);

  var date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function addDaysToDateString(dateString, days) {
  var date = parseDateOnlyString(dateString);

  if (!date) {
    return "";
  }

  date.setDate(date.getDate() + days);

  return formatDateForInput(date);
}

function normalizeCompetitionSummary(item) {
  if (!item) {
    return {
      competitionStartDate: "",
      competitionEndDate: "",
      registrationEndDate: "",
    };
  }

  return {
    competitionStartDate: normalizeDateString(
      item.competitionStartDate || item.CompetitionStartDate,
    ),
    competitionEndDate: normalizeDateString(
      item.competitionEndDate || item.CompetitionEndDate,
    ),
    registrationEndDate: normalizeDateString(
      item.registrationEndDate || item.RegistrationEndDate,
    ),
  };
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    var normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }

  return false;
}

function normalizeExistingStallBooking(item) {
  if (!item) {
    return null;
  }

  var horseId = item.horseId || item.HorseId || item.horseid || null;

  var isForTack = normalizeBoolean(
    item.isForTack ?? item.IsForTack ?? item.isfortack,
  );

  return {
    stallBookingId:
      item.stallBookingId || item.StallBookingId || item.stallbookingid || null,

    horseId: horseId,

    isForTack: isForTack,

    isTackBooking: isForTack === true || horseId === null,

    priceCatalogId:
      Number(item.priceCatalogId || item.PriceCatalogId || 0) || null,

    totalAmount: Number(item.totalAmount || item.TotalAmount || 0) || 0,

    isPaid: normalizeBoolean(item.isPaid ?? item.IsPaid),

    startDate: normalizeDateString(
      item.startDate || item.StartDate || item.startdate,
    ),

    endDate: normalizeDateString(item.endDate || item.EndDate || item.enddate),

    compoundId: item.compoundId || item.CompoundId || item.compoundid || null,

    stallId: item.stallId || item.StallId || item.stallid || null,
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

      var mentionsTack =
        categoryName.includes("ציוד") ||
        productName.includes("ציוד") ||
        productName.toLowerCase().includes("tack");

      return mentionsStall && !mentionsTack;
    });
}

function extractTackStallPriceItems(sections) {
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

  var [competitionSummary, setCompetitionSummary] = useState({
    competitionStartDate: "",
    competitionEndDate: "",
    registrationEndDate: "",
  });

  var [horses, setHorses] = useState([]);
  var [horsePayers, setHorsePayers] = useState([]);
  var [managedPayers, setManagedPayers] = useState([]);
  var [existingStallBookings, setExistingStallBookings] = useState([]);
  var [horseStallTypeOptions, setHorseStallTypeOptions] = useState([]);
  var [tackStallTypeOptions, setTackStallTypeOptions] = useState([]);

  var [selectedHorseStallType, setSelectedHorseStallType] = useState(null);
  var [startDate, setstartDate] = useState("");
  var [endDate, setendDate] = useState("");
  var [notes, setNotes] = useState("");
  var [mode, setMode] = useState("horse");
  var [loading, setLoading] = useState(false);
  var [screenError, setScreenError] = useState("");
  var isActiveTab = params.isActiveTab;

  useEffect(
    function () {
      if (isActiveTab) {
        loadData();
      }
    },
    [isActiveTab, loadData],
  );

  useEffect(
    function () {
      var defaultStart = competitionSummary.competitionStartDate;
      var defaultEnd = competitionSummary.competitionEndDate;

      if (!startDate && defaultStart) {
        setstartDate(defaultStart);
      }

      if (!endDate && defaultEnd) {
        setendDate(defaultEnd);
      }
    },
    [competitionSummary, startDate, endDate],
  );

  var loadData = useCallback(
    async function () {
      if (!activeRole || !activeRole.ranchId || !competitionId) {
        return;
      }

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

        setCompetitionSummary(
          normalizeCompetitionSummary(invitationResponse?.data?.competition),
        );

        var sections =
          getServicePriceSectionsFromInvitation(invitationResponse);

        setHorseStallTypeOptions(extractHorseStallPriceItems(sections));
        setTackStallTypeOptions(extractTackStallPriceItems(sections));

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
    },
    [competitionId, activeRole],
  );

  useFocusEffect(
    useCallback(
      function () {
        loadData();
      },
      [loadData],
    ),
  );

  var horseHook = useAdminHorseStallBookings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    horses: horses,
    horsePayers: horsePayers,
    existingStallBookings: existingStallBookings,
    selectedHorseStallType: selectedHorseStallType,
    startDate: startDate,
    endDate: endDate,
    notes: notes,
    reloadStallBookings: loadData,
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
              !booking.isTackBooking &&
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

  var tackHook = useAdminTackStallBookings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    selectedHorseBookings: horseHook.selectedHorseBookings,
    existingStallBookings: existingStallBookings,
    horseStallTypeOptions: horseStallTypeOptions,
    tackStallTypeOptions: tackStallTypeOptions,
    selectedHorseStallType: selectedHorseStallType,
    startDate: startDate,
    endDate: endDate,
    allSelectedHorsePayers: allSelectedHorsePayers,
    reloadStallBookings: loadData,
  });

  async function handleOpenTackMode() {
    if (!horseHook.hasAnyHorseStallBookingsForCompetition) {
      return;
    }

    if (horseHook.selectedHorseBookings.length === 0) {
      setMode("tack");
      return;
    }

    var success = await horseHook.handleCreateHorseStallBookings();

    if (success) {
      setMode("tack");
    }
  }

  function handleBackToHorseMode() {
    setMode("horse");
  }

  var bookedHorseNamesSummary = useMemo(
    function () {
      var existingHorseNames = existingStallBookings
        .filter(function (booking) {
          return booking && !booking.isTackBooking && booking.horseId;
        })
        .map(function (booking) {
          var matchedHorse = horses.find(function (horse) {
            return horse.horseId === booking.horseId;
          });

          return matchedHorse ? matchedHorse.horseName : "";
        })
        .filter(Boolean);

      var uniqueNames = Array.from(new Set(existingHorseNames));

      if (uniqueNames.length === 0) {
        return "";
      }

      return uniqueNames.join(", ");
    },
    [existingStallBookings, horses],
  );

  var existingTackBookingsCount = useMemo(
    function () {
      return existingStallBookings.filter(function (booking) {
        return booking && booking.isTackBooking;
      }).length;
    },
    [existingStallBookings],
  );

  // CAP-1: כניסה מוגבלת מסיום ההרשמה (לא רשאים להזמין תא לפני שההרשמה
  // נסגרת), יציאה עם מרווח נוסף של יומיים אחרי סוף התחרות לפירוק.
  var minCompetitionDate = competitionSummary.registrationEndDate;
  var maxCompetitionDate = addDaysToDateString(
    competitionSummary.competitionEndDate,
    2,
  );

  var highlightedCompetitionRange = useMemo(
    function () {
      if (
        !competitionSummary.competitionStartDate ||
        !competitionSummary.competitionEndDate
      ) {
        return null;
      }

      return {
        start: competitionSummary.competitionStartDate,
        end: competitionSummary.competitionEndDate,
      };
    },
    [
      competitionSummary.competitionStartDate,
      competitionSummary.competitionEndDate,
    ],
  );

  return {
    mode: mode,
    loading: loading,
    screenError: screenError,

    horseStallTypeOptions: horseStallTypeOptions,
    tackStallTypeOptions: tackStallTypeOptions,

    selectedHorseStallType: selectedHorseStallType,
    setSelectedHorseStallType: setSelectedHorseStallType,

    startDate: startDate,
    setstartDate: setstartDate,
    endDate: endDate,
    setendDate: setendDate,
    notes: notes,
    setNotes: setNotes,

    minCompetitionDate: minCompetitionDate,
    maxCompetitionDate: maxCompetitionDate,
    highlightedCompetitionRange: highlightedCompetitionRange,

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
    isSaving: horseHook.isSaving || tackHook.isSavingTack,

    selectedTackStallType: tackHook.selectedTackStallType,
    setSelectedTackStallType: tackHook.setSelectedTackStallType,
    tackQuantity: tackHook.tackQuantity,
    setTackQuantity: tackHook.setTackQuantity,
    tackSplitMode: tackHook.tackSplitMode,
    setTackSplitMode: tackHook.setTackSplitMode,
    selectedTackPayers: tackHook.selectedTackPayers,
    toggleTackPayerSelection: tackHook.toggleTackPayerSelection,
    tackNotes: tackHook.tackNotes,
    setTackNotes: tackHook.setTackNotes,
    tackStartDate: tackHook.tackStartDate,
    setTackStartDate: tackHook.setTackStartDate,
    tackEndDate: tackHook.tackEndDate,
    setTackEndDate: tackHook.setTackEndDate,
    effectiveTackPayers: tackHook.effectiveTackPayers,
    tackPricingSummary: tackHook.tackPricingSummary,
    allTackTypes: tackHook.allTackTypes,
    allSelectedHorsePayers: allSelectedHorsePayers,

    handleOpenTackMode: handleOpenTackMode,
    handleBackToHorseMode: handleBackToHorseMode,
    handleSubmitTackDraft: tackHook.handleSubmitTackDraft,

    formatHorseLabel: formatHorseLabel,
    formatPayerLabel: formatPayerLabel,
    formatStallTypeLabel: formatStallTypeLabel,

    bookedHorseNamesSummary: bookedHorseNamesSummary,
    existingTackBookingsCount: existingTackBookingsCount,
  };
}
