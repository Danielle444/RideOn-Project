import { useEffect, useRef, useState } from "react";
import {
  createCompetition,
  getCompetitionById,
  updateCompetition,
  rescheduleCompetition,
} from "../../services/competitionService";
import {
  getAllFields,
  getAllClassTypes,
  getAllJudges,
  getAllPrizeTypes,
  getAllPatternsWithManeuvers,
} from "../../services/superUserService";
import { getArenasByRanchId } from "../../services/arenaService";
import { getAllPaidTimeBaseSlots } from "../../services/paidTimeSlotInCompetitionService";
import {
  toInputDate,
  getErrorMessage,
  validateDetailsForm,
  buildCompetitionBasePayload,
  getWholeDayOffsetDays,
} from "../../utils/competitionForm.utils";
import { addDaysToDateOnly } from "../../utils/paidTimeSlotForm.utils";

// Approved CAP-6 copy (hebrew-strings.md) — the direct-date-edit fold-in of
// the old separate "postpone" flow.
var DATE_CHANGE_CONFIRM_TITLE = "עדכון מועדי התחרות";
var DATE_CHANGE_FORWARD_ONLY_GUARD =
  "אפשר להזיז את התחרות רק קדימה. יש לבחור תאריך פתיחה מאוחר מהנוכחי.";
var DATE_CHANGE_CONFIRM_LABEL = "כן, עדכן/י את המועדים";
var DATE_CHANGE_CANCEL_LABEL = "ביטול";
var RESCHEDULE_SUCCESS_FALLBACK = "התחרות וכל מועדי השירותים שלה נדחו בהצלחה.";
var RESCHEDULE_GENERIC_ERROR = "אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.";
// Reschedule already committed server-side by the time the follow-up
// updateCompetition call can fail — RESCHEDULE_GENERIC_ERROR above ("no
// changes were made") would be a lie at that point. This is the truthful,
// separate message for exactly that partial-success case.
var DATE_CHANGE_PARTIAL_SAVE_ERROR =
  "המועדים עודכנו, אך שמירת שאר פרטי התחרות נכשלה. יש לבדוק את הפרטים ולנסות שוב.";

