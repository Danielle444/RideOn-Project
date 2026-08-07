import apiClient from "./axiosInstance";

function getCompounds(ranchId, competitionId) {
  var params = { ranchId: ranchId };

  // Ranch-model fix (Bug 2): passing competitionId lets the server resolve
  // the competition's host/venue ranch instead of using ranchId (the
  // caller's own active ranch) for physical compound data. Callers that
  // don't have a competition in scope (ranch-level compound setup) simply
  // omit it and keep the pre-fix ranch-scoped behavior.
  if (competitionId != null) {
    params.competitionId = competitionId;
  }

  return apiClient.get("/StallAssignments/compounds", {
    params: params,
  });
}

function getAssignments(competitionId, ranchId) {
  return apiClient.get("/StallAssignments", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

// Payer-safe projection (blocker 2, 2026-08-07): server redacts other
// participants' identity server-side (IsMine/HorseName/BarnName only for the
// caller's own stall) - never call getAssignments() for a Payer viewer.
function getPayerMapAssignments(competitionId, ranchId) {
  return apiClient.get("/StallAssignments/payer-map", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function getHorses(competitionId, ranchId) {
  return apiClient.get("/StallAssignments/horses", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function getAssignedStallPrices(competitionId, ranchId) {
  return apiClient.get("/StallAssignments/assigned-prices", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function getStallMapPublishStatus(competitionId, ranchId) {
  return apiClient.get("/StallAssignments/publish-status", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function parseCompoundLayout(compound) {
  var raw =
    compound &&
    (compound.layoutJson != null
      ? compound.layoutJson
      : compound.layout != null
        ? compound.layout
        : compound.Layout);

  if (!raw) return null;

  try {
    if (typeof raw === "string") {
      return JSON.parse(raw);
    }

    return raw;
  } catch {
    return null;
  }
}

export {
  getCompounds,
  getAssignments,
  getPayerMapAssignments,
  getHorses,
  getAssignedStallPrices,
  getStallMapPublishStatus,
  parseCompoundLayout,
};
