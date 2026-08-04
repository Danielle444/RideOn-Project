import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getRidersByRanch,
  getTrainersByRanch,
} from "../services/federationMembersService";
import { getCompetitionInvitationDetails } from "../services/competitionService";
import { getRealHorsesByRanch } from "../services/horsesService";
import { getManagedPayers } from "../services/payerService";
import {
  createEntry,
  getCompetitionEntriesView,
} from "../services/entriesService";
import { findDuplicateActiveEntry } from "../utils/entryDuplicateMatch";

var DUPLICATE_ENTRY_CONFIRM_MESSAGE =
  "הרוכב והסוס כבר רשומים למקצה זה. להוסיף בכל זאת?";
var DUPLICATE_ENTRY_CONFIRM_LABEL = "הוסף בכל זאת";
var DUPLICATE_ENTRY_CANCEL_LABEL = "ביטול";

// Reused verbatim (not new copy) from this same hook's loadScreenData catch
// below, and from useRegistrationStepStatus.js's own
// GENERIC_LOAD_ERROR_MESSAGE - the established repo-wide phrasing for "a
// fetch inside the registration flow failed," which is exactly what
// checkForDuplicateAndConfirm's GET can hit.
var GENERIC_FETCH_ERROR_MESSAGE = "אירעה שגיאה בטעינת נתוני ההרשמה";

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

  return String(item.fullName || "").trim();
}

