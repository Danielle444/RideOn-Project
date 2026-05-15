import { useEffect, useState } from "react";
import { getCompetitionSummary } from "../../services/competitionSummaryService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

function getEmptySummary() {
  return {
    organizer: {
      expectedAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    },
    federation: {
      expectedAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    },
    organizerCategories: [],
    federationCategories: [],
  };
}

export default function useCompetitionSummaryPage(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;

  var [summary, setSummary] = useState(getEmptySummary());
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");

  useEffect(
    function () {
      loadSummary();
    },
    [competitionId, ranchId],
  );

  async function loadSummary() {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      var response = await getCompetitionSummary(competitionId, ranchId);
      var data = response.data || getEmptySummary();

      setSummary({
        organizer:
          data.organizer || data.Organizer || getEmptySummary().organizer,
        federation:
          data.federation || data.Federation || getEmptySummary().federation,
        organizerCategories:
          data.organizerCategories || data.OrganizerCategories || [],
        federationCategories:
          data.federationCategories || data.FederationCategories || [],
      });
    } catch (error) {
      console.error(error);
      setError(getErrorMessage(error, "שגיאה בטעינת סיכום התחרות"));
      setSummary(getEmptySummary());
    } finally {
      setLoading(false);
    }
  }

  return {
    summary: summary,
    loading: loading,
    error: error,
    loadSummary: loadSummary,
  };
}
