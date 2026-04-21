const ACTIVE_COMPETITION_KEY = "rideon_active_competition";

function saveActiveCompetition(competition) {
  if (!competition) {
    return;
  }

  localStorage.setItem(ACTIVE_COMPETITION_KEY, JSON.stringify(competition));
}

function getActiveCompetition() {
  var rawValue = localStorage.getItem(ACTIVE_COMPETITION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function clearActiveCompetition() {
  localStorage.removeItem(ACTIVE_COMPETITION_KEY);
}

export {
  saveActiveCompetition,
  getActiveCompetition,
  clearActiveCompetition,
};