export default function useAdminCompetitionRegistrations(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;

  // CAP-2: the entry currently being replaced by an edit (a change request),
  // so the duplicate check does not flag an edit against itself. Undefined/
  // null for both create surfaces (inline + the two create-mode modal call
  // sites) - only CompetitionEntryCreateModal's edit mode passes a real id.
  var excludeEntryId =
    params.excludeEntryId !== undefined ? params.excludeEntryId : null;

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
  var [prizeRecipientName, setPrizeRecipientName] = useState("");

  var [locks, setLocks] = useState({
    class: false,
    horse: false,
    rider: false,
    coach: false,
    payer: false,
    prizeRecipient: false,
  });

  var [loading, setLoading] = useState(false);
  var [horsesLoading, setHorsesLoading] = useState(false);
  var [isSaving, setIsSaving] = useState(false);
  var [screenError, setScreenError] = useState("");

  // Monotonic id so an out-of-order horse-search response cannot overwrite the
  // results of a later keystroke.
  var horsesRequestIdRef = useRef(0);

  var [lastCreatedEntry, setLastCreatedEntry] = useState(null);

  // CAP-1: transient "just created" confirmation, and how many entries this
  // hook instance has created in the current mount ("session"). Only ever
  // set by a create call (suppressSuccess !== true) - see handleCreateEntry.
  var [justCreated, setJustCreated] = useState(false);
  var [createdCount, setCreatedCount] = useState(0);

  function resetCreationSummary() {
    setJustCreated(false);
    setCreatedCount(0);
  }

  useEffect(
    function () {
      if (locks.prizeRecipient) {
        return;
      }

      if (!selectedPayer) {
        setPrizeRecipientName("");
        return;
      }

      setPrizeRecipientName(formatPayerLabel(selectedPayer));
    },
    [selectedPayer, locks.prizeRecipient],
  );

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

      // Horses are deliberately NOT loaded here — the ranch horse table is
      // unbounded (ranch 11 holds 8,871 rows, ~69 of them real) and stalled
      // this screen. The horse picker fetches its own bounded list when it
      // opens, via loadHorsesForPicker below.
      var results = await Promise.all([
        getCompetitionInvitationDetails(
          competitionId,
          activeRole.roleId,
          activeRole.ranchId,
        ),
        getManagedPayers(activeRole.ranchId, null, null),
        getRidersByRanch(activeRole.ranchId, null),
        getTrainersByRanch(activeRole.ranchId, null),
      ]);

      var invitationResponse = results[0];
      var payersResponse = results[1];
      var ridersResponse = results[2];
      var trainersResponse = results[3];

      var incomingClasses = Array.isArray(invitationResponse?.data?.classes)
        ? invitationResponse.data.classes
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

  // Fetches the bounded, real-horse-only list for the horse picker. Called when
  // the picker opens and on every debounced keystroke, with the typed text
  // passed to the server as the search argument.
  var loadHorsesForPicker = useCallback(
    async function (searchText) {
      if (!activeRole || !activeRole.ranchId) {
        return;
      }

      var requestId = horsesRequestIdRef.current + 1;
      horsesRequestIdRef.current = requestId;

      try {
        setHorsesLoading(true);

        var response = await getRealHorsesByRanch(
          activeRole.ranchId,
          searchText || null,
        );

        // Ignore a slow response that a newer keystroke has already superseded.
        if (horsesRequestIdRef.current !== requestId) {
          return;
        }

        var incomingHorses = Array.isArray(response?.data) ? response.data : [];

        setHorses(
          incomingHorses
            .map(function (item) {
              return normalizeHorseItem(item);
            })
            .filter(Boolean),
        );
      } catch (error) {
        if (horsesRequestIdRef.current !== requestId) {
          return;
        }

        setHorses([]);
      } finally {
        if (horsesRequestIdRef.current === requestId) {
          setHorsesLoading(false);
        }
      }
    },
    [activeRole],
  );

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

    setPrizeRecipientName(function (prevValue) {
      return locks.prizeRecipient ? prevValue : "";
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

  // CAP-2 soft duplicate guard. Fetches the competition's entry list and
  // warns (Alert confirm/cancel) when the exact class+horse+rider triple
  // already has an Active entry - never blocks outright ON A FOUND
  // duplicate (cancel/confirm is the user's own choice). A fetch or
  // normalization FAILURE is a different case: since we could not verify
  // one way or the other, we must not treat "unknown" as "no duplicate" -
  // this stops the submit (returns false, same shape as "user cancelled"),
  // shows the same generic load-error copy this hook already uses
  // (GENERIC_FETCH_ERROR_MESSAGE, reused verbatim from loadScreenData below
  // rather than inventing new copy), and performs no createEntry call. No
  // form state is touched on this path, so all selections are preserved for
  // a retry.
  async function checkForDuplicateAndConfirm() {
    var duplicate;

    try {
      var response = await getCompetitionEntriesView(
        competitionId,
        activeRole.ranchId,
      );

      var entries = Array.isArray(response?.data) ? response.data : [];

      duplicate = findDuplicateActiveEntry(entries, {
        classInCompId: selectedClass.classInCompId,
        horseId: selectedHorse.horseId,
        riderFederationMemberId: selectedRider.federationMemberId,
        excludeEntryId: excludeEntryId,
      });
    } catch (error) {
      Alert.alert("שגיאה", GENERIC_FETCH_ERROR_MESSAGE);
      return false;
    }

    if (!duplicate) {
      return true;
    }

    return await new Promise(function (resolve) {
      Alert.alert(DUPLICATE_ENTRY_CONFIRM_MESSAGE, undefined, [
        {
          text: DUPLICATE_ENTRY_CANCEL_LABEL,
          style: "cancel",
          onPress: function () {
            resolve(false);
          },
        },
        {
          text: DUPLICATE_ENTRY_CONFIRM_LABEL,
          onPress: function () {
            resolve(true);
          },
        },
      ], {
        cancelable: true,
        onDismiss: function () {
          resolve(false);
        },
      });
    });
  }

  // options.suppressSuccess: true for CompetitionEntryCreateModal's edit
  // flow (which still creates a real new entry, but the change-request step
  // around it is what should be user-visible, not this hook's own success
  // banner/tally - see CAP-1). Safe to leave undefined/omitted for the two
  // plain-create call sites (inline surface's onSubmit prop passes this
  // function directly to a Pressable's onPress, so the first argument may
  // be a GestureResponderEvent rather than an options object - that object
  // has no truthy `.suppressSuccess`, so it behaves exactly like "not
  // suppressed", which is the correct default for that surface).
  async function handleCreateEntry(options) {
    var suppressSuccess = !!(options && options.suppressSuccess);

    var validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return null;
    }

    // Clear any confirmation left over from a previous submit before this
    // new attempt runs, so a failed/duplicate-cancelled resubmit doesn't
    // keep showing a stale "success" banner.
    setJustCreated(false);

    var shouldProceed = await checkForDuplicateAndConfirm();

    if (!shouldProceed) {
      return null;
    }

    try {
      setIsSaving(true);

      var payload = {
        classInCompId: selectedClass.classInCompId,
        orderedBySystemUserId: user.personId,
        ranchId: activeRole.ranchId,
        horseId: selectedHorse.horseId,
        riderFederationMemberId: selectedRider.federationMemberId,
        coachFederationMemberId: selectedTrainer.federationMemberId,
        paidByPersonId: selectedPayer.personId,
        prizeRecipientName: prizeRecipientName
          ? prizeRecipientName.trim()
          : null,
      };

      var response = await createEntry(payload);

      setLastCreatedEntry(response.data);

      resetUnlockedFields();

      if (!suppressSuccess) {
        setCreatedCount(function (prevCount) {
          return prevCount + 1;
        });

        setJustCreated(true);
      }

      return response.data;
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשמירת ההרשמה"),
      );

      return null;
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
        !!selectedTrainer &&
        !!selectedPayer &&
        !isSaving
      );
    },
    [
      selectedClass,
      selectedHorse,
      selectedRider,
      selectedTrainer,
      selectedPayer,
      isSaving,
    ],
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
    prizeRecipientName,

    setSelectedClass,
    setSelectedHorse,
    setSelectedRider,
    setSelectedTrainer,
    setSelectedPayer,
    setPrizeRecipientName,

    locks,
    handleToggleLock,

    loading,
    horsesLoading,
    loadHorsesForPicker,
    isSaving,
    screenError,
    canSubmit,

    handleCreateEntry,

    formatClassLabel,
    formatHorseLabel,
    formatMemberLabel,
    formatPayerLabel,

    lastCreatedEntry,

    justCreated,
    createdCount,
    resetCreationSummary,
  };
}
