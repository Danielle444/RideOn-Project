import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { createEquipmentStallBookings } from "../services/stallBookingsService";

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

export default function useAdminEquipmentStallBookings(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;
  var selectedHorseBookings = params.selectedHorseBookings;
  var existingStallBookings = params.existingStallBookings;
  var horseStallTypeOptions = params.horseStallTypeOptions;
  var equipmentStallTypeOptions = params.equipmentStallTypeOptions;
  var selectedHorseStallType = params.selectedHorseStallType;
  var checkInDate = params.checkInDate;
  var checkOutDate = params.checkOutDate;
  var allSelectedHorsePayers = params.allSelectedHorsePayers;
  var reloadStallBookings = params.reloadStallBookings;

  var [selectedEquipmentStallType, setSelectedEquipmentStallType] = useState(null);
  var [equipmentQuantity, setEquipmentQuantity] = useState("1");
  var [equipmentSplitMode, setEquipmentSplitMode] = useState("equal");
  var [selectedEquipmentPayers, setSelectedEquipmentPayers] = useState([]);
  var [equipmentNotes, setEquipmentNotes] = useState("");
  var [equipmentStartDate, setEquipmentStartDate] = useState("");
  var [equipmentEndDate, setEquipmentEndDate] = useState("");
  var [isSavingEquipment, setIsSavingEquipment] = useState(false);

  var allHorseStallTypes = useMemo(
    function () {
      var fromSelected = selectedHorseBookings
        .map(function (booking) {
          return booking.stallType || selectedHorseStallType;
        })
        .filter(Boolean);

      var fromExisting = existingStallBookings
        .filter(function (booking) {
          return booking && !booking.isEquipmentBooking && booking.catalogItemId;
        })
        .map(function (booking) {
          return horseStallTypeOptions.find(function (item) {
            return item.priceCatalogId === booking.catalogItemId;
          });
        })
        .filter(Boolean);

      return uniqByPriceCatalogId(fromSelected.concat(fromExisting));
    },
    [selectedHorseBookings, selectedHorseStallType, existingStallBookings, horseStallTypeOptions]
  );

  var defaultEquipmentDateRange = useMemo(
    function () {
      var existingHorseBookingStartDates = existingStallBookings
        .filter(function (booking) {
          return booking && !booking.isEquipmentBooking;
        })
        .map(function (booking) {
          return booking.startDate;
        });

      var existingHorseBookingEndDates = existingStallBookings
        .filter(function (booking) {
          return booking && !booking.isEquipmentBooking;
        })
        .map(function (booking) {
          return booking.endDate;
        });

      var selectedStartDates = selectedHorseBookings.map(function () {
        return checkInDate;
      });

      var selectedEndDates = selectedHorseBookings.map(function () {
        return checkOutDate;
      });

      return {
        startDate: getMinDateString(
          existingHorseBookingStartDates.concat(selectedStartDates)
        ),
        endDate: getMaxDateString(
          existingHorseBookingEndDates.concat(selectedEndDates)
        ),
      };
    },
    [existingStallBookings, selectedHorseBookings, checkInDate, checkOutDate]
  );

  useEffect(
    function () {
      setEquipmentStartDate(defaultEquipmentDateRange.startDate || "");
      setEquipmentEndDate(defaultEquipmentDateRange.endDate || "");
    },
    [defaultEquipmentDateRange.startDate, defaultEquipmentDateRange.endDate]
  );

  useEffect(
    function () {
      if (allHorseStallTypes.length === 1) {
        setSelectedEquipmentStallType(allHorseStallTypes[0]);
      } else if (
        selectedEquipmentStallType &&
        !allHorseStallTypes.some(function (item) {
          return item.priceCatalogId === selectedEquipmentStallType.priceCatalogId;
        })
      ) {
        setSelectedEquipmentStallType(null);
      }
    },
    [allHorseStallTypes, selectedEquipmentStallType]
  );

  function toggleEquipmentPayerSelection(payerItem) {
    if (!payerItem || !payerItem.paidByPersonId) {
      return;
    }

    setSelectedEquipmentPayers(function (prev) {
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

  var effectiveEquipmentPayers = useMemo(
    function () {
      if (equipmentSplitMode === "equal") {
        return allSelectedHorsePayers;
      }

      return selectedEquipmentPayers;
    },
    [equipmentSplitMode, allSelectedHorsePayers, selectedEquipmentPayers]
  );

  var equipmentPricingSummary = useMemo(
    function () {
      var quantity = Number(equipmentQuantity || 0);
      var unitPrice = Number(selectedEquipmentStallType?.itemPrice || 0);
      var total = quantity * unitPrice;
      var payerCount = effectiveEquipmentPayers.length;
      var perPayer = payerCount > 0 ? Math.ceil(total / payerCount) : 0;

      return {
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: total,
        payerCount: payerCount,
        amountPerPayer: perPayer,
      };
    },
    [equipmentQuantity, selectedEquipmentStallType, effectiveEquipmentPayers]
  );

  async function handleSubmitEquipmentDraft() {
    if (!selectedEquipmentStallType || !selectedEquipmentStallType.priceCatalogId) {
      Alert.alert("שגיאה", "יש לבחור סוג תא ציוד");
      return;
    }

    if (!equipmentStartDate || !equipmentEndDate) {
      Alert.alert("שגיאה", "יש לבחור תאריכי כניסה ויציאה לתאי ציוד");
      return;
    }

    var quantityNumber = Number(equipmentQuantity || 0);

    if (!quantityNumber || quantityNumber <= 0) {
      Alert.alert("שגיאה", "יש להזין כמות תקינה של תאי ציוד");
      return;
    }

    if (!effectiveEquipmentPayers || effectiveEquipmentPayers.length === 0) {
      Alert.alert("שגיאה", "יש לבחור לפחות משלם אחד עבור תאי הציוד");
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
      setIsSavingEquipment(true);

      await createEquipmentStallBookings({
        competitionId: competitionId,
        orderedBySystemUserId: user.personId,
        catalogItemId: selectedEquipmentStallType.priceCatalogId,
        notes: equipmentNotes ? equipmentNotes.trim() : null,
        ranchId: activeRole.ranchId,
        startDate: equipmentStartDate,
        endDate: equipmentEndDate,
        quantity: quantityNumber,
        payers: effectiveEquipmentPayers.map(function (payer) {
          return {
            payerPersonId: payer.paidByPersonId,
          };
        }),
      });

      if (reloadStallBookings) {
        await reloadStallBookings();
      }

      Alert.alert("נשמר", "תאי הציוד הוזמנו בהצלחה");
      setEquipmentQuantity("1");
      setEquipmentSplitMode("equal");
      setSelectedEquipmentPayers([]);
      setEquipmentNotes("");
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשמירת תאי הציוד")
      );
    } finally {
      setIsSavingEquipment(false);
    }
  }

  return {
    selectedEquipmentStallType: selectedEquipmentStallType,
    setSelectedEquipmentStallType: setSelectedEquipmentStallType,
    equipmentQuantity: equipmentQuantity,
    setEquipmentQuantity: setEquipmentQuantity,
    equipmentSplitMode: equipmentSplitMode,
    setEquipmentSplitMode: setEquipmentSplitMode,
    selectedEquipmentPayers: selectedEquipmentPayers,
    toggleEquipmentPayerSelection: toggleEquipmentPayerSelection,
    equipmentNotes: equipmentNotes,
    setEquipmentNotes: setEquipmentNotes,
    equipmentStartDate: equipmentStartDate,
    setEquipmentStartDate: setEquipmentStartDate,
    equipmentEndDate: equipmentEndDate,
    setEquipmentEndDate: setEquipmentEndDate,
    effectiveEquipmentPayers: effectiveEquipmentPayers,
    equipmentPricingSummary: equipmentPricingSummary,
    allHorseStallTypes: allHorseStallTypes,
    isSavingEquipment: isSavingEquipment,
    handleSubmitEquipmentDraft: handleSubmitEquipmentDraft,
  };
}0