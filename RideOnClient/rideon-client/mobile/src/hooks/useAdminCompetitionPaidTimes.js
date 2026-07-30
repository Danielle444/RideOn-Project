import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  getRidersByRanch,
  getTrainersByRanch,
} from "../services/federationMembersService";
import { getCompetitionInvitationDetails } from "../services/competitionService";
import { getHorsesByRanch } from "../services/horsesService";
import { getManagedPayers } from "../services/payerService";
import { createPaidTimeRequest } from "../services/paidTimeRequestsService";
import {
  validatePaidTimeForm,
  clearFieldError,
  buildPaidTimeReviewModel,
  buildPaidTimeRequestPayload,
  buildSuccessSnapshot,
  getHebrewDateLabel,
  formatDisplayTime,
  formatDurationLabel,
  formatPriceLabel,
} from "../utils/paidTimeRequestForm";

var CREATE_ERROR_MESSAGE =
  "אירעה שגיאה בשמירת בקשת הפייד טיים. אנא נסי שוב.";

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

  var duration = formatDurationLabel(item.durationMinutes);
  var price = formatPriceLabel(item.itemPrice);

  return [item.productName || "", duration, price].filter(Boolean).join(" • ");
}

export default function useAdminCompetitionPaidTimes(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;
  // רק לתצוגה במסך האישור. אם המסך לא מספק שם תחרות, פשוט לא מוצגת שורה.
  var competitionName = params.competitionName || "";

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

  // ולידציה ברמת השדה: מפה של fieldKey -> הודעה, כדי שכל השדות החסרים
  // יוצגו יחד מתחת לשדה שלהם במקום Alert עם השגיאה הראשונה בלבד.
  var [fieldErrors, setFieldErrors] = useState({});
  // שגיאה שאינה של שדה בטופס (משתמש מחובר / חווה פעילה חסרים).
  var [formError, setFormError] = useState("");
  // בקשת גלילה לסקשן הראשון שנכשל. ה-token משתנה בכל ניסיון כושל.
  var [scrollRequest, setScrollRequest] = useState(null);

  var [isReviewOpen, setIsReviewOpen] = useState(false);
  var [reviewModel, setReviewModel] = useState(null);
  var [submitError, setSubmitError] = useState("");

  var [successSnapshot, setSuccessSnapshot] = useState(null);
  var [isSuccessOpen, setIsSuccessOpen] = useState(false);

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

  // עוטפים את ה-setters כדי לנקות את שגיאת השדה ברגע שהמשתמשת מתקנת אותו.
  // ניקוי בחירה (בחירת null) לא מנקה את השגיאה - השדה עדיין חסר.
  function buildFieldSetter(setValue, fieldKey) {
    return function (nextValue) {
      setValue(nextValue);

      if (!nextValue) {
        return;
      }

      setFieldErrors(function (prevErrors) {
        return clearFieldError(prevErrors, fieldKey);
      });
    };
  }

  var setSelectedPriceCatalogField = buildFieldSetter(
    setSelectedPriceCatalog,
    "priceCatalog",
  );
  var setSelectedRequestedSlotField = buildFieldSetter(
    setSelectedRequestedSlot,
    "requestedSlot",
  );
  var setSelectedHorseField = buildFieldSetter(setSelectedHorse, "horse");
  var setSelectedRiderField = buildFieldSetter(setSelectedRider, "rider");
  var setSelectedTrainerField = buildFieldSetter(setSelectedTrainer, "coach");
  var setSelectedPayerField = buildFieldSetter(setSelectedPayer, "payer");

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

  function getFormValues() {
    return {
      requestedSlot: selectedRequestedSlot,
      priceCatalog: selectedPriceCatalog,
      horse: selectedHorse,
      rider: selectedRider,
      coach: selectedTrainer,
      payer: selectedPayer,
      notes: notes,
      user: user,
      activeRole: activeRole,
      competitionName: competitionName,
    };
  }

  var labelFormatters = {
    formatHorseLabel: formatHorseLabel,
    formatMemberLabel: formatMemberLabel,
    formatPayerLabel: formatPayerLabel,
  };

  // הפעולה הראשית של הטופס: ולידציה של הכל במכה אחת, ואם תקין - פתיחת
  // מסך האישור. אין כאן קריאה ליצירה; היא קורית רק מ-handleConfirmSubmit.
  function handleContinueToReview() {
    var result = validatePaidTimeForm(getFormValues());

    setFieldErrors(result.fieldErrors);
    setFormError(result.contextError);

    if (!result.isValid) {
      if (result.firstInvalidFieldKey) {
        setScrollRequest(function (prevRequest) {
          return {
            fieldKey: result.firstInvalidFieldKey,
            token: (prevRequest ? prevRequest.token : 0) + 1,
          };
        });
      }

      return;
    }

    setSubmitError("");
    setReviewModel(buildPaidTimeReviewModel(getFormValues(), labelFormatters));
    setIsReviewOpen(true);
  }

  function handleBackToEdit() {
    if (isSaving) {
      return;
    }

    setIsReviewOpen(false);
    setSubmitError("");
  }

  async function handleConfirmSubmit() {
    // הגנה כפולה מפני שליחה כפולה: גם הכפתור מושבת בזמן שמירה, וגם כאן.
    if (isSaving) {
      return;
    }

    var values = getFormValues();
    var result = validatePaidTimeForm(values);

    if (!result.isValid) {
      setFieldErrors(result.fieldErrors);
      setFormError(result.contextError);
      setIsReviewOpen(false);
      return;
    }

    try {
      setIsSaving(true);
      setSubmitError("");

      await createPaidTimeRequest(buildPaidTimeRequestPayload(values));

      // צילום המצב לפני האיפוס - כדי שמסך ההצלחה יציג את מה שנשלח גם
      // אחרי שהשדות הלא נעולים התרוקנו.
      setSuccessSnapshot(buildSuccessSnapshot(values, labelFormatters));
      setIsReviewOpen(false);
      setReviewModel(null);
      setIsSuccessOpen(true);
      setFieldErrors({});
      setFormError("");

      // התנהגות הנעילה/השימור נשארה בדיוק כפי שהייתה.
      resetUnlockedFields();
    } catch (error) {
      // בכוונה לא מוצג טקסט השרת/מסד הנתונים - רק הודעה בעברית למשתמשת.
      setSubmitError(CREATE_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCloseSuccess() {
    setIsSuccessOpen(false);
    setSuccessSnapshot(null);
  }

  // "המשך לאישור" חייב להיות לחיץ גם כשחסרים שדות - זו הפעולה שמפעילה את
  // הוולידציה ומציגה את כל השגיאות יחד. לכן החסימה היחידה היא שמירה פעילה.
  var canSubmit = useMemo(
    function () {
      return !isSaving;
    },
    [isSaving],
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

    setSelectedPriceCatalog: setSelectedPriceCatalogField,
    setSelectedRequestedSlot: setSelectedRequestedSlotField,
    setSelectedHorse: setSelectedHorseField,
    setSelectedRider: setSelectedRiderField,
    setSelectedTrainer: setSelectedTrainerField,
    setSelectedPayer: setSelectedPayerField,
    setNotes,

    locks,
    handleToggleLock,

    loading,
    isSaving,
    screenError,
    canSubmit,

    fieldErrors,
    formError,
    scrollRequest,

    isReviewOpen,
    reviewModel,
    submitError,
    handleContinueToReview,
    handleBackToEdit,
    handleConfirmSubmit,

    isSuccessOpen,
    successSnapshot,
    handleCloseSuccess,

    formatHorseLabel,
    formatMemberLabel,
    formatPayerLabel,
    formatRequestedSlotLabel,
    formatPriceCatalogLabel,
  };
}
