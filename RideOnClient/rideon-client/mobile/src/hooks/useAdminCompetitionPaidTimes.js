import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getRidersByRanch,
  getTrainersByRanch,
} from "../services/federationMembersService";
import { getCompetitionInvitationDetails } from "../services/competitionService";
import { getHorsesByRanch } from "../services/horsesService";
import { getManagedPayers } from "../services/payerService";
import { createPaidTimeRequest } from "../services/paidTimeRequestsService";

function normalizeHorseItem(item) {
  if (!item) {
    return null;
  }

  return {
    horseId: item.horseId || item.HorseId || null,
    horseName: item.horseName || item.HorseName || "",
    barnName: item.barnName || item.BarnName || "",
  };
}

function normalizeFederationMemberItem(item) {
  if (!item) {
    return null;
  }

  return {
    federationMemberId:
      item.federationMemberId ||
      item.FederationMemberId ||
      item.riderFederationMemberId ||
      item.RiderFederationMemberId ||
      item.coachFederationMemberId ||
      item.CoachFederationMemberId ||
      null,
    firstName: item.firstName || item.FirstName || "",
    lastName: item.lastName || item.LastName || "",
    fullName:
      item.fullName ||
      item.FullName ||
      (
        (item.firstName || item.FirstName || "") +
        " " +
        (item.lastName || item.LastName || "")
      ).trim(),
  };
}

function normalizePayerItem(item) {
  if (!item) {
    return null;
  }

  return {
    personId: item.personId || item.PersonId || null,
    firstName: item.firstName || item.FirstName || "",
    lastName: item.lastName || item.LastName || "",
    fullName:
      item.fullName ||
      item.FullName ||
      (
        (item.firstName || item.FirstName || "") +
        " " +
        (item.lastName || item.LastName || "")
      ).trim(),
  };
}

function normalizePaidTimeSlotItem(item) {
  if (!item) {
    return null;
  }

  return {
    paidTimeSlotInCompId:
      item.paidTimeSlotInCompId ||
      item.PaidTimeSlotInCompId ||
      null,
    slotDate: item.slotDate || item.SlotDate || null,
    startTime: item.startTime || item.StartTime || "",
    endTime: item.endTime || item.EndTime || "",
    timeOfDay: item.timeOfDay || item.TimeOfDay || "",
    arenaName: item.arenaName || item.ArenaName || "",
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
      null,
    productId: item.productId || item.ProductId || null,
    itemPrice: item.itemPrice || item.ItemPrice || null,
    durationMinutes: item.durationMinutes || item.DurationMinutes || null,
    productName: item.productName || item.ProductName || "",
  };
}

function getHebrewDateLabel(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    var date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "numeric",
    });
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

function formatMemberLabel(item) {
  if (!item) {
    return "";
  }

  return String(item.fullName || "").trim();
}

function formatPayerLabel(item) {
  if (!item) {
    return "";
  }

  return String(item.fullName || "").trim();
}

function formatDisplayTime(timeValue) {
  if (!timeValue) {
    return "";
  }

  var timeText = String(timeValue).trim();

  if (timeText.length >= 5) {
    return timeText.slice(0, 5);
  }

  return timeText;
}

function formatRequestedSlotLabel(item) {
  if (!item) {
    return "";
  }

  var dateLabel = getHebrewDateLabel(item.slotDate);
  var timeLabel = [
    formatDisplayTime(item.startTime),
    formatDisplayTime(item.endTime),
  ]
    .filter(Boolean)
    .join(" - ");
  var arenaName = String(item.arenaName || "").trim();

  return [dateLabel, timeLabel, arenaName].filter(Boolean).join(" • ");
}

function formatPriceCatalogLabel(item) {
  if (!item) {
    return "";
  }

  var duration = item.durationMinutes
    ? String(item.durationMinutes) + " דק׳"
    : "";
  var price = item.itemPrice ? String(item.itemPrice) + " ₪" : "";

  return [item.productName || "", duration, price].filter(Boolean).join(" • ");
}

