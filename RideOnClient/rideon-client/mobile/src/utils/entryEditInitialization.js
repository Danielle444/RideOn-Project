// CAP-6: pure resolution logic for CompetitionEntryCreateModal's edit-mode
// initialization. Kept separate so "has everything required resolved yet"
// is testable with plain vitest, no component rendering. A lookup is
// required only when editItem itself carries that id - an entry with no
// coachFederationMemberId must not block forever waiting for a trainer
// match that can never occur.

function findById(list, idKey, idValue) {
  if (!Array.isArray(list)) {
    return null;
  }

  return (
    list.find(function (item) {
      return item && item[idKey] === idValue;
    }) || null
  );
}

// Horse always resolves via this editItem-only fallback, never a list
// lookup - registrations.horses is a bounded, picker-driven search list
// that changes on every keystroke, and depending on it here would defeat
// the whole point of this guard (see CompetitionEntryCreateModal.jsx).
function buildHorseFallback(editItem) {
  if (!editItem || !editItem.horseId) {
    return null;
  }

  return {
    horseId: editItem.horseId,
    horseName: editItem.horseName || "",
    barnName: editItem.barnName || "",
    federationNumber: editItem.federationNumber || "",
  };
}

// Returns null when a required lookup has not resolved yet against the
// CURRENT lists (caller should wait and retry once the relevant list
// changes, without marking initialization complete). Returns the resolved
// selections once every id editItem actually carries has a match.
function resolveEntryEditInitialization(editItem, lists) {
  if (!editItem) {
    return null;
  }

  var classes = lists && lists.classes ? lists.classes : [];
  var riders = lists && lists.riders ? lists.riders : [];
  var trainers = lists && lists.trainers ? lists.trainers : [];
  var payers = lists && lists.payers ? lists.payers : [];

  var selectedClass = editItem.classInCompId
    ? findById(classes, "classInCompId", editItem.classInCompId)
    : null;

  if (editItem.classInCompId && !selectedClass) {
    return null;
  }

  var selectedRider = editItem.riderFederationMemberId
    ? findById(riders, "federationMemberId", editItem.riderFederationMemberId)
    : null;

  if (editItem.riderFederationMemberId && !selectedRider) {
    return null;
  }

  var selectedTrainer = editItem.coachFederationMemberId
    ? findById(
        trainers,
        "federationMemberId",
        editItem.coachFederationMemberId,
      )
    : null;

  if (editItem.coachFederationMemberId && !selectedTrainer) {
    return null;
  }

  var selectedPayer = editItem.paidByPersonId
    ? findById(payers, "personId", editItem.paidByPersonId)
    : null;

  if (editItem.paidByPersonId && !selectedPayer) {
    return null;
  }

  return {
    selectedClass: selectedClass,
    selectedHorse: buildHorseFallback(editItem),
    selectedRider: selectedRider,
    selectedTrainer: selectedTrainer,
    selectedPayer: selectedPayer,
    prizeRecipientName: editItem.prizeRecipientName || "",
  };
}

export { resolveEntryEditInitialization };
