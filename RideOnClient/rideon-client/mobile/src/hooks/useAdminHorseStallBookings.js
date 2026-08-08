import { useEffect, useMemo, useState } from "react";
import { createStallBooking } from "../services/stallBookingsService";
import { showToast } from "../services/toastService";
import { getApiErrorMessage } from "../../../shared/auth/utils/authApiErrors";

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
  var startDate = params.startDate;
  var endDate = params.endDate;
  var notes = params.notes;
  var reloadStallBookings = params.reloadStallBookings;
  // CAP-5: when set (the payer-account entry point), every horse booking in
  // this session is hard-locked to this one payer - default-selected, the
  // only choosable option, and not toggleable. undefined/null elsewhere
  // (the real Registrations screen never passes this), so behavior there is
  // unchanged.
  var lockedPayer = params.lockedPayer || null;

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
            return booking && booking.horseId && !booking.isTackBooking;
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

  // CAP-4: already-booked horses stay in the list (not filtered out) so the
  // "add horse" surface can show them with a non-selectable indicator instead
  // of silently omitting them. Only a horse already added to THIS draft is
  // excluded here.
  var availableHorseOptions = useMemo(
    function () {
      return horses.filter(function (horse) {
        var alreadySelected = selectedHorseBookings.some(function (booking) {
          return booking.horse.horseId === horse.horseId;
        });

        return !alreadySelected;
      });
    },
    [horses, selectedHorseBookings],
  );

  var selectableHorseOptions = useMemo(
    function () {
      return availableHorseOptions.filter(function (horse) {
        return !bookedHorseIds.includes(horse.horseId);
      });
    },
    [availableHorseOptions, bookedHorseIds],
  );

  var allEligibleHorsesAlreadyBooked = useMemo(
    function () {
      return horses.length > 0 && selectableHorseOptions.length === 0;
    },
    [horses, selectableHorseOptions],
  );

  var hasAnyHorseStallBookingsForCompetition = useMemo(
    function () {
      var existingHorseBookings = existingStallBookings.filter(
        function (booking) {
          return booking && !booking.isTackBooking;
        },
      );

      return (
        existingHorseBookings.length > 0 || selectedHorseBookings.length > 0
      );
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
            payers: lockedPayer
              ? [lockedPayer]
              : getDefaultHorsePayers(selectedHorseToAdd.horseId),
            stallType: selectedHorseStallType,
          },
        ]);
      });

      setSelectedHorseToAdd(null);
    },
    [selectedHorseToAdd, selectedHorseStallType, lockedPayer],
  );

  function getAvailablePayersForHorse(horseId, managedPayers) {
    if (lockedPayer) {
      return [lockedPayer];
    }

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
    // CAP-5: locked payer can be neither deselected nor replaced.
    if (lockedPayer) {
      return;
    }

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

    if (!startDate || !endDate) {
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
      showToast(validationMessage, "error");
      return false;
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
      showToast(
        "יש לפחות סוס אחד עם משלם לא תקין. פתחי עריכה ובחרי משלם מחדש.",
        "error",
      );
      return false;
    }

    try {
      setIsSaving(true);

      var requests = selectedHorseBookings.map(function (booking) {
        var currentStallType = booking.stallType || selectedHorseStallType;

        return createStallBooking({
          competitionId: competitionId,
          orderedBySystemUserId: user.personId,
          priceCatalogId: currentStallType.priceCatalogId,
          notes: notes ? notes.trim() : null,
          // Ranch-model fix: the server now derives both the horse's
          // requesting ranch (from horseId) and the host ranch (from
          // competitionId) itself -- it never trusts a client-supplied
          // ranchId for this endpoint, so it is intentionally not sent.
          horseId: booking.horse.horseId,
          startDate: startDate,
          endDate: endDate,
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

      if (reloadStallBookings) {
        await reloadStallBookings();
      }

      showToast("תאי הסוסים הוזמנו בהצלחה", "success");

      setSelectedHorseBookings([]);
      setExpandedHorseEditorId(null);

      return true;
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "אירעה שגיאה בשמירת הזמנת התאים"),
        "error",
      );

      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    selectedHorseToAdd: selectedHorseToAdd,
    setSelectedHorseToAdd: setSelectedHorseToAdd,
    selectedHorseBookings: selectedHorseBookings,
    availableHorseOptions: availableHorseOptions,
    bookedHorseIds: bookedHorseIds,
    allEligibleHorsesAlreadyBooked: allEligibleHorsesAlreadyBooked,
    hasAnyHorseStallBookingsForCompetition:
      hasAnyHorseStallBookingsForCompetition,
    getAvailablePayersForHorse: getAvailablePayersForHorse,
    handleRemoveHorseBooking: handleRemoveHorseBooking,
    toggleHorsePayerSelection: toggleHorsePayerSelection,
    expandedHorseEditorId: expandedHorseEditorId,
    toggleHorseEditor: toggleHorseEditor,
    handleCreateHorseStallBookings: handleCreateHorseStallBookings,
    isSaving: isSaving,
  };
}
