// Every user-facing string for the three-view classes page, in one place.
//
// THE COPY RULE: the forecast speaks in SUGGESTIONS, the actuals speak in STATEMENTS. Same
// numbers, different verbs. "כדאי להקדים" before the competition; "היום הסתיים" after it.
// Anything added here must pick a voice -- that is why the schedule strings are keyed by
// view rather than shared.
//
// PENDING OREN'S APPROVAL. Nothing outside this file hardcodes a Hebrew literal for this
// feature, so revisions land here and nowhere else.

var CLASSES_VIEW_TABS_COPY = {
  financial: {
    label: "כספים",
    hint: "עלויות ופרסים",
  },
  planning: {
    label: "תכנון",
    hint: "תחזית לקראת התחרות",
  },
  actuals: {
    label: "בפועל",
    hint: "נתוני אמת",
    // Never "disabled" -- the tab says what it is waiting for.
    unavailableHint: "יהיה זמין עם סגירת ההרשמה",
  },
};

// Marks a time that has wrapped past midnight into the following calendar day. Without it
// a finish of "00:30" is indistinguishable from half past midnight that same morning.
var NEXT_DAY_SUFFIX = " (למחרת)";

var SCHEDULE_COPY = {
  nextDaySuffix: NEXT_DAY_SUFFIX,

  planning: {
    columnHeader: "לוח זמנים משוער",
    dayFinishLabel: "סיום משוער",
    noStartTime: "כדאי להזין שעת התחלה למקצה הראשון כדי לקבל לוח זמנים",
    assumedOrigin: function (startTime) {
      return (
        "לוח הזמנים מבוסס על שעת התחלה משוערת של " +
        startTime +
        ". כדאי להזין שעת התחלה למקצה הראשון כדי לקבל לוח זמנים מדויק."
      );
    },
    applySetLabel: function (startTime) {
      return "הכנס את שעת ההתחלה " + startTime;
    },
    lateFinishYellow: "שעת הסיום המשוערת גבולית. כדאי לעקוב אחרי התקדמות היום.",
    lateFinishHigh: "שעת הסיום המשוערת מאוחרת מאוד.",
    applyAdvanceLabel: function (startTime) {
      return "הקדם את שעת ההתחלה ל-" + startTime;
    },
    insufficient:
      "הקדמת שעת ההתחלה לבדה לא תספיק. כדאי לשקול לפצל את היום או להעביר מקצים ליום אחר.",
  },

  actuals: {
    columnHeader: "לוח זמנים בפועל",
    dayFinishLabel: "סיום",
    noStartTime: "למקצה הראשון לא הוזנה שעת התחלה, ולכן אין לוח זמנים ליום זה.",
    assumedOrigin: function (startTime) {
      return (
        "למקצה הראשון לא הוזנה שעת התחלה. לוח הזמנים מחושב לפי שעת התחלה משוערת של " +
        startTime +
        "."
      );
    },
    applySetLabel: function (startTime) {
      return "קבע את שעת ההתחלה " + startTime;
    },
    lateFinishYellow: "היום מסתיים בשעה גבולית.",
    lateFinishHigh: "היום מסתיים מאוחר מאוד.",
    applyAdvanceLabel: function (startTime) {
      return "הקדם את שעת ההתחלה ל-" + startTime;
    },
    insufficient: "הקדמת שעת ההתחלה לבדה אינה פותרת את אורך היום.",
  },
};

