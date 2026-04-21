import { useEffect, useMemo, useState } from "react";
import {
  getClassesByCompetitionId,
  createClassInCompetition,
  updateClassInCompetition,
  deleteClassInCompetition,
} from "../../services/classInCompetitionService";
import { getAllPatternsWithManeuvers } from "../../services/superUserService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function useCompetitionClassesStep(options) {
  var competitionId = options.competitionId;
  var currentRanchId = options.currentRanchId;
  var activeStep = options.activeStep;
  var detailsForm = options.detailsForm;
  var onShowToast = options.onShowToast;
  var loadOnInit = !!options.loadOnInit;

  var [classesInCompetition, setClassesInCompetition] = useState([]);
  var [loadingClasses, setLoadingClasses] = useState(false);
  var [patterns, setPatterns] = useState([]);

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

  useEffect(function () {
    loadPatterns();
  }, []);

  useEffect(
    function () {
      if (!competitionId || !currentRanchId) {
        return;
      }

      if (activeStep !== "classes" && !loadOnInit) {
        return;
      }

      loadClassesSectionData(competitionId, currentRanchId);
    },
    [activeStep, competitionId, currentRanchId, loadOnInit],
  );

  async function loadPatterns() {
    try {
      var response = await getAllPatternsWithManeuvers();
      setPatterns(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadClassesSectionData(competitionIdValue, ranchId) {
    try {
      setLoadingClasses(true);

      var response = await getClassesByCompetitionId(
        competitionIdValue,
        ranchId,
      );

      var items = Array.isArray(response.data) ? response.data : [];
      setClassesInCompetition(items);
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

  function sortClasses(items) {
    return [...items].sort(function (a, b) {
      var aOrder = Number(a.orderInDay || 0);
      var bOrder = Number(b.orderInDay || 0);

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      var aTime = a.startTime ? String(a.startTime) : "";
      var bTime = b.startTime ? String(b.startTime) : "";

      return aTime.localeCompare(bTime);
    });
  }

  async function handleSubmitClass(formData) {
    if (!competitionId || !currentRanchId) {
      setClassModalError("יש לשמור קודם את התחרות");
      return false;
    }

    try {
      setSavingClass(true);
      setClassModalError("");

      var payload = {
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
        judgeIds: Array.isArray(formData.judgeIds) ? formData.judgeIds : [],
        prizeTypeId: formData.prizeTypeId,
        prizeAmount: formData.prizeAmount,
        patternNumber: formData.patternNumber,
      };

      if (editClassItem) {
        var updateResponse = await updateClassInCompetition(editClassItem.classInCompId, {
          classInCompId: editClassItem.classInCompId,
          ...payload,
        });

        var updatedItem = updateResponse.data;

        setClassesInCompetition(function (prev) {
          var next = prev.map(function (item) {
            if (item.classInCompId === updatedItem.classInCompId) {
              return updatedItem;
            }

            return item;
          });

          return sortClasses(next);
        });

        onShowToast("success", "המקצה עודכן בהצלחה");
      } else {
        var createResponse = await createClassInCompetition(payload);
        var newItem = createResponse.data;

        setClassesInCompetition(function (prev) {
          return sortClasses([...prev, newItem]);
        });

        onShowToast("success", "המקצה נוסף בהצלחה");
      }

      closeClassModal();
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

      setClassesInCompetition(function (prev) {
        return prev.filter(function (currentItem) {
          return currentItem.classInCompId !== item.classInCompId;
        });
      });

      onShowToast("success", "המקצה נמחק בהצלחה");
    } catch (error) {
      console.error(error);
      onShowToast("error", getErrorMessage(error, "שגיאה במחיקת המקצה"));
    }
  }

  return {
    classesInCompetition,
    loadingClasses,
    patterns,
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