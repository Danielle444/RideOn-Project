// Shared "step unavailable" Hebrew reason-mapping. This is the single copy -
// AdminCompetitionRegistrationsScreen.jsx does NOT keep its own inline copy
// (an earlier version of this comment claimed it did; that was already
// stale by the time of the CAP-4 audit - the screen imports and calls
// buildRegistrationStepNoticeMessage below directly, same as the three
// standalone management screens (Classes / Stalls-Shavings / Paid Times)).

var REGISTRATION_STEP_REASON_MESSAGES = {
  NOT_CONFIGURED: "שלב זה עדיין לא הוגדר עבור התחרות.",
  NOT_OPEN_YET: "ההרשמה לשלב זה עדיין לא נפתחה.",
  MISSING_PRICE: "לא הוגדר מחיר פעיל עבור שלב זה.",
  NEEDS_RELEVANT_ENTRY:
    'יש צורך בהרשמה פעילה למקצה לפני הזמנת תא. אפשר להוסיף הרשמה בלשונית "מקצים".',
  NEEDS_RELEVANT_STALL_BOOKING:
    'יש צורך בהזמנת תא פעילה לפני הזמנת נסורת. אפשר להוסיף תא בלשונית "תאים".',
  STATUS_UNAVAILABLE: "לא ניתן לאמת כרגע את מצב ההרשמה עבור שלב זה.",
};

var REGISTRATION_STEP_ENDED_MESSAGE =
  "התחרות הסתיימה, ולא ניתן עוד לבצע שינויים בשלב זה.";

function formatOpeningDate(value) {
  if (!value) {
    return "";
  }

  var parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// הודעה גנרית ל"שלב לא זמין" - נשענת על reason keys קריאים למכונה בלבד
// (ראה registrationStepAvailability.js), לא על טקסט עסקי כפול.
//
// CAP-5: loading is no longer this function's concern - RegistrationStepNotice
// itself short-circuits to a spinner-only render via its own isLoading prop,
// so callers never need a "checking availability..." string here.
function buildRegistrationStepNoticeMessage(stepAvailability) {
  if (!stepAvailability) {
    return REGISTRATION_STEP_REASON_MESSAGES.STATUS_UNAVAILABLE;
  }

  if (stepAvailability.isReadOnly) {
    return REGISTRATION_STEP_ENDED_MESSAGE;
  }

  var reason = stepAvailability.unavailableReason;

  if (reason === "NOT_OPEN_YET" && stepAvailability.openingDate) {
    var formattedOpeningDate = formatOpeningDate(stepAvailability.openingDate);

    if (formattedOpeningDate) {
      return "פייד טיים ייפתח להרשמה בתאריך " + formattedOpeningDate + ".";
    }
  }

  return (
    REGISTRATION_STEP_REASON_MESSAGES[reason] ||
    REGISTRATION_STEP_REASON_MESSAGES.STATUS_UNAVAILABLE
  );
}

export {
  buildRegistrationStepNoticeMessage,
  formatOpeningDate,
  REGISTRATION_STEP_REASON_MESSAGES,
  REGISTRATION_STEP_ENDED_MESSAGE,
};
