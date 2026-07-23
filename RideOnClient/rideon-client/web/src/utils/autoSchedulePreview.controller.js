// Pure orchestration for the read-only auto-scheduling Preview (Stage C2).
//
// This is the single seam where the Preview HTTP call meets the Stage C1
// display mapping. It is dependency-injected (the preview function is passed
// in) so it can be unit-tested without React, without a real axios, and
// without touching any assignment/persistence service.
//
// It performs EXACTLY one network operation: the injected read-only preview
// call. It never assigns, unassigns, transfers, applies, or mutates anything.

import { mapAutoSchedulePreview } from "./autoSchedulePreview.utils.js";

// previewFn: (competitionId, ranchId) => Promise<axiosResponse>
// Returns the normalized (mapped) Preview result. Uses response.data because
// axiosInstance resolves with the full axios response object.
async function fetchAutoSchedulePreview(previewFn, competitionId, ranchId, slots) {
  if (typeof previewFn !== "function") {
    throw new Error("previewFn is required");
  }

  var response = await previewFn(competitionId, ranchId);
  var data = response && response.data ? response.data : null;

  return mapAutoSchedulePreview(data, slots);
}

export { fetchAutoSchedulePreview };
