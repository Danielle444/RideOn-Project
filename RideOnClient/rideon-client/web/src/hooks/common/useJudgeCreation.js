import { useState } from "react";
import {
  createJudge,
  getAllFields,
  getAllJudges,
} from "../../services/superUserService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function useJudgeCreation(options) {
  var fieldId = options.fieldId;
  var onJudgesUpdated = options.onJudgesUpdated;
  var onJudgeCreated = options.onJudgeCreated;

  var [judgeModalOpen, setJudgeModalOpen] = useState(false);
  var [judgeModalError, setJudgeModalError] = useState("");
  var [judgeFields, setJudgeFields] = useState([]);

  async function handleOpenJudgeModal() {
    try {
      setJudgeModalError("");
      setJudgeModalOpen(true);

      if (judgeFields.length > 0) {
        return;
      }

      var res = await getAllFields();
      setJudgeFields(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      setJudgeModalError(getErrorMessage(error, "שגיאה בטעינת ענפים"));
    }
  }

  function handleCloseJudgeModal() {
    setJudgeModalOpen(false);
    setJudgeModalError("");
  }

  async function handleCreateJudge(formData) {
    try {
      setJudgeModalError("");
      await createJudge(formData);

      var judgesRes = await getAllJudges(fieldId || null);
      var refreshedJudges = Array.isArray(judgesRes.data) ? judgesRes.data : [];

      if (onJudgesUpdated) {
        onJudgesUpdated(refreshedJudges);
      }

      var createdJudge = refreshedJudges.find(function (judge) {
        return (
          String(judge.firstNameHebrew || "").trim() ===
            String(formData.firstNameHebrew || "").trim() &&
          String(judge.lastNameHebrew || "").trim() ===
            String(formData.lastNameHebrew || "").trim()
        );
      });

      if (createdJudge && onJudgeCreated) {
        onJudgeCreated(createdJudge, refreshedJudges);
      }

      setJudgeModalOpen(false);
    } catch (error) {
      console.error(error);
      setJudgeModalError(getErrorMessage(error, "שגיאה בשמירת השופט"));
    }
  }

  return {
    judgeModalOpen,
    judgeModalError,
    judgeFields,
    handleOpenJudgeModal,
    handleCloseJudgeModal,
    handleCreateJudge,
  };
}