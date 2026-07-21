import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useCompetitionDetailsStep from "./useCompetitionDetailsStep";
import useCompetitionClassesStep from "./useCompetitionClassesStep";
import useCompetitionPaidTimeStep from "./useCompetitionPaidTimeStep";
import {
  getCompetitionsByHostRanch,
  duplicateCompetitionFromSelection,
} from "../../services/competitionService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function useCompetitionFormPage(options) {
  var navigate = useNavigate();
  var params = useParams();

  var isEdit = options.mode === "edit";
  var currentRanchId = options.currentRanchId;
  var competitionIdFromRoute = params.competitionId
    ? Number(params.competitionId)
    : null;

  var [activeStep, setActiveStep] = useState("details");
  var [creationMode, setCreationMode] = useState("manual");

  var [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  var [duplicateSourceCompetitions, setDuplicateSourceCompetitions] = useState(
    [],
  );
  var [loadingDuplicateSources, setLoadingDuplicateSources] = useState(false);
  var [savingDuplicate, setSavingDuplicate] = useState(false);
  var [duplicateError, setDuplicateError] = useState("");

  function showToast(type, message) {
    setToast({
      isOpen: true,
      type: type,
      message: message,
    });
  }

  function closeToast() {
    setToast({
      isOpen: false,
      type: "success",
      message: "",
    });
  }

  var details = useCompetitionDetailsStep({
    currentRanchId: currentRanchId,
    isEdit: isEdit,
    competitionIdFromRoute: competitionIdFromRoute,
    onNavigateToEdit: function (newCompetitionId) {
      navigate("/competitions/" + newCompetitionId + "/edit", {
        replace: true,
      });
    },
    onShowToast: showToast,
  });

  var shouldShowPaidTimeStep = useMemo(
    function () {
      return !!(
        details.detailsForm.paidTimeRegistrationDate ||
        details.detailsForm.paidTimePublicationDate
      );
    },
    [
      details.detailsForm.paidTimeRegistrationDate,
      details.detailsForm.paidTimePublicationDate,
    ],
  );

  var classes = useCompetitionClassesStep({
    competitionId: details.competitionId,
    currentRanchId: currentRanchId,
    activeStep: activeStep,
    detailsForm: details.detailsForm,
    onShowToast: showToast,
    loadOnInit: isEdit,
  });

  var paidTime = useCompetitionPaidTimeStep({
    competitionId: details.competitionId,
    currentRanchId: currentRanchId,
    activeStep: activeStep,
    shouldShowPaidTimeStep: shouldShowPaidTimeStep,
    onShowToast: showToast,
  });

  useEffect(
    function () {
      if (!isEdit) {
        return;
      }

      if (!details.competitionId) {
        return;
      }

      var currentSelected = Array.isArray(details.selectedCompetitionJudgeIds)
        ? details.selectedCompetitionJudgeIds
        : [];

      if (currentSelected.length > 0) {
        return;
      }

      var classesList = Array.isArray(classes.classesInCompetition)
        ? classes.classesInCompetition
        : [];

      if (classesList.length === 0) {
        return;
      }

      var judgeIdsFromClasses = classesList
        .flatMap(function (item) {
          return Array.isArray(item.judgeIds) ? item.judgeIds : [];
        })
        .filter(function (id, index, arr) {
          return arr.indexOf(id) === index;
        });

      if (judgeIdsFromClasses.length === 0) {
        return;
      }

      details.setSelectedCompetitionJudgeIds(judgeIdsFromClasses);
    },
    [
      isEdit,
      details.competitionId,
      details.selectedCompetitionJudgeIds,
      classes.classesInCompetition,
      details.setSelectedCompetitionJudgeIds,
    ],
  );

  useEffect(
    function () {
      if (isEdit) {
        return;
      }

      if (creationMode !== "duplicate") {
        return;
      }

      loadDuplicateSourceCompetitions();
    },
    [creationMode, currentRanchId],
  );

  async function loadDuplicateSourceCompetitions() {
    if (!currentRanchId) {
      showToast("error", "לא נבחרה חווה פעילה");
      return;
    }

    try {
      setDuplicateError("");
      setLoadingDuplicateSources(true);

      var response = await getCompetitionsByHostRanch({
        ranchId: currentRanchId,
        searchText: null,
        status: null,
        fieldId: null,
        dateFrom: null,
        dateTo: null,
      });

      setDuplicateSourceCompetitions(
        Array.isArray(response.data) ? response.data : [],
      );
    } catch (error) {
      console.error(error);
      setDuplicateSourceCompetitions([]);
      setDuplicateError(
        getErrorMessage(error, "שגיאה בטעינת תחרויות מקור לשכפול"),
      );
    } finally {
      setLoadingDuplicateSources(false);
    }
  }

  function handleCreationModeChange(nextMode) {
    if (details.competitionId) {
      return;
    }

    setCreationMode(nextMode);
    setDuplicateError("");

    if (nextMode === "manual") {
      setActiveStep("details");
    }
  }

  async function handleSaveDetails(intent) {
    var result = await details.saveDetails(
      intent,
      classes.canPublishCompetition,
    );

    if (!result.success) {
      return;
    }

    if (intent === "draft") {
      navigate("/competitions", {
        state: result.toast ? { toast: result.toast } : undefined,
      });
      return;
    }

    if (intent === "continue") {
      setActiveStep("classes");
      return;
    }

    if (intent === "publish") {
      navigate("/competitions", {
        state: result.toast ? { toast: result.toast } : undefined,
      });
      return;
    }
  }

  function handleFinishClassesStep() {
    if (shouldShowPaidTimeStep) {
      setActiveStep("paidTime");
      return;
    }

    showToast("success", "שלב המקצים נשמר");
  }

  function handleSkipPaidTimeStep() {
    showToast("info", "ניתן לחזור ולהגדיר פייד־טיים בהמשך");
  }

  async function handleDuplicateCompetition(payload) {
    try {
      setSavingDuplicate(true);
      setDuplicateError("");

      var response = await duplicateCompetitionFromSelection(payload);
      var newCompetitionId = response.data?.newCompetitionId;

      if (!newCompetitionId) {
        throw new Error("לא התקבל מזהה לתחרות החדשה");
      }

      navigate("/competitions", {
        replace: true,
        state: {
          toast: { type: "success", message: "התחרות שוכפלה בהצלחה" },
        },
      });
    } catch (error) {
      console.error(error);
      setDuplicateError(getErrorMessage(error, "שגיאה בשכפול התחרות"));
    } finally {
      setSavingDuplicate(false);
    }
  }

  return {
    navigate,
    toast,
    showToast,
    closeToast,
    activeStep,
    setActiveStep,
    creationMode,
    setCreationMode: handleCreationModeChange,
    loadingPage: details.loadingPage,
    savingDetails: details.savingDetails,
    fields: details.fields,
    arenas: details.arenas,
    classTypes: details.classTypes,
    judges: details.judges,
    prizeTypes: details.prizeTypes,
    patterns:
      Array.isArray(classes.patterns) && classes.patterns.length > 0
        ? classes.patterns
        : details.patterns,
    paidTimeBaseSlots: details.paidTimeBaseSlots,
    competitionId: details.competitionId,
    currentStatus: details.currentStatus,
    detailsForm: details.detailsForm,
    selectedCompetitionJudgeIds: details.selectedCompetitionJudgeIds,
    setSelectedCompetitionJudgeIds: details.setSelectedCompetitionJudgeIds,
    toggleCompetitionJudge: details.toggleCompetitionJudge,
    setJudgesManually: details.setJudgesManually,
    handleDetailsChange: details.handleDetailsChange,
    handleSaveDetails: handleSaveDetails,
    classesInCompetition: classes.classesInCompetition,
    loadingClasses: classes.loadingClasses,
    classModalOpen: classes.classModalOpen,
    editClassItem: classes.editClassItem,
    classModalError: classes.classModalError,
    savingClass: classes.savingClass,
    createClassDefaultDate: classes.createClassDefaultDate,
    openCreateClassModal: classes.openCreateClassModal,
    openEditClassModal: classes.openEditClassModal,
    closeClassModal: classes.closeClassModal,
    handleSubmitClass: classes.handleSubmitClass,
    handleDeleteClass: classes.handleDeleteClass,
    canPublishCompetition: classes.canPublishCompetition,
    handleFinishClassesStep: handleFinishClassesStep,
    paidTimeSlotsInCompetition: paidTime.paidTimeSlotsInCompetition,
    loadingPaidTime: paidTime.loadingPaidTime,
    paidTimeModalOpen: paidTime.paidTimeModalOpen,
    editPaidTimeItem: paidTime.editPaidTimeItem,
    paidTimeModalError: paidTime.paidTimeModalError,
    savingPaidTime: paidTime.savingPaidTime,
    openCreatePaidTimeModal: paidTime.openCreatePaidTimeModal,
    openEditPaidTimeModal: paidTime.openEditPaidTimeModal,
    closePaidTimeModal: paidTime.closePaidTimeModal,
    handleSubmitPaidTime: paidTime.handleSubmitPaidTime,
    handleDeletePaidTime: paidTime.handleDeletePaidTime,
    shouldShowPaidTimeStep: shouldShowPaidTimeStep,
    handleSkipPaidTimeStep: handleSkipPaidTimeStep,
    duplicateSourceCompetitions: duplicateSourceCompetitions,
    loadingDuplicateSources: loadingDuplicateSources,
    savingDuplicate: savingDuplicate,
    duplicateError: duplicateError,
    handleDuplicateCompetition: handleDuplicateCompetition,
    reloadDuplicateSourceCompetitions: loadDuplicateSourceCompetitions,
  };
}
