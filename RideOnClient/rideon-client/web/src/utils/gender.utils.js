// Canonical person-gender values: "m" / "f" / "o". Legacy data (uppercase "M"/"F" and the Hebrew
// words "גבר"/"אישה") stays readable via genderLabel/normalizeGenderValue until the one-time DB
// normalization lands; horse.gender (זכר/נקבה/מסורס) is a separate domain and is never touched
// here.
var GENDER_OPTIONS = [
  { value: "m", label: "זכר" },
  { value: "f", label: "נקבה" },
  { value: "o", label: "אחר" },
];

// Legacy value -> canonical code. Only recognizes values seen in live data as of the CAP-3 audit
// (m/f/o, M/F, גבר/אישה); an unrecognized value is left as-is rather than guessed at.
function canonicalGenderCode(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  var normalized = String(value).trim();

  if (normalized === "m" || normalized === "M" || normalized === "גבר") {
    return "m";
  }

  if (normalized === "f" || normalized === "F" || normalized === "אישה") {
    return "f";
  }

  if (normalized === "o") {
    return "o";
  }

  return null;
}

// Display label for any stored gender value. null/undefined/"" render as "" (callers apply their
// own placeholder, e.g. the existing `value || "—"` convention). An unrecognized non-empty value
// is passed through unchanged rather than crashing or silently disappearing, mirroring the
// existing safe-display pattern used elsewhere in this codebase (PaidTimeRequestCard's
// getPaidTimeType falls back to the raw productName for an unrecognized value).
function genderLabel(code) {
  if (code === null || code === undefined || code === "") {
    return "";
  }

  var canonical = canonicalGenderCode(code);

  if (canonical === null) {
    return String(code);
  }

  var match = GENDER_OPTIONS.find(function (option) {
    return option.value === canonical;
  });

  return match ? match.label : String(code);
}

// Normalizes a legacy value to its canonical m/f/o code for writes. null/empty are returned
// unchanged (the existing form contract converts an unselected dropdown to null itself, at save
// time -- this function does not decide that). An unrecognized non-empty value is returned
// unchanged rather than guessed at.
function normalizeGenderValue(value) {
  if (value === null || value === undefined || value === "") {
    return value;
  }

  var canonical = canonicalGenderCode(value);

  return canonical === null ? value : canonical;
}

export { GENDER_OPTIONS, genderLabel, normalizeGenderValue };