var PLANNED_VS_ACTUAL_COPY = {
  columnHeader: "תחזית מול בפועל",
  panelTitle: "השוואת תחזית לתוצאה בפועל",

  withinBand: "בתוך טווח התחזית",
  belowBand: "מתחת לתחזית",
  aboveBand: "מעל לתחזית",

  // The verdicts are about the FORECAST, not about the competition. That distinction is the
  // reason this panel exists: a shortfall that is really a modelling error must not read as
  // a marketing failure.
  verdicts: {
    noData: {
      title: "אין תחזית להשוואה",
      detail: "למקצים של תחרות זו לא נשמרה תחזית כניסות, ולכן אין מה להשוות.",
    },
    onTarget: {
      title: "התחזית התאמתה",
      detail: "כל המקצים שנבדקו נכנסו לטווח התחזית.",
    },
    mixed: {
      title: "התחזית הייתה לא מדויקת",
      detail:
        "יש פערים בין התחזית לבין התוצאה בפועל, אך הם אינם באותו כיוון. הפערים נובעים ממקצים מסוימים ולא מהטיה של התחזית.",
    },
    // The TITLE carries the diagnosis (the forecast was wrong); the detail just states the
    // observation. Keep that split -- if the title ever softens, the panel goes back to
    // being a scoreboard.
    forecastHigh: {
      title: "התחזית הייתה גבוהה מדי",
      detail: "ההרשמה למקצים הינה מתחת לטווח התחזית.",
    },
    forecastLow: {
      title: "התחזית הייתה נמוכה מדי",
      detail: "ההרשמה למקצים הינה מעל לטווח התחזית.",
    },
  },

  summaryLine: function (summary) {
    return (
      "נבדקו " +
      summary.comparedClasses +
      " מקצים · " +
      summary.withinBandCount +
      " בטווח · " +
      summary.belowBandCount +
      " מתחת · " +
      summary.aboveBandCount +
      " מעל"
    );
  },

  totalsLine: function (summary) {
    return (
      "סה״כ כניסות בפועל " +
      summary.totalActual +
      " מול תחזית של " +
      Math.round(summary.totalPredicted)
    );
  },
};

// Advice about things the app does not track (judge rotations, worker shifts). Suggestion
// voice throughout -- these are always forward-looking, never a statement of fact.
var DAY_RECOMMENDATIONS_COPY = {
  panelTitle: "המלצות לתפעול היום",

  judges: {
    title: "כדאי לשקול תגבור שיפוט",
    detail: function (judgeCount, dayFinishTime) {
      return (
        "היום צפוי להסתיים בשעה " +
        dayFinishTime +
        ", ורשומים בו " +
        (judgeCount === 1 ? "שופט אחד" : judgeCount + " שופטים") +
        ". כדאי לשקול הוספת שופט נוסף שיחליף באמצע היום."
      );
    },
  },

  shifts: {
    title: "כדאי לשקול משמרת נוספת",
    detail: function (dayFinishTime) {
      return (
        "היום צפוי להסתיים בשעה " +
        dayFinishTime +
        ". כדאי לשקול משמרת נוספת של עובדים כדי לכסות את שעות הערב."
      );
    },
  },

  responses: {
    willDo: "נטפל בזה",
    later: "הזכירי לי מאוחר יותר",
    notNeeded: "לא נדרש",
  },

  answered: {
    willDo: "סומן לטיפול",
    later: "נדחה למועד מאוחר יותר",
    notNeeded: "סומן כלא נדרש",
  },

  undo: "שינוי",
};

// The registration-open instrument. Denominated by position in the window, so the wording
// changes with how much time is left, not only with the size of the gap.
var REGISTRATION_WINDOW_COPY = {
  panelTitle: "מעקב הרשמה",

  progressLine: function (analysis) {
    return (
      "נרשמו " +
      analysis.actualEntries +
      " מתוך תחזית של " +
      Math.round(analysis.predictedEntries) +
      " לכלל התחרות · נותרו " +
      (analysis.daysRemaining === 1
        ? "יום אחד"
        : analysis.daysRemaining + " ימים") +
      " לסגירת ההרשמה"
    );
  },

  statuses: {
    onTrack: {
      title: "ההרשמה מתקדמת בקצב הצפוי",
      detail: "אין צורך בפעולה בשלב זה.",
    },
    // Early in the window the forecast is the less reliable side, so the wording says so.
    earlySoft: {
      title: "ההרשמה איטית מהצפוי, אך מוקדם להסיק",
      detail:
        "בתחילת תקופת ההרשמה התחזית פחות אמינה, וייתכן שהיא גבוהה מדי. כדאי להמשיך לעקוב לפני נקיטת פעולה.",
    },
    behind: {
      title: "ההרשמה מפגרת אחרי התחזית",
      detail:
        "קצב ההרשמה נמוך מהצפוי ביחס לזמן שחלף. כדאי לשקול תזכורת לאדמינים כדי לעודד הרשמה.",
    },
    urgent: {
      title: "ההרשמה נמוכה מהתחזית הצפויה והזמן קצר",
      detail:
        "תקופת ההרשמה עומדת להסתיים וההרשמה עדיין מתחת לתחזית. זהו העיתוי האחרון שבו תזכורת עשויה להשפיע.",
    },
  },

  notifyButton: "שליחת תזכורת לאדמינים",
  notifyConfirmTitle: "שליחת תזכורת",
  notifyConfirmBody: function (competitionName) {
    return (
      "תישלח התראה לכל האדמינים עם תזכורת להירשם לתחרות " +
      competitionName +
      ". לא ניתן לבטל שליחה."
    );
  },
  notifyConfirm: "שלחי",
  notifyCancel: "ביטול",
  notifySent: "התזכורת נשלחה",
};

