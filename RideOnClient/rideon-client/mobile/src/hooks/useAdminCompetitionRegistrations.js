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
import { createEntry } from "../services/entriesService";

function normalizeClassItem(item) {
  if (!item) {
    return null;
  }

  return {
    classInCompId: item.classInCompId || item.ClassInCompId || null,
    className: item.className || item.ClassName || "",
    classDateTime: item.classDateTime || item.ClassDateTime || null,
  };
}

function normalizeHorseItem(item) {
  if (!item) {
    return null;
  }

  return {
    horseId: item.horseId || item.HorseId || null,
    horseName: item.horseName || item.HorseName || "",
    barnName: item.barnName || item.BarnName || "",
    federationNumber:
      item.federationNumber || item.FederationNumber || item.horseNumber || "",
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
    cellPhone: item.cellPhone || item.CellPhone || "",
  };
}

function getHebrewDayLabel(dateValue) {
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

function formatClassLabel(item) {
  if (!item) {
    return "";
  }

  var className = String(item.className || "").trim();
  var dayLabel = getHebrewDayLabel(item.classDateTime);

  if (!dayLabel) {
    return className;
  }

  return className + " • " + dayLabel;
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

  var fullName = String(item.fullName || "").trim();

  if (item.cellPhone) {
    return fullName + " • " + item.cellPhone;
  }

  return fullName;
}

export default function useAdminCompetitionRegistrations(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;

  var [classes, setClasses] = useState([]);
  var [horses, setHorses] = useState([]);
  var [riders, setRiders] = useState([]);
  var [trainers, setTrainers] = useState([]);
  var [payers, setPayers] = useState([]);

  var [selectedClass, setSelectedClass] = useState(null);
  var [selectedHorse, setSelectedHorse] = useState(null);
  var [selectedRider, setSelectedRider] = useState(null);
  var [selectedTrainer, setSelectedTrainer] = useState(null);
  var [selectedPayer, setSelectedPayer] = useState(null);

  var [locks, setLocks] = useState({
    class: false,
    horse: false,
    rider: false,
    coach: false,
    payer: false,
  });

  var [loading, setLoading] = useState(false);
  var [isSaving, setIsSaving] = useState(false);
  var [screenError, setScreenError] = useState("");

  useFocusEffect(
    useCallback(
      function () {
        if (
          !activeRole ||
          !activeRole.ranchId ||
          !activeRole.roleId ||
          !competitionId
        ) {
          return;
        }

        loadScreenData();
      },
      [activeRole, competitionId],
    ),
  );

  async function loadScreenData() {
    try {
      if (
        !activeRole ||
        !activeRole.ranchId ||
        !activeRole.roleId ||
        !competitionId
      ) {
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

      var incomingClasses = Array.isArray(invitationResponse?.data?.classes)
        ? invitationResponse.data.classes
        : [];

      var incomingHorses = Array.isArray(horsesResponse?.data)
        ? horsesResponse.data
        : [];

      var incomingPayers = Array.isArray(payersResponse?.data)
        ? payersResponse.data
        : [];

      var incomingRiders = Array.isArray(ridersResponse?.data)
        ? ridersResponse.data
        : [];

      var incomingTrainers = Array.isArray(trainersResponse?.data)
        ? trainersResponse.data
        : [];

      setClasses(
        incomingClasses
          .map(function (item) {
            return normalizeClassItem(item);
          })
          .filter(Boolean),
      );

      setHorses(
        incomingHorses
          .map(function (item) {
            return normalizeHorseItem(item);
          })
          .filter(Boolean),
      );

      setPayers(
        incomingPayers
          .map(function (item) {
            return normalizePayerItem(item);
          })
          .filter(Boolean),
      );

      setRiders(
        incomingRiders
          .map(function (item) {
            return normalizeFederationMemberItem(item);
          })
          .filter(Boolean),
      );

      setTrainers(
        incomingTrainers
          .map(function (item) {
            return normalizeFederationMemberItem(item);
          })
          .filter(Boolean),
      );
    } catch (error) {
      setScreenError(
        String(error?.response?.data || "אירעה שגיאה בטעינת נתוני ההרשמה"),
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
    setSelectedClass(function (prevValue) {
      return locks.class ? prevValue : null;
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
  }

  function validateForm() {
    if (!selectedClass || !selectedClass.classInCompId) {
      return "יש לבחור מקצה";
    }

    if (!selectedRider || !selectedRider.federationMemberId) {
      return "יש לבחור רוכב";
    }

    if (!selectedHorse || !selectedHorse.horseId) {
      return "יש לבחור סוס";
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

  async function handleCreateEntry() {
    var validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return;
    }

    try {
      setIsSaving(true);

      var payload = {
        classInCompId: selectedClass.classInCompId,
        orderedBySystemUserId: user.personId,
        ranchId: activeRole.ranchId,
        horseId: selectedHorse.horseId,
        riderFederationMemberId: selectedRider.federationMemberId,
        coachFederationMemberId: selectedTrainer
          ? selectedTrainer.federationMemberId
          : null,
        paidByPersonId: selectedPayer.personId,
        prizeRecipientName: null,
      };

      await createEntry(payload);

      Alert.alert("נשמר", "ההרשמה נוספה בהצלחה");
      resetUnlockedFields();
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשמירת ההרשמה"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  var canSubmit = useMemo(
    function () {
      return (
        !!selectedClass &&
        !!selectedHorse &&
        !!selectedRider &&
        !!selectedPayer &&
        !isSaving
      );
    },
    [selectedClass, selectedHorse, selectedRider, selectedPayer, isSaving],
  );

  return {
    classes,
    horses,
    riders,
    trainers,
    payers,

    selectedClass,
    selectedHorse,
    selectedRider,
    selectedTrainer,
    selectedPayer,

    setSelectedClass,
    setSelectedHorse,
    setSelectedRider,
    setSelectedTrainer,
    setSelectedPayer,

    locks,
    handleToggleLock,

    loading,
    isSaving,
    screenError,
    canSubmit,

    handleCreateEntry,

    formatClassLabel,
    formatHorseLabel,
    formatMemberLabel,
    formatPayerLabel,
  };
}
