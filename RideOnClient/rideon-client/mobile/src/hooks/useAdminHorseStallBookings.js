import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { createStallBooking } from "../services/stallBookingsService";

function uniqByPersonId(items) {
  var map = {};

  items.forEach(function (item) {
    if (item && item.paidByPersonId && !map[item.paidByPersonId]) {
      map[item.paidByPersonId] = item;
    }
  });

  return Object.values(map);
}

function uniqByHorseId(items) {
  var map = {};

  items.forEach(function (item) {
    if (item && item.horseId && !map[item.horseId]) {
      map[item.horseId] = item;
    }
  });

  return Object.values(map);
}

export default function useAdminHorseStallBookings(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;
  var horses = params.horses;
  var horsePayers = params.horsePayers;
  var existingStallBookings = params.existingStallBookings;
  var selectedHorseStallType = params.selectedHorseStallType;
  var checkInDate = params.checkInDate;
  var checkOutDate = params.checkOutDate;
  var notes = params.notes;

  var [selectedHorseToAdd, setSelectedHorseToAdd] = useState(null);
  var [selectedHorseBookings, setSelectedHorseBookings] = useState([]);
  var [expandedHorseEditorId, setExpandedHorseEditorId] = useState(null);
  var [isSaving, setIsSaving] = useState(false);

  function getDefaultHorsePayers(horseId) {
    return uniqByPersonId(
      horsePayers.filter(function (payer) {
        return payer.horseId === horseId;
      }),
    );
  }

  var bookedHorseIds = useMemo(
    function () {
      return uniqByHorseId(
        existingStallBookings
          .filter(function (booking) {
            return (
              booking &&
              booking.horseId &&
              booking.isForTack === false
            );
          })
          .map(function (booking) {
            return { horseId: booking.horseId };
          }),
      ).map(function (item) {
        return item.horseId;
      });
    },
    [existingStallBookings],
  );

  var availableHorseOptions = useMemo(
    function () {
      return horses.filter(function (horse) {
        var alreadySelected = selectedHorseBookings.some(function (booking) {
          return booking.horse.horseId === horse.horseId;
        });

        var alreadyBooked = bookedHorseIds.includes(horse.horseId);

        return !alreadySelected && !alreadyBooked;
      });
    },
    [horses, selectedHorseBookings, bookedHorseIds],
  );

  var allEligibleHorsesAlreadyBooked = useMemo(
    function () {
      return horses.length > 0 && availableHorseOptions.length === 0;
    },
    [horses, availableHorseOptions],
  );

  var hasAnyHorseStallBookingsForCompetition = useMemo(
    function () {
      var existingHorseBookings = existingStallBookings.filter(function (booking) {
        return booking && booking.isForTack === false;
      });

      return existingHorseBookings.length > 0 || selectedHorseBookings.length > 0;
    },
    [existingStallBookings, selectedHorseBookings],
  );

  useEffect(
    function () {
      if (!selectedHorseToAdd || !selectedHorseToAdd.horseId) {
        return;
      }

      setSelectedHorseBookings(function (prev) {
        var exists = prev.some(function (booking) {
          return booking.horse.horseId === selectedHorseToAdd.horseId;
        });

        if (exists) {
          return prev;
        }

        return prev.concat([
          {
            horse: selectedHorseToAdd,
            payers: getDefaultHorsePayers(selectedHorseToAdd.horseId),
            stallType: selectedHorseStallType,
          },
        ]);
      });

      setSelectedHorseToAdd(null);
    },
    [selectedHorseToAdd, selectedHorseStallType],
  );

  function getAvailablePayersForHorse(horseId, managedPayers) {
    var defaultPayers = getDefaultHorsePayers(horseId);
    return uniqByPersonId(defaultPayers.concat(managedPayers || []));
  }

  function handleRemoveHorseBooking(horseId) {
    setSelectedHorseBookings(function (prev) {
      return prev.filter(function (booking) {
        return booking.horse.horseId !== horseId;
      });
    });

    setExpandedHorseEditorId(function (prev) {
      return prev === horseId ? null : prev;
    });
  }

  function toggleHorsePayerSelection(horseId, payerItem) {
    if (!horseId || !payerItem || !payerItem.paidByPersonId) {
      return;
    }

    setSelectedHorseBookings(function (prev) {
      return prev.map(function (booking) {
        if (booking.horse.horseId !== horseId) {
          return booking;
        }

        var exists = booking.payers.some(function (payer) {
          return payer.paidByPersonId === payerItem.paidByPersonId;
        });

        var updatedPayers = exists
          ? booking.payers.filter(function (payer) {
              return payer.paidByPersonId !== payerItem.paidByPersonId;
            })
          : uniqByPersonId(booking.payers.concat([payerItem]));

        return {
          horse: booking.horse,
          payers: updatedPayers,
          stallType: booking.stallType,
        };
      });
    });
  }

  function toggleHorseEditor(horseId) {
    setExpandedHorseEditorId(function (prev) {
      return prev === horseId ? null : horseId;
    });
  }

  function validateHorseBookingsForm() {
    if (!selectedHorseStallType || !selectedHorseStallType.priceCatalogId) {
      return "יש לבחור סוג תא";
    }

    if (!selectedHorseBookings.length) {
      return "יש להוסיף לפחות סוס אחד";
    }

    if (!checkInDate || !checkOutDate) {
      return "יש לבחור תאריכי כניסה ויציאה";
    }

    var hasHorseWithoutPayers = selectedHorseBookings.some(function (booking) {
      return !booking.payers || booking.payers.length === 0;
    });

    if (hasHorseWithoutPayers) {
      return "יש לבחור לפחות משלם אחד לכל סוס";
    }

    if (!user || !user.personId) {
      return "לא נמצאו פרטי משתמש מחובר";
    }

    if (!activeRole || !activeRole.ranchId) {
      return "לא נמצאה חווה פעילה";
    }

    return "";
  }

  async function handleCreateHorseStallBookings() {
    var validationMessage = validateHorseBookingsForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return;
    }

    var invalidHorseBooking = selectedHorseBookings.find(function (booking) {
      return (
        !booking.payers ||
        booking.payers.length === 0 ||
        booking.payers.some(function (payer) {
          return !payer || !payer.paidByPersonId;
        })
      );
    });

    if (invalidHorseBooking) {
      Alert.alert(
        "שגיאה",
        "יש לפחות סוס אחד עם משלם לא תקין. פתחי עריכה ובחרי משלם מחדש.",
      );
      return;
    }

    try {
      setIsSaving(true);

      var requests = selectedHorseBookings.map(function (booking) {
        var currentStallType = booking.stallType || selectedHorseStallType;

        return createStallBooking({
          competitionId: competitionId,
          orderedBySystemUserId: user.personId,
          catalogItemId: currentStallType.priceCatalogId,
          notes: notes ? notes.trim() : null,
          ranchId: activeRole.ranchId,
          horseId: booking.horse.horseId,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          isForTack: false,
          payers: booking.payers
            .filter(function (payer) {
              return payer && payer.paidByPersonId;
            })
            .map(function (payer) {
              return {
                payerPersonId: payer.paidByPersonId,
              };
            }),
        });
      });

      await Promise.all(requests);

      Alert.alert("נשמר", "תאי הסוסים הוזמנו בהצלחה");
      setSelectedHorseBookings([]);
      setExpandedHorseEditorId(null);
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשמירת הזמנת התאים"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return {
    selectedHorseToAdd: selectedHorseToAdd,
    setSelectedHorseToAdd: setSelectedHorseToAdd,
    selectedHorseBookings: selectedHorseBookings,
    availableHorseOptions: availableHorseOptions,
    allEligibleHorsesAlreadyBooked: allEligibleHorsesAlreadyBooked,
    hasAnyHorseStallBookingsForCompetition: hasAnyHorseStallBookingsForCompetition,
    getAvailablePayersForHorse: getAvailablePayersForHorse,
    handleRemoveHorseBooking: handleRemoveHorseBooking,
    toggleHorsePayerSelection: toggleHorsePayerSelection,
    expandedHorseEditorId: expandedHorseEditorId,
    toggleHorseEditor: toggleHorseEditor,
    handleCreateHorseStallBookings: handleCreateHorseStallBookings,
    isSaving: isSaving,
  };
}