import { useEffect, useState } from "react";
import {
  getPaidTimeSlotsByCompetitionId,
  createPaidTimeSlotInCompetition,
  updatePaidTimeSlotInCompetition,
  deletePaidTimeSlotInCompetition,
} from "../../services/paidTimeSlotInCompetitionService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function useCompetitionPaidTimeStep(options) {
  var competitionId = options.competitionId;
  var currentRanchId = options.currentRanchId;
  var activeStep = options.activeStep;
  var shouldShowPaidTimeStep = options.shouldShowPaidTimeStep;
  var onShowToast = options.onShowToast;

  var [paidTimeSlotsInCompetition, setPaidTimeSlotsInCompetition] = useState([]);
  var [loadingPaidTime, setLoadingPaidTime] = useState(false);

  var [paidTimeModalOpen, setPaidTimeModalOpen] = useState(false);
  var [editPaidTimeItem, setEditPaidTimeItem] = useState(null);
  var [paidTimeModalError, setPaidTimeModalError] = useState("");
  var [savingPaidTime, setSavingPaidTime] = useState(false);

  useEffect(
    function () {
      if (
        activeStep !== "paidTime" ||
        !competitionId ||
        !currentRanchId ||
        !shouldShowPaidTimeStep
      ) {
        return;
      }

      loadPaidTimeSectionData(competitionId, currentRanchId);
    },
    [activeStep, competitionId, currentRanchId, shouldShowPaidTimeStep],
  );

  async function loadPaidTimeSectionData(competitionIdValue, ranchId) {
    try {
      setLoadingPaidTime(true);

      var response = await getPaidTimeSlotsByCompetitionId(
        competitionIdValue,
        ranchId,
      );
      setPaidTimeSlotsInCompetition(
        Array.isArray(response.data) ? response.data : [],
      );
    } catch (error) {
      console.error(error);
      onShowToast(
        "error",
        getErrorMessage(error, "שגיאה בטעינת סלוטי הפייד־טיים"),
      );
    } finally {
      setLoadingPaidTime(false);
    }
  }

  function openCreatePaidTimeModal() {
    if (!competitionId) {
      onShowToast("error", "יש לשמור קודם את התחרות");
      return;
    }

    setEditPaidTimeItem(null);
    setPaidTimeModalError("");
    setPaidTimeModalOpen(true);
  }

  function openEditPaidTimeModal(item) {
    setEditPaidTimeItem(item);
    setPaidTimeModalError("");
    setPaidTimeModalOpen(true);
  }

  function closePaidTimeModal() {
    setPaidTimeModalOpen(false);
    setEditPaidTimeItem(null);
    setPaidTimeModalError("");
  }

  async function handleSubmitPaidTime(formData) {
    if (!competitionId || !currentRanchId) {
      setPaidTimeModalError("יש לשמור קודם את התחרות");
      return false;
    }

    try {
      setSavingPaidTime(true);
      setPaidTimeModalError("");

      if (editPaidTimeItem) {
        await updatePaidTimeSlotInCompetition(editPaidTimeItem.compSlotId, {
          compSlotId: editPaidTimeItem.compSlotId,
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          paidTimeSlotId: formData.paidTimeSlotId,
          arenaRanchId: currentRanchId,
          arenaId: formData.arenaId,
          slotDate: formData.slotDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          slotStatus: formData.slotStatus,
          slotNotes: formData.slotNotes,
        });

        onShowToast("success", "סלוט הפייד־טיים עודכן בהצלחה");
      } else {
        await createPaidTimeSlotInCompetition({
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          paidTimeSlotId: formData.paidTimeSlotId,
          arenaRanchId: currentRanchId,
          arenaId: formData.arenaId,
          slotDate: formData.slotDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          slotStatus: formData.slotStatus,
          slotNotes: formData.slotNotes,
        });

        onShowToast("success", "סלוט הפייד־טיים נוסף בהצלחה");
      }

      closePaidTimeModal();
      await loadPaidTimeSectionData(competitionId, currentRanchId);

      return true;
    } catch (error) {
      console.error(error);
      setPaidTimeModalError(
        getErrorMessage(error, "שגיאה בשמירת סלוט הפייד־טיים"),
      );
      return false;
    } finally {
      setSavingPaidTime(false);
    }
  }

  async function handleDeletePaidTime(item) {
    if (!competitionId || !currentRanchId) {
      return;
    }

    var confirmed = window.confirm("האם למחוק את סלוט הפייד־טיים?");

    if (!confirmed) {
      return;
    }

    try {
      await deletePaidTimeSlotInCompetition(
        item.compSlotId,
        competitionId,
        currentRanchId,
        false,
      );
      onShowToast("success", "סלוט הפייד־טיים נמחק בהצלחה");
      await loadPaidTimeSectionData(competitionId, currentRanchId);
    } catch (error) {
      console.error(error);
      onShowToast(
        "error",
        getErrorMessage(error, "שגיאה במחיקת סלוט הפייד־טיים"),
      );
    }
  }

  return {
    paidTimeSlotsInCompetition,
    loadingPaidTime,
    paidTimeModalOpen,
    editPaidTimeItem,
    paidTimeModalError,
    savingPaidTime,
    openCreatePaidTimeModal,
    openEditPaidTimeModal,
    closePaidTimeModal,
    handleSubmitPaidTime,
    handleDeletePaidTime,
  };
}