export default function useAdminCompetitionPaidTimes(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;

  var [horses, setHorses] = useState([]);
  var [riders, setRiders] = useState([]);
  var [trainers, setTrainers] = useState([]);
  var [payers, setPayers] = useState([]);
  var [requestableSlots, setRequestableSlots] = useState([]);
  var [priceCatalogItems, setPriceCatalogItems] = useState([]);

  var [selectedPriceCatalog, setSelectedPriceCatalog] = useState(null);
  var [selectedRequestedSlot, setSelectedRequestedSlot] = useState(null);
  var [selectedHorse, setSelectedHorse] = useState(null);
  var [selectedRider, setSelectedRider] = useState(null);
  var [selectedTrainer, setSelectedTrainer] = useState(null);
  var [selectedPayer, setSelectedPayer] = useState(null);
  var [notes, setNotes] = useState("");

  var [locks, setLocks] = useState({
    priceCatalog: false,
    requestedSlot: false,
    horse: false,
    rider: false,
    coach: false,
    payer: false,
    notes: false,
  });

  var [loading, setLoading] = useState(false);
  var [isSaving, setIsSaving] = useState(false);
  var [screenError, setScreenError] = useState("");

  useFocusEffect(
    useCallback(
      function () {
        if (!activeRole || !activeRole.ranchId || !competitionId) {
          return;
        }

        loadScreenData();
      },
      [activeRole, competitionId],
    ),
  );

  async function loadScreenData() {
    try {
      if (!activeRole || !activeRole.ranchId || !competitionId) {
        return;
      }

      setLoading(true);
      setScreenError("");

      var results = await Promise.all([
        getCompetitionInvitationDetails(
          competitionId,
          activeRole.roleId,
          activeRole.ranchId,
        ),
        getHorsesByRanch(activeRole.ranchId, null),
        getManagedPayers(activeRole.ranchId, null, null),
        getRidersByRanch(activeRole.ranchId, null),
        getTrainersByRanch(activeRole.ranchId, null),
      ]);

      var invitationResponse = results[0];
      var horsesResponse = results[1];
      var payersResponse = results[2];
      var ridersResponse = results[3];
      var trainersResponse = results[4];

      var incomingSlots = Array.isArray(invitationResponse?.data?.paidTimeSlots)
        ? invitationResponse.data.paidTimeSlots
        : [];

      var incomingPriceSections = Array.isArray(
        invitationResponse?.data?.servicePriceSections,
      )
        ? invitationResponse.data.servicePriceSections
        : [];

      var paidTimeSection =
        incomingPriceSections.find(function (section) {
          return (
            String(section?.categoryName || "").trim() === "פייד טיים" ||
            Number(section?.categoryId) === 1
          );
        }) || null;

      var incomingPriceItems = Array.isArray(paidTimeSection?.items)
        ? paidTimeSection.items
        : [];

      setRequestableSlots(
        incomingSlots
          .map(function (item) {
            return normalizePaidTimeSlotItem(item);
          })
          .filter(Boolean),
      );

      setPriceCatalogItems(
        incomingPriceItems
          .map(function (item) {
            return normalizePriceCatalogItem(item);
          })
          .filter(Boolean),
      );

      setHorses(
        (Array.isArray(horsesResponse?.data) ? horsesResponse.data : [])
          .map(function (item) {
            return normalizeHorseItem(item);
          })
          .filter(Boolean),
      );

      setPayers(
        (Array.isArray(payersResponse?.data) ? payersResponse.data : [])
          .map(function (item) {
            return normalizePayerItem(item);
          })
          .filter(Boolean),
      );

      setRiders(
        (Array.isArray(ridersResponse?.data) ? ridersResponse.data : [])
          .map(function (item) {
            return normalizeFederationMemberItem(item);
          })
          .filter(Boolean),
      );

      setTrainers(
        (Array.isArray(trainersResponse?.data) ? trainersResponse.data : [])
          .map(function (item) {
            return normalizeFederationMemberItem(item);
          })
          .filter(Boolean),
      );
    } catch (error) {
      setScreenError(
        String(error?.response?.data || "אירעה שגיאה בטעינת נתוני פייד טיים"),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleToggleLock(fieldKey) {
    setLocks(function (prevLocks) {
      return {
        ...prevLocks,
        [fieldKey]: !prevLocks[fieldKey],
      };
    });
  }

  function resetUnlockedFields() {
    setSelectedPriceCatalog(function (prevValue) {
      return locks.priceCatalog ? prevValue : null;
    });

    setSelectedRequestedSlot(function (prevValue) {
      return locks.requestedSlot ? prevValue : null;
    });

    setSelectedHorse(function (prevValue) {
      return locks.horse ? prevValue : null;
    });

    setSelectedRider(function (prevValue) {
      return locks.rider ? prevValue : null;
    });

    setSelectedTrainer(function (prevValue) {
      return locks.coach ? prevValue : null;
    });

    setSelectedPayer(function (prevValue) {
      return locks.payer ? prevValue : null;
    });

    setNotes(function (prevValue) {
      return locks.notes ? prevValue : "";
    });
  }

  function validateForm() {
    if (!selectedPriceCatalog || !selectedPriceCatalog.priceCatalogId) {
      return "יש לבחור סוג פייד טיים";
    }

    if (!selectedRequestedSlot || !selectedRequestedSlot.paidTimeSlotInCompId) {
      return "יש לבחור סלוט מבוקש";
    }

    if (!selectedRider || !selectedRider.federationMemberId) {
      return "יש לבחור רוכב";
    }

    if (!selectedHorse || !selectedHorse.horseId) {
      return "יש לבחור סוס";
    }

    if (!selectedTrainer || !selectedTrainer.federationMemberId) {
      return "יש לבחור מאמן";
    }

    if (!selectedPayer || !selectedPayer.personId) {
      return "יש לבחור משלם";
    }

    if (!user || !user.personId) {
      return "לא נמצאו פרטי משתמש מחובר";
    }

    if (!activeRole || !activeRole.ranchId) {
      return "לא נמצאה חווה פעילה";
    }

    return "";
  }

  async function handleCreatePaidTimeRequest() {
    var validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return;
    }

    try {
      setIsSaving(true);

      var payload = {
        orderedBySystemUserId: user.personId,
        ranchId: activeRole.ranchId,
        horseId: selectedHorse.horseId,
        riderFederationMemberId: selectedRider.federationMemberId,
        coachFederationMemberId: selectedTrainer.federationMemberId,
        paidByPersonId: selectedPayer.personId,
        priceCatalogId: selectedPriceCatalog.priceCatalogId,
        requestedCompSlotId: selectedRequestedSlot.paidTimeSlotInCompId,
        notes: notes ? notes.trim() : null,
      };

      await createPaidTimeRequest(payload);

      Alert.alert("נשמר", "בקשת הפייד טיים נוספה בהצלחה");
      resetUnlockedFields();
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשמירת בקשת הפייד טיים"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  var canSubmit = useMemo(
    function () {
      return (
        !!selectedPriceCatalog &&
        !!selectedRequestedSlot &&
        !!selectedHorse &&
        !!selectedRider &&
        !!selectedTrainer &&
        !!selectedPayer &&
        !isSaving
      );
    },
    [
      selectedPriceCatalog,
      selectedRequestedSlot,
      selectedHorse,
      selectedRider,
      selectedTrainer,
      selectedPayer,
      isSaving,
    ],
  );

  return {
    horses,
    riders,
    trainers,
    payers,
    requestableSlots,
    priceCatalogItems,

    selectedPriceCatalog,
    selectedRequestedSlot,
    selectedHorse,
    selectedRider,
    selectedTrainer,
    selectedPayer,
    notes,

    setSelectedPriceCatalog,
    setSelectedRequestedSlot,
    setSelectedHorse,
    setSelectedRider,
    setSelectedTrainer,
    setSelectedPayer,
    setNotes,

    locks,
    handleToggleLock,

    loading,
    isSaving,
    screenError,
    canSubmit,

    handleCreatePaidTimeRequest,

    formatHorseLabel,
    formatMemberLabel,
    formatPayerLabel,
    formatRequestedSlotLabel,
    formatPriceCatalogLabel,
  };
}
