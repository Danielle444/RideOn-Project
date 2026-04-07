import { useEffect, useState } from "react";
import {
  createCompetition,
  getCompetitionById,
  updateCompetition,
} from "../../services/competitionService";
import {
  getAllFields,
  getAllClassTypes,
  getAllJudges,
  getAllPrizeTypes,
} from "../../services/superUserService";
import { getArenasByRanchId } from "../../services/arenaService";
import { getAllPaidTimeBaseSlots } from "../../services/paidTimeSlotInCompetitionService";
import {
  toInputDate,
  getErrorMessage,
  validateDetailsForm,
} from "../../utils/competitionForm.utils";

export default function useCompetitionDetailsStep(options) {
  var currentRanchId = options.currentRanchId;
  var isEdit = options.isEdit;
  var competitionIdFromRoute = options.competitionIdFromRoute;
  var onNavigateToEdit = options.onNavigateToEdit;
  var onShowToast = options.onShowToast;

  var [loadingPage, setLoadingPage] = useState(false);
  var [savingDetails, setSavingDetails] = useState(false);

  var [fields, setFields] = useState([]);
  var [arenas, setArenas] = useState([]);
  var [classTypes, setClassTypes] = useState([]);
  var [judges, setJudges] = useState([]);
  var [prizeTypes, setPrizeTypes] = useState([]);
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

  useEffect(
    function () {
      if (!currentRanchId) {
        return;
      }

      loadInitialData();
    },
    [currentRanchId],
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
      ]);

      var fieldsRes = results[0];
      var arenasRes = results[1];
      var paidTimeBaseSlotsRes = results[2];
      var prizeTypesRes = results[3];

      setFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
      setArenas(Array.isArray(arenasRes.data) ? arenasRes.data : []);
      setPaidTimeBaseSlots(
        Array.isArray(paidTimeBaseSlotsRes.data) ? paidTimeBaseSlotsRes.data : [],
      );
      setPrizeTypes(Array.isArray(prizeTypesRes.data) ? prizeTypesRes.data : []);

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

      // בכוונה לא מאפסים כאן selectedCompetitionJudgeIds
      // כי היא רשימה לוקאלית שנאתחל פעם אחת מתוך המקצים ב-useCompetitionFormPage
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
    return {
      competitionId: competitionId,
      hostRanchId: currentRanchId,
      fieldId: Number(detailsForm.fieldId),
      competitionName: detailsForm.competitionName.trim(),
      competitionStartDate: detailsForm.competitionStartDate,
      competitionEndDate: detailsForm.competitionEndDate,
      registrationOpenDate: detailsForm.registrationOpenDate || null,
      registrationEndDate: detailsForm.registrationEndDate || null,
      paidTimeRegistrationDate: detailsForm.paidTimeRegistrationDate || null,
      paidTimePublicationDate: detailsForm.paidTimePublicationDate || null,
      competitionStatus: statusOverride,
      notes: detailsForm.notes.trim() || null,
    };
  }

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

    try {
      setSavingDetails(true);

      var statusToSend = intent === "publish" ? null : "טיוטה";
      var payload = buildCompetitionPayload(statusToSend);

      if (competitionId) {
        await updateCompetition(competitionId, payload);

        if (intent === "publish") {
          setCurrentStatus("עתידית");
          onShowToast("success", "התחרות פורסמה בהצלחה");
        } else {
          setCurrentStatus("טיוטה");
          onShowToast("success", "התחרות נשמרה כטיוטה");
        }

        await loadExistingCompetition(competitionId, currentRanchId);

        return {
          success: true,
          competitionId: competitionId,
        };
      }

      var createPayload = {
        hostRanchId: currentRanchId,
        fieldId: Number(detailsForm.fieldId),
        competitionName: detailsForm.competitionName.trim(),
        competitionStartDate: detailsForm.competitionStartDate,
        competitionEndDate: detailsForm.competitionEndDate,
        registrationOpenDate: detailsForm.registrationOpenDate || null,
        registrationEndDate: detailsForm.registrationEndDate || null,
        paidTimeRegistrationDate: detailsForm.paidTimeRegistrationDate || null,
        paidTimePublicationDate: detailsForm.paidTimePublicationDate || null,
        notes: detailsForm.notes.trim() || null,
      };

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
    paidTimeBaseSlots,
    competitionId,
    currentStatus,
    detailsForm,
    selectedCompetitionJudgeIds,
    setSelectedCompetitionJudgeIds,
    setCompetitionId,
    setCurrentStatus,
    handleDetailsChange,
    toggleCompetitionJudge,
    setJudgesManually,
    loadExistingCompetition,
    saveDetails,
  };
}