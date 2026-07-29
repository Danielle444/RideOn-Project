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
  return status === "פעילה" || status ==="כעת";
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

// Display-only mapping. "פעילה" stays the stored/compared logic key everywhere
// (getCompetitionStatusVariant and the canAdmin/Payer/Worker gates above);
// this only changes what the user reads on a badge.
function getCompetitionStatusLabel(status) {
  if (status === "פעילה") {
    return "פתוח להרשמה";
  }

  return status;
}

export {
  getCompetitionStatusVariant,
  getCompetitionStatusLabel,
  canAdminSeeCompetitionDetails,
  canAdminRegisterCompetition,
  canAdminEnterCompetition,
  canPayerEnterCompetition,
  canWorkerEnterCompetition,
};