// Forecast summary cards for the planning view. Suggestion/expectation voice: everything
// here is צפוי, never a statement of fact.
var PLANNING_FORECAST_COPY = {
  predictedEntries: "כניסות צפויות ביום",
  totalIncome: "הכנסה צפויה ביום",
  ranchIncome: "הכנסה צפויה לחווה",
  federationIncome: "הכנסה צפויה להתאחדות",
  caveat: "המספרים מבוססים על תחזית הכניסות. ההכנסה מוצגת ברוטו, ללא ניכוי פרסים.",
};

// Phase 8 financial layer. Three sub-tabs INSIDE the financial view (כספים): a read-time
// income projection (תחזית), the actual running total (בפועל), and a reliability scorecard
// (תחזית מול בפועל). Every figure is a labelled PROJECTION and a RANGE -- never a point dressed
// as an accounting total. Each of the three income bands (entry / stall / shavings) states its
// own assumption and shows its own width; a tight entry band beside a wide stall band is the
// honesty, not a defect.
//
// ABSENCE != ZERO: when a ranch has no active stall/shavings price, the band shows a prompt to
// set prices -- NEVER a silent 0. Ranch 49 (Green Fields) is the live precedent.
//
// ALL STRINGS PENDING OREN'S APPROVAL, same as the rest of this file.
var FINANCIAL_PROJECTION_COPY = {
  // The three sub-tabs. Tabs 2/3 are grayed WITH A STATED REASON before they apply -- never
  // hidden, never a bare "disabled".
  tabs: {
    projection: {
      label: "תחזית",
      hint: "הכנסות ותאים לפני ההרשמה",
    },
    actual: {
      label: "בפועל",
      hint: "הכנסות מתוך הרשמות אמת",
      unavailableHint: "יהיה זמין עם סגירת ההרשמה",
    },
    comparison: {
      label: "תחזית מול בפועל",
      hint: "עד כמה התחזית דייקה",
      unavailableHint: "יהיה זמין כשיצטברו נתוני אמת",
    },
  },

  projectionTitle: "תחזית הכנסות",
  // Suggestion voice: everything here is צפוי, a forecast, never a statement of fact.
  projectionCaption:
    "כל המספרים הם תחזית המבוססת על חיזוי הכניסות, ומוצגים כטווח. ההכנסה ברוטו, ללא ניכוי פרסים.",

  entryIncomeLabel: "הכנסה ממקצים",
  entryIncomeHint: "כניסות צפויות × עלות המקצה (מארגן + התאחדות)",
  stallIncomeLabel: "הכנסה מתאים",
  stallIncomeHint: "לפי מספר הסוסים הצפוי והמלאי בחווה",
  shavingsIncomeLabel: "הכנסה מנסורת",
  shavingsIncomeHint: "לפי מספר התאים הצפוי",
  bagsOrderLabel: "שקי נסורת להזמנה",
  bagsOrderHint: "כמות מוערכת להזמנה מראש",

  // Range template: "בערך, בין X ל-Y". A zero-width band renders as a single value.
  approxPrefix: "בערך, ",
  rangeBetween: "בין ",
  rangeTo: " ל-",

  // Absence -> prompt. `pricingPrompt` covers a ranch with no pricing at all (ranch 49); the
  // per-band prompts cover the independent-degrade case (one priced, the other not).
  pricingPrompt:
    "מחירון לא הוגדר עבור החווה — עדכנו מחירי תאים ונסורת כדי לקבל תחזית",
  stallPricePrompt:
    "מחיר תאים לא הוגדר עבור החווה — עדכנו את המחירון כדי לקבל תחזית הכנסה מתאים",
  shavingsPricePrompt:
    "מחיר נסורת לא הוגדר עבור החווה — עדכנו את המחירון כדי לקבל תחזית הכנסה מנסורת",

  // More than one active shavings product -> the price is ambiguous (the live DK bug).
  shavingsAmbiguousNote:
    "קיים יותר ממוצר נסורת פעיל אחד, כך שהמחיר אינו חד-משמעי. בחרו מוצר נסורת אחד לתחרות לקבלת תחזית מדויקת יותר.",

  // Tack is its own low-confidence line -- surfaced, never folded silently into the stall number.
  tackNote: function (tackLo, tackHi) {
    var count = tackLo === tackHi ? String(tackLo) : tackLo + " עד " + tackHi;

    return (
      "כולל כ-" + count + " תאי ציוד (הערכה בביטחון נמוך: תא ציוד לכל 3–5 סוסים)"
    );
  },

  atCapacityNote:
    "מספר הסוסים הצפוי מגיע לתקרת התאים בחווה. התחזית נחתכה לפי מלאי התאים הקיים.",

  pricesMissingNote: function (count) {
    return count === 1
      ? "מקצה אחד ללא עלות מוגדרת אינו נכלל בתחזית ההכנסה ממקצים."
      : count + " מקצים ללא עלות מוגדרת אינם נכללים בתחזית ההכנסה ממקצים.";
  },

  unpredictedNote: function (count) {
    return count === 1
      ? "מקצה אחד ללא חיזוי כניסות אינו נכלל בתחזית."
      : count + " מקצים ללא חיזוי כניסות אינם נכללים בתחזית.";
  },

  noPredictions:
    "עדיין אין חיזוי כניסות למקצי תחרות זו, ולכן לא ניתן להציג תחזית הכנסות.",

  // Tab 2 (actual). Entry income is computed from real Active entries; stall/shavings actuals
  // come from real bookings and are not wired yet -- stated, not faked.
  actualTitle: "הכנסות בפועל",
  actualEntryIncomeLabel: "הכנסה ממקצים (בפועל)",
  actualEntryIncomeHint: "כניסות פעילות × עלות המקצה",
  actualBookingsPending:
    "הכנסות מתאים ומנסורת יחושבו מהזמנות בפועל (בפיתוח).",
  actualUnavailable: "התצוגה תהיה זמינה עם סגירת ההרשמה.",

  // Tab 3 (projection vs actual). A reliability scorecard about the FORECAST, not the
  // competition -- the same distinction the planned-vs-actual entries panel makes.
  comparisonTitle: "תחזית מול בפועל",
  comparisonUnavailable: "התצוגה תהיה זמינה כשיצטברו נתוני הרשמה בפועל.",
  comparisonWithinBand: "ההכנסה בפועל בתוך טווח התחזית",
  comparisonBelowBand: "ההכנסה בפועל מתחת לטווח התחזית",
  comparisonAboveBand: "ההכנסה בפועל מעל טווח התחזית",
  comparisonLine: function (actual, lo, hi) {
    return (
      "הכנסה ממקצים בפועל " +
      actual +
      " מול תחזית של " +
      lo +
      " עד " +
      hi
    );
  },
};

export {
  CLASSES_VIEW_TABS_COPY,
  SCHEDULE_COPY,
  PLANNED_VS_ACTUAL_COPY,
  DAY_RECOMMENDATIONS_COPY,
  REGISTRATION_WINDOW_COPY,
  PLANNING_FORECAST_COPY,
  FINANCIAL_PROJECTION_COPY,
};
