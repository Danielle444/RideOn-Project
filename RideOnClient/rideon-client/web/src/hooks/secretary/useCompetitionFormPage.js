import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useCompetitionDetailsStep from "./useCompetitionDetailsStep";
import useCompetitionClassesStep from "./useCompetitionClassesStep";
import useCompetitionPaidTimeStep from "./useCompetitionPaidTimeStep";

export default function useCompetitionFormPage(options) {
  var navigate = useNavigate();
  var params = useParams();

  var isEdit = options.mode === "edit";
  var currentRanchId = options.currentRanchId;
  var competitionIdFromRoute = params.competitionId
    ? Number(params.competitionId)
    : null;

  var [activeStep, setActiveStep] = useState("details");
  var [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

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

  async function handleSaveDetails(intent) {
    var result = await details.saveDetails(
      intent,
      classes.canPublishCompetition,
    );

    if (!result.success) {
      return;
    }

    if (intent === "draft") {
      navigate("/competitions");
      return;
    }

    if (intent === "continue") {
      setActiveStep("classes");
    }

    if (intent === "publish") {
      setActiveStep("classes");
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

  return {
    navigate,
    toast,
    closeToast,
    activeStep,
    setActiveStep,
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
  };
}