function getCompetitionStatusVariant(status) {
  if (status === "כעת") {
    return "now";
  }

  if (status === "פעילה") {
    return "open";
  }

  if (status === "עתידית") {
    return "future";
  }

  if (status === "הסתיימה") {
    return "past";
  }

  if (status === "טיוטה") {
    return "draft";
  }

  return "default";
}

function canAdminSeeCompetitionDetails(status) {
  return status !== "טיוטה";
}

function canAdminRegisterCompetition(status) {
  return status === "פעילה";
}

function canAdminEnterCompetition(status) {
  return (
    status === "פעילה" ||
    status === "כעת" ||
    status === "הסתיימה"
  );
}

function canPayerEnterCompetition(status) {
  return status === "פעילה" || status === "כעת";
}

function canWorkerEnterCompetition(status) {
  return status === "פעילה" || status === "כעת";
}

export {
  getCompetitionStatusVariant,
  canAdminSeeCompetitionDetails,
  canAdminRegisterCompetition,
  canAdminEnterCompetition,
  canPayerEnterCompetition,
  canWorkerEnterCompetition,
};