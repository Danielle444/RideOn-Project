// Pure helper for the CAP-2 duplicate-entry warning. Kept separate from
// useAdminCompetitionRegistrations.js so the matching rule itself is
// independently testable with plain vitest (no React Native involved).
//
// Duplicate rule: same classInCompId + horseId + riderFederationMemberId on
// an Active entry. Same horse/class with a different rider (or same
// rider/class with a different horse) is NOT a duplicate.

// Defensive camelCase/PascalCase normalization, matching the `||` fallback
// convention already used by every normalize*Item() in
// useAdminCompetitionRegistrations.js - the wire casing for
// GET /Entries/competition-view has never been independently captured for
// this endpoint (see repo memory), so both cases are accepted the same way.
function normalizeEntryViewItem(item) {
  if (!item) {
    return null;
  }

  return {
    entryId: item.entryId || item.EntryId || null,
    classInCompId: item.classInCompId || item.ClassInCompId || null,
    horseId: item.horseId || item.HorseId || null,
    riderFederationMemberId:
      item.riderFederationMemberId || item.RiderFederationMemberId || null,
    entryStatus: item.entryStatus || item.EntryStatus || "",
  };
}

// Returns the normalized matching entry, or null when no active duplicate
// is found. `entries` may be any array-ish value from an API response;
// non-arrays are treated as empty (defensive, mirrors the rest of the hook).
function findDuplicateActiveEntry(entries, criteria) {
  var list = Array.isArray(entries) ? entries : [];
  var classInCompId = criteria ? criteria.classInCompId : null;
  var horseId = criteria ? criteria.horseId : null;
  var riderFederationMemberId = criteria ? criteria.riderFederationMemberId : null;
  var excludeEntryId =
    criteria && criteria.excludeEntryId != null ? criteria.excludeEntryId : null;

  for (var i = 0; i < list.length; i++) {
    var normalized = normalizeEntryViewItem(list[i]);

    if (!normalized) {
      continue;
    }

    if (normalized.entryStatus !== "Active") {
      continue;
    }

    if (excludeEntryId != null && normalized.entryId === excludeEntryId) {
      continue;
    }

    if (
      normalized.classInCompId != null &&
      normalized.classInCompId === classInCompId &&
      normalized.horseId != null &&
      normalized.horseId === horseId &&
      normalized.riderFederationMemberId != null &&
      normalized.riderFederationMemberId === riderFederationMemberId
    ) {
      return normalized;
    }
  }

  return null;
}

export { normalizeEntryViewItem, findDuplicateActiveEntry };
