// Shared "step unavailable" Hebrew reason-mapping, extracted so the three
// standalone management screens (Classes / Stalls-Shavings / Paid Times)
// reuse ONE mapping instead of each carrying an independent copy.
//
// AdminCompetitionRegistrationsScreen.jsx keeps its own inline copy of this
// exact logic (approved in Stage 3, out of scope to touch here) - the two
// copies must stay textually identical if either is ever revised.

var REGISTRATION_STEP_REASON_MESSAGES = {
  NOT_CONFIGURED: "שלב זה עדיין לא הוגדר עבור התחרות.",
  NOT_OPEN_YET: "ההרשמה לשלב זה עדיין לא נפתחה.",
  MISSING_PRICE: "לא הוגדר מחיר פעיל עבור שלב זה.",
  NEEDS_RELEVANT_ENTRY: "יש צורך בהרשמה פעילה למקצה לפני שניתן להמשיך בשלב זה.",
  NEEDS_RELEVANT_STALL_BOOKING:
    "יש צורך בהזמנת תא פעילה לפני שניתן להמשיך בשלב זה.",
  STATUS_UNAVAILABLE: "לא ניתן לאמת כרגע את מצב ההרשמה עבור שלב זה.",
};

var REGISTRATION_STEP_ENDED_MESSAGE =
  "התחרות הסתיימה, ולא ניתן עוד לבצע שינויים בשלב זה.";

var REGISTRATION_STEP_LOADING_MESSAGE = "בודקת זמינות השלב...";

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
function buildRegistrationStepNoticeMessage(stepAvailability, isStatusLoading) {
  if (isStatusLoading) {
    return REGISTRATION_STEP_LOADING_MESSAGE;
  }

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
  REGISTRATION_STEP_LOADING_MESSAGE,
};
