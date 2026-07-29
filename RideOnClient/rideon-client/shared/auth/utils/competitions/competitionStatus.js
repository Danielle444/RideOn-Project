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

// Display-only mapping, and the SINGLE place competition-status text is
// translated for humans. "פעילה" stays the stored/compared logic key everywhere
// (getCompetitionStatusVariant and the canAdmin/Payer/Worker gates above, plus
// every filter/sort comparison in web and mobile); this only changes what the
// user reads. Identity for every status except "פעילה".
function getCompetitionStatusLabel(status) {
  if (status === "פעילה") {
    return "פתוחה להרשמה";
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