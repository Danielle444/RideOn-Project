import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { createTackStallBookings } from "../services/stallBookingsService";

function uniqByPersonId(items) {
  var map = {};

  items.forEach(function (item) {
    if (item && item.paidByPersonId && !map[item.paidByPersonId]) {
      map[item.paidByPersonId] = item;
    }
  });

  return Object.values(map);
}

function uniqByPriceCatalogId(items) {
  var map = {};

  items.forEach(function (item) {
    if (item && item.priceCatalogId && !map[item.priceCatalogId]) {
      map[item.priceCatalogId] = item;
    }
  });

  return Object.values(map);
}

function getMinDateString(dateStrings) {
  var validDates = dateStrings.filter(Boolean).sort();
  return validDates.length > 0 ? validDates[0] : "";
}

function getMaxDateString(dateStrings) {
  var validDates = dateStrings.filter(Boolean).sort();
  return validDates.length > 0 ? validDates[validDates.length - 1] : "";
}

export default function useAdminTackStallBookings(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;
  var selectedHorseBookings = params.selectedHorseBookings;
  var existingStallBookings = params.existingStallBookings;
  var horseStallTypeOptions = params.horseStallTypeOptions;
  var tackStallTypeOptions = params.tackStallTypeOptions;
  var selectedHorseStallType = params.selectedHorseStallType;
  var startDate = params.startDate;
  var endDate = params.endDate;
  var allSelectedHorsePayers = params.allSelectedHorsePayers;
  var reloadStallBookings = params.reloadStallBookings;

  var [selectedTackStallType, setSelectedTackStallType] = useState(null);
  var [tackQuantity, setTackQuantity] = useState("1");
  var [tackSplitMode, setTackSplitMode] = useState("equal");
  var [selectedTackPayers, setSelectedTackPayers] = useState([]);
  var [tackNotes, setTackNotes] = useState("");
  var [tackStartDate, setTackStartDate] = useState("");
  var [tackEndDate, setTackEndDate] = useState("");
  var [isSavingTack, setIsSavingTack] = useState(false);

  var allTackTypes = useMemo(
    function () {
      var optionMap = {};

      horseStallTypeOptions.forEach(function (item) {
        var id = Number(item && item.priceCatalogId);
        if (id) {
          optionMap[id] = item;
        }
      });

      var selectedIds = selectedHorseBookings
        .map(function (booking) {
          var stallType =
            booking && booking.stallType
              ? booking.stallType
              : selectedHorseStallType;

          return Number(stallType && stallType.priceCatalogId);
        })
        .filter(Boolean);

      var existingIds = existingStallBookings
        .filter(function (booking) {
          return booking && !booking.isTackBooking && booking.priceCatalogId;
        })
        .map(function (booking) {
          return Number(booking.priceCatalogId);
        })
        .filter(Boolean);

      var uniqueIds = Array.from(new Set(selectedIds.concat(existingIds)));

      return uniqueIds
        .map(function (id) {
          return optionMap[id] || null;
        })
        .filter(Boolean);
    },
    [
      selectedHorseBookings,
      selectedHorseStallType,
      existingStallBookings,
      horseStallTypeOptions,
    ],
  );

  var defaultTackDateRange = useMemo(
    function () {
      var existingHorseBookingStartDates = existingStallBookings
        .filter(function (booking) {
          return booking && !booking.isTackBooking;
        })
        .map(function (booking) {
          return booking.startDate;
        });

      var existingHorseBookingEndDates = existingStallBookings
        .filter(function (booking) {
          return booking && !booking.isTackBooking;
        })
        .map(function (booking) {
          return booking.endDate;
        });

      var selectedStartDates = selectedHorseBookings.map(function () {
        return startDate;
      });

      var selectedEndDates = selectedHorseBookings.map(function () {
        return endDate;
      });

      return {
        startDate: getMinDateString(
          existingHorseBookingStartDates.concat(selectedStartDates),
        ),
        endDate: getMaxDateString(
          existingHorseBookingEndDates.concat(selectedEndDates),
        ),
      };
    },
    [existingStallBookings, selectedHorseBookings, startDate, endDate],
  );

  useEffect(
    function () {
      setTackStartDate(defaultTackDateRange.startDate || "");
      setTackEndDate(defaultTackDateRange.endDate || "");
    },
    [defaultTackDateRange.startDate, defaultTackDateRange.endDate],
  );

  useEffect(
    function () {
      if (allTackTypes.length === 1) {
        setSelectedTackStallType(allTackTypes[0]);
      } else if (
        selectedTackStallType &&
        !allTackTypes.some(function (item) {
          return item.priceCatalogId === selectedTackStallType.priceCatalogId;
        })
      ) {
        setSelectedTackStallType(null);
      }
    },
    [allTackTypes, selectedTackStallType],
  );

  function toggleTackPayerSelection(payerItem) {
    if (!payerItem || !payerItem.paidByPersonId) {
      return;
    }

    setSelectedTackPayers(function (prev) {
      var exists = prev.some(function (item) {
        return item.paidByPersonId === payerItem.paidByPersonId;
      });

      if (exists) {
        return prev.filter(function (item) {
          return item.paidByPersonId !== payerItem.paidByPersonId;
        });
      }

      return uniqByPersonId(prev.concat([payerItem]));
    });
  }

  var effectiveTackPayers = useMemo(
    function () {
      if (tackSplitMode === "equal") {
        return allSelectedHorsePayers;
      }

      return selectedTackPayers;
    },
    [tackSplitMode, allSelectedHorsePayers, selectedTackPayers],
  );

  var tackPricingSummary = useMemo(
    function () {
      var quantity = Number(tackQuantity || 0);
      var unitPrice = Number(selectedTackStallType?.itemPrice || 0);
      var total = quantity * unitPrice;
      var payerCount = effectiveTackPayers.length;
      var perPayer = payerCount > 0 ? Math.ceil(total / payerCount) : 0;

      return {
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: total,
        payerCount: payerCount,
        amountPerPayer: perPayer,
      };
    },
    [tackQuantity, selectedTackStallType, effectiveTackPayers],
  );

  async function handleSubmitTackDraft() {
    if (!selectedTackStallType || !selectedTackStallType.priceCatalogId) {
      Alert.alert("שגיאה", "יש לבחור סוג תא ציוד");
      return;
    }

    if (!tackStartDate || !tackEndDate) {
      Alert.alert("שגיאה", "יש לבחור תאריכי כניסה ויציאה לתאי ציוד");
      return;
    }

    var quantityNumber = Number(tackQuantity || 0);

    if (!quantityNumber || quantityNumber <= 0) {
      Alert.alert("שגיאה", "יש להזין כמות תקינה של תאי ציוד");
      return;
    }

    if (!effectiveTackPayers || effectiveTackPayers.length === 0) {
      Alert.alert("שגיאה", "יש לבחור לפחות משלם אחד עבור תאי ציוד");
      return;
    }

    if (!user || !user.personId) {
      Alert.alert("שגיאה", "לא נמצאו פרטי משתמש מחובר");
      return;
    }

    if (!activeRole || !activeRole.ranchId) {
      Alert.alert("שגיאה", "לא נמצאה חווה פעילה");
      return;
    }

    try {
      setIsSavingTack(true);

      await createTackStallBookings({
        competitionId: competitionId,
        orderedBySystemUserId: user.personId,
        priceCatalogId: selectedTackStallType.priceCatalogId,
        notes: tackNotes ? tackNotes.trim() : null,
        ranchId: activeRole.ranchId,
        startDate: tackStartDate,
        endDate: tackEndDate,
        quantity: quantityNumber,
        payers: effectiveTackPayers.map(function (payer) {
          return {
            payerPersonId: payer.paidByPersonId,
          };
        }),
      });

      if (reloadStallBookings) {
        await reloadStallBookings();
      }

      Alert.alert("נשמר", "תאי הציוד הוזמנו בהצלחה");
      setTackQuantity("1");
      setTackSplitMode("equal");
      setSelectedTackPayers([]);
      setTackNotes("");
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשמירת תאי הציוד"),
      );
    } finally {
      setIsSavingTack(false);
    }
  }

  return {
    selectedTackStallType: selectedTackStallType,
    setSelectedTackStallType: setSelectedTackStallType,
    tackQuantity: tackQuantity,
    setTackQuantity: setTackQuantity,
    tackSplitMode: tackSplitMode,
    setTackSplitMode: setTackSplitMode,
    selectedTackPayers: selectedTackPayers,
    toggleTackPayerSelection: toggleTackPayerSelection,
    tackNotes: tackNotes,
    setTackNotes: setTackNotes,
    tackStartDate: tackStartDate,
    setTackStartDate: setTackStartDate,
    tackEndDate: tackEndDate,
    setTackEndDate: setTackEndDate,
    effectiveTackPayers: effectiveTackPayers,
    tackPricingSummary: tackPricingSummary,
    allTackTypes: allTackTypes,
    isSavingTack: isSavingTack,
    handleSubmitTackDraft: handleSubmitTackDraft,
  };
}