function formatDateForConfirm(value) {
  if (!value) {
    return "-";
  }

  var parts = String(value).split("-");

  if (parts.length !== 3) {
    return value;
  }

  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function buildDateChangeConfirmMessage(oldStart, oldEnd, newStart, newEnd) {
  return (
    "שינוי תאריך פתיחת התחרות יזיז את כל מועדי התחרות — המקצים, זמני " +
    "הפייד־טיים, הזמנות התאים ומשלוחי הנסורת שטרם סופקו — בהתאם. התחרות " +
    "תעבור מהתאריכים " +
    formatDateForConfirm(oldStart) +
    "–" +
    formatDateForConfirm(oldEnd) +
    " לתאריכים " +
    formatDateForConfirm(newStart) +
    "–" +
    formatDateForConfirm(newEnd) +
    ". להמשיך?"
  );
}

export default function useCompetitionDetailsStep(options) {
  var currentRanchId = options.currentRanchId;
  var isEdit = options.isEdit;
  var competitionIdFromRoute = options.competitionIdFromRoute;
  var onNavigateToEdit = options.onNavigateToEdit;
  var onShowToast = options.onShowToast;

  var [loadingPage, setLoadingPage] = useState(false);
  var [savingDetails, setSavingDetails] = useState(false);
  var [savingReschedule, setSavingReschedule] = useState(false);
  var [dateChangeConfirm, setDateChangeConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  var dateChangeConfirmResolveRef = useRef(null);

  // Persisted (server-confirmed) competition dates, kept SEPARATE from
  // detailsForm.competitionStartDate/competitionEndDate. detailsForm is form
  // state — even though those two fields are now rendered read-only for an
  // existing competition, the state itself is still nominally editable, and
  // the reschedule preview must never be able to anchor on anything but the
  // last value the server actually returned. Only loadExistingCompetition
  // (below) is allowed to set these.
  var [persistedCompetitionStartDate, setPersistedCompetitionStartDate] =
    useState("");
  var [persistedCompetitionEndDate, setPersistedCompetitionEndDate] =
    useState("");

  var [fields, setFields] = useState([]);
  var [arenas, setArenas] = useState([]);
  var [classTypes, setClassTypes] = useState([]);
  var [judges, setJudges] = useState([]);
  var [prizeTypes, setPrizeTypes] = useState([]);
  var [patterns, setPatterns] = useState([]);
  var [paidTimeBaseSlots, setPaidTimeBaseSlots] = useState([]);
  var [selectedCompetitionJudgeIds, setSelectedCompetitionJudgeIds] = useState(
    [],
  );

  var [competitionId, setCompetitionId] = useState(
    isEdit ? competitionIdFromRoute : null,
  );
  var [currentStatus, setCurrentStatus] = useState("טיוטה");

  var [detailsForm, setDetailsForm] = useState({
    competitionName: "",
    fieldId: "",
    competitionStartDate: "",
    competitionEndDate: "",
    registrationOpenDate: "",
    registrationEndDate: "",
    paidTimeRegistrationDate: "",
    paidTimePublicationDate: "",
    notes: "",
  });

  // Re-runs on either a ranch change OR a route competition-id change, so
  // navigating from /competitions/{id1}/edit to /competitions/{id2}/edit
  // without a remount (React Router reuses the same component instance
  // across param-only navigations on the same route) still reloads
  // everything for id2 through the one existing path below —
  // loadInitialData always re-fetches the ranch-scoped lookups too, which
  // is a harmless redundant call when only the competition id changed, not
  // a second fetch mechanism. competitionIdFromRoute is a plain prop this
  // hook never writes to, so this cannot create a loop.
  useEffect(
    function () {
      if (!currentRanchId) {
        return;
      }

      loadInitialData();
    },
    [currentRanchId, competitionIdFromRoute],
  );

  useEffect(
    function () {
      if (!detailsForm.fieldId) {
        setClassTypes([]);
        setJudges([]);
        return;
      }

      loadFieldRelatedData(Number(detailsForm.fieldId));
    },
    [detailsForm.fieldId],
  );

  async function loadInitialData() {
    if (!currentRanchId) {
      return;
    }

    try {
      setLoadingPage(true);

      var results = await Promise.all([
        getAllFields(),
        getArenasByRanchId(currentRanchId),
        getAllPaidTimeBaseSlots(currentRanchId),
        getAllPrizeTypes(),
        getAllPatternsWithManeuvers(),
      ]);

      var fieldsRes = results[0];
      var arenasRes = results[1];
      var paidTimeBaseSlotsRes = results[2];
      var prizeTypesRes = results[3];
      var patternsRes = results[4];

      setFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
      setArenas(Array.isArray(arenasRes.data) ? arenasRes.data : []);
      setPaidTimeBaseSlots(
        Array.isArray(paidTimeBaseSlotsRes.data) ? paidTimeBaseSlotsRes.data : [],
      );
      setPrizeTypes(Array.isArray(prizeTypesRes.data) ? prizeTypesRes.data : []);
      setPatterns(Array.isArray(patternsRes.data) ? patternsRes.data : []);

      if (isEdit && competitionIdFromRoute) {
        await loadExistingCompetition(competitionIdFromRoute, currentRanchId);
      } else {
        setCurrentStatus("טיוטה");
      }
    } catch (error) {
      console.error(error);
      onShowToast("error", getErrorMessage(error, "שגיאה בטעינת נתוני העמוד"));
    } finally {
      setLoadingPage(false);
    }
  }

  async function loadFieldRelatedData(fieldId) {
    try {
      var results = await Promise.all([
        getAllClassTypes(fieldId),
        getAllJudges(fieldId),
      ]);

      var classTypesRes = results[0];
      var judgesRes = results[1];

      setClassTypes(Array.isArray(classTypesRes.data) ? classTypesRes.data : []);
      setJudges(Array.isArray(judgesRes.data) ? judgesRes.data : []);
    } catch (error) {
      console.error(error);
      onShowToast("error", getErrorMessage(error, "שגיאה בטעינת נתוני ענף"));
    }
  }

  async function loadExistingCompetition(competitionIdValue, ranchId) {
    try {
      var competitionRes = await getCompetitionById(competitionIdValue, ranchId);
      var competition = competitionRes.data;

      setCompetitionId(competition.competitionId);
      setCurrentStatus(competition.competitionStatus || "טיוטה");
      setPersistedCompetitionStartDate(
        toInputDate(competition.competitionStartDate),
      );
      setPersistedCompetitionEndDate(
        toInputDate(competition.competitionEndDate),
      );

      setDetailsForm({
        competitionName: competition.competitionName || "",
        fieldId: competition.fieldId ? String(competition.fieldId) : "",
        competitionStartDate: toInputDate(competition.competitionStartDate),
        competitionEndDate: toInputDate(competition.competitionEndDate),
        registrationOpenDate: toInputDate(competition.registrationOpenDate),
        registrationEndDate: toInputDate(competition.registrationEndDate),
        paidTimeRegistrationDate: toInputDate(
          competition.paidTimeRegistrationDate,
        ),
        paidTimePublicationDate: toInputDate(
          competition.paidTimePublicationDate,
        ),
        notes: competition.notes || "",
      });
    } catch (error) {
      console.error(error);
      onShowToast("error", getErrorMessage(error, "שגיאה בטעינת פרטי התחרות"));
    }
  }

  function handleDetailsChange(fieldName, value) {
    var currentFieldId = String(detailsForm.fieldId || "");
    var nextFieldId = fieldName === "fieldId" ? String(value || "") : currentFieldId;

    setDetailsForm(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });

    if (fieldName === "fieldId" && currentFieldId !== nextFieldId) {
      setSelectedCompetitionJudgeIds([]);
    }
  }

  function toggleCompetitionJudge(judgeId) {
    setSelectedCompetitionJudgeIds(function (prev) {
      var exists = prev.some(function (id) {
        return String(id) === String(judgeId);
      });

      if (exists) {
        return prev.filter(function (id) {
          return String(id) !== String(judgeId);
        });
      }

      return [...prev, judgeId];
    });
  }

  function setJudgesManually(newJudges) {
    setJudges(Array.isArray(newJudges) ? newJudges : []);
  }

  function buildCompetitionPayload(statusOverride) {
    var basePayload = buildCompetitionBasePayload(detailsForm, currentRanchId);

    return {
      ...basePayload,
      competitionId: competitionId,
      competitionStatus: statusOverride,
    };
  }

  // "publish" clears the manual marker (null) so the server's effective-status
  // calculation takes over. "draft" writes the draft marker explicitly.
  // "continue" (save & continue to classes) must PRESERVE the current status:
  // it echoes the status the form already holds, which the server's
  // NormalizeManualStatus collapses back to the stored value — טיוטה stays
  // draft, בוטלה stays cancelled, and any computed published value
  // (עתידית/פעילה/כעת/הסתיימה) collapses to null, i.e. stays published.
  function computeStatusToSend(intent) {
    if (intent === "publish") {
      return null;
    }

    if (intent === "draft") {
      return "טיוטה";
    }

    return currentStatus;
  }

  // Sets currentStatus for the given intent and returns the matching toast
  // copy. Shared by the ordinary save path and the date-change path so both
  // apply the exact same status transition.
  function applyIntentStatusSideEffect(intent) {
    if (intent === "publish") {
      setCurrentStatus("עתידית");
      return "התחרות פורסמה בהצלחה";
    }

    if (intent === "draft") {
      setCurrentStatus("טיוטה");
      return "התחרות נשמרה כטיוטה";
    }

    // "continue" preserves the status — leave currentStatus alone and let
    // the reload below refresh it from the server's effective status.
    return "פרטי התחרות נשמרו בהצלחה";
  }

  // CAP-6: editing competitionStartDate on an existing competition folds the
  // old separate "postpone" flow into this same save action. If the start
  // date moved, the offset is derived from the persisted (server-confirmed)
  // date - never from detailsForm's own field, which is unsaved form state -
  // confirmed with the secretary, then applied via the SAME dedicated
  // endpoint (POST /Competitions/{id}/reschedule) the old modal used, so
  // classes/paid-time/stalls/undelivered-shavings move atomically server-side.
  // Any other edited fields are applied afterward via the ordinary update
  // endpoint, since reschedule only ever touches dates and their dependents.
  async function saveDetails(intent, canPublishCompetition) {
    if (!currentRanchId) {
      onShowToast("error", "לא נבחרה חווה פעילה");
      return { success: false };
    }

    var validationError = validateDetailsForm(detailsForm);

    if (validationError) {
      onShowToast("error", validationError);
      return { success: false };
    }

    if (intent === "publish" && !canPublishCompetition) {
      onShowToast("error", "אפשר לפרסם תחרות רק אחרי שהוגדר לפחות מקצה אחד");
      return { success: false };
    }

    var startDateChanged =
      !!competitionId &&
      !!persistedCompetitionStartDate &&
      detailsForm.competitionStartDate !== persistedCompetitionStartDate;

    if (startDateChanged) {
      var offsetDays = getWholeDayOffsetDays(
        detailsForm.competitionStartDate,
        persistedCompetitionStartDate,
      );

      if (offsetDays <= 0) {
        onShowToast("error", DATE_CHANGE_FORWARD_ONLY_GUARD);
        return { success: false };
      }

      var newEndDatePreview = addDaysToDateOnly(
        persistedCompetitionEndDate,
        offsetDays,
      );

      var confirmed = await askDateChangeConfirmation(
        buildDateChangeConfirmMessage(
          persistedCompetitionStartDate,
          persistedCompetitionEndDate,
          detailsForm.competitionStartDate,
          newEndDatePreview,
        ),
      );

      if (!confirmed) {
        return { success: false };
      }

      return await saveWithDateChange(offsetDays, intent);
    }

    return await saveOrdinary(intent);
  }

  function askDateChangeConfirmation(message) {
    setDateChangeConfirm({
      isOpen: true,
      title: DATE_CHANGE_CONFIRM_TITLE,
      message: message,
    });

    return new Promise(function (resolve) {
      dateChangeConfirmResolveRef.current = resolve;
    });
  }

  function resolveDateChangeConfirm(confirmed) {
    setDateChangeConfirm({ isOpen: false, title: "", message: "" });

    if (dateChangeConfirmResolveRef.current) {
      var resolve = dateChangeConfirmResolveRef.current;
      dateChangeConfirmResolveRef.current = null;
      resolve(confirmed);
    }
  }

  function confirmDateChange() {
    resolveDateChangeConfirm(true);
  }

  function cancelDateChangeConfirm() {
    resolveDateChangeConfirm(false);
  }

  // Two independent failure points, two independent truths. If reschedule
  // itself fails, nothing moved - the existing generic error is accurate and
  // updateCompetition must never run. If reschedule succeeds, the dates are
  // ALREADY moved server-side before updateCompetition is even attempted -
  // so a subsequent updateCompetition failure must never be reported as a
  // failed date move, and the reload must still happen so the UI reflects
  // what actually changed.
  async function saveWithDateChange(offsetDays, intent) {
    try {
      setSavingDetails(true);
      setSavingReschedule(true);

      var rescheduleResponse;

      try {
        rescheduleResponse = await rescheduleCompetition(competitionId, {
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          offsetDays: offsetDays,
        });
      } catch (error) {
        console.error(error);
        onShowToast("error", getErrorMessage(error, RESCHEDULE_GENERIC_ERROR));
        return { success: false };
      }

      try {
        var newStartDate = addDaysToDateOnly(
          persistedCompetitionStartDate,
          offsetDays,
        );
        var newEndDate = addDaysToDateOnly(
          persistedCompetitionEndDate,
          offsetDays,
        );

        var statusToSend = computeStatusToSend(intent);
        var payload = {
          ...buildCompetitionBasePayload(
            {
              ...detailsForm,
              competitionStartDate: newStartDate,
              competitionEndDate: newEndDate,
            },
            currentRanchId,
          ),
          competitionId: competitionId,
          competitionStatus: statusToSend,
        };

        await updateCompetition(competitionId, payload);
      } catch (error) {
        console.error(error);
        onShowToast("error", DATE_CHANGE_PARTIAL_SAVE_ERROR);
        await loadExistingCompetition(competitionId, currentRanchId);
        return { success: false };
      }

      applyIntentStatusSideEffect(intent);

      var successMessage =
        rescheduleResponse.data?.message ||
        rescheduleResponse.data?.Message ||
        RESCHEDULE_SUCCESS_FALLBACK;

      onShowToast("success", successMessage);

      await loadExistingCompetition(competitionId, currentRanchId);

      return {
        success: true,
        competitionId: competitionId,
        toast: { type: "success", message: successMessage },
      };
    } finally {
      setSavingDetails(false);
      setSavingReschedule(false);
    }
  }

  async function saveOrdinary(intent) {
    try {
      setSavingDetails(true);

      var statusToSend = computeStatusToSend(intent);
      var payload = buildCompetitionPayload(statusToSend);

      if (competitionId) {
        await updateCompetition(competitionId, payload);

        var updateToastMessage = applyIntentStatusSideEffect(intent);

        onShowToast("success", updateToastMessage);

        await loadExistingCompetition(competitionId, currentRanchId);

        return {
          success: true,
          competitionId: competitionId,
          toast: { type: "success", message: updateToastMessage },
        };
      }

      var createPayload = buildCompetitionBasePayload(detailsForm, currentRanchId);

      var response = await createCompetition(createPayload);

      var newCompetitionId =
        response.data?.competitionId || response.data?.CompetitionId;

      if (!newCompetitionId) {
        throw new Error("CompetitionId was not returned from server");
      }

      setCompetitionId(newCompetitionId);
      setCurrentStatus("טיוטה");
      onShowToast("success", "טיוטת התחרות נוצרה בהצלחה");

      onNavigateToEdit(newCompetitionId);

      return {
        success: true,
        competitionId: newCompetitionId,
        toast: { type: "success", message: "טיוטת התחרות נוצרה בהצלחה" },
      };
    } catch (error) {
      console.error(error);
      onShowToast("error", getErrorMessage(error, "שגיאה בשמירת פרטי התחרות"));
      return { success: false };
    } finally {
      setSavingDetails(false);
    }
  }

  return {
    loadingPage,
    savingDetails,
    fields,
    arenas,
    classTypes,
    judges,
    prizeTypes,
    patterns,
    paidTimeBaseSlots,
    competitionId,
    currentStatus,
    detailsForm,
    persistedCompetitionStartDate,
    persistedCompetitionEndDate,
    selectedCompetitionJudgeIds,
    setSelectedCompetitionJudgeIds,
    setCompetitionId,
    setCurrentStatus,
    handleDetailsChange,
    toggleCompetitionJudge,
    setJudgesManually,
    loadExistingCompetition,
    saveDetails,
    savingReschedule,
    dateChangeConfirm,
    confirmDateChange,
    cancelDateChangeConfirm,
    dateChangeConfirmLabel: DATE_CHANGE_CONFIRM_LABEL,
    dateChangeCancelLabel: DATE_CHANGE_CANCEL_LABEL,
  };
}