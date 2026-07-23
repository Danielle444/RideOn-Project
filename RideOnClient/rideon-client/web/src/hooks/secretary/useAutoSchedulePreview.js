import { useState } from "react";

import {
  previewAutoSchedule,
  applyAutoSchedule,
} from "../../services/paidTimeRequestService";
import { fetchAutoSchedulePreview } from "../../utils/autoSchedulePreview.controller";
import {
  applyAutoScheduleAction,
  isStalePreviewError,
  getStalePreviewMessage,
} from "../../utils/autoScheduleApply.controller";
import { getErrorMessage } from "../../utils/competitionForm.utils";

// Manages the auto-scheduling Preview modal state for the secretary paid-time
// screen (Stage C2), plus the fingerprint-gated Apply mutation (Stage D2).
//
// Preview state (open/loading/error/data) is read-only. Apply state
// (applying/applyError/isStale/applied) gates the single write: the fingerprint
// the Preview already produced is the ONLY thing sent to the server. The hook
// never computes the fingerprint and never sends assignments or a proposal.
//
// options:
//   competitionId : number (from the page's useParams)
//   ranchId       : number (from the page's active role)
//   getSlots      : function returning the already-loaded slots array
//   onApplied     : function(summary) called after a successful Apply so the
//                   page can toast, refresh, and close per its own UX.
export default function useAutoSchedulePreview(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;
  var getSlots = options.getSlots;
  var onApplied = options.onApplied;

  var [isOpen, setIsOpen] = useState(false);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [data, setData] = useState(null);

  // Apply (Stage D2) state - separate from the read-only Preview state above.
  var [applying, setApplying] = useState(false);
  var [applyError, setApplyError] = useState("");
  var [isStale, setIsStale] = useState(false);
  var [applied, setApplied] = useState(false);

  async function recalculate() {
    // Guard against overlapping requests (disables repeated clicks). Also blocked
    // while an Apply is in flight so a mid-apply recalc can't race the write.
    if (loading || applying) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      // A fresh Preview supersedes any prior stale/apply message.
      setApplyError("");

      var slots = typeof getSlots === "function" ? getSlots() : [];
      var normalized = await fetchAutoSchedulePreview(
        previewAutoSchedule,
        competitionId,
        ranchId,
        slots,
      );

      setData(normalized);
      // A successful new Preview clears stale/applied so its new fingerprint
      // (and only it) can be applied.
      setIsStale(false);
      setApplied(false);
    } catch (err) {
      // Existing screen convention: friendly Hebrew message, no stack trace.
      // On failure Apply stays disabled (data is cleared -> no fingerprint), so
      // the obsolete fingerprint can never be re-applied.
      setData(null);
      setError(getErrorMessage(err, "אירעה שגיאה בהפקת תצוגה מקדימה של השיבוץ"));
    } finally {
      setLoading(false);
    }
  }

  // Fingerprint-gated Apply. Sends ONLY the Preview's server fingerprint.
  async function apply() {
    // Prevent duplicate submissions and applying an obsolete/already-applied
    // Preview. Without a fingerprint there is nothing safe to apply.
    if (applying || loading) {
      return;
    }
    if (isStale || applied) {
      return;
    }
    if (!data || !data.fingerprint) {
      return;
    }

    try {
      setApplying(true);
      setApplyError("");

      var summary = await applyAutoScheduleAction(
        applyAutoSchedule,
        competitionId,
        ranchId,
        data.fingerprint,
      );

      // Lock out a second Apply of the same Preview, then hand off to the page
      // for the success UX (toast + refresh + close) via its own mechanism.
      setApplied(true);

      if (typeof onApplied === "function") {
        onApplied(summary);
      }
    } catch (err) {
      if (isStalePreviewError(err)) {
        // Stale: no write happened. Do NOT auto-recalculate. The secretary must
        // click "חשב מחדש" before Apply can be attempted again.
        setIsStale(true);
        setApplyError(getStalePreviewMessage(err));
      } else {
        // 400 / 403 / network / unexpected: friendly Hebrew, no stack trace, and
        // NOT the stale UX.
        setApplyError(
          getErrorMessage(err, "אירעה שגיאה בהחלת השיבוץ האוטומטי"),
        );
      }
    } finally {
      setApplying(false);
    }
  }

  function open() {
    // Every open starts a fresh Preview - never reuse a stale proposal.
    setIsOpen(true);
    setData(null);
    setError("");
    setApplyError("");
    setIsStale(false);
    setApplied(false);
    recalculate();
  }

  function close() {
    // Discard the visible Preview so a later reopen cannot show stale data.
    setIsOpen(false);
    setData(null);
    setError("");
    setLoading(false);
    setApplyError("");
    setIsStale(false);
    setApplied(false);
  }

  return {
    isOpen: isOpen,
    loading: loading,
    error: error,
    data: data,
    applying: applying,
    applyError: applyError,
    isStale: isStale,
    applied: applied,
    open: open,
    close: close,
    recalculate: recalculate,
    apply: apply,
  };
}
