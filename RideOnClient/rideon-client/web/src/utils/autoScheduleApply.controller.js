// Pure orchestration for the fingerprint-gated auto-scheduling Apply (Stage D2).
//
// This is the single seam where the Apply HTTP call meets the hook. It is
// dependency-injected (the apply function is passed in) so it can be
// unit-tested without React and without a real axios.
//
// It performs EXACTLY one network operation: the injected apply call. It never
// computes, transforms, or interprets the fingerprint - it only forwards the
// server-issued fingerprint the Preview already returned. It sends no
// assignments, request/slot ids, times, orders, statuses, or client proposal.

// Stable, machine-readable code the server returns with a 409 when the approved
// Preview is no longer current. Matches StalePreviewException.Code on the server.
var STALE_PREVIEW_CODE = "STALE_PREVIEW";

// Approved Hebrew fallback, mirroring the server message, used only if the 409
// body did not carry a message string.
var STALE_PREVIEW_MESSAGE =
  "התצוגה המקדימה שאושרה כבר אינה עדכנית. יש לחשב מחדש לפני החלה.";

// applyFn: (competitionId, ranchId, fingerprint) => Promise<axiosResponse>
// Returns the raw AutoSchedulerSummary payload (response.data) on success, or
// throws the original axios error so the caller can classify it (stale vs other).
async function applyAutoScheduleAction(
  applyFn,
  competitionId,
  ranchId,
  fingerprint,
) {
  if (typeof applyFn !== "function") {
    throw new Error("applyFn is required");
  }

  var response = await applyFn(competitionId, ranchId, fingerprint);
  return response && response.data ? response.data : null;
}

// A stale Preview is signalled by BOTH the HTTP 409 status AND the stable
// machine-readable code - a plain 409 without the code is NOT treated as stale.
function isStalePreviewError(error) {
  if (!error || !error.response) {
    return false;
  }

  if (error.response.status !== 409) {
    return false;
  }

  var data = error.response.data;

  return !!(
    data &&
    typeof data === "object" &&
    data.code === STALE_PREVIEW_CODE
  );
}

// The Hebrew message to show for a stale Preview: prefer the server's message,
// fall back to the approved equivalent. Never returns an empty string.
function getStalePreviewMessage(error) {
  if (
    error &&
    error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    typeof error.response.data.message === "string" &&
    error.response.data.message.trim()
  ) {
    return error.response.data.message.trim();
  }

  return STALE_PREVIEW_MESSAGE;
}

export {
  applyAutoScheduleAction,
  isStalePreviewError,
  getStalePreviewMessage,
  STALE_PREVIEW_CODE,
  STALE_PREVIEW_MESSAGE,
};
