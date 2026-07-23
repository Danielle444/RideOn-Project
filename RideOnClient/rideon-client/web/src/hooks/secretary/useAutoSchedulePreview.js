import { useState } from "react";

import { previewAutoSchedule } from "../../services/paidTimeRequestService";
import { fetchAutoSchedulePreview } from "../../utils/autoSchedulePreview.controller";
import { getErrorMessage } from "../../utils/competitionForm.utils";

// Manages the read-only auto-scheduling Preview modal state for the secretary
// paid-time screen (Stage C2). It owns ONLY view state (open/loading/error/data)
// and delegates the actual fetch+map to the pure controller. It never persists
// or mutates assignments - the only network call is the read-only Preview.
//
// options:
//   competitionId : number (from the page's useParams)
//   ranchId       : number (from the page's active role)
//   getSlots      : function returning the already-loaded slots array
export default function useAutoSchedulePreview(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;
  var getSlots = options.getSlots;

  var [isOpen, setIsOpen] = useState(false);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [data, setData] = useState(null);

  async function recalculate() {
    // Guard against overlapping requests (disables repeated clicks).
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      var slots = typeof getSlots === "function" ? getSlots() : [];
      var normalized = await fetchAutoSchedulePreview(
        previewAutoSchedule,
        competitionId,
        ranchId,
        slots,
      );

      setData(normalized);
    } catch (err) {
      // Existing screen convention: friendly Hebrew message, no stack trace.
      setData(null);
      setError(getErrorMessage(err, "אירעה שגיאה בהפקת תצוגה מקדימה של השיבוץ"));
    } finally {
      setLoading(false);
    }
  }

  function open() {
    // Every open starts a fresh Preview - never reuse a stale proposal.
    setIsOpen(true);
    setData(null);
    setError("");
    recalculate();
  }

  function close() {
    // Discard the visible Preview so a later reopen cannot show stale data.
    setIsOpen(false);
    setData(null);
    setError("");
    setLoading(false);
  }

  return {
    isOpen: isOpen,
    loading: loading,
    error: error,
    data: data,
    open: open,
    close: close,
    recalculate: recalculate,
  };
}
