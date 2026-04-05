import { useEffect, useMemo, useState } from "react";
import {
  getClassesByCompetitionId,
  createClassInCompetition,
  updateClassInCompetition,
  deleteClassInCompetition,
} from "../../services/classInCompetitionService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function useCompetitionClassesStep(options) {
  var competitionId = options.competitionId;
  var currentRanchId = options.currentRanchId;
  var activeStep = options.activeStep;
  var detailsForm = options.detailsForm;
  var onShowToast = options.onShowToast;

  var [classesInCompetition, setClassesInCompetition] = useState([]);
  var [loadingClasses, setLoadingClasses] = useState(false);

  var [classModalOpen, setClassModalOpen] = useState(false);
  var [editClassItem, setEditClassItem] = useState(null);
  var [classModalError, setClassModalError] = useState("");
  var [savingClass, setSavingClass] = useState(false);
  var [createClassDefaultDate, setCreateClassDefaultDate] = useState("");

  var canPublishCompetition = useMemo(
    function () {
      return !!competitionId && classesInCompetition.length > 0;
    },
    [competitionId, classesInCompetition],
  );

  useEffect(
    function () {
      if (activeStep !== "classes" || !competitionId || !currentRanchId) {
        return;
      }

      loadClassesSectionData(competitionId, currentRanchId);
    },
    [activeStep, competitionId, currentRanchId],
  );

  async function loadClassesSectionData(competitionIdValue, ranchId) {
    try {
      setLoadingClasses(true);

      var response = await getClassesByCompetitionId(competitionIdValue, ranchId);
      setClassesInCompetition(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      onShowToast("error", getErrorMessage(error, "שגיאה בטעינת המקצים"));
    } finally {
      setLoadingClasses(false);
    }
  }

  function openCreateClassModal(defaultDate) {
    if (!competitionId) {
      onShowToast("error", "יש לשמור קודם את פרטי התחרות");
      return;
    }

    if (!detailsForm.fieldId) {
      onShowToast("error", "יש לבחור ענף לפני הוספת מקצה");
      return;
    }

    setEditClassItem(null);
    setClassModalError("");
    setCreateClassDefaultDate(defaultDate || "");
    setClassModalOpen(true);
  }

  function openEditClassModal(item) {
    setEditClassItem(item);
    setClassModalError("");
    setCreateClassDefaultDate("");
    setClassModalOpen(true);
  }

  function closeClassModal() {
    setClassModalOpen(false);
    setEditClassItem(null);
    setClassModalError("");
    setCreateClassDefaultDate("");
  }

  async function handleSubmitClass(formData) {
    if (!competitionId || !currentRanchId) {
      setClassModalError("יש לשמור קודם את התחרות");
      return false;
    }

    try {
      setSavingClass(true);
      setClassModalError("");

      if (editClassItem) {
        await updateClassInCompetition(editClassItem.classInCompId, {
          classInCompId: editClassItem.classInCompId,
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          classTypeId: formData.classTypeId,
          arenaRanchId: currentRanchId,
          arenaId: formData.arenaId,
          classDateTime: formData.classDateTime,
          startTime: formData.startTime,
          orderInDay: formData.orderInDay,
          organizerCost: formData.organizerCost,
          federationCost: formData.federationCost,
          classNotes: formData.classNotes,
        });

        onShowToast("success", "המקצה עודכן בהצלחה");
      } else {
        await createClassInCompetition({
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          classTypeId: formData.classTypeId,
          arenaRanchId: currentRanchId,
          arenaId: formData.arenaId,
          classDateTime: formData.classDateTime,
          startTime: formData.startTime,
          orderInDay: formData.orderInDay,
          organizerCost: formData.organizerCost,
          federationCost: formData.federationCost,
          classNotes: formData.classNotes,
        });

        onShowToast("success", "המקצה נוסף בהצלחה");
      }

      closeClassModal();
      await loadClassesSectionData(competitionId, currentRanchId);

      return true;
    } catch (error) {
      console.error(error);
      setClassModalError(getErrorMessage(error, "שגיאה בשמירת המקצה"));
      return false;
    } finally {
      setSavingClass(false);
    }
  }

  async function handleDeleteClass(item) {
    if (!competitionId || !currentRanchId) {
      return;
    }

    var confirmed = window.confirm("האם למחוק את המקצה?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteClassInCompetition(
        item.classInCompId,
        competitionId,
        currentRanchId,
      );
      onShowToast("success", "המקצה נמחק בהצלחה");
      await loadClassesSectionData(competitionId, currentRanchId);
    } catch (error) {
      console.error(error);
      onShowToast("error", getErrorMessage(error, "שגיאה במחיקת המקצה"));
    }
  }

  return {
    classesInCompetition,
    loadingClasses,
    classModalOpen,
    editClassItem,
    classModalError,
    savingClass,
    canPublishCompetition,
    createClassDefaultDate,
    openCreateClassModal,
    openEditClassModal,
    closeClassModal,
    handleSubmitClass,
    handleDeleteClass,
    loadClassesSectionData,
  };
}